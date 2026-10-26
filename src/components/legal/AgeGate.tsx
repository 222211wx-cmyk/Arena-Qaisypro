/** Games-only 18+ gate. Every non-game section remains open to all ages. */
import { useState } from "react";
import { motion } from "framer-motion";
import { useLocation } from "wouter";
import { useLegal } from "@/contexts/LegalContext";
import { useLang } from "@/contexts/LangContext";
import type { Lang } from "@/contexts/LangContext";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@workspace/gdna-ds/components/ui/button";
import { Input } from "@workspace/gdna-ds/components/ui/input";
import { Label } from "@workspace/gdna-ds/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@workspace/gdna-ds/components/ui/card";
import { sharedCopy } from "@/i18n/shared-components-copy";

type AgeGateCopyKey =
  | "title"
  | "body"
  | "dateLabel"
  | "save"
  | "denied"
  | "loginHint"
  | "loginLink"
  | "registerHint"
  | "registerLink"
  | "back"
  | "verificationFailed";

const AGE_GATE_COPY = {
  title: {
    en: "Games are 18+",
    fr: "Jeux réservés aux 18+",
    ar: "قسم الألعاب +18",
    es: "Juegos solo para mayores de 18",
    de: "Spiele ab 18",
  },
  body: {
    en: "This section requires 18+ under the laws of your country.",
    fr: "Cette section est réservée aux 18+ selon les lois de votre pays.",
    ar: "هذا القسم يتطلب +18 حسب قوانين بلدك",
    es: "Esta sección requiere ser mayor de 18 años según las leyes de tu país.",
    de: "Dieser Bereich ist gemäß den Gesetzen deines Landes erst ab 18 Jahren zugänglich.",
  },
  dateLabel: {
    en: "Enter your date of birth once",
    fr: "Saisissez votre date de naissance une seule fois",
    ar: "أدخل تاريخ ميلادك لمرة واحدة",
    es: "Introduce tu fecha de nacimiento una vez",
    de: "Geburtsdatum einmalig eingeben",
  },
  save: {
    en: "Verify age",
    fr: "Vérifier l'âge",
    ar: "تحقق من العمر",
    es: "Verificar edad",
    de: "Alter bestätigen",
  },
  denied: {
    en: "Access to Games is blocked for users under 18. All other sections remain available.",
    fr: "L'accès aux Jeux est bloqué aux moins de 18 ans. Toutes les autres sections restent accessibles.",
    ar: "تم منع الدخول إلى الألعاب لمن هم أقل من 18 سنة. باقي الأقسام متاحة لك.",
    es: "El acceso a Juegos está bloqueado para menores de 18 años. Las demás secciones siguen disponibles.",
    de: "Der Zugang zu den Spielen ist für Personen unter 18 Jahren gesperrt. Alle anderen Bereiche bleiben verfügbar.",
  },
  loginHint: {
    en: "Already have an account?",
    fr: "Vous avez déjà un compte ?",
    ar: "هل لديك حساب بالفعل؟",
    es: "¿Ya tienes una cuenta?",
    de: "Du hast bereits ein Konto?",
  },
  loginLink: {
    en: "Log in",
    fr: "Se connecter",
    ar: "تسجيل الدخول",
    es: "Iniciar sesión",
    de: "Anmelden",
  },
  registerHint: {
    en: "New here?",
    fr: "Nouveau ici ?",
    ar: "جديد هنا؟",
    es: "¿Nuevo aquí?",
    de: "Neu hier?",
  },
  registerLink: {
    en: "Create account",
    fr: "Créer un compte",
    ar: "إنشاء حساب",
    es: "Crear cuenta",
    de: "Konto erstellen",
  },
  back: {
    en: "Back to the Empire",
    fr: "Retour à l'Empire",
    ar: "الرجوع إلى الإمبراطورية",
    es: "Volver al Imperio",
    de: "Zurück zum Imperium",
  },
  verificationFailed: {
    en: "Age verification failed. Please try again.",
    fr: "La vérification de l’âge a échoué. Veuillez réessayer.",
    ar: "فشل التحقق من العمر. يُرجى المحاولة مرة أخرى.",
    es: "No se pudo verificar la edad. Inténtalo de nuevo.",
    de: "Die Altersüberprüfung ist fehlgeschlagen. Bitte versuche es erneut.",
  },
} satisfies Record<AgeGateCopyKey, Record<Lang, string>>;

