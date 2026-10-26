import { Link, useSearch } from "wouter";
import { useAuth } from "@/contexts/AuthContext";
import { useLang } from "@/contexts/LangContext";
import { recoveryCopy } from "@/i18n/recovery-copy";
import { recoveryReturnPath, recoveryRoute } from "@/lib/recovery-links";
import { RecoveryPhoneSettings } from "@/components/auth/recovery-phone-settings";
import { useRecoveryLanguage, useRecoveryMetadata } from "./recover-account";

export default function RecoveryPhone() {
  useRecoveryLanguage();
  const { user } = useAuth();
  const { lang } = useLang();
  const copy = recoveryCopy(lang);
  const next = recoveryReturnPath(useSearch());
  const route = recoveryRoute("/recovery-phone", next, lang);
  useRecoveryMetadata(copy.phoneTitle, copy.optIn);
  return <div className="mx-auto max-w-lg space-y-4 p-4 py-8" dir={lang === "ar" ? "rtl" : "ltr"}>
    {user ? <RecoveryPhoneSettings key={user.id} /> : <div className="rounded-md border border-primary/20 bg-card p-6 space-y-4">
      <h1 className="text-lg font-semibold">{copy.phoneTitle}</h1>
      <p>{copy.authRequired}</p>
      <Link href={`/login?${new URLSearchParams({ next: route })}`} className="text-primary hover:underline" data-testid="link-recovery-phone-login">{copy.signIn}</Link>
    </div>}
    <a href={`${import.meta.env.BASE_URL.replace(/\/$/, "")}${next ?? "/dashboard"}`} className="inline-block text-sm text-primary hover:underline" data-testid="link-recovery-phone-return">{copy.back}</a>
  </div>;
}