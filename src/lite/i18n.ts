/**
 * Lite-local i18n. The five foundation languages (en, fr, ar, es, de) are retained.
 * Region editions add hi (Hindi) and pt (Portuguese). Strings are intentionally tiny
 * — Lite ships text only, no font bytes.
 */
export type LiteLang = "en" | "fr" | "ar" | "es" | "de" | "hi" | "pt";

export const RTL_LANGS = new Set<LiteLang>(["ar"]);

// hint: Structural and logic conflict. Both design and behavior differ.
export interface Strings {
  brand: string;
  tagline: string;
  nav_home: string;
  nav_citizens: string;
  nav_market: string;
  nav_clips: string;
  nav_hisn: string;
  nav_messages: string;
  nav_settings: string;
  login: string;
  logout: string;
  username: string;
  password: string;
  signIn: string;
  signingIn: string;
  loginRequired: string;
  retry: string;
  loading: string;
  empty_citizens: string;
  empty_market: string;
  empty_clips: string;
  empty_messages: string;
  view_profile: string;
  load_image: string;
  load_audio: string;
  audio_unavailable: string;
  image_off: string;
  offline_snapshot: string;
  section_error: string;
  limited_data: string;
  limited_data_hint: string;
  install_app: string;
  install_ios: string;
  net_offline: string;
  net_slow: string;
  net_savedata: string;
  compose: string;
  send: string;
  queued_offline: string;
  needs_review: string;
  needs_review_hint: string;
  connect_first: string;
  settings_lang: string;
  settings_data: string;
  market_price: string;
  hisn_title: string;
  hisn_desc: string;
  profile_citizen: string;
  profile_joined: string;
  back: string;
  crown_banner: string;
  decrypting: string;
  decrypt_failed: string;
  // Operators (Win-Win-Win 2.0)
  nav_operators: string;
  nav_data: string;
  operators_title: string;
  operators_intro: string;
  operators_unverified: string;
  operators_indicative: string;
  operators_direct_pay: string;
  operators_no_commission: string;
  operators_ussd_note: string;
  operators_data_allowance: string;
  operators_official_link: string;
  operators_partner_cta: string;
  empty_operators: string;
  referral_banner: string;
  referral_note: string;
  // Data / savings dashboard
  data_title: string;
  data_intro: string;
  data_score: string;
  data_saved: string;
  data_total: string;
  data_avoided: string;
  data_period: string;
  data_month: string;
  data_samples: string;
  data_comparison_samples: string;
  data_status_unverified: string;
  data_no_data: string;
  data_measured: string;
  data_estimated: string;
  data_method: string;
  data_original: string;
  data_alternative: string;
  data_clips: string;
  telemetry_title: string;
  telemetry_consent: string;
  telemetry_hint: string;
}
/* Incompatible legacy API copy retained for merge provenance.
export interface Strings {
  brand: string;
  tagline: string;
  nav_home: string;
  nav_citizens: string;
  nav_market: string;
  nav_clips: string;
  nav_hisn: string;
  nav_messages: string;
  nav_settings: string;
  login: string;
  logout: string;
  username: string;
  password: string;
  signIn: string;
  signingIn: string;
  loginRequired: string;
  retry: string;
  loading: string;
  empty_citizens: string;
  empty_market: string;
  empty_clips: string;
  empty_messages: string;
  view_profile: string;
  load_image: string;
  load_audio: string;
  audio_unavailable: string;
  image_off: string;
  offline_snapshot: string;
  section_error: string;
  limited_data: string;
  limited_data_hint: string;
  install_app: string;
  install_ios: string;
  net_offline: string;
  net_slow: string;
  net_savedata: string;
  compose: string;
  send: string;
  queued_offline: string;
  needs_review: string;
  needs_review_hint: string;
  connect_first: string;
  settings_lang: string;
  settings_data: string;
  market_price: string;
  hisn_title: string;
  hisn_desc: string;
  profile_citizen: string;
  profile_joined: string;
  back: string;
  crown_banner: string;
  decrypting: string;
  decrypt_failed: string;
  // Operators (Win-Win-Win 2.0)
  nav_operators: string;
  nav_data: string;
  operators_title: string;
  operators_intro: string;
  operators_unverified: string;
  operators_indicative: string;
  operators_direct_pay: string;
  operators_no_commission: string;
  operators_ussd_note: string;
  operators_data_allowance: string;
  operators_partner_cta: string;
  empty_operators: string;
  referral_banner: string;
  referral_note: string;
  // Data / savings dashboard
  data_title: string;
  data_intro: string;
  data_score: string;
  data_saved: string;
  data_total: string;
  data_period: string;
  data_samples: string;
  data_no_data: string;
  data_measured: string;
  data_estimated: string;
  data_method: string;
  data_original: string;
  data_alternative: string;
  data_clips: string;
  telemetry_title: string;
  telemetry_consent: string;
  telemetry_hint: string;
}
*/

