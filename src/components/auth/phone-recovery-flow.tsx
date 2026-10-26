import { useEffect, useId, useRef, useState } from "react";
import type { FirebaseOptions } from "firebase/app";
import { Button } from "@workspace/gdna-ds/components/ui/button";
import { Input } from "@workspace/gdna-ds/components/ui/input";
import { Label } from "@workspace/gdna-ds/components/ui/label";
import { Checkbox } from "@workspace/gdna-ds/components/ui/checkbox";
import { recoveryCopy } from "@/i18n/recovery-copy";
import { createPhoneRecoverySession, recoveryErrorText, recoveryRequest, type PhoneRecoverySession } from "@/lib/phone-recovery";
import { announceAccountChange } from "@/lib/account-session-events";

type Action = "access" | "reset" | "bind" | "remove";
export function PhoneRecoveryFlow({ action, config, lang, onSuccess, onCancel, onAccess }: {
  action: Action; config: FirebaseOptions; lang: string; onSuccess: () => void; onCancel?: () => void;
  onAccess?: (idToken: string) => Promise<void>;
}) {
  const copy = recoveryCopy(lang);
  const id = useId();
  const [step, setStep] = useState<"phone" | "sms" | "verified">("phone");
  const [phone, setPhone] = useState("");
  const [consent, setConsent] = useState(false);
  const [sms, setSms] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const session = useRef<PhoneRecoverySession | null>(null);
  const captcha = useRef<HTMLDivElement>(null);
  const generation = useRef(0);
  const lock = useRef(false);
  const request = useRef<AbortController | null>(null);

  useEffect(() => () => {
    generation.current++;
    request.current?.abort();
    const active = session.current;
    session.current = null;
    void active?.close().catch(() => { /* Named in-memory app is deleted in close's finally. */ });
  }, []);

  const dispose = async () => {
    const active = session.current;
    session.current = null;
    await active?.close();
  };
  const clearProof = () => {
    setSms("");
    setNewPassword("");
    setConfirmPassword("");
    setCurrentPassword("");
    setStep("phone");
    setConsent(false);
  };
  useEffect(() => {
    if (step !== "verified") return;
    const timer = window.setTimeout(() => {
      if (lock.current) return; // Server validates the age of an in-flight proof.
      void dispose().catch(() => {});
      clearProof();
      setError(copy.expired);
    }, 5 * 60_000);
    return () => window.clearTimeout(timer);
  }, [step, copy.expired]);

  const startAgain = async () => {
    if (lock.current) return;
    setError("");
    try { await dispose(); } catch (err) { setError(recoveryErrorText(err, copy)); }
    clearProof();
  };
  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (lock.current) return;
    setError("");
    if (!consent) { setError(copy.consentRequired); return; }
    if (step === "phone" && !/^\+[1-9]\d{7,14}$/.test(phone.trim())) { setError(copy.invalidPhone); return; }
    if (action !== "reset" && action !== "access" && !currentPassword) { setError(copy.stepUp); return; }
    if (step === "sms" && !/^\d{6}$/.test(sms.trim())) { setError(copy.invalidCode); return; }
    if (step === "verified" && action === "reset") {
      if (newPassword.length < 6 || new TextEncoder().encode(newPassword).length > 72) { setError(copy.passwordShort); return; }
      if (newPassword !== confirmPassword) { setError(copy.mismatch); return; }
    }
    lock.current = true;
    setBusy(true);
    const version = generation.current;
    const isCurrent = () => generation.current === version;
    let posting = false;
    try {
      if (step === "phone") {
        await dispose();
        const active = await createPhoneRecoverySession(config, lang);
        if (!isCurrent()) { await active.close(); return; }
        session.current = active;
        await active.send(phone.trim(), captcha.current!);
        if (isCurrent()) setStep("sms");
      } else if (step === "sms") {
        await session.current!.confirm(sms.trim());
        if (!isCurrent()) return;
        if (action === "access") {
          // Direct access consumes the proof immediately after real SMS
          // confirmation; there is no password or extra verification stage.
          posting = true;
          const idToken = await session.current!.token();
          if (!isCurrent()) return;
          if (!onAccess) throw new Error("Recovery access is unavailable");
          await onAccess(idToken);
          await dispose().catch(() => {});
          if (isCurrent()) { clearProof(); onSuccess(); }
        } else { setSms(""); setStep("verified"); }
      } else {
        // Fresh phone-provider proof is obtained only after consent and SMS
        // confirmation. Never persist it or send it to any other API.
        posting = true;
        const idToken = await session.current!.token();
        if (!isCurrent()) return;
        request.current = new AbortController();
        await recoveryRequest(action === "reset" ? "reset" : `phone/${action}`, action === "reset"
          ? { idToken, newPassword }
          : { idToken, currentPassword }, request.current.signal);
        if (action === "reset") announceAccountChange();
        // The server mutation is already committed. A local widget cleanup
        // failure must not turn that committed result into a false failure.
        // close still attempts sign-out and deletion through nested finally.
        await dispose().catch(() => {});
        if (isCurrent()) { clearProof(); onSuccess(); }
      }
    } catch (err) {
      if (!isCurrent()) return;
      const message = recoveryErrorText(err, copy);
      // A submitted proof is single-use across ALL actions, including failed
      // backend mutations. Require a fresh SMS rather than retrying a token.
      if (posting || step === "phone" || message === copy.expired) {
        await dispose().catch(() => {});
        clearProof();
      }
      setError(message);
    } finally {
      if (isCurrent()) { lock.current = false; setBusy(false); }
    }
  };
  const actionLabel = action === "access" ? copy.access : action === "reset" ? copy.reset : action === "remove" ? copy.remove : copy.bind;
  return (
    <form onSubmit={submit} className="space-y-4" dir={lang === "ar" ? "rtl" : "ltr"} data-testid={`form-phone-${action}`}>
      {error && <p role="alert" className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive" data-testid="status-recovery-error">{error}</p>}
      {action === "remove" && <p className="text-sm text-muted-foreground" data-testid="text-remove-recovery-warning">{copy.removeWarning}</p>}
      {step === "phone" && <>
        {action !== "reset" && action !== "access" && <div className="space-y-2">
          <Label htmlFor={`${id}-current`}>{copy.currentPassword}</Label>
          <Input id={`${id}-current`} type="password" autoComplete="current-password" value={currentPassword} onChange={e => setCurrentPassword(e.target.value)} disabled={busy} required data-testid="input-recovery-current-password" />
          <p className="text-xs text-muted-foreground">{copy.stepUp}</p>
        </div>}
        <div className="space-y-2">
          <Label htmlFor={`${id}-phone`}>{copy.phone}</Label>
          <Input id={`${id}-phone`} type="tel" dir="ltr" autoComplete="tel" value={phone} onChange={e => setPhone(e.target.value)} disabled={busy} maxLength={16} required aria-describedby={`${id}-phone-hint`} data-testid="input-recovery-phone" />
          <p id={`${id}-phone-hint`} className="text-xs text-muted-foreground">{action === "access" ? copy.accessPhoneHint : copy.phoneHint}</p>
        </div>
        <div className="flex items-start gap-3">
          <Checkbox id={`${id}-consent`} checked={consent} onCheckedChange={value => setConsent(value === true)} disabled={busy} className="mt-1" data-testid="checkbox-recovery-sms-consent" />
          <Label htmlFor={`${id}-consent`} className="text-sm font-normal leading-relaxed text-muted-foreground">{copy.consent}</Label>
        </div>
      </>}
      {/* A visible widget, not an invisible reCAPTCHA. Keep its DOM mounted
          until the named Firebase session is cleaned up. */}
      <div ref={captcha} dir="ltr" className={step === "phone" ? "overflow-x-auto" : "hidden"} data-testid="recovery-visible-recaptcha" />
      {step === "sms" && <div className="space-y-2">
        <Label htmlFor={`${id}-sms`}>{copy.sms}</Label>
        <Input id={`${id}-sms`} dir="ltr" inputMode="numeric" autoComplete="one-time-code" value={sms} onChange={e => setSms(e.target.value)} minLength={6} maxLength={6} disabled={busy} required aria-describedby={`${id}-sms-hint`} data-testid="input-recovery-sms-code" />
        <p id={`${id}-sms-hint`} className="text-xs text-muted-foreground">{copy.smsHint}</p>
        {action === "access" && <p className="text-xs text-muted-foreground">{copy.smsPrivacy}</p>}
      </div>}
      {step === "verified" && <>
        <p role="status" className="text-sm text-primary" data-testid="status-recovery-phone-verified">{copy.verified}</p>
        {action === "reset" && <>
          <div className="space-y-2">
            <Label htmlFor={`${id}-new`}>{copy.newPassword}</Label>
            <Input id={`${id}-new`} type="password" autoComplete="new-password" value={newPassword} onChange={e => setNewPassword(e.target.value)} minLength={6} disabled={busy} required data-testid="input-recovery-new-password" />
            <p className="text-xs text-muted-foreground">{copy.passwordHint}</p>
          </div>
          <div className="space-y-2">
            <Label htmlFor={`${id}-confirm`}>{copy.confirmPassword}</Label>
            <Input id={`${id}-confirm`} type="password" autoComplete="new-password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} minLength={6} disabled={busy} required data-testid="input-recovery-confirm-password" />
          </div>
        </>}
      </>}
      <div className="flex flex-wrap gap-3">
        <Button type="submit" disabled={busy || !consent} data-testid="button-recovery-submit">{busy ? copy.busy : step === "phone" ? copy.send : step === "sms" ? action === "access" ? copy.confirmAccess : copy.confirmSms : actionLabel}</Button>
        {step !== "phone" && <Button type="button" variant="outline" disabled={busy} onClick={() => void startAgain()} data-testid="button-recovery-restart">{copy.restart}</Button>}
        {onCancel && <Button type="button" variant="ghost" disabled={busy} onClick={onCancel} data-testid="button-recovery-cancel">{copy.cancel}</Button>}
      </div>
    </form>
  );
}