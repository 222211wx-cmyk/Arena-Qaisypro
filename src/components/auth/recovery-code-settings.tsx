import { useEffect, useRef, useState, type FormEvent } from "react";
import { Link } from "wouter";
import { generateRecoveryCode, getGetRecoveryCodeStatusQueryKey, removeRecoveryCode, useGetRecoveryCodeStatus, type OfflineRecoveryStatus } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@workspace/gdna-ds/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@workspace/gdna-ds/components/ui/card";
import { Input } from "@workspace/gdna-ds/components/ui/input";
import { Label } from "@workspace/gdna-ds/components/ui/label";
import { Checkbox } from "@workspace/gdna-ds/components/ui/checkbox";
import { Alert, AlertDescription, AlertTitle } from "@workspace/gdna-ds/components/ui/alert";
import { Skeleton } from "@workspace/gdna-ds/components/ui/skeleton";
import { KeyRound } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useLang } from "@/contexts/LangContext";
import { offlineRecoveryCopy, offlineRecoveryErrorKind, type OfflineRecoveryCopy } from "@/i18n/offline-recovery-copy";
import { useRecoveryReminderPreference } from "@/hooks/use-recovery-reminder-preference";
import { isRecoveryCodeExpiringSoon, recoveryReminderCopy } from "../../../../../lib/recovery-code-reminder";

const NO_STORE: RequestInit = { cache: "no-store", credentials: "include" };

export function formatRecoveryDate(value: string | null, lang: string): string {
  if (!value) return "";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString(lang, { year: "numeric", month: "long", day: "numeric" });
}

export function RecoveryWarnings({ copy }: { copy: OfflineRecoveryCopy }) {
  return <Alert data-testid="alert-offline-recovery-limits">
    <AlertTitle>{copy.internet}</AlertTitle>
    <AlertDescription>
      <ul className="list-disc space-y-1 ps-4">
        <li>{copy.keeps}</li>
        <li>{copy.noHistory}</li>
        <li>{copy.noErase}</li>
        <li>{copy.noCode}</li>
      </ul>
    </AlertDescription>
  </Alert>;
}

type Mode = "idle" | "generate" | "remove";
type Issued = { code: string; expiresAt: string };

