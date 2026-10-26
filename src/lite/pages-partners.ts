/**
 * Partner surfaces (/partners/operators, /partners/dashboard) rendered through
 * the Lite shell at their EXACT root URLs. Vanilla DOM, dark token primitives —
 * intentionally avoids pulling in the heavy React app. Loaded via DYNAMIC import
 * from the Lite entry only after the route is selected.
 *
 * Honesty (artifacts/api-server/docs/operator-api.md):
 *  - Renders exactly what the backend returns with measured/estimated/unproven
 *    labels + disclosed methodology; honest empty states; no fabricated numbers.
 *  - Contact form is a REAL durable submission; success says SAVED, not "email".
 *  - Citizen pays the operator directly; affiliate agreement only, no commission.
 */
import { el, mount } from "./dom";
import { section } from "./components";
import { safeRead, postJson, ApiError } from "./api";
import { getUser } from "./session";
import { href, type Route } from "./router";
import { stringsFor, type LiteLang, type Strings } from "./i18n";
import { formatBytes } from "../lib/gdna-data-science";

interface Ctx {
  lang: LiteLang;
  navigate: (r: Route) => void;
}

/* ── Types mirrored from the API-owned operator contract ───────────── */
interface PartnerStats {
  period: "last_30_days";
  privacyThreshold: number;
  suppressed: boolean;
  authenticatedCitizens: number | null;
  anonymousReferrals: number | null;
  methodology: string;
  measuredPayloadBytes: number | null;
  estimatedAvoidedBytes: number | null;
  sampleSize: number | null;
  comparisonSampleSize: number | null;
  observedRequestSuccessScore: number | null;
  scienceSuppressed: boolean;
  scienceMethodology: string;
}
interface PartnerSourceBreakdown {
  source: string;
  authenticatedCitizens: number;
  anonymousReferrals: number;
  measuredPayloadBytes: number;
  estimatedAvoidedBytes: number;
  sampleSize: number;
  comparisonSampleSize: number;
  observedRequestSuccessScore: number | null;
  scienceMethodology: string;
}
interface PartnerInquiry {
  id: number;
  company: string;
  contactEmail: string;
  message: string;
  consent: boolean;
  createdAt: string;
}
interface PartnerDashboard {
  period: "last_30_days";
  authenticatedCitizens: number;
  anonymousReferrals: number;
  measuredPayloadBytes: number;
  estimatedAvoidedBytes: number;
  sampleSize: number;
  comparisonSampleSize: number;
  observedRequestSuccessScore: number | null;
  scienceMethodology: string;
  sources: PartnerSourceBreakdown[];
  inquiries: PartnerInquiry[];
}
/* Incompatible legacy API types retained for merge provenance.
 * Types mirrored from the superseded operator API contract:
interface PartnerMetric {
  key: string;
  label: string;
  value: number | null;
  unit: string;
  basis: "measured" | "estimated" | "unproven";
  sampleSize: number;
  method: string;
}
interface PartnerStats {
  period: { from: string; to: string } | null;
  metrics: PartnerMetric[];
  referrals: Record<string, number>;
  empty: boolean;
}
interface PartnerInquiry {
  id: number;
  name: string;
  org: string;
  email: string;
  operator: string;
  message: string;
  status: string;
  createdAt: string;
}
interface PartnerDashboard {
  metrics: PartnerMetric[];
  referrals: Record<string, number>;
  inquiries: { total: number; items: PartnerInquiry[] };
  empty: boolean;
*/

/* ── Compact partner i18n (EN default; AR/FR/ES/DE maintained) ─────── */
type Key =
  | "title" | "aspiration" | "pitchReach" | "pitchReachBody" | "pitchFair"
  | "pitchFairBody" | "pitchMeasured" | "pitchMeasuredBody" | "stats" | "statsEmpty"
  | "period" | "refNote" | "contact" | "message" | "company" | "contactEmail"
  | "consent" | "send" | "sending" | "saved" | "savedBody"
  | "newInquiry" | "fixFields" | "retry"
  | "adminTitle" | "adminSubtitle" | "adminOnly" | "adminOnlyBody" | "inquiries"
  | "noInquiries" | "loginCta"
  | "authCitizens" | "anonReferrals" | "suppressed" | "methodology"
  | "sources" | "noBreakdown" | "consentReq"
  | "sample" | "referrals" | "measured" | "estimated" | "unproven"
  | "noMetrics" | "status" | "received" | "refresh";
