import { useEffect, useState } from "react";
import { Link, useSearch } from "wouter";
import { Button } from "@workspace/gdna-ds/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@workspace/gdna-ds/components/ui/card";
import { ShieldCheck } from "lucide-react";
import { useLang, type Lang } from "@/contexts/LangContext";
import { useAuth } from "@/contexts/AuthContext";
import { recoveryCopy } from "@/i18n/recovery-copy";
import { recoveryErrorText, recoveryRequest, type RecoveryConfig } from "@/lib/phone-recovery";
import { recoveryReturnPath, recoveryRoute } from "@/lib/recovery-links";
import { PhoneRecoveryFlow } from "@/components/auth/phone-recovery-flow";
import { offlineRecoveryCopy } from "@/i18n/offline-recovery-copy";

export function useRecoveryLanguage() {
  const search = useSearch();
  const { lang, setLang } = useLang();
  const requested = new URLSearchParams(search).get("lang");
  useEffect(() => {
    if (requested && ["en", "fr", "ar", "es", "de"].includes(requested) && requested !== lang) setLang(requested as Lang);
  }, [requested, lang, setLang]);
}

export function useRecoveryMetadata(title: string, description: string) {
  useEffect(() => {
    const oldTitle = document.title;
    document.title = `${title} — ARENA`;
    const saved: Array<{ node: Element; old: string | null; created: boolean }> = [];
    for (const [selector, value] of [
      ['meta[name="description"]', description], ['meta[property="og:title"]', `${title} — ARENA`],
      ['meta[property="og:description"]', description], ['meta[name="robots"]', "noindex, nofollow"],
    ]) {
      let node = document.querySelector(selector);
      const created = !node;
      if (!node) {
        node = document.createElement("meta");
        const match = selector.match(/\[(name|property)="([^"]+)"\]/)!;
        node.setAttribute(match[1], match[2]);
        document.head.appendChild(node);
      }
      saved.push({ node, old: node.getAttribute("content"), created });
      node.setAttribute("content", value);
    }
    return () => {
      document.title = oldTitle;
      saved.forEach(({ node, old, created }) => {
        if (created) node.remove();
        else if (old === null) node.removeAttribute("content");
        else node.setAttribute("content", old);
      });
    };
  }, [title, description]);
}

export default function RecoverAccount({reset=false}:{reset?:boolean}) {
  useRecoveryLanguage();
  const { lang } = useLang();
  const copy = recoveryCopy(lang);
  const { refreshUser, recoverAccess, recoveryAccessPending, authError, loading } = useAuth();
  const search = useSearch();
  const next = recoveryReturnPath(search);
  const signIn = next?.startsWith("/lite") ? "/lite/login" : `/login${next ? `?${new URLSearchParams({ next })}` : ""}`;
  const [identifier,setIdentifier]=useState('');
  const [birthDate,setBirthDate]=useState('');
  const [config, setConfig] = useState<RecoveryConfig | null>(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [attempt, setAttempt] = useState(0);
  useRecoveryMetadata(copy.title, copy.intro);
  useEffect(() => {
    const controller = new AbortController();
    setConfig(null);
    setError("");
    void recoveryRequest<RecoveryConfig>("config", undefined, controller.signal)
      .then(data => { if (!controller.signal.aborted) setConfig(data); })
      .catch(err => { if (!controller.signal.aborted) setError(recoveryErrorText(err, copy)); });
    return () => controller.abort();
  }, [attempt, lang]);
  return <div className="mx-auto max-w-lg p-4 py-8" dir={lang === "ar" ? "rtl" : "ltr"}>
    <Card className="bg-card/50 border-primary/20">
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><ShieldCheck className="h-5 w-5 text-primary" />{copy.title}</CardTitle>
        <CardDescription>{copy.intro}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {reset&&<section className="space-y-3">
          <h1>استرجاع كلمة السر / Reset password</h1>
          <label className="block">البريد أو اسم اللاعب / Email or player name<input className="block w-full bg-background p-2" autoComplete="username" value={identifier} onChange={e=>setIdentifier(e.target.value)} /></label>
          <label className="block">تاريخ الميلاد / Date of birth<input className="block w-full bg-background p-2" type="date" value={birthDate} onChange={e=>setBirthDate(e.target.value)} /></label>
          <p>هاد المعلومات للمساعدة فقط وماشي إثبات ملكية. الاسترجاع كيحتاج الهاتف الموثّق مسبقاً ورمز Firebase SMS. ما كاينش إرسال Email/Twilio مهيّأ، وجدول email_verification_codes ما تبدّلش. ما غاديش نكشف وجود بريد أو تاريخ ميلاد حساب للزوار.</p>
        </section>}

        {success || recoveryAccessPending ? <>
          <p role="status" className="rounded-md border border-primary/30 bg-primary/10 p-3 text-sm" data-testid="status-recovery-access-success">{copy.accessSuccess}</p>
          {authError && <p role="alert" className="text-sm text-destructive">{copy.accessRefreshFailed}</p>}
          <Button variant="outline" disabled={loading} onClick={() => void refreshUser()} data-testid="button-recovery-session-retry">{copy.retrySession}</Button>
        </> :
          error ? <>
            <p role="alert" className="text-sm text-destructive" data-testid="status-recovery-config-error">{error}</p>
            <Button variant="outline" onClick={() => setAttempt(value => value + 1)} data-testid="button-recovery-config-retry">{copy.retry}</Button>
          </> : !config ? <p role="status" data-testid="status-recovery-config-loading">{copy.loading}</p> :
            !config.configured || !config.firebaseConfig ? <p role="alert" className="text-sm text-destructive" data-testid="status-recovery-config-unavailable">{copy.unavailable}</p> :
              <PhoneRecoveryFlow action={reset?"reset":"access"} config={config.firebaseConfig} lang={lang} onAccess={idToken => recoverAccess(idToken, next ?? "/social")} onSuccess={() => {
                setSuccess(true);
                // Only check the committed cookie now. Never reuse the SMS
                // proof or return to a new-SMS form if this check is offline.
                void refreshUser();
              }} />}
        <Link href={recoveryRoute("/recover-with-code", next, lang)} className="block text-sm text-primary hover:underline" data-testid="link-recover-account-with-code">{offlineRecoveryCopy(lang).link}</Link>
        <div className="flex flex-wrap gap-4">
          <a href={`${import.meta.env.BASE_URL.replace(/\/$/, "")}${signIn}`} className="text-sm text-primary hover:underline" data-testid="link-recovery-sign-in">{copy.signIn}</a>
          {next && <a href={`${import.meta.env.BASE_URL.replace(/\/$/, "")}${next}`} className="text-sm text-muted-foreground hover:underline" data-testid="link-recovery-return">{copy.back}</a>}
        </div>
      </CardContent>
    </Card>
  </div>;
}
