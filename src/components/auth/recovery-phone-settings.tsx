import { useCallback, useEffect, useState } from "react";
import { Button } from "@workspace/gdna-ds/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@workspace/gdna-ds/components/ui/card";
import { ShieldCheck } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useLang } from "@/contexts/LangContext";
import { recoveryCopy } from "@/i18n/recovery-copy";
import { recoveryErrorText, recoveryRequest, type RecoveryConfig, type RecoveryPhone } from "@/lib/phone-recovery";
import { PhoneRecoveryFlow } from "./phone-recovery-flow";

export function RecoveryPhoneSettings() {
  const { user } = useAuth();
  const { lang } = useLang();
  const copy = recoveryCopy(lang);
  const [data, setData] = useState<{ config: RecoveryConfig; phone: RecoveryPhone } | null>(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [action, setAction] = useState<"bind" | "remove" | null>(null);
  const [attempt, setAttempt] = useState(0);
  const refresh = useCallback(() => { setAttempt(value => value + 1); }, []);

  useEffect(() => {
    const controller = new AbortController();
    setData(null);
    setError("");
    setAction(null);
    if (!user) return () => controller.abort();
    void Promise.all([
      recoveryRequest<RecoveryConfig>("config", undefined, controller.signal),
      recoveryRequest<RecoveryPhone>("phone", undefined, controller.signal),
    ]).then(([config, phone]) => {
      if (!controller.signal.aborted) setData({ config, phone });
    }).catch(err => {
      if (!controller.signal.aborted) setError(recoveryErrorText(err, copy));
    });
    return () => controller.abort();
  }, [user?.id, attempt, lang]);

  useEffect(() => { setMessage(""); }, [user?.id]);
  useEffect(() => {
    const onFocus = () => { if (!action) refresh(); };
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [action, refresh]);
  return <Card className="bg-card/50 border-primary/20" dir={lang === "ar" ? "rtl" : "ltr"} data-testid="card-recovery-phone-settings">
    <CardHeader>
      <CardTitle className="flex items-center gap-2 text-lg"><ShieldCheck className="h-5 w-5 text-primary" />{copy.phoneTitle}</CardTitle>
      <CardDescription>{copy.optIn}</CardDescription>
    </CardHeader>
    <CardContent className="space-y-4">
      {message && <p role="status" className="text-sm text-primary" data-testid="status-recovery-phone-saved">{message}</p>}
      {!user ? <p>{copy.authRequired}</p> : error ? <>
        <p role="alert" className="text-sm text-destructive" data-testid="status-recovery-settings-error">{error}</p>
        <Button variant="outline" onClick={refresh} data-testid="button-recovery-settings-retry">{copy.retry}</Button>
      </> : !data ? <p role="status" className="text-sm text-muted-foreground" data-testid="status-recovery-settings-loading">{copy.loading}</p> : <>
        <p className="text-sm" data-testid="text-enrolled-recovery-phone">{data.phone.hasVerifiedPhone ? <>{copy.enrolled}: <bdi dir="ltr">{data.phone.maskedPhone}</bdi></> : copy.notEnrolled}</p>
        {!data.config.configured || !data.config.firebaseConfig ? <p role="alert" className="text-sm text-destructive" data-testid="status-recovery-not-configured">{copy.unavailable}</p> : action ?
          <PhoneRecoveryFlow key={`${user.id}-${action}`} action={action} config={data.config.firebaseConfig} lang={lang} onCancel={() => setAction(null)} onSuccess={() => {
            setMessage(action === "remove" ? copy.removeSuccess : copy.bindSuccess);
            setAction(null);
            refresh();
          }} /> :
          <div className="flex flex-wrap gap-3">
            <Button onClick={() => { setMessage(""); setAction("bind"); }} data-testid="button-bind-recovery-phone">{data.phone.hasVerifiedPhone ? copy.replace : copy.bind}</Button>
            {data.phone.hasVerifiedPhone && <Button variant="outline" onClick={() => { setMessage(""); setAction("remove"); }} data-testid="button-remove-recovery-phone">{copy.remove}</Button>}
          </div>}
      </>}
    </CardContent>
  </Card>;
}