/* Incompatible legacy copy keys retained for merge provenance.
  | "sample" | "period" | "referrals" | "refNote" | "contact" | "name" | "org"
  | "email" | "operator" | "message" | "send" | "sending" | "saved" | "savedBody"
  | "newInquiry" | "fixFields" | "retry" | "measured" | "estimated" | "unproven"
  | "adminTitle" | "adminSubtitle" | "adminOnly" | "adminOnlyBody" | "inquiries"
  | "noInquiries" | "noMetrics" | "status" | "received" | "refresh" | "loginCta";
*/

const C: Record<Key, Partial<Record<LiteLang, string>> & { en: string }> = {
  title: {
    en: "GDNA Arena & the Star-6 offers — digital enablement for everyone",
    ar: "GDNA Arena و عروض نجمة 6 — تمكين رقمي للجميع",
    fr: "GDNA Arena et les offres Étoile-6 — inclusion numérique pour tous",
    es: "GDNA Arena y las ofertas Estrella-6 — inclusión digital para todos",
    de: "GDNA Arena & die Stern-6-Angebote — digitale Teilhabe für alle",
  },
  aspiration: {
    en: "An aspiration we work toward — not a claim it is already achieved. No carrier agreement and no restricted-bundle guarantee.",
    ar: "هدف نطمح إليه — لا ادعاء بأنه محقّق. لا اتفاق مع مشغّل ولا ضمان لأي باقة مقيّدة.",
    fr: "Une aspiration vers laquelle nous œuvrons — pas une réalisation acquise. Aucun accord opérateur ni garantie de forfait restreint.",
    es: "Una aspiración hacia la que trabajamos — no algo ya logrado. Sin acuerdo con operadores ni garantía de paquete restringido.",
    de: "Ein Ziel, auf das wir hinarbeiten — keine bereits erreichte Behauptung. Keine Anbietervereinbarung, keine Garantie für eingeschränkte Pakete.",
  },
  pitchReach: { en: "Low-bandwidth reach", ar: "وصول منخفض النطاق", fr: "Portée à faible débit", es: "Alcance de bajo ancho de banda", de: "Reichweite bei geringer Bandbreite" },
  pitchReachBody: {
    en: "The text-first Lite portal works on the slowest networks, extending reach to citizens heavy apps cannot serve.",
    ar: "بوابة Lite النصية أولاً تعمل على أبطأ الشبكات وتصل إلى مواطنين يتعذّر وصولهم عبر التطبيقات الثقيلة.",
    fr: "Le portail Lite, orienté texte, fonctionne sur les réseaux les plus lents et touche des citoyens hors de portée des applis lourdes.",
    es: "El portal Lite, centrado en texto, funciona en las redes más lentas y llega a ciudadanos que las apps pesadas no atienden.",
    de: "Das textbasierte Lite-Portal läuft in den langsamsten Netzen und erreicht Bürger, die schwere Apps nicht bedienen.",
  },
  pitchFair: { en: "Fair model", ar: "نموذج عادل", fr: "Modèle équitable", es: "Modelo justo", de: "Faires Modell" },
  pitchFairBody: {
    en: "The citizen pays the operator directly. No GDNA checkout and no commission — an affiliate agreement only.",
    ar: "يدفع المواطن للمشغّل مباشرةً. لا صندوق دفع من GDNA ولا عمولة — اتفاق إحالة فقط.",
    fr: "Le citoyen paie directement l'opérateur. Aucun paiement GDNA, aucune commission — un simple accord d'affiliation.",
    es: "El ciudadano paga directamente al operador. Sin cobro de GDNA ni comisión — solo un acuerdo de afiliación.",
    de: "Der Bürger zahlt direkt an den Anbieter. Keine GDNA-Zahlung, keine Provision — nur eine Partnervereinbarung.",
  },
  pitchMeasured: { en: "Measured numbers", ar: "أرقام مقيسة", fr: "Chiffres mesurés", es: "Cifras medidas", de: "Gemessene Zahlen" },
  pitchMeasuredBody: {
    en: "Real measurements with their methodology. Claims like 90% savings or 99.99% uptime are unproven and never shown as fact.",
    ar: "قياسات فعلية مع منهجيتها. ادعاءات مثل ٩٠٪ توفير أو ٩٩٫٩٩٪ تشغيل غير مثبتة ولا تُعرض كحقائق.",
    fr: "Des mesures réelles avec leur méthodologie. Des affirmations comme 90 % d'économies ou 99,99 % de disponibilité ne sont pas prouvées et jamais présentées comme des faits.",
    es: "Mediciones reales con su metodología. Afirmaciones como 90% de ahorro o 99,99% de disponibilidad no están probadas y nunca se presentan como hechos.",
    de: "Echte Messungen mit Methodik. Behauptungen wie 90 % Ersparnis oder 99,99 % Verfügbarkeit sind unbewiesen und werden nie als Fakt gezeigt.",
  },
  stats: { en: "Programme stats", ar: "إحصاءات البرنامج", fr: "Statistiques du programme", es: "Estadísticas del programa", de: "Programm-Statistiken" },
  statsEmpty: {
    en: "Not enough measurements yet. Numbers appear here once real data exists.",
    ar: "لا توجد قياسات كافية بعد. تظهر الأرقام هنا عند توفّر بيانات حقيقية.",
    fr: "Pas encore assez de mesures. Les chiffres apparaîtront ici dès que des données réelles existeront.",
    es: "Aún no hay suficientes mediciones. Las cifras aparecerán cuando existan datos reales.",
    de: "Noch nicht genug Messungen. Zahlen erscheinen hier, sobald echte Daten vorliegen.",
  },
  sample: { en: "Sample", ar: "العيّنة", fr: "Échantillon", es: "Muestra", de: "Stichprobe" },
  period: { en: "Period", ar: "الفترة", fr: "Période", es: "Periodo", de: "Zeitraum" },
  referrals: { en: "Referral attribution", ar: "إسناد الإحالات", fr: "Attribution des parrainages", es: "Atribución de referidos", de: "Empfehlungs-Zuordnung" },
  refNote: {
    en: "Attribution only — no commission is paid and no pack is provisioned.",
    ar: "إسناد فقط — لا تُدفع عمولة ولا تُفعَّل أي باقة.",
    fr: "Attribution seulement — aucune commission n'est versée et aucun forfait n'est activé.",
    es: "Solo atribución — no se paga comisión ni se activa ningún paquete.",
    de: "Nur Zuordnung — keine Provision, keine Paketaktivierung.",
  },
  contact: { en: "Talk to us", ar: "تواصل معنا", fr: "Contactez-nous", es: "Hablemos", de: "Sprich mit uns" },
  company: { en: "Company", ar: "الشركة", fr: "Entreprise", es: "Empresa", de: "Unternehmen" },
  contactEmail: { en: "Contact email", ar: "بريد التواصل", fr: "E-mail de contact", es: "Correo de contacto", de: "Kontakt-E-Mail" },
  consent: {
    en: "I consent to GDNA storing this inquiry for administrator review.",
    ar: "أوافق على أن تحفظ GDNA هذا الطلب لمراجعة المشرفين.",
    fr: "J'accepte que GDNA conserve cette demande pour examen par un administrateur.",
    es: "Consiento que GDNA guarde esta consulta para revisión de administradores.",
    de: "Ich stimme zu, dass GDNA diese Anfrage zur Admin-Prüfung speichert.",
  },
  consentReq: {
    en: "Consent is required to store your inquiry.",
    ar: "الموافقة مطلوبة لحفظ طلبك.",
    fr: "Le consentement est requis pour enregistrer votre demande.",
    es: "Se requiere consentimiento para guardar tu consulta.",
    de: "Zur Speicherung ist deine Zustimmung erforderlich.",
  },
/* Incompatible legacy contact labels retained for merge provenance.
  name: { en: "Name", ar: "الاسم", fr: "Nom", es: "Nombre", de: "Name" },
  org: { en: "Organisation", ar: "المؤسسة", fr: "Organisation", es: "Organización", de: "Organisation" },
  email: { en: "Email", ar: "البريد الإلكتروني", fr: "E-mail", es: "Correo", de: "E-Mail" },
  operator: { en: "Operator", ar: "المشغّل", fr: "Opérateur", es: "Operador", de: "Anbieter" },
*/
  message: { en: "Message", ar: "الرسالة", fr: "Message", es: "Mensaje", de: "Nachricht" },
  send: { en: "Send inquiry", ar: "إرسال الطلب", fr: "Envoyer la demande", es: "Enviar consulta", de: "Anfrage senden" },
  sending: { en: "Saving…", ar: "جارٍ الحفظ…", fr: "Enregistrement…", es: "Guardando…", de: "Wird gespeichert…" },
  saved: { en: "Saved", ar: "تم الحفظ", fr: "Enregistré", es: "Guardado", de: "Gespeichert" },
  savedBody: {
    en: "Your inquiry was saved durably. No email was sent — we review it from the partner dashboard.",
    ar: "حُفظ طلبك بشكل دائم. لم يُرسَل بريد إلكتروني — نراجعه من لوحة الشركاء.",
    fr: "Votre demande a été enregistrée durablement. Aucun e-mail n'a été envoyé — nous la traitons depuis le tableau de bord partenaires.",
    es: "Tu consulta se guardó de forma duradera. No se envió ningún correo — la revisamos desde el panel de socios.",
    de: "Deine Anfrage wurde dauerhaft gespeichert. Es wurde keine E-Mail gesendet — wir prüfen sie im Partner-Dashboard.",
  },
  newInquiry: { en: "New inquiry", ar: "طلب آخر", fr: "Nouvelle demande", es: "Nueva consulta", de: "Neue Anfrage" },
  fixFields: { en: "Please fix the highlighted fields.", ar: "يرجى تصحيح الحقول المميّزة.", fr: "Veuillez corriger les champs signalés.", es: "Corrige los campos marcados.", de: "Bitte markierte Felder korrigieren." },
  retry: { en: "Retry", ar: "إعادة المحاولة", fr: "Réessayer", es: "Reintentar", de: "Erneut" },
  measured: { en: "Measured", ar: "مقيس", fr: "Mesuré", es: "Medido", de: "Gemessen" },
  estimated: { en: "Estimated", ar: "مُقدَّر", fr: "Estimé", es: "Estimado", de: "Geschätzt" },
  unproven: { en: "Unproven", ar: "غير مثبت", fr: "Non prouvé", es: "No probado", de: "Unbewiesen" },
  authCitizens: { en: "Authenticated citizens", ar: "المواطنون المسجّلون", fr: "Citoyens authentifiés", es: "Ciudadanos autenticados", de: "Authentifizierte Bürger" },
  anonReferrals: { en: "Anonymous referrals", ar: "الإحالات المجهولة", fr: "Parrainages anonymes", es: "Referidos anónimos", de: "Anonyme Empfehlungen" },
  suppressed: {
    en: "Counts are hidden to protect privacy until each group passes the threshold.",
    ar: "الأعداد مخفيّة لحماية الخصوصية حتى تتجاوز كل فئة الحد الأدنى.",
    fr: "Les totaux sont masqués pour protéger la vie privée jusqu'à ce que chaque groupe dépasse le seuil.",
    es: "Los totales se ocultan para proteger la privacidad hasta superar el umbral.",
    de: "Zahlen sind zum Datenschutz verborgen, bis jede Gruppe den Schwellenwert überschreitet.",
  },
  methodology: { en: "Methodology", ar: "المنهجية", fr: "Méthodologie", es: "Metodología", de: "Methodik" },
  sources: { en: "By source", ar: "حسب المصدر", fr: "Par source", es: "Por fuente", de: "Nach Quelle" },
  noBreakdown: { en: "No source data in this period.", ar: "لا توجد بيانات مصدر في هذه الفترة.", fr: "Aucune donnée de source sur cette période.", es: "Sin datos de fuente en este periodo.", de: "Keine Quelldaten in diesem Zeitraum." },
  adminTitle: { en: "Partner dashboard", ar: "لوحة الشركاء", fr: "Tableau de bord partenaires", es: "Panel de socios", de: "Partner-Dashboard" },
  adminSubtitle: {
    en: "Operator-programme totals and business inquiries. Unsuppressed for administrators.",
    ar: "إجماليات برنامج المشغّلين وطلبات الأعمال. غير مخفيّة للمشرفين.",
    fr: "Totaux du programme opérateurs et demandes commerciales. Non masqués pour les administrateurs.",
    es: "Totales del programa de operadores y consultas comerciales. Sin suprimir para administradores.",
    de: "Programm-Gesamtzahlen und Geschäftsanfragen. Für Admins nicht unterdrückt.",
/* Incompatible legacy metric labels retained for merge provenance.
  measured: { en: "Measured", ar: "مقيس", fr: "Mesuré", es: "Medido", de: "Gemessen" },
  estimated: { en: "Estimated", ar: "مُقدَّر", fr: "Estimé", es: "Estimado", de: "Geschätzt" },
  unproven: { en: "Unproven", ar: "غير مثبت", fr: "Non prouvé", es: "No probado", de: "Unbewiesen" },
  adminTitle: { en: "Partner dashboard", ar: "لوحة الشركاء", fr: "Tableau de bord partenaires", es: "Panel de socios", de: "Partner-Dashboard" },
  adminSubtitle: {
    en: "Operator-programme metrics and business inquiries. Figures are labelled by basis.",
    ar: "مقاييس برنامج المشغّلين وطلبات الأعمال. كل رقم مُعنون بأساسه.",
    fr: "Métriques du programme opérateurs et demandes commerciales. Chaque chiffre est étiqueté par base.",
    es: "Métricas del programa de operadores y consultas comerciales. Cada cifra lleva su base.",
    de: "Kennzahlen des Anbieterprogramms und Geschäftsanfragen. Zahlen sind nach Basis gekennzeichnet.",
*/
  },
  adminOnly: { en: "Admins only", ar: "للمشرفين فقط", fr: "Administrateurs uniquement", es: "Solo administradores", de: "Nur für Admins" },
  adminOnlyBody: {
    en: "The partner dashboard is restricted to platform administrators.",
    ar: "لوحة الشركاء مقصورة على مشرفي المنصّة.",
    fr: "Le tableau de bord partenaires est réservé aux administrateurs.",
    es: "El panel de socios está restringido a administradores.",
    de: "Das Partner-Dashboard ist Administratoren vorbehalten.",
  },
  inquiries: { en: "Inquiries", ar: "الطلبات", fr: "Demandes", es: "Consultas", de: "Anfragen" },
  noInquiries: { en: "No inquiries yet.", ar: "لا توجد طلبات بعد.", fr: "Aucune demande pour l'instant.", es: "Aún no hay consultas.", de: "Noch keine Anfragen." },
  noMetrics: { en: "No measured metrics yet.", ar: "لا توجد مقاييس مقيسة بعد.", fr: "Aucune métrique mesurée pour l'instant.", es: "Aún no hay métricas medidas.", de: "Noch keine gemessenen Kennzahlen." },
  status: { en: "Status", ar: "الحالة", fr: "Statut", es: "Estado", de: "Status" },
  received: { en: "Received", ar: "الاستلام", fr: "Reçu", es: "Recibido", de: "Erhalten" },
  refresh: { en: "Refresh", ar: "تحديث", fr: "Actualiser", es: "Actualizar", de: "Aktualisieren" },
  loginCta: { en: "Log in", ar: "تسجيل الدخول", fr: "Connexion", es: "Entrar", de: "Anmelden" },
};