// hint: Structural and logic conflict. Both design and behavior differ.
const en: Strings = {
  brand: "GDNA Lite",
  tagline: "Text-first. Works on any connection.",
  nav_home: "Home",
  nav_citizens: "Citizens",
  nav_market: "Market",
  nav_clips: "Clips",
  nav_hisn: "Hisn",
  nav_messages: "Messages",
  nav_settings: "Settings",
  login: "Log in",
  logout: "Log out",
  username: "Username",
  password: "Password",
  signIn: "Sign in",
  signingIn: "Signing in…",
  loginRequired: "Log in to continue.",
  retry: "Retry",
  loading: "Loading…",
  empty_citizens: "No citizens to show yet.",
  empty_market: "The market is quiet right now.",
  empty_clips: "No clips yet.",
  empty_messages: "No conversations yet.",
  view_profile: "View profile",
  load_image: "Load image",
  load_audio: "Play audio",
  audio_unavailable: "Audio unavailable",
  image_off: "Images are off to save data. Tap to load.",
  offline_snapshot: "Showing a saved copy — you appear to be offline.",
  section_error: "This section could not load.",
  limited_data: "Limited data",
  limited_data_hint: "Blocks automatic images and large downloads.",
  install_app: "Install app",
  install_ios: "On iPhone: tap Share, then “Add to Home Screen”.",
  net_offline: "You are offline. Reading saved data.",
  net_slow: "Slow connection — data-saving is on.",
  net_savedata: "Data Saver is on.",
  compose: "Write a message",
  send: "Send",
  queued_offline: "Queued — will send when you reconnect.",
  needs_review: "Needs review",
  needs_review_hint: "Recipient security keys changed. Re-encrypt to send.",
  connect_first: "This recipient hasn't set up secure messaging. Connect once online first.",
  settings_lang: "Language",
  settings_data: "Data",
  market_price: "Price",
  hisn_title: "Hisn — the fortress",
  hisn_desc: "Your protected citizenship record and safety controls.",
  profile_citizen: "Citizen",
  profile_joined: "Joined",
  back: "Back",
  crown_banner: "\u265B  Empire citizen",
  decrypting: "Decrypting…",
  decrypt_failed: "Could not decrypt this message on this device.",
  nav_operators: "Operators",
  nav_data: "My data",
  operators_title: "Operator offers",
  operators_intro:
    "Indicative low-cost data packs citizens have reported. You pay the operator directly — GDNA takes no cut and does not sell or activate these packs.",
  operators_unverified: "Unverified",
  operators_indicative: "Indicative price — not an official operator offer.",
  operators_direct_pay: "You pay the operator directly.",
  operators_no_commission: "No GDNA checkout, no commission. Affiliate agreement only.",
  operators_ussd_note: "Display-only dial code (unverified — not a purchase action).",
  operators_data_allowance: "Data allowance",
  operators_official_link: "Open the operator's official page",
  operators_partner_cta: "Are you an operator? See the partnership pitch.",
  empty_operators: "No operator offers listed yet.",
  referral_banner: "You arrived through a referral link.",
  referral_note:
    "This records attribution only. It does not verify, discount, or activate any pack.",
  data_title: "My data & savings",
  data_intro:
    "Measured from your own Lite reads. No sample or seed numbers — empty until real usage is recorded.",
  data_score: "Request success score",
  data_saved: "Data payload",
  data_total: "Measured payload",
  data_avoided: "Estimated avoided bytes",
  data_period: "Period",
  data_month: "Month",
  data_samples: "Measured requests",
  data_comparison_samples: "Comparable samples",
  data_status_unverified: "Client-reported, not independently verified. Not billed mobile data, uptime, or carrier performance.",
  data_no_data: "No measured data yet. Use Lite and your measurements will appear here.",
  data_measured: "Measured",
  data_estimated: "Estimated",
  data_method: "Methodology",
  data_original: "Original",
  data_alternative: "Delivered",
  data_clips: "Per-clip sizes",
  telemetry_title: "Measurement",
  telemetry_consent: "Share anonymous byte measurements",
  telemetry_hint:
    "Off by default. Sends only resource type, byte counts and success/fail — no URLs, content, or personal data.",
};
/* Incompatible legacy API copy retained for merge provenance.
const en: Strings = {
  brand: "GDNA Lite",
  tagline: "Text-first. Works on any connection.",
  nav_home: "Home",
  nav_citizens: "Citizens",
  nav_market: "Market",
  nav_clips: "Clips",
  nav_hisn: "Hisn",
  nav_messages: "Messages",
  nav_settings: "Settings",
  login: "Log in",
  logout: "Log out",
  username: "Username",
  password: "Password",
  signIn: "Sign in",
  signingIn: "Signing in…",
  loginRequired: "Log in to continue.",
  retry: "Retry",
  loading: "Loading…",
  empty_citizens: "No citizens to show yet.",
  empty_market: "The market is quiet right now.",
  empty_clips: "No clips yet.",
  empty_messages: "No conversations yet.",
  view_profile: "View profile",
  load_image: "Load image",
  load_audio: "Play audio",
  audio_unavailable: "Audio unavailable",
  image_off: "Images are off to save data. Tap to load.",
  offline_snapshot: "Showing a saved copy — you appear to be offline.",
  section_error: "This section could not load.",
  limited_data: "Limited data",
  limited_data_hint: "Blocks automatic images and large downloads.",
  install_app: "Install app",
  install_ios: "On iPhone: tap Share, then “Add to Home Screen”.",
  net_offline: "You are offline. Reading saved data.",
  net_slow: "Slow connection — data-saving is on.",
  net_savedata: "Data Saver is on.",
  compose: "Write a message",
  send: "Send",
  queued_offline: "Queued — will send when you reconnect.",
  needs_review: "Needs review",
  needs_review_hint: "Recipient security keys changed. Re-encrypt to send.",
  connect_first: "This recipient hasn't set up secure messaging. Connect once online first.",
  settings_lang: "Language",
  settings_data: "Data",
  market_price: "Price",
  hisn_title: "Hisn — the fortress",
  hisn_desc: "Your protected citizenship record and safety controls.",
  profile_citizen: "Citizen",
  profile_joined: "Joined",
  back: "Back",
  crown_banner: "\u265B  Empire citizen",
  decrypting: "Decrypting…",
  decrypt_failed: "Could not decrypt this message on this device.",
  nav_operators: "Operators",
  nav_data: "My data",
  operators_title: "Operator offers",
  operators_intro:
    "Indicative low-cost data packs citizens have reported. You pay the operator directly — GDNA takes no cut and does not sell or activate these packs.",
  operators_unverified: "Unverified",
  operators_indicative: "Indicative price — not an official operator offer.",
  operators_direct_pay: "You pay the operator directly.",
  operators_no_commission: "No GDNA checkout, no commission. Affiliate agreement only.",
  operators_ussd_note: "Reported activation code (unverified — do not rely on it).",
  operators_data_allowance: "Data allowance",
  operators_partner_cta: "Are you an operator? See the partnership pitch.",
  empty_operators: "No operator offers listed yet.",
  referral_banner: "You arrived through a referral link.",
  referral_note:
    "This records attribution only. It does not verify, discount, or activate any pack.",
  data_title: "My data & savings",
  data_intro:
    "Measured from your own Lite reads. No sample or seed numbers — empty until real usage is recorded.",
  data_score: "Data-saving score",
  data_saved: "Data saved",
  data_total: "Data requested",
  data_period: "Period",
  data_samples: "Measured events",
  data_no_data: "No measured data yet. Use Lite and your savings will appear here.",
  data_measured: "Measured",
  data_estimated: "Estimated",
  data_method: "How this is measured",
  data_original: "Original",
  data_alternative: "Delivered",
  data_clips: "Per-clip sizes",
  telemetry_title: "Measurement",
  telemetry_consent: "Share anonymous byte measurements",
  telemetry_hint:
    "Off by default. Sends only resource type, byte counts and success/fail — no URLs, content, or personal data.",
};
*/

