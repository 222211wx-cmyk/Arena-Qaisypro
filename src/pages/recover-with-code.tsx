import { useEffect, useRef, useState, type FormEvent } from "react";
import { useSearch } from "wouter";
import { redeemRecoveryCode, type OfflineRecoveryResult } from "@workspace/api-client-react";
import { Button } from "@workspace/gdna-ds/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@workspace/gdna-ds/components/ui/card";
import { Input } from "@workspace/gdna-ds/components/ui/input";
import { Label } from "@workspace/gdna-ds/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@workspace/gdna-ds/components/ui/alert";
import { KeyRound } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useLang } from "@/contexts/LangContext";
import { offlineRecoveryCopy, offlineRecoveryErrorKind } from "@/i18n/offline-recovery-copy";
import { recoveryReturnPath } from "@/lib/recovery-links";
import { announceAccountChange } from "@/lib/account-session-events";
import { RecoveryWarnings } from "@/components/auth/recovery-code-settings";
import { useRecoveryLanguage, useRecoveryMetadata } from "./recover-account";

/** Accept pasted codes with spaces/odd case; server remains authoritative. */
function normalizeCode(raw: string): string {
  const compact = raw.replace(/\s+/g, "");
  return /^gdna-/i.test(compact) ? `GDNA-${compact.slice(5).toLowerCase()}` : compact.toLowerCase();
}