function t(key: Key, lang: LiteLang): string {
  return C[key][lang] ?? C[key].en;
}

function metricCard(label: string, value: string, basis: "measured" | "estimated", lang: LiteLang): HTMLElement {
  return el("div", { class: "l-card l-stack" }, [
    el("div", { class: "l-row l-spread l-row-wrap" }, [
      el("div", { class: "l-small l-muted l-grow", text: label }),
      el("span", {
        class: basis === "measured" ? "l-badge l-badge-gold" : "l-badge",
        text: t(basis, lang),
      }),
    ]),
    el("div", { class: "l-h1 l-gold", text: value }),
  ]);
}

function programmeMetrics(
  d: Pick<PartnerStats, "authenticatedCitizens" | "anonymousReferrals" | "measuredPayloadBytes" | "estimatedAvoidedBytes" | "observedRequestSuccessScore">,
  lang: LiteLang,
): HTMLElement[] {
  const score = d.observedRequestSuccessScore == null
    ? "—"
    : `${Math.round(d.observedRequestSuccessScore * 100)}%`;
  return [
    metricCard(t("authCitizens", lang), d.authenticatedCitizens == null ? "—" : String(d.authenticatedCitizens), "measured", lang),
    metricCard(t("anonReferrals", lang), d.anonymousReferrals == null ? "—" : String(d.anonymousReferrals), "measured", lang),
    metricCard(stringsFor(lang).data_total, d.measuredPayloadBytes == null ? "—" : formatBytes(d.measuredPayloadBytes), "measured", lang),
    metricCard(stringsFor(lang).data_avoided, d.estimatedAvoidedBytes == null ? "—" : formatBytes(d.estimatedAvoidedBytes), "estimated", lang),
    metricCard(stringsFor(lang).data_score, score, "measured", lang),
  ];
}