/** Mount with key={user.id}: every identity change remounts and drops all secrets. */
export function RecoveryCodeSettings({ showPageLink = false }: { showPageLink?: boolean }) {
  const { user } = useAuth();
  const { lang } = useLang();
  const copy = offlineRecoveryCopy(lang);
  const reminderCopy = recoveryReminderCopy(lang);
  const reminder = useRecoveryReminderPreference(user?.id);
  const queryClient = useQueryClient();
  const queryKey = [...getGetRecoveryCodeStatusQueryKey(), user?.id ?? 0] as const;
  const status = useGetRecoveryCodeStatus({
    query: { queryKey, enabled: !!user, staleTime: 0, gcTime: 0, retry: 1, refetchOnWindowFocus: true },
    request: NO_STORE,
  });

  const refetchRef = useRef(status.refetch);
  refetchRef.current = status.refetch;
  const [mode, setMode] = useState<Mode>("idle");
  const [password, setPassword] = useState("");
  const [ack, setAck] = useState(false);
  const [issued, setIssued] = useState<Issued | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [copyState, setCopyState] = useState<"" | "copied" | "failed">("");
  const inFlight = useRef<AbortController | null>(null);
  const seq = useRef(0);
  const codeRef = useRef<HTMLElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);

  const clearSecrets = () => { setPassword(""); setIssued(null); setCopyState(""); };

  /** Invalidate seq BEFORE aborting so no late result can set state. Returns true if a request was cancelled. */
  const cancelInFlight = (): boolean => {
    const controller = inFlight.current;
    seq.current += 1;
    inFlight.current = null;
    controller?.abort();
    setBusy(false);
    return controller !== null;
  };
  const cancelRef = useRef(cancelInFlight);
  cancelRef.current = cancelInFlight;
  const pendingAction = useRef<Mode>("idle");

  // Abort and forget on unmount.
  useEffect(() => () => { seq.current += 1; const c = inFlight.current; inFlight.current = null; c?.abort(); }, []);

  // Hide the code and drop the typed password when the page is backgrounded or unloaded.
  useEffect(() => {
    const onHide = () => {
      if (document.visibilityState !== "hidden") return;
      const wasGenerating = pendingAction.current === "generate";
      const cancelled = cancelRef.current();
      pendingAction.current = "idle";
      setPassword("");
      if (cancelled && wasGenerating) { setError(copy.lost); setMode("idle"); setAck(false); void refetchRef.current(); }
      setIssued(current => { if (current) setNotice(copy.hidden); return null; });
      setCopyState("");
    };
    const onPageHide = () => { cancelRef.current(); pendingAction.current = "idle"; setPassword(""); setIssued(null); };
    document.addEventListener("visibilitychange", onHide);
    window.addEventListener("pagehide", onPageHide);
    return () => { document.removeEventListener("visibilitychange", onHide); window.removeEventListener("pagehide", onPageHide); };
  }, [copy.hidden, copy.lost]);

  // Warn before reload/navigation while the one-time code is on screen.
  useEffect(() => {
    if (!issued) return;
    const onBeforeUnload = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ""; };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [issued]);

  useEffect(() => { if (issued) codeRef.current?.focus(); }, [issued]);
  useEffect(() => { if (mode !== "idle") passwordRef.current?.focus(); }, [mode]);

  const open = (next: Mode) => { setMode(next); setError(""); setNotice(""); setAck(false); clearSecrets(); };
  const close = () => {
    const wasGenerating = pendingAction.current === "generate";
    const cancelled = cancelInFlight();
    pendingAction.current = "idle";
    setMode("idle"); setAck(false); setPassword("");
    // A cancelled generation may still have rotated the code server-side.
    if (cancelled && wasGenerating) { setError(copy.lost); void status.refetch(); } else setError("");
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (busy || inFlight.current) return;
    if (!password) { setError(copy.passwordRequired); return; }
    if (mode === "generate" && !ack) { setError(copy.ackRequired); return; }
    const controller = new AbortController();
    inFlight.current = controller;
    const id = ++seq.current;
    const action = mode;
    pendingAction.current = action;
    const currentPassword = password;
    setPassword("");
    setBusy(true);
    setError("");
    setNotice("");
    try {
      if (action === "generate") {
        const result = await generateRecoveryCode({ currentPassword }, { ...NO_STORE, signal: controller.signal });
        if (id !== seq.current) return;
        if (document.visibilityState === "hidden") { setError(copy.lost); queryClient.setQueryData<OfflineRecoveryStatus>(queryKey, { active: true, expiresAt: result.expiresAt }); return; }
        setIssued({ code: result.code, expiresAt: result.expiresAt });
        queryClient.setQueryData<OfflineRecoveryStatus>(queryKey, { active: true, expiresAt: result.expiresAt });
      } else {
        const result = await removeRecoveryCode({ currentPassword }, { ...NO_STORE, signal: controller.signal });
        if (id !== seq.current) return;
        queryClient.setQueryData<OfflineRecoveryStatus>(queryKey, result);
        setNotice(copy.removed);
      }
      setMode("idle");
      setAck(false);
    } catch (err) {
      if (id !== seq.current) return;
      const kind = offlineRecoveryErrorKind(err);
      if (kind === "abort") return;
      if (action === "generate" && (kind === "network" || kind === "generic")) {
        // The server may have rotated the code even though the response was lost.
        setError(copy.lost);
        void status.refetch();
      } else {
        setError(kind === "password" ? copy.wrongPassword : kind === "rate" ? copy.rateLimited : kind === "network" ? copy.network : copy.generic);
        if (action === "remove") void status.refetch();
      }
    } finally {
      if (id === seq.current) { setBusy(false); inFlight.current = null; pendingAction.current = "idle"; }
    }
  };

  const copyCode = async () => {
    if (!issued) return;
    try { await navigator.clipboard.writeText(issued.code); setCopyState("copied"); }
    catch { setCopyState("failed"); }
  };

  const selectCode = () => {
    const node = codeRef.current;
    if (!node) return;
    const range = document.createRange();
    range.selectNodeContents(node);
    const selection = window.getSelection();
    selection?.removeAllRanges();
    selection?.addRange(range);
  };

  const data = status.data;
  return <Card className="bg-card/50 border-primary/20" dir={lang === "ar" ? "rtl" : "ltr"} data-testid="card-recovery-code-settings">
    <CardHeader>
      <CardTitle className="flex items-center gap-2 text-lg"><KeyRound className="h-5 w-5 text-primary" aria-hidden="true" />{copy.title}</CardTitle>
      <CardDescription>{copy.intro}</CardDescription>
    </CardHeader>
    <CardContent className="space-y-4">
      <RecoveryWarnings copy={copy} />

      {status.isLoading ? <div className="space-y-2" role="status" aria-label={copy.loading} data-testid="status-recovery-code-loading">
        <Skeleton className="h-4 w-2/3" /><Skeleton className="h-9 w-40" />
      </div> : status.isError && !data ? <div className="space-y-2">
        <p role="alert" className="text-sm text-destructive" data-testid="status-recovery-code-error">{copy.statusError}</p>
        <Button variant="outline" size="sm" onClick={() => void status.refetch()} data-testid="button-recovery-code-retry">{copy.retry}</Button>
      </div> : data && <p className="text-sm" role="status" data-testid="text-recovery-code-status">
        {data.active ? copy.active.replace("{date}", formatRecoveryDate(data.expiresAt, lang)) : copy.inactive}
      </p>}

      <div className="space-y-2">
        <div className="flex items-start gap-2">
          <Checkbox id="recovery-expiry-reminder" checked={reminder.enabled} disabled={!reminder.ready}
            onCheckedChange={value => reminder.setEnabled(value === true)}
            aria-describedby="recovery-expiry-reminder-hint" data-testid="checkbox-recovery-expiry-reminder" />
          <Label htmlFor="recovery-expiry-reminder" className="text-sm font-normal leading-snug">{reminderCopy.label}</Label>
        </div>
        <p id="recovery-expiry-reminder-hint" className="text-sm text-muted-foreground">{reminderCopy.hint}</p>
        {reminder.failed && <p role="alert" className="text-sm text-destructive">{reminderCopy.storageError}</p>}
      </div>

      {reminder.enabled && status.isSuccess && !status.isFetching && isRecoveryCodeExpiringSoon(data)
        && mode === "idle" && !issued && !busy && <Alert data-testid="alert-recovery-code-expiry">
          <AlertTitle>{reminderCopy.label}</AlertTitle>
          <AlertDescription className="space-y-2">
            <p>{reminderCopy.warning.replace("{date}", formatRecoveryDate(data?.expiresAt ?? null, lang))}</p>
            <Button variant="link" className="h-auto whitespace-normal p-0 text-start" onClick={() => open("generate")}
              data-testid="button-recovery-code-expiry-replace">{reminderCopy.replace}</Button>
          </AlertDescription>
        </Alert>}

      {notice && <p role="status" className="text-sm text-primary" data-testid="status-recovery-code-notice">{notice}</p>}
      {error && mode === "idle" && <p role="alert" className="text-sm text-destructive" data-testid="status-recovery-code-action-error">{error}</p>}

      {issued && <Alert className="border-primary/40" data-testid="panel-recovery-code-issued">
        <AlertTitle>{copy.codeHeading}</AlertTitle>
        <AlertDescription className="space-y-3">
          <p>{copy.shownOnce}</p>
          <code ref={codeRef} tabIndex={0} dir="ltr" onFocus={selectCode} aria-label={copy.codeLabel}
            className="block select-all break-all rounded-md border border-border bg-background p-3 font-mono text-sm text-foreground"
            data-testid="text-recovery-code">{issued.code}</code>
          <p>{copy.expires.replace("{date}", formatRecoveryDate(issued.expiresAt, lang))}</p>
          <p>{copy.selectHint}</p>
          <p className="text-destructive">{copy.clipboardRisk}</p>
          {copyState && <p role="status" data-testid="status-recovery-code-copy">{copyState === "copied" ? copy.copied : copy.copyFailed}</p>}
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={() => void copyCode()} data-testid="button-recovery-code-copy">{copy.copy}</Button>
            <Button size="sm" onClick={() => { clearSecrets(); }} data-testid="button-recovery-code-saved">{copy.saved}</Button>
          </div>
        </AlertDescription>
      </Alert>}

      {mode === "idle" && !issued && data && <div className="flex flex-wrap gap-2">
        <Button onClick={() => open("generate")} data-testid="button-recovery-code-generate">{data.active ? copy.rotate : copy.generate}</Button>
        {data.active && <Button variant="outline" onClick={() => open("remove")} data-testid="button-recovery-code-remove">{copy.remove}</Button>}
      </div>}

      {mode !== "idle" && <form onSubmit={e => void submit(e)} className="space-y-3" aria-busy={busy} data-testid={`form-recovery-code-${mode}`}>
        <p className="text-sm text-muted-foreground">{mode === "generate" ? (data?.active ? copy.rotateWarn : copy.passwordStepUp) : copy.removeWarn}</p>
        {mode === "generate" && data?.active && <p className="text-sm text-muted-foreground">{copy.passwordStepUp}</p>}
        <div className="space-y-1">
          <Label htmlFor="recovery-code-password">{copy.currentPassword}</Label>
          <Input ref={passwordRef} id="recovery-code-password" type="password" autoComplete="current-password" value={password} maxLength={1024}
            onChange={e => setPassword(e.target.value)} disabled={busy} data-testid="input-recovery-code-password" />
        </div>
        {mode === "generate" && <div className="flex items-start gap-2">
          <Checkbox id="recovery-code-ack" checked={ack} onCheckedChange={v => setAck(v === true)} disabled={busy} data-testid="checkbox-recovery-code-ack" />
          <Label htmlFor="recovery-code-ack" className="text-sm font-normal leading-snug">{copy.ack}</Label>
        </div>}
        {error && <p role="alert" className="text-sm text-destructive" data-testid="status-recovery-code-form-error">{error}</p>}
        <div className="flex flex-wrap gap-2">
          <Button type="submit" variant={mode === "remove" ? "destructive" : "default"} disabled={busy || !password || (mode === "generate" && !ack)} data-testid="button-recovery-code-submit">
            {busy ? copy.working : mode === "remove" ? copy.remove : data?.active ? copy.rotate : copy.generate}
          </Button>
          <Button type="button" variant="ghost" onClick={close} data-testid="button-recovery-code-cancel">{copy.cancel}</Button>
        </div>
      </form>}

      {showPageLink && <Link href="/recovery-code" className="inline-block text-sm text-primary hover:underline" data-testid="link-recovery-code-page">{copy.openPage}</Link>}
    </CardContent>
  </Card>;
}
