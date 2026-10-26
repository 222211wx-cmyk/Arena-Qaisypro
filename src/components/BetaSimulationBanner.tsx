import { Alert, AlertDescription } from "@workspace/gdna-ds/components/ui/alert";
import { useLang } from "@/contexts/LangContext";

export function BetaSimulationBanner() {
  const { lang } = useLang();
  const text = {
    en: "This is a beta version. Payments are simulated.",
    fr: "Ceci est une version bêta. Les paiements sont simulés.",
    ar: "هذه نسخة تجريبية. المدفوعات محاكاة.",
    es: "Esta es una versión beta. Los pagos son simulados.",
    de: "Dies ist eine Betaversion. Zahlungen werden nur simuliert.",
  }[lang];
  return (
    <Alert
      className="rounded-none border-x-0 border-t-0 border-primary/30 bg-primary/10 py-2 text-primary"
      data-testid="banner-public-beta"
    >
      <AlertDescription className="text-center text-xs font-bold tracking-wide sm:text-sm" dir={lang === "ar" ? "rtl" : "ltr"}>
        {text}
      </AlertDescription>
    </Alert>
  );
}