// Region/edition translations. Foundation langs that reuse English fall back via en.
// hint: Structural and logic conflict. Both design and behavior differ.
const fr: Partial<Strings> = {
  tagline: "Texte d'abord. Fonctionne sur toute connexion.",
  nav_home: "Accueil", nav_citizens: "Citoyens", nav_market: "Marché", nav_clips: "Clips", nav_messages: "Messages",
  audio_unavailable: "Audio indisponible", load_audio: "Lire l'audio", empty_clips: "Aucun clip.",
  nav_settings: "Réglages", login: "Connexion", logout: "Déconnexion", username: "Nom d'utilisateur",
  password: "Mot de passe", signIn: "Se connecter", retry: "Réessayer", loading: "Chargement…",
  view_profile: "Voir le profil", load_image: "Charger l'image", limited_data: "Données limitées",
  install_app: "Installer l'app", send: "Envoyer", settings_lang: "Langue", back: "Retour",
  section_error: "Cette section n'a pas pu se charger.", loginRequired: "Connectez-vous pour continuer.",
  nav_operators: "Opérateurs", nav_data: "Mes données",
  operators_title: "Offres opérateurs",
  operators_intro:
    "Forfaits data économiques indicatifs, signalés par des citoyens. Vous payez l'opérateur directement — GDNA ne prend aucune commission et ne vend ni n'active ces forfaits.",
  operators_unverified: "Non vérifié",
  operators_indicative: "Prix indicatif — pas une offre officielle de l'opérateur.",
  operators_direct_pay: "Vous payez l'opérateur directement.",
  operators_no_commission: "Pas de paiement GDNA, pas de commission. Accord d'affiliation uniquement.",
  operators_ussd_note: "Code d'affichage uniquement (non vérifié — pas une action d'achat).",
  operators_data_allowance: "Volume de données", operators_official_link: "Ouvrir la page officielle de l'opérateur",
  operators_partner_cta: "Vous êtes opérateur ? Voir le partenariat.",
  empty_operators: "Aucune offre opérateur pour l'instant.",
  referral_banner: "Vous êtes arrivé via un lien de parrainage.",
  referral_note: "Cela enregistre seulement l'attribution. Aucune vérification, remise ni activation de forfait.",
  data_title: "Mes données et économies",
  data_intro: "Mesuré à partir de vos propres lectures Lite. Aucun chiffre d'exemple — vide jusqu'à un usage réel.",
  data_score: "Score de réussite des requêtes", data_saved: "Charge de données", data_total: "Charge mesurée",
  data_avoided: "Octets évités estimés",
  data_period: "Période", data_month: "Mois", data_samples: "Requêtes mesurées",
  data_comparison_samples: "Échantillons comparables",
  data_status_unverified: "Déclaré par le client, non vérifié indépendamment. Pas des données mobiles facturées, ni disponibilité ou performance opérateur.",
  data_no_data: "Aucune donnée mesurée. Utilisez Lite et vos mesures apparaîtront ici.",
  data_measured: "Mesuré", data_estimated: "Estimé", data_method: "Méthodologie",
  data_original: "Original", data_alternative: "Livré", data_clips: "Tailles par clip",
  telemetry_title: "Mesure", telemetry_consent: "Partager des mesures d'octets anonymes",
  telemetry_hint: "Désactivé par défaut. Envoie seulement le type de ressource, les octets et le résultat — aucune URL, contenu ni donnée personnelle.",
};
/* Incompatible legacy API copy retained for merge provenance.
const fr: Partial<Strings> = {
  tagline: "Texte d'abord. Fonctionne sur toute connexion.",
  nav_home: "Accueil", nav_citizens: "Citoyens", nav_market: "Marché", nav_clips: "Clips", nav_messages: "Messages",
  audio_unavailable: "Audio indisponible", load_audio: "Lire l'audio", empty_clips: "Aucun clip.",
  nav_settings: "Réglages", login: "Connexion", logout: "Déconnexion", username: "Nom d'utilisateur",
  password: "Mot de passe", signIn: "Se connecter", retry: "Réessayer", loading: "Chargement…",
  view_profile: "Voir le profil", load_image: "Charger l'image", limited_data: "Données limitées",
  install_app: "Installer l'app", send: "Envoyer", settings_lang: "Langue", back: "Retour",
  section_error: "Cette section n'a pas pu se charger.", loginRequired: "Connectez-vous pour continuer.",
  nav_operators: "Opérateurs", nav_data: "Mes données",
  operators_title: "Offres opérateurs",
  operators_intro:
    "Forfaits data économiques indicatifs, signalés par des citoyens. Vous payez l'opérateur directement — GDNA ne prend aucune commission et ne vend ni n'active ces forfaits.",
  operators_unverified: "Non vérifié",
  operators_indicative: "Prix indicatif — pas une offre officielle de l'opérateur.",
  operators_direct_pay: "Vous payez l'opérateur directement.",
  operators_no_commission: "Pas de paiement GDNA, pas de commission. Accord d'affiliation uniquement.",
  operators_ussd_note: "Code d'activation signalé (non vérifié — ne vous y fiez pas).",
  operators_data_allowance: "Volume de données", operators_partner_cta: "Vous êtes opérateur ? Voir le partenariat.",
  empty_operators: "Aucune offre opérateur pour l'instant.",
  referral_banner: "Vous êtes arrivé via un lien de parrainage.",
  referral_note: "Cela enregistre seulement l'attribution. Aucune vérification, remise ni activation de forfait.",
  data_title: "Mes données et économies",
  data_intro: "Mesuré à partir de vos propres lectures Lite. Aucun chiffre d'exemple — vide jusqu'à un usage réel.",
  data_score: "Score d'économie de données", data_saved: "Données économisées", data_total: "Données demandées",
  data_period: "Période", data_samples: "Événements mesurés",
  data_no_data: "Aucune donnée mesurée. Utilisez Lite et vos économies apparaîtront ici.",
  data_measured: "Mesuré", data_estimated: "Estimé", data_method: "Méthode de mesure",
  data_original: "Original", data_alternative: "Livré", data_clips: "Tailles par clip",
  telemetry_title: "Mesure", telemetry_consent: "Partager des mesures d'octets anonymes",
  telemetry_hint: "Désactivé par défaut. Envoie seulement le type de ressource, les octets et le résultat — aucune URL, contenu ni donnée personnelle.",
};
*/
// hint: Structural and logic conflict. Both design and behavior differ.
const ar: Partial<Strings> = {
  tagline: "النص أولاً. يعمل على أي اتصال.",
  nav_home: "الرئيسية", nav_citizens: "المواطنون", nav_market: "السوق", nav_clips: "المقاطع", nav_messages: "الرسائل",
  audio_unavailable: "الصوت غير متوفر", load_audio: "تشغيل الصوت", empty_clips: "لا توجد مقاطع.",
  nav_settings: "الإعدادات", login: "تسجيل الدخول", logout: "خروج", username: "اسم المستخدم",
  password: "كلمة المرور", signIn: "دخول", retry: "إعادة المحاولة", loading: "جارٍ التحميل…",
  view_profile: "عرض الملف", load_image: "تحميل الصورة", limited_data: "بيانات محدودة",
  install_app: "تثبيت التطبيق", send: "إرسال", settings_lang: "اللغة", back: "رجوع",
  section_error: "تعذّر تحميل هذا القسم.", loginRequired: "سجّل الدخول للمتابعة.",
  nav_operators: "المشغّلون", nav_data: "بياناتي",
  operators_title: "عروض المشغّلين",
  operators_intro:
    "باقات بيانات اقتصادية إرشادية أبلغ عنها المواطنون. تدفع للمشغّل مباشرةً — لا تأخذ GDNA أي عمولة ولا تبيع أو تفعّل هذه الباقات.",
  operators_unverified: "غير مُوثّق",
  operators_indicative: "سعر إرشادي — ليس عرضاً رسمياً من المشغّل.",
  operators_direct_pay: "تدفع للمشغّل مباشرةً.",
  operators_no_commission: "لا دفع عبر GDNA ولا عمولة. اتفاق إحالة فقط.",
  operators_ussd_note: "رمز للعرض فقط (غير مُوثّق — ليس إجراء شراء).",
  operators_data_allowance: "حجم البيانات", operators_official_link: "افتح الصفحة الرسمية للمشغّل",
  operators_partner_cta: "هل أنت مشغّل؟ اطّلع على الشراكة.",
  empty_operators: "لا توجد عروض مشغّلين بعد.",
  referral_banner: "وصلت عبر رابط إحالة.",
  referral_note: "هذا يسجّل الإحالة فقط. لا تحقّق ولا خصم ولا تفعيل لأي باقة.",
  data_title: "بياناتي وتوفيري",
  data_intro: "مقيس من قراءاتك في Lite. لا أرقام تجريبية — فارغ حتى يُسجَّل استخدام فعلي.",
  data_score: "درجة نجاح الطلبات", data_saved: "حِمل البيانات", data_total: "الحِمل المقيس",
  data_avoided: "البايتات المتجنَّبة المقدَّرة",
  data_period: "الفترة", data_month: "الشهر", data_samples: "الطلبات المقيسة",
  data_comparison_samples: "العيّنات القابلة للمقارنة",
  data_status_unverified: "مُبلَّغ من العميل وغير مُتحقَّق منه بشكل مستقل. ليست بيانات جوّال مفوترة ولا تشغيلاً ولا أداء مشغّل.",
  data_no_data: "لا توجد بيانات مقيسة بعد. استخدم Lite وستظهر قياساتك هنا.",
  data_measured: "مقيس", data_estimated: "مُقدَّر", data_method: "المنهجية",
  data_original: "الأصل", data_alternative: "المُسلَّم", data_clips: "أحجام كل مقطع",
  telemetry_title: "القياس", telemetry_consent: "مشاركة قياسات بايت مجهولة",
  telemetry_hint: "مُعطَّل افتراضياً. يرسل فقط نوع المورد وعدد البايت والنتيجة — بلا روابط أو محتوى أو بيانات شخصية.",
};
/* Incompatible legacy API copy retained for merge provenance.
const ar: Partial<Strings> = {
  tagline: "النص أولاً. يعمل على أي اتصال.",
  nav_home: "الرئيسية", nav_citizens: "المواطنون", nav_market: "السوق", nav_clips: "المقاطع", nav_messages: "الرسائل",
  audio_unavailable: "الصوت غير متوفر", load_audio: "تشغيل الصوت", empty_clips: "لا توجد مقاطع.",
  nav_settings: "الإعدادات", login: "تسجيل الدخول", logout: "خروج", username: "اسم المستخدم",
  password: "كلمة المرور", signIn: "دخول", retry: "إعادة المحاولة", loading: "جارٍ التحميل…",
  view_profile: "عرض الملف", load_image: "تحميل الصورة", limited_data: "بيانات محدودة",
  install_app: "تثبيت التطبيق", send: "إرسال", settings_lang: "اللغة", back: "رجوع",
  section_error: "تعذّر تحميل هذا القسم.", loginRequired: "سجّل الدخول للمتابعة.",
  nav_operators: "المشغّلون", nav_data: "بياناتي",
  operators_title: "عروض المشغّلين",
  operators_intro:
    "باقات بيانات اقتصادية إرشادية أبلغ عنها المواطنون. تدفع للمشغّل مباشرةً — لا تأخذ GDNA أي عمولة ولا تبيع أو تفعّل هذه الباقات.",
  operators_unverified: "غير مُوثّق",
  operators_indicative: "سعر إرشادي — ليس عرضاً رسمياً من المشغّل.",
  operators_direct_pay: "تدفع للمشغّل مباشرةً.",
  operators_no_commission: "لا دفع عبر GDNA ولا عمولة. اتفاق إحالة فقط.",
  operators_ussd_note: "رمز تفعيل مُبلَّغ عنه (غير مُوثّق — لا تعتمد عليه).",
  operators_data_allowance: "حجم البيانات", operators_partner_cta: "هل أنت مشغّل؟ اطّلع على الشراكة.",
  empty_operators: "لا توجد عروض مشغّلين بعد.",
  referral_banner: "وصلت عبر رابط إحالة.",
  referral_note: "هذا يسجّل الإحالة فقط. لا تحقّق ولا خصم ولا تفعيل لأي باقة.",
  data_title: "بياناتي وتوفيري",
  data_intro: "مقيس من قراءاتك في Lite. لا أرقام تجريبية — فارغ حتى يُسجَّل استخدام فعلي.",
  data_score: "درجة توفير البيانات", data_saved: "البيانات الموفَّرة", data_total: "البيانات المطلوبة",
  data_period: "الفترة", data_samples: "الأحداث المقيسة",
  data_no_data: "لا توجد بيانات مقيسة بعد. استخدم Lite وسيظهر توفيرك هنا.",
  data_measured: "مقيس", data_estimated: "مُقدَّر", data_method: "طريقة القياس",
  data_original: "الأصل", data_alternative: "المُسلَّم", data_clips: "أحجام كل مقطع",
  telemetry_title: "القياس", telemetry_consent: "مشاركة قياسات بايت مجهولة",
  telemetry_hint: "مُعطَّل افتراضياً. يرسل فقط نوع المورد وعدد البايت والنتيجة — بلا روابط أو محتوى أو بيانات شخصية.",
};
*/
// hint: Structural and logic conflict. Both design and behavior differ.
const es: Partial<Strings> = {
  tagline: "Primero el texto. Funciona con cualquier conexión.",
  nav_home: "Inicio", nav_citizens: "Ciudadanos", nav_market: "Mercado", nav_settings: "Ajustes",
  login: "Entrar", logout: "Salir", signIn: "Entrar", retry: "Reintentar", loading: "Cargando…",
  send: "Enviar", settings_lang: "Idioma", back: "Atrás",
  nav_operators: "Operadores", nav_data: "Mis datos",
  operators_title: "Ofertas de operadores",
  operators_intro:
    "Paquetes de datos económicos indicativos, reportados por ciudadanos. Pagas directamente al operador — GDNA no cobra comisión ni vende o activa estos paquetes.",
  operators_unverified: "No verificado",
  operators_indicative: "Precio indicativo — no es una oferta oficial del operador.",
  operators_direct_pay: "Pagas directamente al operador.",
  operators_no_commission: "Sin cobro de GDNA, sin comisión. Solo acuerdo de afiliación.",
  operators_ussd_note: "Código solo informativo (no verificado — no es una acción de compra).",
  operators_data_allowance: "Volumen de datos", operators_official_link: "Abrir la página oficial del operador",
  operators_partner_cta: "¿Eres operador? Ver la propuesta de alianza.",
  empty_operators: "Aún no hay ofertas de operadores.",
  referral_banner: "Llegaste mediante un enlace de referido.",
  referral_note: "Esto solo registra la atribución. No verifica, descuenta ni activa ningún paquete.",
  data_title: "Mis datos y ahorros",
  data_intro: "Medido a partir de tus propias lecturas en Lite. Sin cifras de ejemplo — vacío hasta que haya uso real.",
  data_score: "Puntuación de éxito de solicitudes", data_saved: "Carga de datos", data_total: "Carga medida",
  data_avoided: "Bytes evitados estimados",
  data_period: "Periodo", data_month: "Mes", data_samples: "Solicitudes medidas",
  data_comparison_samples: "Muestras comparables",
  data_status_unverified: "Reportado por el cliente, no verificado de forma independiente. No son datos móviles facturados, ni disponibilidad o rendimiento del operador.",
  data_no_data: "Aún no hay datos medidos. Usa Lite y tus mediciones aparecerán aquí.",
  data_measured: "Medido", data_estimated: "Estimado", data_method: "Metodología",
  data_original: "Original", data_alternative: "Entregado", data_clips: "Tamaños por clip",
  telemetry_title: "Medición", telemetry_consent: "Compartir mediciones de bytes anónimas",
  telemetry_hint: "Desactivado por defecto. Envía solo el tipo de recurso, los bytes y el resultado — sin URLs, contenido ni datos personales.",
};
/* Incompatible legacy API copy retained for merge provenance.
const es: Partial<Strings> = {
  tagline: "Primero el texto. Funciona con cualquier conexión.",
  nav_home: "Inicio", nav_citizens: "Ciudadanos", nav_market: "Mercado", nav_settings: "Ajustes",
  login: "Entrar", logout: "Salir", signIn: "Entrar", retry: "Reintentar", loading: "Cargando…",
  send: "Enviar", settings_lang: "Idioma", back: "Atrás",
  nav_operators: "Operadores", nav_data: "Mis datos",
  operators_title: "Ofertas de operadores",
  operators_intro:
    "Paquetes de datos económicos indicativos, reportados por ciudadanos. Pagas directamente al operador — GDNA no cobra comisión ni vende o activa estos paquetes.",
  operators_unverified: "No verificado",
  operators_indicative: "Precio indicativo — no es una oferta oficial del operador.",
  operators_direct_pay: "Pagas directamente al operador.",
  operators_no_commission: "Sin cobro de GDNA, sin comisión. Solo acuerdo de afiliación.",
  operators_ussd_note: "Código de activación reportado (no verificado — no dependas de él).",
  operators_data_allowance: "Volumen de datos", operators_partner_cta: "¿Eres operador? Ver la propuesta de alianza.",
  empty_operators: "Aún no hay ofertas de operadores.",
  referral_banner: "Llegaste mediante un enlace de referido.",
  referral_note: "Esto solo registra la atribución. No verifica, descuenta ni activa ningún paquete.",
  data_title: "Mis datos y ahorros",
  data_intro: "Medido a partir de tus propias lecturas en Lite. Sin cifras de ejemplo — vacío hasta que haya uso real.",
  data_score: "Puntuación de ahorro de datos", data_saved: "Datos ahorrados", data_total: "Datos solicitados",
  data_period: "Periodo", data_samples: "Eventos medidos",
  data_no_data: "Aún no hay datos medidos. Usa Lite y tus ahorros aparecerán aquí.",
  data_measured: "Medido", data_estimated: "Estimado", data_method: "Cómo se mide",
  data_original: "Original", data_alternative: "Entregado", data_clips: "Tamaños por clip",
  telemetry_title: "Medición", telemetry_consent: "Compartir mediciones de bytes anónimas",
  telemetry_hint: "Desactivado por defecto. Envía solo el tipo de recurso, los bytes y el resultado — sin URLs, contenido ni datos personales.",
};
*/
// hint: Structural and logic conflict. Both design and behavior differ.
const de: Partial<Strings> = {
  tagline: "Text zuerst. Funktioniert bei jeder Verbindung.",
  nav_home: "Start", nav_citizens: "Bürger", nav_market: "Markt", nav_settings: "Einstellungen",
  login: "Anmelden", logout: "Abmelden", signIn: "Anmelden", retry: "Erneut", loading: "Lädt…",
  send: "Senden", settings_lang: "Sprache", back: "Zurück",
  nav_operators: "Anbieter", nav_data: "Meine Daten",
  operators_title: "Anbieter-Angebote",
  operators_intro:
    "Von Bürgern gemeldete, unverbindliche günstige Datenpakete. Du zahlst direkt an den Anbieter — GDNA nimmt keine Provision und verkauft oder aktiviert diese Pakete nicht.",
  operators_unverified: "Nicht verifiziert",
  operators_indicative: "Richtpreis — kein offizielles Anbieter-Angebot.",
  operators_direct_pay: "Du zahlst direkt an den Anbieter.",
  operators_no_commission: "Keine GDNA-Zahlung, keine Provision. Nur Partnervereinbarung.",
  operators_ussd_note: "Nur zur Anzeige (nicht verifiziert — keine Kaufaktion).",
  operators_data_allowance: "Datenvolumen", operators_official_link: "Offizielle Anbieterseite öffnen",
  operators_partner_cta: "Anbieter? Zum Partnerschafts-Pitch.",
  empty_operators: "Noch keine Anbieter-Angebote.",
  referral_banner: "Du kamst über einen Empfehlungslink.",
  referral_note: "Dies erfasst nur die Zuordnung. Keine Verifizierung, kein Rabatt, keine Paketaktivierung.",
  data_title: "Meine Daten & Ersparnis",
  data_intro: "Gemessen aus deinen eigenen Lite-Zugriffen. Keine Beispielzahlen — leer bis echte Nutzung erfasst wird.",
  data_score: "Erfolgs-Score der Anfragen", data_saved: "Datenlast", data_total: "Gemessene Last",
  data_avoided: "Geschätzt vermiedene Bytes",
  data_period: "Zeitraum", data_month: "Monat", data_samples: "Gemessene Anfragen",
  data_comparison_samples: "Vergleichbare Stichproben",
  data_status_unverified: "Vom Client gemeldet, nicht unabhängig verifiziert. Keine abgerechneten Mobildaten, keine Verfügbarkeit oder Anbieterleistung.",
  data_no_data: "Noch keine Messdaten. Nutze Lite, und deine Messungen erscheinen hier.",
  data_measured: "Gemessen", data_estimated: "Geschätzt", data_method: "Methodik",
  data_original: "Original", data_alternative: "Geliefert", data_clips: "Größen pro Clip",
  telemetry_title: "Messung", telemetry_consent: "Anonyme Byte-Messungen teilen",
  telemetry_hint: "Standardmäßig aus. Sendet nur Ressourcentyp, Bytes und Ergebnis — keine URLs, Inhalte oder personenbezogenen Daten.",
};
/* Incompatible legacy API copy retained for merge provenance.
const de: Partial<Strings> = {
  tagline: "Text zuerst. Funktioniert bei jeder Verbindung.",
  nav_home: "Start", nav_citizens: "Bürger", nav_market: "Markt", nav_settings: "Einstellungen",
  login: "Anmelden", logout: "Abmelden", signIn: "Anmelden", retry: "Erneut", loading: "Lädt…",
  send: "Senden", settings_lang: "Sprache", back: "Zurück",
  nav_operators: "Anbieter", nav_data: "Meine Daten",
  operators_title: "Anbieter-Angebote",
  operators_intro:
    "Von Bürgern gemeldete, unverbindliche günstige Datenpakete. Du zahlst direkt an den Anbieter — GDNA nimmt keine Provision und verkauft oder aktiviert diese Pakete nicht.",
  operators_unverified: "Nicht verifiziert",
  operators_indicative: "Richtpreis — kein offizielles Anbieter-Angebot.",
  operators_direct_pay: "Du zahlst direkt an den Anbieter.",
  operators_no_commission: "Keine GDNA-Zahlung, keine Provision. Nur Partnervereinbarung.",
  operators_ussd_note: "Gemeldeter Aktivierungscode (nicht verifiziert — verlass dich nicht darauf).",
  operators_data_allowance: "Datenvolumen", operators_partner_cta: "Anbieter? Zum Partnerschafts-Pitch.",
  empty_operators: "Noch keine Anbieter-Angebote.",
  referral_banner: "Du kamst über einen Empfehlungslink.",
  referral_note: "Dies erfasst nur die Zuordnung. Keine Verifizierung, kein Rabatt, keine Paketaktivierung.",
  data_title: "Meine Daten & Ersparnis",
  data_intro: "Gemessen aus deinen eigenen Lite-Zugriffen. Keine Beispielzahlen — leer bis echte Nutzung erfasst wird.",
  data_score: "Datenspar-Score", data_saved: "Gesparte Daten", data_total: "Angeforderte Daten",
  data_period: "Zeitraum", data_samples: "Gemessene Ereignisse",
  data_no_data: "Noch keine Messdaten. Nutze Lite, und deine Ersparnis erscheint hier.",
  data_measured: "Gemessen", data_estimated: "Geschätzt", data_method: "Wie gemessen wird",
  data_original: "Original", data_alternative: "Geliefert", data_clips: "Größen pro Clip",
  telemetry_title: "Messung", telemetry_consent: "Anonyme Byte-Messungen teilen",
  telemetry_hint: "Standardmäßig aus. Sendet nur Ressourcentyp, Bytes und Ergebnis — keine URLs, Inhalte oder personenbezogenen Daten.",
};
*/
const hi: Partial<Strings> = {
  tagline: "पहले टेक्स्ट। किसी भी कनेक्शन पर चलता है।",
  nav_home: "होम", nav_citizens: "नागरिक", nav_market: "बाज़ार", nav_clips: "क्लिप्स", nav_messages: "संदेश",
  audio_unavailable: "ऑडियो अनुपलब्ध", load_audio: "ऑडियो चलाएँ", empty_clips: "कोई क्लिप नहीं।",
  nav_settings: "सेटिंग्स", login: "लॉग इन", logout: "लॉग आउट", username: "उपयोगकर्ता नाम",
  password: "पासवर्ड", signIn: "साइन इन", retry: "फिर से", loading: "लोड हो रहा है…",
  view_profile: "प्रोफ़ाइल देखें", load_image: "छवि लोड करें", limited_data: "सीमित डेटा",
  install_app: "ऐप इंस्टॉल करें", send: "भेजें", settings_lang: "भाषा", back: "वापस",
  image_off: "डेटा बचाने के लिए छवियाँ बंद हैं। लोड करने के लिए टैप करें।",
  section_error: "यह सेक्शन लोड नहीं हो सका।", loginRequired: "जारी रखने के लिए लॉग इन करें।",
};
const pt: Partial<Strings> = {
  tagline: "Texto primeiro. Funciona em qualquer conexão.",
  nav_home: "Início", nav_citizens: "Cidadãos", nav_market: "Mercado", nav_clips: "Clipes", nav_messages: "Mensagens",
  audio_unavailable: "Áudio indisponível", load_audio: "Reproduzir áudio", empty_clips: "Nenhum clipe.",
  nav_settings: "Ajustes", login: "Entrar", logout: "Sair", username: "Usuário", password: "Senha",
  signIn: "Entrar", retry: "Tentar de novo", loading: "Carregando…", view_profile: "Ver perfil",
  load_image: "Carregar imagem", limited_data: "Dados limitados", install_app: "Instalar app",
  send: "Enviar", settings_lang: "Idioma", back: "Voltar",
  image_off: "Imagens desligadas para poupar dados. Toque para carregar.",
  section_error: "Não foi possível carregar esta seção.", loginRequired: "Entre para continuar.",
};

const TABLES: Record<LiteLang, Partial<Strings>> = { en, fr, ar, es, de, hi, pt };

export function stringsFor(lang: LiteLang): Strings {
  return { ...en, ...TABLES[lang] };
}

/**
 * Region edition → its ordered language menu. `menu[0]` is the canonical
 * first-visit default when the citizen has no explicitly saved choice.
 * The global/default edition leads with Arabic (project canonical); region
 * editions keep their own defaults (India → Hindi, Brasil → Portuguese).
 * All five global languages remain available in the default menu.
 */
export const EDITION_LANGS: Record<string, LiteLang[]> = {
  default: ["ar", "en", "fr", "es", "de"],
  in: ["hi", "en"],
  africa: ["ar", "fr", "en"],
  brasil: ["pt"],
};
