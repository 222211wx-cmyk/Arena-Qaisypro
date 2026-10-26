/**
 * GEO-BLOCK SCREEN
 * Shown when user's country is in the BLOCKED list.
 * /login and /register are exempted — users can still create an account
 * even from a restricted country (they may be using a VPN or traveling).
 */
import { motion } from "framer-motion";
import { useLocation } from "wouter";
import { useLegal } from "@/contexts/LegalContext";
import { useLang } from "@/contexts/LangContext";

// These paths are always accessible, even for blocked countries
const FREE_PATHS = ["/login", "/register", "/legal"];

const T = {
  title: {
    en: "Access Not Available",
    ar: "الوصول غير متاح",
    fr: "Accès Non Disponible",
    es: "Acceso No Disponible",
    de: "Zugang Nicht Verfügbar",
  },
  subtitle: {
    en: "Arena Qaisypro is not available in your country",
    ar: "Arena Qaisypro غير متاحة في بلدك",
    fr: "Arena Qaisypro n'est pas disponible dans votre pays",
    es: "Arena Qaisypro no está disponible en tu país",
    de: "Arena Qaisypro ist in Ihrem Land nicht verfügbar",
  },
  reason: {
    en: "Due to international regulations, sanctions, or local law, we are unable to provide access to this platform in your jurisdiction.",
    ar: "بسبب اللوائح الدولية أو العقوبات أو القانون المحلي، لا يمكننا توفير الوصول إلى هذه المنصة في نطاق ولايتك القضائية.",
    fr: "En raison des réglementations internationales, des sanctions ou de la loi locale, nous ne pouvons pas fournir l'accès à cette plateforme dans votre juridiction.",
    es: "Debido a regulaciones internacionales, sanciones o leyes locales, no podemos proporcionar acceso a esta plataforma en su jurisdicción.",
    de: "Aufgrund internationaler Vorschriften, Sanktionen oder lokaler Gesetze können wir in Ihrer Rechtsordnung keinen Zugang zu dieser Plattform gewähren.",
  },
  code: {
    en: "Error Code: GEO-403 — JURISDICTION RESTRICTED",
    ar: "رمز الخطأ: GEO-403 — النطاق القانوني مقيّد",
    fr: "Code Erreur: GEO-403 — JURIDICTION RESTREINTE",
    es: "Código de Error: GEO-403 — JURISDICCIÓN RESTRINGIDA",
    de: "Fehlercode: GEO-403 — JURISDIKTION GESPERRT",
  },
  loginNote: {
    en: "If you believe this is an error, you may still",
    ar: "إذا كنت تعتقد أن هذا خطأ، يمكنك دائماً",
    fr: "Si vous pensez qu'il s'agit d'une erreur, vous pouvez",
    es: "Si crees que esto es un error, aún puedes",
    de: "Falls Sie glauben, dass dies ein Fehler ist, können Sie",
  },
  loginLink: {
    en: "log in to your account",
    ar: "تسجيل الدخول إلى حسابك",
    fr: "vous connecter à votre compte",
    es: "iniciar sesión en tu cuenta",
    de: "sich in Ihr Konto einloggen",
  },
};

export default function GeoBlock() {
  const { geoData } = useLegal();
  const { lang } = useLang();
  const [location] = useLocation();
  const isRTL = lang === "ar";

  // Always allow login / register / legal even for blocked countries
  const isFree = FREE_PATHS.some(p => location === p || location.startsWith(p + "/"));
  if (isFree) return null;

  if (!geoData || geoData.restriction !== "blocked") return null;

  const t = (k: keyof typeof T) =>
    (T[k] as Record<string, string>)[lang] ?? (T[k] as Record<string, string>)["en"];

  return (
    <div
      dir={isRTL ? "rtl" : "ltr"}
      className="fixed inset-0 z-[300] bg-background flex items-center justify-center px-4"
    >
      {/* Animated red scan line */}
      <motion.div
        animate={{ top: ["0%", "100%"] }}
        transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
        className="absolute left-0 right-0 h-px bg-destructive/30 z-10"
        style={{ position: "absolute" }}
      />

      <motion.div
        initial={{ scale: 0.85, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.5 }}
        className="max-w-lg w-full text-center"
      >
        {/* Icon */}
        <motion.div
          animate={{ opacity: [0.4, 1, 0.4] }}
          transition={{ duration: 1.5, repeat: Infinity }}
          className="text-destructive text-7xl mb-6 font-black"
        >
          ⊗
        </motion.div>

        {/* Country flag + code */}
        <div className="text-4xl mb-2">{getFlagEmoji(geoData.countryCode)}</div>
        <div className="text-muted-foreground text-xs tracking-[0.4em] mb-4 font-mono">
          {geoData.country?.toUpperCase()} — {geoData.countryCode}
        </div>

        <h1 className="text-4xl font-black text-foreground mb-2">{t("title")}</h1>
        <h2 className="text-destructive text-base font-semibold mb-6">{t("subtitle")}</h2>

        <p className="text-muted-foreground text-sm leading-relaxed mb-8 max-w-md mx-auto">
          {t("reason")}
        </p>

        {/* Message from geo API */}
        {geoData.message && (
          <div className="border border-destructive/40 bg-destructive/10 rounded-xl px-5 py-3 mb-6">
            <p className="text-destructive/70 text-xs leading-relaxed">{geoData.message}</p>
          </div>
        )}

        {/* Laws */}
        {geoData.laws?.length > 0 && (
          <div className="flex justify-center gap-2 flex-wrap mb-6">
            {geoData.laws.map((law: string) => (
              <span key={law} className="bg-card border border-border text-muted-foreground text-xs px-3 py-1 rounded-full">
                {law}
              </span>
            ))}
          </div>
        )}

        {/* Login shortcut — always available */}
        <p className="text-muted-foreground text-xs mb-4">
          {t("loginNote")}{" "}
          <a href="/login" className="text-muted-foreground hover:text-foreground underline transition-colors">
            {t("loginLink")}
          </a>
          .
        </p>

        {/* Error code */}
        <p className="text-muted-foreground text-xs font-mono tracking-widest">{t("code")}</p>
      </motion.div>
    </div>
  );
}

function getFlagEmoji(code: string): string {
  const flags: Record<string, string> = {
    KP: "🇰🇵", IR: "🇮🇷", CU: "🇨🇺", SY: "🇸🇾",
    SD: "🇸🇩", MM: "🇲🇲", AF: "🇦🇫",
  };
  return flags[code] ?? "🚫";
}
