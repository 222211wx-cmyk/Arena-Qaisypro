import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useLegal, COUNTRIES, type CountryProfile } from "@/contexts/LegalContext";
import { useLang } from "@/contexts/LangContext";
import { task39Text } from "@/i18n/task39";
import { legalText } from "@/i18n/community-admin-surfaces-copy";
import { LIFE_PATH_TERMS } from "@/i18n/life-path-terms";

type Tab = "country" | "terms" | "privacy" | "cookies" | "rights";

const COIN_DISCLAIMER = {
  en: "⚠️ Arena Qaisypro coins are virtual in-platform credits with no real-world monetary value. They cannot be exchanged for fiat currency, cryptocurrency, or any real-world asset. Coin balances do not constitute financial instruments under any jurisdiction.",
  ar: "⚠️ كوينز Arena Qaisypro هي رصيد افتراضي داخل المنصة ليس له أي قيمة نقدية حقيقية. لا يمكن تحويلها إلى عملات ورقية أو رقمية أو أي أصول حقيقية. أرصدة الكوينز لا تُشكّل أدوات مالية بأي قانون.",
  fr: "⚠️ Les coins Arena Qaisypro sont des crédits virtuels sans valeur monétaire réelle. Ils ne peuvent pas être échangés contre des devises ou des crypto-monnaies. Les soldes ne constituent pas des instruments financiers.",
  es: "⚠️ Las monedas de Arena Qaisypro son créditos virtuales sin valor monetario real. No se pueden canjear por moneda fiduciaria ni criptomonedas. Los saldos no constituyen instrumentos financieros.",
  de: "⚠️ Arena Qaisypro Coins sind virtuelle Guthaben innerhalb der Plattform und haben keinen realen Geldwert. Sie können weder in gesetzliche Zahlungsmittel oder Kryptowährungen noch in reale Vermögenswerte umgetauscht werden. Coin-Guthaben stellen in keiner Rechtsordnung Finanzinstrumente dar.",
};

const LEGAL_CENTER_BADGE = {
  en: "LEGAL CENTER",
  fr: "CENTRE JURIDIQUE",
  ar: "المركز القانوني",
  es: "CENTRO LEGAL",
  de: "RECHTSCENTER",
};