export default function AgeGate({ active }: { active?: boolean }) {
  const { country } = useLegal();
  const { user, loading, refreshUser } = useAuth();
  const { lang } = useLang();
  const [location, setLocation] = useLocation();
  const [birthDate, setBirthDate] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const isRTL = lang === "ar";
  const coinsNotice = sharedCopy(lang).coins.text;

  const isXpOnlyGame = location === "/games/penalty-king";
  const isActiveGame = active ?? (location.startsWith("/games/") && !isXpOnlyGame);
  if (!isActiveGame || (!loading && user?.isAdult === true)) return null;

  const t = (key: AgeGateCopyKey): string => AGE_GATE_COPY[key][lang];

  const saveBirthDate = async () => {
    setError("");
    setSaving(true);
    try {
      const response = await fetch("/api/auth/birth-date", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ birthDate }),
      });
      const data: { error?: unknown } | null = await response.json().catch(() => null);
      if (!response.ok) {
        setError(typeof data?.error === "string" ? data.error : t("verificationFailed"));
        return;
      }
      if (!data) {
        setError(t("verificationFailed"));
        return;
      }
      await refreshUser();
    } catch {
      setError(t("verificationFailed"));
    } finally {
      setSaving(false);
    }
  };

  const isDenied = user?.isAdult === false;

  return (
    <div
      dir={isRTL ? "rtl" : "ltr"}
      className="fixed inset-0 z-[200] bg-background/95 backdrop-blur-md flex items-center justify-center px-4"
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="max-w-md w-full"
      >
        <Card className="border-primary/30 bg-card text-center">
          <CardHeader>
            <div className="text-5xl">{country.flag}</div>
            <CardTitle className="text-2xl font-black">{t("title")}</CardTitle>
            <p className="text-primary font-bold">{t("body")}</p>
          </CardHeader>
          <CardContent className="space-y-5">
            <p className="rounded-lg border border-orange-500/30 bg-orange-950/40 px-3 py-2 text-xs leading-relaxed text-orange-300">
              {coinsNotice}
            </p>
            {loading ? (
              <p className="text-muted-foreground text-sm">...</p>
            ) : isDenied ? (
              <>
                <p className="text-destructive text-sm leading-relaxed">{t("denied")}</p>
                <Button className="w-full" onClick={() => setLocation("/")}>{t("back")}</Button>
              </>
            ) : !user ? (
              <>
                <div className="flex flex-col gap-3">
                  <Button onClick={() => setLocation("/login")}>{t("loginLink")}</Button>
                  <Button variant="outline" onClick={() => setLocation("/register")}>{t("registerLink")}</Button>
                  <Button variant="ghost" onClick={() => setLocation("/")}>{t("back")}</Button>
                </div>
              </>
            ) : (
              <>
                <div className="space-y-2 text-start">
                  <Label htmlFor="games-birth-date">{t("dateLabel")}</Label>
                  <Input
                    id="games-birth-date"
                    type="date"
                    value={birthDate}
                    max={new Date().toISOString().slice(0, 10)}
                    onChange={(event) => setBirthDate(event.target.value)}
                    data-testid="games-birth-date"
                  />
                </div>
                {error && <p className="text-destructive text-sm">{error}</p>}
                <Button className="w-full" disabled={!birthDate || saving} onClick={saveBirthDate}>
                  {saving ? "..." : t("save")}
                </Button>
                <Button className="w-full" variant="ghost" onClick={() => setLocation("/")}>{t("back")}</Button>
              </>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