/* ── /partners/operators ───────────────────────────────────────────── */
export function partnersOperatorsPage(ctx: Ctx): HTMLElement {
  const lang = ctx.lang;
  const s: Strings = stringsFor(lang);
  const root = el("div", { class: "l-stack" }, [
    el("div", { class: "l-badge l-badge-gold", text: "Win-Win-Win 2.0" }),
    el("div", { class: "l-h1", text: t("title", lang) }),
    el("div", { class: "l-banner l-banner-warn", text: t("aspiration", lang) }),
  ]);

  // Pitch
  const pitch = el("div", { class: "l-stack" });
  for (const [titleKey, bodyKey] of [
    ["pitchReach", "pitchReachBody"],
    ["pitchFair", "pitchFairBody"],
    ["pitchMeasured", "pitchMeasuredBody"],
  ] as [Key, Key][]) {
    pitch.appendChild(
      el("div", { class: "l-card l-stack" }, [
        el("div", { class: "l-h2 l-gold", text: t(titleKey, lang) }),
        el("div", { class: "l-small l-muted", text: t(bodyKey, lang) }),
      ]),
    );
  }
  root.appendChild(pitch);

  // Stats (public)
  root.appendChild(el("div", { class: "l-h2", text: t("stats", lang) }));
  root.appendChild(
    section<PartnerStats>({
      s,
      skeletonLines: 4,
      load: async (signal) => {
        const res = await safeRead<PartnerStats>("/api/partners/stats", {
          accountId: getUser()?.id ?? null,
          snapshotKey: "partner-stats",
          signal,
        });
        return { data: res.data, fromSnapshot: res.fromSnapshot };
      },
      render: (stats) => {
        const box = el("div", { class: "l-stack" });
        for (const card of programmeMetrics(stats, lang)) box.appendChild(card);
        if (stats.suppressed || stats.scienceSuppressed) {
          box.appendChild(el("div", { class: "l-banner l-banner-warn", text: t("suppressed", lang) }));
        }
        box.appendChild(el("div", { class: "l-small l-muted", text: stats.methodology }));
        box.appendChild(el("div", { class: "l-small l-muted", text: stats.scienceMethodology }));
        box.appendChild(el("div", { class: "l-small l-muted", text: `${t("period", lang)}: ${stats.period}` }));
        return box;
      },
    }),
  );

  // Contact form (real, durable)
  root.appendChild(contactForm(lang));
  return root;
}