const GERMAN_LEGAL_TEXT: Record<string, string> = {
  "Your Country": "Ihr Land",
  "Terms": "Nutzungsbedingungen",
  "Privacy": "Datenschutz",
  "Cookies": "Cookies",
  "Your Rights": "Ihre Rechte",
  "Legal Center": "Rechtscenter",
  "Country-adaptive compliance — full transparency": "Länderspezifische Rechtskonformität — volle Transparenz",
  "Select your country to apply the correct legal framework automatically:": "Wählen Sie Ihr Land aus, damit automatisch der richtige Rechtsrahmen angewendet wird:",
  "Search your country...": "Land suchen …",
  "Active Legal Framework": "Aktiver Rechtsrahmen",
  "Games Minimum Age": "Mindestalter für Spiele",
  "Cookie Consent": "Cookie-Einwilligung",
  "Required": "Erforderlich",
  "Optional": "Optional",
  "Gaming Warning": "Spielhinweis",
  "Active": "Aktiv",
  "None": "Keine",
  "Coins Disclaimer": "Hinweis zu Coins",
  "Applicable laws:": "Anwendbare Rechtsvorschriften:",
  "Terms of Service": "Nutzungsbedingungen",
  "Acceptance": "Annahme",
  "By accessing Arena Qaisypro, you agree to these Terms. If you do not agree, please do not use the platform.": "Mit dem Zugriff auf Arena Qaisypro erklären Sie sich mit diesen Nutzungsbedingungen einverstanden. Wenn Sie ihnen nicht zustimmen, nutzen Sie die Plattform bitte nicht.",
  "Eligibility": "Nutzungsberechtigung",
  "The platform is open to all ages. Only the Games section requires users to be 18+ under local law.": "Die Plattform steht Personen jeden Alters offen. Nur für den Spielebereich müssen Nutzer nach Maßgabe des örtlichen Rechts mindestens 18 Jahre alt sein.",
  "Virtual Currency": "Virtuelle Währung",
  "Content": "Inhalte",
  "Content you post remains yours. You grant us a license to display it on the platform. We reserve the right to remove content that violates laws or these Terms.": "Von Ihnen veröffentlichte Inhalte bleiben Ihr Eigentum. Sie räumen uns eine Lizenz ein, diese auf der Plattform anzuzeigen. Wir behalten uns vor, Inhalte zu entfernen, die gegen geltendes Recht oder diese Nutzungsbedingungen verstoßen.",
  "Disclaimer": "Haftungsausschluss",
  'The platform is provided "as is" without warranties. We are not liable for any losses arising from use of the platform.': "Die Plattform wird ohne Mängelgewähr und ohne Garantien im gegenwärtigen Zustand bereitgestellt. Wir haften nicht für Verluste, die aus der Nutzung der Plattform entstehen.",
  "Governing Law": "Anwendbares Recht",
  "Privacy Policy": "Datenschutzerklärung",
  "Data We Collect": "Von uns erhobene Daten",
  "We collect: username, email, platform activity (games, votes, posts), device data, and browser language.": "Wir erheben folgende Daten: Benutzername, E-Mail-Adresse, Aktivitäten auf der Plattform (Spiele, Abstimmungen und Beiträge), Gerätedaten und Browsersprache.",
  "How We Use Your Data": "Wie wir Ihre Daten verwenden",
  "We use your data to operate the service, improve experience, prevent fraud, and comply with law. We never sell your data.": "Wir verwenden Ihre Daten, um den Dienst zu betreiben, das Nutzungserlebnis zu verbessern, Betrug zu verhindern und gesetzliche Pflichten zu erfüllen. Wir verkaufen Ihre Daten niemals.",
  "Data Retention": "Speicherdauer",
  "We retain your data while your account is active. Upon account deletion, your data is removed within 30 days.": "Wir speichern Ihre Daten, solange Ihr Konto aktiv ist. Nach der Löschung Ihres Kontos werden Ihre Daten innerhalb von 30 Tagen entfernt.",
  "AI Processing": "KI-Verarbeitung",
  "The platform uses OpenAI for content moderation and AI features. Data sent to OpenAI is subject to OpenAI's privacy policy.": "Die Plattform nutzt OpenAI zur Moderation von Inhalten und für KI-Funktionen. Für an OpenAI übermittelte Daten gilt die Datenschutzerklärung von OpenAI.",
  "Cookie Policy": "Cookie-Richtlinie",
  "Essential": "Erforderlich",
  "Login session": "Anmeldesitzung",
  "Language preference": "Spracheinstellung",
  "Legal compliance setup": "Einrichtung zur Einhaltung rechtlicher Vorgaben",
  "Consent tracking": "Dokumentation der Einwilligung",
  "Games age verification": "Altersprüfung für Spiele",
  "Analytics": "Analyse",
  "Performance improvement": "Leistungsverbesserung",
  "Can reject": "Ablehnbar",
  "Manage Your Consent": "Einwilligung verwalten",
  "Accept All": "Alle akzeptieren",
  "Essential Only": "Nur erforderliche",
  "Reject All": "Alle ablehnen",
};

