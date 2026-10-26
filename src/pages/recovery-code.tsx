import { Link, useSearch } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@workspace/gdna-ds/components/ui/card";
import { Skeleton } from "@workspace/gdna-ds/components/ui/skeleton";
import { useAuth } from "@/contexts/AuthContext";
import { useLang } from "@/contexts/LangContext";
import { offlineRecoveryCopy } from "@/i18n/offline-recovery-copy";
import { recoveryReturnPath, recoveryRoute } from "@/lib/recovery-links";
import { RecoveryCodeSettings } from "@/components/auth/recovery-code-settings";
import { useRecoveryLanguage, useRecoveryMetadata } from "./recover-account";

export default function RecoveryCodePage() {
  useRecoveryLanguage();
  const { user, loading } = useAuth();
  const { lang } = useLang();
  const copy = offlineRecoveryCopy(lang);
  const next = recoveryReturnPath(useSearch());
  const route = recoveryRoute("/recovery-code", next, lang);
  useRecoveryMetadata(copy.title, copy.intro);
  return <main className="mx-auto min-h-[100dvh] max-w-lg space-y-4 p-4 py-8" dir={lang === "ar" ? "rtl" : "ltr"}>
    {loading ? <div className="space-y-3" role="status" aria-label={copy.loading}><Skeleton className="h-8 w-2/3" /><Skeleton className="h-40 w-full" /></div>
      : user ? <RecoveryCodeSettings key={user.id} />
      : <Card className="bg-card/50 border-primary/20">
        <CardHeader><CardTitle className="text-lg">{copy.title}</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <p>{copy.authRequired}</p>
          <Link href={`/login?${new URLSearchParams({ next: route })}`} className="inline-block text-primary hover:underline" data-testid="link-recovery-code-login">{copy.signIn}</Link>
        </CardContent>
      </Card>}
    <a href={`${import.meta.env.BASE_URL.replace(/\/$/, "")}${next ?? "/dashboard"}`} className="inline-block text-sm text-primary hover:underline" data-testid="link-recovery-code-return">{copy.back}</a>
  </main>;
}