export default function RecoverWithCode() {
  useRecoveryLanguage();
  const { lang } = useLang();
  const { user, refreshUser } = useAuth();
  const copy = offlineRecoveryCopy(lang);
  const next = recoveryReturnPath(useSearch());
  const base = import.meta.env.BASE_URL.replace(/\/$/, "");
  const loginHref = next?.startsWith("/lite") ? `${base}/lite/login` : `${base}/login${next ? `?${new URLSearchParams({ next })}` : ""}`;
  useRecoveryMetadata(copy.recoverTitle, copy.recoverIntro);

  const [code, setCode] = useState("");
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<OfflineRecoveryResult | null>(null);
  const inFlight = useRef<AbortController | null>(null);
  const seq = useRef(0);
  const resultRef = useRef<HTMLDivElement>(null);
  const refreshRef = useRef(refreshUser);
  refreshRef.current = refreshUser;
  const currentUsername = useRef(user?.username);
  currentUsername.current = user?.username;

  /** Invalidate seq BEFORE aborting so a late response cannot set state. */
  const cancelInFlight = () => {
    const controller = inFlight.current;
    seq.current += 1;
    inFlight.current = null;
    controller?.abort();
    setBusy(false);
    return controller !== null;
  };
  const cancelRef = useRef(cancelInFlight);
  cancelRef.current = cancelInFlight;
  const wipeRef = useRef(() => { setCode(""); setPw(""); setPw2(""); });

  useEffect(() => () => { seq.current += 1; const c = inFlight.current; inFlight.current = null; c?.abort(); }, []);

  // Identity change mid-request: drop the request and any typed secrets.
  const userId = user?.id;
  const firstUser = useRef(true);
  useEffect(() => {
    if (firstUser.current) { firstUser.current = false; return; }
    if (cancelRef.current()) setError(copy.network);
    wipeRef.current();
  }, [userId, copy.network]);

  // Drop typed secrets and cancel when the page goes to the background or is unloaded.
  useEffect(() => {
    const wipe = () => {
      if (document.visibilityState !== "hidden") return;
      if (cancelRef.current()) setError(copy.network);
      wipeRef.current();
    };
    const onPageHide = () => { cancelRef.current(); wipeRef.current(); };
    document.addEventListener("visibilitychange", wipe);
    window.addEventListener("pagehide", onPageHide);
    return () => { document.removeEventListener("visibilitychange", wipe); window.removeEventListener("pagehide", onPageHide); };
  }, [copy.network]);

  useEffect(() => { if (result) resultRef.current?.focus(); }, [result]);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (busy || inFlight.current) return;
    const normalized = normalizeCode(code);
    if (!normalized) { setError(copy.codeRequired); return; }
    if (pw.length < 6 || new TextEncoder().encode(pw).length > 72) { setError(copy.passwordShort); return; }
    if (pw !== pw2) { setError(copy.mismatch); return; }
    const newPassword = pw;
    const controller = new AbortController();
    inFlight.current = controller;
    const id = ++seq.current;
    // Secrets live only in this closure for the request's lifetime.
    wipeRef.current();
    setBusy(true);
    setError("");
    try {
      const data = await redeemRecoveryCode({ code: normalized, newPassword }, { cache: "no-store", credentials: "include", signal: controller.signal });
      announceAccountChange();
      if (id !== seq.current) return;
      setResult({ success: true, username: data.username, revocationPending: data.revocationPending });
      // Only the recovered account's revoked session is refreshed; other accounts stay signed in.
      if (currentUsername.current && currentUsername.current.toLowerCase() === data.username.toLowerCase()) void refreshRef.current();
    } catch (err) {
      if (id !== seq.current) return;
      const kind = offlineRecoveryErrorKind(err);
      if (kind === "abort") return;
      setError(kind === "invalid" || kind === "password" ? copy.invalidCode : kind === "rate" ? copy.rateLimited : kind === "network" ? copy.network : copy.generic);
    } finally {
      if (id === seq.current) { setBusy(false); inFlight.current = null; }
    }
  };

  return <main className="mx-auto min-h-[100dvh] max-w-lg space-y-4 p-4 py-8" dir={lang === "ar" ? "rtl" : "ltr"}>
    <Card className="bg-card/50 border-primary/20">
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><KeyRound className="h-5 w-5 text-primary" aria-hidden="true" />{copy.recoverTitle}</CardTitle>
        <CardDescription>{copy.recoverIntro}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {result ? <div ref={resultRef} tabIndex={-1} className="space-y-3" role="status" data-testid="panel-recover-code-success">
          <Alert className="border-primary/40">
            <AlertTitle>{copy.success}</AlertTitle>
            <AlertDescription className="space-y-2">
              <p>{copy.usernameIs} <strong dir="ltr" className="font-mono" data-testid="text-recovered-username">{result.username}</strong></p>
              <p>{copy.devicesOut}</p>
              {result.revocationPending && <p data-testid="text-recover-revocation-pending">{copy.pending}</p>}
              <p>{copy.noHistory}</p>
            </AlertDescription>
          </Alert>
          <Button asChild><a href={loginHref} data-testid="link-recover-code-login">{copy.goLogin}</a></Button>
        </div> : <>
          <RecoveryWarnings copy={copy} />
          <form onSubmit={e => void submit(e)} className="space-y-3" aria-busy={busy} data-testid="form-recover-with-code">
            <div className="space-y-1">
              <Label htmlFor="recover-code">{copy.codeLabel}</Label>
              <Input id="recover-code" dir="ltr" className="font-mono" autoComplete="off" autoCapitalize="off" spellCheck={false} maxLength={160}
                value={code} onChange={e => setCode(e.target.value)} disabled={busy} aria-describedby="recover-code-hint" data-testid="input-recover-code" />
              <p id="recover-code-hint" className="text-xs text-muted-foreground">{copy.codeHint}</p>
            </div>
            <div className="space-y-1">
              <Label htmlFor="recover-new-password">{copy.newPassword}</Label>
              <Input id="recover-new-password" type="password" autoComplete="new-password" maxLength={72} value={pw} onChange={e => setPw(e.target.value)} disabled={busy} data-testid="input-recover-new-password" />
            </div>
            <div className="space-y-1">
              <Label htmlFor="recover-confirm-password">{copy.confirmPassword}</Label>
              <Input id="recover-confirm-password" type="password" autoComplete="new-password" maxLength={72} value={pw2} onChange={e => setPw2(e.target.value)} disabled={busy} data-testid="input-recover-confirm-password" />
            </div>
            <p className="text-sm text-muted-foreground">{copy.resetWarn}</p>
            {error && <p role="alert" className="text-sm text-destructive" data-testid="status-recover-code-error">{error}</p>}
            <Button type="submit" disabled={busy} className="w-full" data-testid="button-recover-code-submit">{busy ? copy.working : copy.redeem}</Button>
          </form>
        </>}
        <div className="flex flex-wrap gap-4 text-sm">
          {!result && <a href={loginHref} className="text-primary hover:underline" data-testid="link-recover-code-sign-in">{copy.signIn}</a>}
          {next && <a href={`${base}${next}`} className="text-muted-foreground hover:underline" data-testid="link-recover-code-return">{copy.back}</a>}
        </div>
      </CardContent>
    </Card>
  </main>;
}