export default function LegalPage() {
  const { country, setCountry, consent, setConsent, ageVerified, setAgeVerified } = useLegal();
  const { lang } = useLang();
  const isRTL = lang === "ar";
  const lt = (english: string) => {
    const german = GERMAN_LEGAL_TEXT[english];
    if (!german) throw new Error(`Fehlende deutsche Übersetzung im Rechtscenter: ${english}`);
    return {
      en: legalText("en", english),
      fr: legalText("fr", english),
      ar: legalText("ar", english),
      es: legalText("es", english),
      de: german,
    }[lang];
  };
  const [tab, setTab] = useState<Tab>(() =>
    new URLSearchParams(window.location.search).get("tab") === "terms" ? "terms" : "country");
  const [search, setSearch] = useState("");

  const filtered = COUNTRIES.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.code.toLowerCase().includes(search.toLowerCase())
  );

  const disclaimer = COIN_DISCLAIMER[lang as keyof typeof COIN_DISCLAIMER] ?? COIN_DISCLAIMER.en;

  const tabLabels: Record<Tab, string> = {
    country: `🌍 ${lt("Your Country")}`,
    terms: `📋 ${lt("Terms")}`,
    privacy: `🔒 ${lt("Privacy")}`,
    cookies: `🍪 ${lt("Cookies")}`,
    rights: `⚖️ ${lt("Your Rights")}`,
  };

  return (
    <div dir={isRTL ? "rtl" : "ltr"} className="min-h-screen bg-background text-foreground pt-16 pb-12">

      {/* Header */}
      <div className="border-b border-yellow-500/20 px-6 py-8 text-center">
        <div className="text-yellow-500 text-xs tracking-[0.4em] mb-2">⚖️ {LEGAL_CENTER_BADGE[lang]}</div>
        <h1 className="text-4xl font-black text-foreground">
          {lt("Legal Center")}
        </h1>
        <p className="mt-2 text-muted-foreground text-sm">
          {lt("Country-adaptive compliance — full transparency")}
        </p>

        {/* Active country badge */}
        <div className="inline-flex items-center gap-2 mt-4 bg-yellow-500/10 border border-yellow-500/30 rounded-full px-4 py-2">
          <span className="text-xl">{country.flag}</span>
          <span className="text-yellow-400 font-semibold text-sm">{country.name}</span>
          <span className="text-muted-foreground text-xs">— {country.laws.slice(0, 2).join(", ")}</span>
        </div>
      </div>

      {/* Coin disclaimer banner */}
      {country.coinsDisclaimer && (
        <div className="bg-orange-950/40 border-b border-orange-500/30 px-6 py-3">
          <p className="max-w-4xl mx-auto text-orange-300 text-xs leading-relaxed">{disclaimer}</p>
        </div>
      )}

      {/* Gaming warning banner */}
      {country.gamingWarning && (
        <div className="bg-red-950/30 border-b border-red-500/20 px-6 py-2">
          <p className="max-w-4xl mx-auto text-destructive text-xs text-center">
            {{en:`⚠️ Gaming regulations apply in ${country.name}. Arena Qaisypro is not a gambling platform — all coins are virtual only.`,fr:`⚠️ La réglementation des jeux s’applique en ${country.name}. Arena Qaisypro n’est pas une plateforme de jeu d’argent — les coins sont uniquement virtuels.`,ar:`⚠️ تسري لوائح الألعاب في ${country.name}. Arena Qaisypro ليست منصة قمار — جميع العملات افتراضية فقط.`,es:`⚠️ La normativa de juegos se aplica en ${country.name}. Arena Qaisypro no es una plataforma de apuestas — todas las monedas son virtuales.`,de:`⚠️ In ${country.name} gelten spielrechtliche Vorschriften. Arena Qaisypro ist keine Glücksspielplattform — sämtliche Coins sind ausschließlich virtuell.`}[lang as "en"|"fr"|"ar"|"es"|"de"]}
          </p>
        </div>
      )}

      {/* Tabs */}
      <div className="flex overflow-x-auto border-b border-border px-4">
        {(Object.keys(tabLabels) as Tab[]).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-3 text-xs tracking-widest whitespace-nowrap transition-all flex-shrink-0 ${
              tab === t ? "text-yellow-400 border-b-2 border-yellow-400" : "text-muted-foreground hover:text-foreground"
            }`}>
            {tabLabels[t]}
          </button>
        ))}
      </div>

      <div className="max-w-4xl mx-auto px-4 mt-8">
        <AnimatePresence mode="wait">

          {/* ── COUNTRY SELECTOR ── */}
          {tab === "country" && (
            <motion.div key="country" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              <p className="text-muted-foreground text-sm mb-4">
                {lt("Select your country to apply the correct legal framework automatically:")}
              </p>
              <input
                value={search} onChange={e => setSearch(e.target.value)}
                placeholder={lt("Search your country...")}
                className="w-full bg-card border border-border rounded-xl px-4 py-3 text-foreground mb-4 focus:outline-none focus:border-yellow-500"
              />
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {filtered.map((c: CountryProfile) => (
                  <button key={c.code} onClick={() => setCountry(c.code)}
                    className={`text-start p-4 rounded-xl border transition-all ${
                      country.code === c.code
                        ? "border-yellow-500 bg-yellow-500/10"
                        : "border-border hover:border-muted-foreground"
                    }`}>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-2xl">{c.flag}</span>
                      <span className="font-semibold text-foreground text-sm">{c.name}</span>
                    </div>
                    <div className="flex flex-wrap gap-1 mt-2">
                      {c.gdpr && <span className="text-xs bg-blue-900/50 text-blue-300 px-1.5 py-0.5 rounded">GDPR</span>}
                      {c.ccpa && <span className="text-xs bg-green-900/50 text-green-300 px-1.5 py-0.5 rounded">CCPA</span>}
                      {c.cookieConsentRequired && <span className="text-xs bg-yellow-900/50 text-yellow-300 px-1.5 py-0.5 rounded">🍪</span>}
                      {c.ageGateRequired && <span className="text-xs bg-red-900/50 text-red-300 px-1.5 py-0.5 rounded">{c.minAge}+</span>}
                      {c.gamingWarning && <span className="text-xs bg-orange-900/50 text-orange-300 px-1.5 py-0.5 rounded">⚠️</span>}
                    </div>
                    <div className="text-xs text-muted-foreground mt-1 truncate">{c.laws.slice(0,2).join(" · ")}</div>
                    {c.notes && <div className="text-xs text-muted-foreground mt-1 line-clamp-2">{c.notes}</div>}
                  </button>
                ))}
              </div>

              {/* Active framework summary */}
              <div className="mt-6 border border-yellow-500/20 rounded-xl p-5 bg-yellow-500/5">
                <h3 className="text-yellow-400 font-bold mb-3">
                  {lt("Active Legal Framework")} — {country.name}
                </h3>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  {[
                    { label: lt("Games Minimum Age"), value: "18+" },
                    { label: "GDPR", value: country.gdpr ? "✅" : "—" },
                    { label: "CCPA", value: country.ccpa ? "✅" : "—" },
                    { label: lt("Cookie Consent"), value: country.cookieConsentRequired ? `✅ ${lt("Required")}` : lt("Optional") },
                    { label: lt("Gaming Warning"), value: country.gamingWarning ? `⚠️ ${lt("Active")}` : lt("None") },
                    { label: lt("Coins Disclaimer"), value: country.coinsDisclaimer ? `⚠️ ${lt("Active")}` : lt("None") },
                  ].map(r => (
                    <div key={r.label} className="flex justify-between">
                      <span className="text-muted-foreground">{r.label}</span>
                      <span className="text-foreground font-semibold">{r.value}</span>
                    </div>
                  ))}
                </div>
                <div className="mt-3 pt-3 border-t border-yellow-500/10">
                  <p className="text-xs text-muted-foreground">
                    {lt("Applicable laws:")}{" "}
                    <span className="text-yellow-400">{country.laws.join(" · ")}</span>
                  </p>
                </div>
              </div>
            </motion.div>
          )}

          {/* ── TERMS OF SERVICE ── */}
          {tab === "terms" && (
            <motion.div key="terms" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="prose prose-invert max-w-none space-y-6">
              <LegalSection title={lt("Terms of Service")} subtitle={`Arena Qaisypro — ${new Date().getFullYear()}`}>
                <LegalClause n={1} title={lt("Acceptance")}>
                  {lt("By accessing Arena Qaisypro, you agree to these Terms. If you do not agree, please do not use the platform.")}
                </LegalClause>
                <LegalClause n={2} title={lt("Eligibility")}>
                  {lt("The platform is open to all ages. Only the Games section requires users to be 18+ under local law.")}
                </LegalClause>
                <LegalClause n={3} title={lt("Virtual Currency")}>
                  {disclaimer}
                </LegalClause>
                <LegalClause n={4} title={lt("Content")}>
                  {lt("Content you post remains yours. You grant us a license to display it on the platform. We reserve the right to remove content that violates laws or these Terms.")}
                </LegalClause>
                <LegalClause n={5} title={LIFE_PATH_TERMS[lang].title}>
                  {LIFE_PATH_TERMS[lang].paragraphs.join("\n\n")}
                </LegalClause>
                <LegalClause n={6} title={lt("Disclaimer")}>
                  {lt('The platform is provided "as is" without warranties. We are not liable for any losses arising from use of the platform.')}
                </LegalClause>
                <LegalClause n={7} title={lt("Governing Law")}>
                  {{en:`These Terms are governed by applicable law in ${country.name}: ${country.laws.join(", ")}.`,fr:`Ces conditions sont régies par le droit applicable en ${country.name} : ${country.laws.join(", ")}.`,ar:`تخضع هذه الشروط للقانون المعمول به في ${country.name}: ${country.laws.join("، ")}.`,es:`Estos términos se rigen por la ley aplicable en ${country.name}: ${country.laws.join(", ")}.`,de:`Für diese Nutzungsbedingungen gilt das in ${country.name} anwendbare Recht: ${country.laws.join(", ")}.`}[lang as "en"|"fr"|"ar"|"es"|"de"]}
                </LegalClause>
              </LegalSection>
            </motion.div>
          )}

          {/* ── PRIVACY POLICY ── */}
          {tab === "privacy" && (
            <motion.div key="privacy" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-6">
              <LegalSection title={lt("Privacy Policy")} subtitle={`${country.flag} ${country.name} — ${country.laws.slice(0,2).join(", ")}`}>
                <LegalClause n={1} title={lt("Data We Collect")}>
                  {lt("We collect: username, email, platform activity (games, votes, posts), device data, and browser language.")}
                </LegalClause>
                <LegalClause n={2} title={lt("How We Use Your Data")}>
                  {lt("We use your data to operate the service, improve experience, prevent fraud, and comply with law. We never sell your data.")}
                </LegalClause>
                {country.gdpr && (
                  <LegalClause n={3} title={task39Text(lang, "gdprLegalBasis")}>
                    {{en:"We process your data under: Contractual necessity (Art. 6(1)(b)), Legitimate interests (Art. 6(1)(f)), and Consent (Art. 6(1)(a)) for optional analytics.",fr:"Nous traitons vos données sur la base de la nécessité contractuelle (art. 6(1)(b)), des intérêts légitimes (art. 6(1)(f)) et du consentement (art. 6(1)(a)) pour les analyses facultatives.",ar:"نعالج بياناتك على أساس الضرورة التعاقدية (المادة 6(1)(b)) والمصالح المشروعة (6(1)(f)) والموافقة (6(1)(a)) للتحليلات الاختيارية.",es:"Tratamos tus datos por necesidad contractual (art. 6(1)(b)), intereses legítimos (art. 6(1)(f)) y consentimiento (art. 6(1)(a)) para analíticas opcionales.",de:"Wir verarbeiten Ihre Daten aufgrund vertraglicher Erforderlichkeit (Art. 6 Abs. 1 lit. b DSGVO), berechtigter Interessen (Art. 6 Abs. 1 lit. f DSGVO) sowie — für optionale Analysen — aufgrund Ihrer Einwilligung (Art. 6 Abs. 1 lit. a DSGVO)."}[lang as "en"|"fr"|"ar"|"es"|"de"]}
                  </LegalClause>
                )}
                {country.ccpa && (
                  <LegalClause n={3} title={task39Text(lang, "ccpaCaliforniaRights")}>
                    {{en:"California residents have the right to know what personal information is collected, the right to delete, the right to opt-out of sale, and the right to non-discrimination.",fr:"Les résidents de Californie ont le droit de connaître les informations collectées, de les supprimer, de refuser leur vente et de ne pas subir de discrimination.",ar:"لسكان كاليفورنيا الحق في معرفة المعلومات الشخصية التي تُجمع وحذفها ورفض بيعها وعدم التعرض للتمييز.",es:"Los residentes de California tienen derecho a conocer la información recopilada, eliminarla, excluirse de su venta y no sufrir discriminación.",de:"In Kalifornien ansässige Personen haben das Recht zu erfahren, welche personenbezogenen Daten erhoben werden, das Recht auf Löschung, das Recht, dem Verkauf ihrer Daten zu widersprechen, und das Recht auf Gleichbehandlung."}[lang as "en"|"fr"|"ar"|"es"|"de"]}
                  </LegalClause>
                )}
                <LegalClause n={country.gdpr || country.ccpa ? 4 : 3} title={lt("Data Retention")}>
                  {lt("We retain your data while your account is active. Upon account deletion, your data is removed within 30 days.")}
                </LegalClause>
                <LegalClause n={country.gdpr || country.ccpa ? 5 : 4} title={lt("AI Processing")}>
                  {lt("The platform uses OpenAI for content moderation and AI features. Data sent to OpenAI is subject to OpenAI's privacy policy.")}
                </LegalClause>
              </LegalSection>
            </motion.div>
          )}

          {/* ── COOKIES ── */}
          {tab === "cookies" && (
            <motion.div key="cookies" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-6">
              <LegalSection title={lt("Cookie Policy")} subtitle={country.cookieConsentRequired ? `⚠️ ${lt("Required")}` : lt("Optional")}>
                <div className="space-y-3">
                  {[
                    { name: "gdna_session", type: lt("Essential"), purpose: lt("Login session"), canReject: false },
                    { name: "gdna_lang",    type: lt("Essential"), purpose: lt("Language preference"), canReject: false },
                    { name: "gdna_country", type: lt("Essential"), purpose: lt("Legal compliance setup"), canReject: false },
                    { name: "gdna_consent", type: lt("Essential"), purpose: lt("Consent tracking"), canReject: false },
                    { name: "gdna_age_ok",  type: lt("Essential"), purpose: lt("Games age verification"), canReject: false },
                    { name: "_analytics",   type: lt("Analytics"), purpose: lt("Performance improvement"), canReject: true },
                  ].map(c => (
                    <div key={c.name} className="border border-border rounded-xl p-4 flex items-start justify-between gap-4">
                      <div>
                        <code className="text-yellow-400 text-xs">{c.name}</code>
                        <p className="text-foreground text-sm mt-0.5">{c.purpose}</p>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <span className={`text-xs px-2 py-0.5 rounded-full ${c.canReject ? "bg-blue-900/50 text-blue-300" : "bg-green-900/50 text-green-300"}`}>{c.type}</span>
                        {c.canReject && <span className="text-xs text-muted-foreground">{lt("Can reject")}</span>}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Consent control */}
                <div className="mt-6 border border-yellow-500/20 rounded-xl p-5 bg-yellow-500/5">
                  <h3 className="text-yellow-400 font-bold mb-3 text-sm">
                    {lt("Manage Your Consent")}
                  </h3>
                  <div className="flex flex-wrap gap-2">
                     {([["full", `✅ ${lt("Accept All")}`, "bg-yellow-500 text-black"],
                        ["essential", `🔒 ${lt("Essential Only")}`, "bg-secondary text-foreground"],
                        ["none", `❌ ${lt("Reject All")}`, "border border-border text-muted-foreground"]] as const).map(([level, label, cls]) => (
                      <button key={level} onClick={() => setConsent(level)}
                        className={`text-xs font-bold px-4 py-2 rounded-lg transition-all ${cls} ${consent===level?"ring-2 ring-yellow-400":""}`}>
                        {label}
                      </button>
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground mt-3">
                    {{en:"Current status",fr:"État actuel",ar:"الحالة الحالية",es:"Estado actual",de:"Aktueller Status"}[lang as "en"|"fr"|"ar"|"es"|"de"]}: {consent === "full" ? `✅ ${lt("Accept All")}` : consent === "essential" ? `🔒 ${lt("Essential Only")}` : `❌ ${lt("None")}`}
                  </p>
                </div>
              </LegalSection>
            </motion.div>
          )}

          {/* ── YOUR RIGHTS ── */}
          {tab === "rights" && (
            <motion.div key="rights" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-4">
              <div className="border border-yellow-500/20 rounded-xl p-5 bg-yellow-500/5 mb-4">
                <p className="text-yellow-400 text-sm font-semibold">
                  {{en:`Your rights under ${country.name} law (${country.laws.join(", ")}):`,fr:`Vos droits selon la législation de ${country.name} (${country.laws.join(", ")}) :`,ar:`حقوقك بموجب قوانين ${country.name} (${country.laws.join("، ")}):`,es:`Tus derechos conforme a la ley de ${country.name} (${country.laws.join(", ")}):`,de:`Ihre Rechte nach dem in ${country.name} geltenden Recht (${country.laws.join(", ")}):`}[lang as "en"|"fr"|"ar"|"es"|"de"]}
                </p>
              </div>
              {country.dataRights.map((right, i) => {
                const RIGHTS_TEXT: Record<string, Record<string, string>> = {
                  access:         { en:"Right to Access — Request a copy of all personal data we hold about you.", ar:"حق الوصول — طلب نسخة من جميع بياناتك الشخصية لدينا.", fr:"Droit d'accès — Demander une copie de vos données personnelles.", es:"Derecho de acceso — Solicita una copia de todos tus datos personales.", de:"Auskunftsrecht — Fordern Sie eine Kopie aller personenbezogenen Daten an, die wir über Sie gespeichert haben." },
                  delete:         { en:"Right to Erasure — Request deletion of your account and all associated data.", ar:"حق المحو — طلب حذف حسابك وجميع بياناتك.", fr:"Droit à l'effacement — Demander la suppression de votre compte.", es:"Derecho de supresión — Solicita eliminar tu cuenta y sus datos.", de:"Recht auf Löschung — Verlangen Sie die Löschung Ihres Kontos und aller damit verbundenen Daten." },
                  portability:    { en:"Right to Portability — Receive your data in a machine-readable format.", ar:"حق النقل — استلام بياناتك بصيغة قابلة للقراءة الآلية.", fr:"Droit à la portabilité — Recevoir vos données dans un format portable.", es:"Derecho a la portabilidad — Recibe tus datos en formato legible por máquina.", de:"Recht auf Datenübertragbarkeit — Erhalten Sie Ihre Daten in einem maschinenlesbaren Format." },
                  rectification:  { en:"Right to Rectification — Correct any inaccurate personal data.", ar:"حق التصحيح — تصحيح أي بيانات شخصية غير دقيقة.", fr:"Droit de rectification — Corriger vos données inexactes.", es:"Derecho de rectificación — Corrige datos personales inexactos.", de:"Recht auf Berichtigung — Lassen Sie unrichtige personenbezogene Daten korrigieren." },
                  object:         { en:"Right to Object — Object to processing based on legitimate interests.", ar:"حق الاعتراض — الاعتراض على المعالجة.", fr:"Droit d'opposition — Vous opposer au traitement.", es:"Derecho de oposición — Oponte al tratamiento basado en intereses legítimos.", de:"Widerspruchsrecht — Widersprechen Sie einer Verarbeitung, die auf berechtigten Interessen beruht." },
                  "opt-out-sale": { en:"Right to Opt-Out of Sale — Opt out of the sale of your personal information (CCPA).", ar:"حق الرفض — رفض بيع معلوماتك الشخصية (CCPA).", fr:"Droit d'opt-out — Refuser la vente de vos données (CCPA).", es:"Derecho a excluirse de la venta — Rechaza la venta de tu información (CCPA).", de:"Recht auf Widerspruch gegen den Verkauf — Widersprechen Sie dem Verkauf Ihrer personenbezogenen Daten (CCPA)." },
                };
                const text = RIGHTS_TEXT[right]?.[lang] ?? RIGHTS_TEXT[right]?.["en"] ?? right;
                return (
                  <div key={right} className="border border-border rounded-xl p-4 flex items-start gap-3">
                    <span className="text-yellow-400 font-black text-lg mt-0.5">{i + 1}</span>
                    <p className="text-foreground/90 text-sm leading-relaxed">{text}</p>
                  </div>
                );
              })}
              {/* Contact */}
              <div className="border border-accent/20 bg-accent/5 rounded-xl p-5 mt-4">
                <p className="text-accent text-sm">
                  {{en:"To exercise any of these rights, contact us at legal@gdna-arena.com — We will respond within 30 days.",fr:"Pour exercer ces droits, contactez-nous à legal@gdna-arena.com — Nous répondrons sous 30 jours.",ar:"لممارسة أي من هذه الحقوق، تواصل معنا عبر legal@gdna-arena.com — سنرد خلال 30 يوماً.",es:"Para ejercer estos derechos, contáctanos en legal@gdna-arena.com — Responderemos en 30 días.",de:"Um eines dieser Rechte auszuüben, kontaktieren Sie uns unter legal@gdna-arena.com — wir antworten innerhalb von 30 Tagen."}[lang as "en"|"fr"|"ar"|"es"|"de"]}
                </p>
              </div>
            </motion.div>
          )}

        </AnimatePresence>
      </div>
    </div>
  );
}

// ── Reusable legal section wrapper ───────────────────────────
function LegalSection({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <div className="border border-border rounded-2xl overflow-hidden">
      <div className="bg-card/50 px-6 py-4 border-b border-border">
        <h2 className="text-foreground font-black text-xl">{title}</h2>
        {subtitle && <p className="text-muted-foreground text-xs mt-1">{subtitle}</p>}
      </div>
      <div className="p-6 space-y-4">{children}</div>
    </div>
  );
}

function LegalClause({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="text-yellow-400 font-bold text-sm mb-1">{n}. {title}</h3>
      <p className="text-foreground/80 text-sm leading-relaxed">{children}</p>
    </div>
  );
}
