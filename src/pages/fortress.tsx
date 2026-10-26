import { useAuth } from "@/contexts/AuthContext";
import { useLocation } from "wouter";
import { Button } from "@workspace/gdna-ds/components/ui/button";
import BotPanel from "@/components/BotPanel";
import { useLang } from "@/contexts/LangContext";
import { contentCopy } from "@/i18n/content-discovery-copy";
import { finalLabelText } from "@/i18n/final-labels-copy";

export default function FortressPage() {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const { lang } = useLang();
  const t = (key: Parameters<typeof contentCopy>[1]) => contentCopy(lang, key);

  if (!user) {
    return (
      <main dir={lang === "ar" ? "rtl" : "ltr"} className="mx-auto flex min-h-[70vh] max-w-xl flex-col items-center justify-center gap-5 px-6 text-center">
        <span className="text-6xl">🏰</span>
        <h1 className="text-3xl font-black">GDN-SMART {finalLabelText(lang, "fortress")}</h1>
        <p className="text-muted-foreground">{t("fortressLogin")}</p>
        <Button onClick={() => navigate("/login")}>{t("signIn")}</Button>
      </main>
    );
  }

  return (
    <main dir={lang === "ar" ? "rtl" : "ltr"} className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      <header className="mb-8 rounded-2xl border border-primary/25 bg-card p-6 sm:p-8">
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-4xl">🏰</span>
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.24em] text-primary">{t("empireIntelligence")}</p>
            <h1 className="mt-1 text-3xl font-black tracking-tight sm:text-4xl">GDN-SMART {finalLabelText(lang, "fortress")}</h1>
          </div>
        </div>
        <p className="mt-4 max-w-3xl text-muted-foreground">
          {t("fortressIntro")}
        </p>
      </header>
      <BotPanel />
    </main>
  );
}