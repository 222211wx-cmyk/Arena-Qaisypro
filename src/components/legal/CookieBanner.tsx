import { motion, AnimatePresence } from "framer-motion";
import { useLegal } from "@/contexts/LegalContext";
import { useLang } from "@/contexts/LangContext";
import { Link } from "wouter";

export default function CookieBanner() {
  const { showCookieBanner, setConsent, country } = useLegal();
  const { lang } = useLang();
  const isRTL = lang === "ar";

  const T = {
    title:   { en:"🍪 Cookie Consent", ar:"🍪 موافقة الكوكيز", fr:"🍪 Consentement aux cookies", es:"🍪 Consentimiento de cookies", de:"🍪 Cookie-Einwilligung" },
    body:    { en:`This platform uses cookies to improve your experience. Under ${country.laws.slice(0,2).join(" & ")}, you have the right to choose.`, ar:`هذه المنصة تستخدم كوكيز. بموجب ${country.laws.slice(0,2).join(" و")}، لك الحق في الاختيار.`, fr:`Cette plateforme utilise des cookies. Selon ${country.laws.slice(0,2).join(" & ")}, vous avez le droit de choisir.`, es:`Esta plataforma usa cookies. Según ${country.laws.slice(0,2).join(" & ")}, tienes derecho a elegir.`, de:`Diese Plattform verwendet Cookies. Gemäß ${country.laws.slice(0,2).join(" & ")} haben Sie das Recht zu wählen.` },
    accept:  { en:"Accept All", ar:"قبول الكل", fr:"Tout accepter", es:"Aceptar todo", de:"Alle akzeptieren" },
    essential:{ en:"Essential Only", ar:"الضروري فقط", fr:"Essentiel seulement", es:"Solo esenciales", de:"Nur essenziell" },
    reject:  { en:"Reject All", ar:"رفض الكل", fr:"Tout refuser", es:"Rechazar todo", de:"Alle ablehnen" },
    policy:  { en:"Privacy Policy", ar:"سياسة الخصوصية", fr:"Politique de confidentialité", es:"Política de privacidad", de:"Datenschutzerklärung" },
  };

  const t = (k: keyof typeof T) => T[k][lang as keyof typeof T[typeof k]] ?? T[k]["en"];

  return (
    <AnimatePresence>
      {showCookieBanner && (
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
          dir={isRTL ? "rtl" : "ltr"}
          className="fixed bottom-0 left-0 right-0 z-50 bg-card border-t border-yellow-500/30 px-6 py-4 shadow-2xl"
        >
          <div className="max-w-5xl mx-auto flex flex-col md:flex-row items-start md:items-center gap-4">
            <div className="flex-1">
              <p className="text-foreground font-semibold text-sm">{t("title")}</p>
              <p className="text-muted-foreground text-xs mt-1 leading-relaxed">{t("body")}{" "}
                <Link href="/legal" className="text-yellow-400 underline">{t("policy")}</Link>
              </p>
            </div>
            <div className="flex flex-wrap gap-2 flex-shrink-0">
              <button
                onClick={() => setConsent("full")}
                className="bg-yellow-500 text-black text-xs font-bold px-4 py-2 rounded-lg hover:bg-yellow-400 transition-all"
              >
                {t("accept")}
              </button>
              <button
                onClick={() => setConsent("essential")}
                className="bg-secondary text-foreground text-xs font-bold px-4 py-2 rounded-lg hover:bg-muted transition-all"
              >
                {t("essential")}
              </button>
              <button
                onClick={() => setConsent("essential")}
                className="border border-border text-muted-foreground text-xs font-bold px-4 py-2 rounded-lg hover:border-muted-foreground transition-all"
              >
                {t("reject")}
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
