import { Alert, AlertDescription, AlertTitle } from "@workspace/gdna-ds/components/ui/alert";
import { useLang } from "@/contexts/LangContext";
import { AlertTriangle } from "lucide-react";

const GAMING_WARNING: Record<string, { title: string; description: string }> = {
  en: {
    title: "Gaming notice",
    description: "This game requires 18+ under the laws of your country.",
  },
  ar: {
    title: "تنبيه اللعب",
    description: "هذه اللعبة تتطلب +18 حسب قوانين بلدك.",
  },
  fr: {
    title: "Avertissement de jeu",
    description: "Ce jeu est réservé aux 18+ selon les lois de votre pays.",
  },
  es: {
    title: "Aviso de juego",
    description: "Este juego requiere ser mayor de 18 años según las leyes de tu país.",
  },
  de: {
    title: "Spielhinweis",
    description: "Dieses Spiel ist gemäß den Gesetzen Ihres Landes nur für Personen ab 18 Jahren zugänglich.",
  },
};

export default function GameWarning() {
  const { lang } = useLang();
  const warning = GAMING_WARNING[lang] ?? GAMING_WARNING.en;

  return (
    <Alert variant="destructive" dir={lang === "ar" ? "rtl" : "ltr"}>
      <AlertTriangle className="h-4 w-4" />
      <AlertTitle>{warning.title}</AlertTitle>
      <AlertDescription>{warning.description}</AlertDescription>
    </Alert>
  );
}