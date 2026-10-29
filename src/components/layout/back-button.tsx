import { useEffect } from "react";
import { useLocation } from "wouter";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { Button } from "@workspace/gdna-ds/components/ui/button";
import { useLang } from "@/contexts/LangContext";
import { closeBackLayer, navigateForward, navigationDepth, trackAppHistory } from "@/lib/back-navigation";

export function BackButton() {
  const [, navigate] = useLocation();
  const { lang } = useLang();
  useEffect(trackAppHistory, []);
  const label = ({ ar: "رجوع", en: "Back", fr: "Retour", es: "Volver", de: "Zurück" } as Record<string, string>)[lang] ?? "Back";
  const forwardLabel = ({ ar: "أمام", en: "Forward", fr: "Suivant", es: "Adelante", de: "Vorwärts" } as Record<string, string>)[lang] ?? "Forward";
  const BackIcon = lang === "ar" ? ArrowRight : ArrowLeft;
  const ForwardIcon = lang === "ar" ? ArrowLeft : ArrowRight;
  return (
    <nav dir={lang === "ar" ? "rtl" : "ltr"} aria-label={`${label} / ${forwardLabel}`}
      className="arena-history flex shrink-0 items-center gap-1 bg-background">
    <Button
      type="button"
      variant="outline"
      size="sm"
      className="gap-2"
      aria-label={label}
      title={label}
      onClick={() => {
        if (closeBackLayer()) return;
        if (navigationDepth() > 0) history.back();
        else navigate("/", { replace: true });
      }}
    >
      <BackIcon className="h-4 w-4" aria-hidden="true" />
      <span>{label}</span>
    </Button>
    <Button type="button" variant="outline" size="sm" className="gap-2"
      aria-label={forwardLabel} title={forwardLabel} onClick={navigateForward}>
      <ForwardIcon className="h-4 w-4" aria-hidden="true" />
      <span>{forwardLabel}</span>
    </Button>
    </nav>
  );
}