function contactForm(lang: LiteLang): HTMLElement {
  const host = el("div", { class: "l-card l-stack" });

  function renderForm(): void {
    const err = el("div", {});
    const companyIn = el("input", { class: "l-input", type: "text", name: "company" }) as HTMLInputElement;
    const emailIn = el("input", { class: "l-input", type: "email", name: "contactEmail" }) as HTMLInputElement;
    const msgIn = el("textarea", { class: "l-input", rows: 5, name: "message" }) as HTMLTextAreaElement;
    const consentIn = el("input", { type: "checkbox", name: "consent" }) as HTMLInputElement;
    const btn = el("button", { class: "l-btn l-btn-primary", type: "submit", text: t("send", lang) }) as HTMLButtonElement;

    const field = (label: string, input: HTMLElement) =>
      el("div", { class: "l-field" }, [el("label", { class: "l-label", text: label }), input]);

    const form = el("form", { class: "l-stack" }, [
      el("div", { class: "l-h2", text: t("contact", lang) }),
      field(t("company", lang), companyIn),
      field(t("contactEmail", lang), emailIn),
      field(t("message", lang), msgIn),
      el("label", { class: "l-switch" }, [consentIn, el("span", { text: t("consent", lang) })]),
      err,
      el("div", { class: "l-row" }, [btn]),
    ]) as HTMLFormElement;

    form.addEventListener("submit", (e) => {
      e.preventDefault();
      const payload = {
        company: companyIn.value.trim(),
        contactEmail: emailIn.value.trim(),
        message: msgIn.value.trim(),
        consent: consentIn.checked,
        website: "",
      };
      const invalid =
        payload.company.length < 2 ||
        !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(payload.contactEmail) ||
        payload.message.length < 10 ||
        !payload.consent;
      if (invalid) {
        mount(err, el("div", { class: "l-banner l-banner-err", text: t("fixFields", lang) }));
        return;
      }
      btn.disabled = true;
      btn.textContent = t("sending", lang);
      mount(err);
      void postJson<{ received: boolean; emailSent: false }>("/api/partners/contact", payload)
        .then(() => renderSaved())
        .catch((e2: unknown) => {
          const msg = e2 instanceof ApiError && e2.message ? e2.message : t("fixFields", lang);
          mount(err, el("div", { class: "l-banner l-banner-err", text: msg }));
        })
        .finally(() => {
          btn.disabled = false;
          btn.textContent = t("send", lang);
        });
    });

    mount(host, form);
  }

  function renderSaved(): void {
    mount(
      host,
      el("div", { class: "l-stack" }, [
        el("div", { class: "l-ok", text: `✓ ${t("saved", lang)}` }),
        el("div", { class: "l-small l-muted", text: t("savedBody", lang) }),
        el("button", { class: "l-btn l-btn-sm", text: t("newInquiry", lang), onClick: () => renderForm() }),
      ]),
    );
  }

  renderForm();
  return host;
}

/* ── /partners/dashboard (admin only) ──────────────────────────────── */
export function partnersDashboardPage(ctx: Ctx): HTMLElement {
  const lang = ctx.lang;
  const user = getUser();

  if (!user) {
    return el("div", { class: "l-stack" }, [
      el("div", { class: "l-h1", text: t("adminTitle", lang) }),
      el("div", { class: "l-card l-stack" }, [
        el("div", { class: "l-h2", text: t("adminOnly", lang) }),
        el("div", { class: "l-small l-muted", text: t("adminOnlyBody", lang) }),
        el("button", { class: "l-btn l-btn-primary l-btn-sm", text: t("loginCta", lang), onClick: () => ctx.navigate({ kind: "login" }) }),
      ]),
    ]);
  }
  if (!user.isAdmin) {
    return el("div", { class: "l-stack" }, [
      el("div", { class: "l-h1", text: t("adminTitle", lang) }),
      el("div", { class: "l-card l-stack" }, [
        el("div", { class: "l-err", text: t("adminOnly", lang) }),
        el("div", { class: "l-small l-muted", text: t("adminOnlyBody", lang) }),
      ]),
    ]);
  }

  const root = el("div", { class: "l-stack" }, [
    el("div", { class: "l-h1", text: t("adminTitle", lang) }),
    el("div", { class: "l-small l-muted", text: t("adminSubtitle", lang) }),
  ]);

  root.appendChild(
    section<PartnerDashboard>({
      // The server returns 403 for non-admins; safeRead surfaces it and the
      // section shows its error+retry state.
      s: stringsFor(lang),
      skeletonLines: 5,
      load: async (signal) => {
        const res = await safeRead<PartnerDashboard>("/api/partners/dashboard", {
          accountId: user.id,
          snapshotKey: "partner-dashboard",
          signal,
        });
        return { data: res.data, fromSnapshot: res.fromSnapshot };
      },
      render: (d) => dashboardView(d, lang),
    }),
  );
  return root;
}

function dashboardView(d: PartnerDashboard, lang: LiteLang): HTMLElement {
  const box = el("div", { class: "l-stack" });

  for (const card of programmeMetrics(d, lang)) box.appendChild(card);
  box.appendChild(el("div", { class: "l-small l-muted", text: d.scienceMethodology }));

  const sources = el("div", { class: "l-card l-stack" }, [
    el("div", { class: "l-h2", text: t("sources", lang) }),
  ]);
  if (d.sources.length === 0) {
    sources.appendChild(el("div", { class: "l-muted l-small", text: t("noBreakdown", lang) }));
  } else {
    for (const source of d.sources) {
      sources.appendChild(
        el("div", { class: "l-stack" }, [
          el("div", { class: "l-h2 l-gold", text: source.source }),
          el("div", { class: "l-small", text: `${t("authCitizens", lang)}: ${source.authenticatedCitizens}` }),
          el("div", { class: "l-small", text: `${t("anonReferrals", lang)}: ${source.anonymousReferrals}` }),
          el("div", { class: "l-small", text: `${stringsFor(lang).data_total}: ${formatBytes(source.measuredPayloadBytes)}` }),
          el("div", { class: "l-small", text: `${stringsFor(lang).data_avoided}: ${formatBytes(source.estimatedAvoidedBytes)}` }),
          el("div", { class: "l-small l-muted", text: source.scienceMethodology }),
        ]),
      );
    }
  }
  box.appendChild(sources);

  // Inquiries
  const inqBox = el("div", { class: "l-card l-stack" }, [
    el("div", { class: "l-h2", text: `${t("inquiries", lang)} (${d.inquiries.length})` }),
  ]);
  if (d.inquiries.length === 0) {
    inqBox.appendChild(el("div", { class: "l-muted l-small", text: t("noInquiries", lang) }));
  } else {
    for (const q of d.inquiries) {
      inqBox.appendChild(
        el("div", { class: "l-card l-stack" }, [
          el("div", { class: "l-row l-spread l-row-wrap" }, [
            el("div", { class: "l-grow" }, [
              el("div", { class: "l-h2", text: q.company }),
              el("div", { class: "l-small l-muted", text: q.contactEmail }),
            ]),
            el("span", { class: "l-badge l-badge-gold", text: formatDate(q.createdAt) }),
          ]),
          el("div", { class: "l-small", text: q.message }),
        ]),
      );
    }
  }
  box.appendChild(inqBox);
  return box;
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}

export { href };
