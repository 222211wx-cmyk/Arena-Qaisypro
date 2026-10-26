import type { Lang } from "@/contexts/LangContext";

type SupportedLang = Lang;

const localeByLang: Record<SupportedLang, string> = {
  en: "en-US",
  fr: "fr-FR",
  ar: "ar-MA",
  es: "es-ES",
  de: "de-DE",
};

export const activeSharedLang = (lang: Lang | string): SupportedLang =>
  lang === "fr" || lang === "ar" || lang === "es" || lang === "de" ? lang : "en";

export const sharedLocale = (lang: Lang | string) => localeByLang[activeSharedLang(lang)];

const dna = {
  en: {
    discipline: "Discipline", resilience: "Resilience", precision: "Precision", awareness: "Awareness",
    growth: "Growth", clarity: "Clarity", strategy: "Strategy", leadership: "Leadership",
    logic: "Logic", influence: "Influence", empathy: "Empathy", expression: "Expression",
    creation: "Creation", enterprise: "Enterprise", persistence: "Persistence", vision: "Vision",
    wisdom: "Wisdom", curiosity: "Curiosity",
  },
  fr: {
    discipline: "Discipline", resilience: "Résilience", precision: "Précision", awareness: "Conscience",
    growth: "Croissance", clarity: "Clarté", strategy: "Stratégie", leadership: "Leadership",
    logic: "Logique", influence: "Influence", empathy: "Empathie", expression: "Expression",
    creation: "Création", enterprise: "Esprit d’entreprise", persistence: "Persévérance", vision: "Vision",
    wisdom: "Sagesse", curiosity: "Curiosité",
  },
  ar: {
    discipline: "الانضباط", resilience: "المرونة", precision: "الدقة", awareness: "الوعي",
    growth: "النمو", clarity: "الوضوح", strategy: "الاستراتيجية", leadership: "القيادة",
    logic: "المنطق", influence: "التأثير", empathy: "التعاطف", expression: "التعبير",
    creation: "الإبداع", enterprise: "الريادة", persistence: "المثابرة", vision: "الرؤية",
    wisdom: "الحكمة", curiosity: "الفضول",
  },
  es: {
    discipline: "Disciplina", resilience: "Resiliencia", precision: "Precisión", awareness: "Conciencia",
    growth: "Crecimiento", clarity: "Claridad", strategy: "Estrategia", leadership: "Liderazgo",
    logic: "Lógica", influence: "Influencia", empathy: "Empatía", expression: "Expresión",
    creation: "Creación", enterprise: "Iniciativa", persistence: "Persistencia", vision: "Visión",
    wisdom: "Sabiduría", curiosity: "Curiosidad",
  },
  de: {
    discipline: "Disziplin", resilience: "Widerstandskraft", precision: "Präzision", awareness: "Achtsamkeit",
    growth: "Wachstum", clarity: "Klarheit", strategy: "Strategie", leadership: "Führung",
    logic: "Logik", influence: "Einfluss", empathy: "Empathie", expression: "Ausdruck",
    creation: "Kreativität", enterprise: "Unternehmergeist", persistence: "Ausdauer", vision: "Vision",
    wisdom: "Weisheit", curiosity: "Neugier",
  },
} as const;

const bot = {
  en: {
    loadError: "The Fortress is temporarily unavailable.",
    challengeError: "Could not issue a new challenge. Please try again.",
    loading: "Loading Fortress bots…", active: "Active", currentChallenge: "Current challenge", preparing: "Preparing…",
    newChallenge: "New challenge", sectionLabel: "GDN-SMART FORTRESS bots",
  },
  fr: {
    loadError: "La Forteresse est temporairement indisponible.",
    challengeError: "Impossible de lancer un nouveau défi. Réessayez.",
    loading: "Chargement des bots de la Forteresse…", active: "Actif", currentChallenge: "Défi actuel", preparing: "Préparation…",
    newChallenge: "Nouveau défi", sectionLabel: "Bots de GDN-SMART FORTRESS",
  },
  ar: {
    loadError: "القلعة غير متاحة مؤقتاً.",
    challengeError: "تعذّر إصدار تحدٍ جديد. حاول مجدداً.",
    loading: "جارٍ تحميل روبوتات القلعة…", active: "نشط", currentChallenge: "التحدي الحالي", preparing: "جارٍ التحضير…",
    newChallenge: "تحدٍ جديد", sectionLabel: "روبوتات GDN-SMART FORTRESS",
  },
  es: {
    loadError: "La Fortaleza no está disponible temporalmente.",
    challengeError: "No se pudo lanzar un nuevo desafío. Inténtalo de nuevo.",
    loading: "Cargando los bots de la Fortaleza…", active: "Activo", currentChallenge: "Desafío actual", preparing: "Preparando…",
    newChallenge: "Nuevo desafío", sectionLabel: "Bots de GDN-SMART FORTRESS",
  },
  de: {
    loadError: "Die Fortress ist vorübergehend nicht verfügbar.",
    challengeError: "Eine neue Herausforderung konnte nicht erstellt werden. Bitte versuche es erneut.",
    loading: "Fortress-Bots werden geladen…", active: "Aktiv", currentChallenge: "Aktuelle Herausforderung", preparing: "Wird vorbereitet…",
    newChallenge: "Neue Herausforderung", sectionLabel: "GDN-SMART FORTRESS Bots",
  },
} as const;

const domains = {
  en: { gaming: "Gaming", education: "Education", business: "Business", social: "Social", competitions: "Competitions", xp: "XP & Level", stream: "Stream", archon: "Archon DNA" },
  fr: { gaming: "Jeux", education: "Éducation", business: "Affaires", social: "Social", competitions: "Compétitions", xp: "XP et niveau", stream: "Stream", archon: "ADN Archon" },
  ar: { gaming: "الألعاب", education: "التعليم", business: "الأعمال", social: "اجتماعي", competitions: "المسابقات", xp: "XP والمستوى", stream: "البث", archon: "Archon DNA" },
  es: { gaming: "Juegos", education: "Educación", business: "Negocios", social: "Social", competitions: "Competiciones", xp: "XP y nivel", stream: "Transmisión", archon: "Archon DNA" },
  de: { gaming: "Gaming", education: "Bildung", business: "Wirtschaft", social: "Soziales", competitions: "Wettbewerbe", xp: "XP & Level", stream: "Stream", archon: "Archon-DNA" },
} as const;

const smart = {
  en: { title: "SMART", recommendation: "SMART", active: "Active", inactive: "Inactive", progressing: "Score improving", activate: "Activate this module", domains },
  fr: { title: "SMART", recommendation: "SMART", active: "Actif", inactive: "Inactif", progressing: "Score en progression", activate: "Activez ce module", domains },
  ar: { title: "SMART", recommendation: "SMART", active: "نشط", inactive: "غير نشط", progressing: "النتيجة في تحسن", activate: "فعّل هذه الوحدة", domains },
  es: { title: "SMART", recommendation: "SMART", active: "Activo", inactive: "Inactivo", progressing: "Puntuación en progreso", activate: "Activa este módulo", domains },
  de: { title: "SMART", recommendation: "SMART", active: "Aktiv", inactive: "Inaktiv", progressing: "Punktzahl verbessert sich", activate: "Dieses Modul aktivieren", domains },
} as const;

const connectivity = {
  en: { offline: "You are offline. Actions that need the network are unavailable.", blocked: "Action blocked. Reconnect to make this change.", reconnecting: "Reconnecting to live updates…" },
  fr: { offline: "Vous êtes hors ligne. Les actions nécessitant le réseau sont indisponibles.", blocked: "Action bloquée. Reconnectez-vous pour effectuer ce changement.", reconnecting: "Reconnexion aux mises à jour en direct…" },
  ar: { offline: "أنت غير متصل. الإجراءات التي تحتاج إلى الشبكة غير متاحة.", blocked: "تم منع الإجراء. أعد الاتصال لتنفيذ هذا التغيير.", reconnecting: "جارٍ إعادة الاتصال بالتحديثات المباشرة…" },
  es: { offline: "No tienes conexión. Las acciones que requieren red no están disponibles.", blocked: "Acción bloqueada. Vuelve a conectarte para realizar este cambio.", reconnecting: "Reconectando a las actualizaciones en directo…" },
  de: { offline: "Du bist offline. Aktionen, die eine Netzwerkverbindung benötigen, sind nicht verfügbar.", blocked: "Aktion blockiert. Stelle die Verbindung wieder her, um diese Änderung vorzunehmen.", reconnecting: "Verbindung zu Live-Aktualisierungen wird wiederhergestellt…" },
} as const;

const royal = {
  en: { title: "Governor Ameeq Consultation Palace", plan: "Today's plan", motivation: "Motivation", progress: "Progress analysis", problem: "Solve a problem", failed: "Connection failed", busy: "The governor is busy in a meeting. Try again later.", speechUnsupported: "Your browser does not support speech recognition. Try Chrome.", notHeard: "I could not hear you clearly — try again.", speak: "Speak with the governor", listening: "Listening… speak now", history: "Previous consultations" },
  fr: { title: "Palais de consultation du gouverneur Ameeq", plan: "Plan du jour", motivation: "Motivation", progress: "Analyse des progrès", problem: "Résoudre un problème", failed: "Échec de la connexion", busy: "Le gouverneur est en réunion. Réessayez plus tard.", speechUnsupported: "Votre navigateur ne prend pas en charge la reconnaissance vocale. Essayez Chrome.", notHeard: "Je ne vous ai pas bien entendu — réessayez.", speak: "Parler au gouverneur", listening: "À l’écoute… parlez maintenant", history: "Consultations précédentes" },
  ar: { title: "قصر استشارة الحاكم Ameeq", plan: "خطة اليوم", motivation: "تحفيز", progress: "تحليل التقدم", problem: "حل مشكلة", failed: "فشل الاتصال", busy: "الحاكم مشغول في اجتماع. حاول لاحقاً.", speechUnsupported: "متصفحك لا يدعم التعرف على الصوت. جرّب Chrome.", notHeard: "لم أسمعك بوضوح — حاول مجدداً.", speak: "تكلم مع الحاكم", listening: "أستمع إليك… تكلم الآن", history: "سجل الاستشارات السابقة" },
  es: { title: "Palacio de consultas del gobernador Ameeq", plan: "Plan de hoy", motivation: "Motivación", progress: "Análisis del progreso", problem: "Resolver un problema", failed: "Error de conexión", busy: "El gobernador está en una reunión. Inténtalo más tarde.", speechUnsupported: "Tu navegador no admite el reconocimiento de voz. Prueba Chrome.", notHeard: "No te oí con claridad — inténtalo de nuevo.", speak: "Hablar con el gobernador", listening: "Escuchando… habla ahora", history: "Consultas anteriores" },
  de: { title: "Beratungspalast von Gouverneur Ameeq", plan: "Heutiger Plan", motivation: "Motivation", progress: "Fortschrittsanalyse", problem: "Ein Problem lösen", failed: "Verbindung fehlgeschlagen", busy: "Der Gouverneur ist in einer Besprechung. Versuche es später erneut.", speechUnsupported: "Dein Browser unterstützt keine Spracherkennung. Versuche es mit Chrome.", notHeard: "Ich konnte dich nicht deutlich hören — versuche es erneut.", speak: "Mit dem Gouverneur sprechen", listening: "Ich höre zu… sprich jetzt", history: "Frühere Beratungen" },
} as const;

const errorBoundary = {
  en: { title: "A temporary problem occurred on this page", text: "You do not need to leave the site — press the button to restore the page.", retry: "Try again", home: "Back to home" },
  fr: { title: "Un problème temporaire est survenu sur cette page", text: "Vous n’avez pas besoin de quitter le site — appuyez sur le bouton pour relancer la page.", retry: "Réessayer", home: "Retour à l’accueil" },
  ar: { title: "وقع خلل مؤقت في هذه الصفحة", text: "لا داعي للخروج من الموقع — اضغط الزر وستعود الصفحة للعمل.", retry: "إعادة المحاولة", home: "العودة للرئيسية" },
  es: { title: "Se produjo un problema temporal en esta página", text: "No necesitas salir del sitio — pulsa el botón para volver a cargar la página.", retry: "Reintentar", home: "Volver al inicio" },
  de: { title: "Auf dieser Seite ist ein vorübergehendes Problem aufgetreten", text: "Du musst die Website nicht verlassen — drücke die Schaltfläche, um die Seite wiederherzustellen.", retry: "Erneut versuchen", home: "Zurück zur Startseite" },
} as const;

const coins = {
  en: { text: "⚠️ Arena Qaisypro coins are virtual credits with no real-world monetary value. Not exchangeable for cash or crypto.", dismiss: "Dismiss" },
  fr: { text: "⚠️ Les coins Arena Qaisypro sont des crédits virtuels sans valeur monétaire réelle et ne peuvent être échangés contre de l’argent ou des cryptomonnaies.", dismiss: "Fermer" },
  ar: { text: "⚠️ كوينز Arena Qaisypro رصيد افتراضي فقط، ليس له قيمة نقدية حقيقية ولا يمكن استبداله بمال أو عملات رقمية.", dismiss: "إغلاق" },
  es: { text: "⚠️ Las monedas Arena Qaisypro son créditos virtuales sin valor monetario real y no se pueden canjear por dinero ni criptomonedas.", dismiss: "Cerrar" },
  de: { text: "⚠️ Arena Qaisypro Coins sind virtuelle Guthaben ohne realen Geldwert. Sie können nicht gegen Bargeld oder Kryptowährungen eingetauscht werden.", dismiss: "Schließen" },
} as const;

const uploadErrors = {
  en: { server: (status: number) => `The server rejected the upload (error ${status}). Try again.`, network: "Network error. Check your connection and try again." },
  fr: { server: (status: number) => `Le serveur a refusé le téléversement (erreur ${status}). Réessayez.`, network: "Erreur réseau. Vérifiez votre connexion et réessayez." },
  ar: { server: (status: number) => `رفض الخادم عملية الرفع (الخطأ ${status}). حاول مجدداً.`, network: "خطأ في الشبكة. تحقق من اتصالك وحاول مجدداً." },
  es: { server: (status: number) => `El servidor rechazó la carga (error ${status}). Inténtalo de nuevo.`, network: "Error de red. Comprueba tu conexión e inténtalo de nuevo." },
  de: { server: (status: number) => `Der Server hat den Upload abgelehnt (Fehler ${status}). Versuche es erneut.`, network: "Netzwerkfehler. Prüfe deine Verbindung und versuche es erneut." },
} as const;

export const sharedCopy = (lang: Lang | string) => {
  const active = activeSharedLang(lang);
  return {
    bot: { ...bot[active], dna: dna[active] },
    smart: { ...smart[active], domains: domains[active] },
    connectivity: connectivity[active],
    royal: royal[active],
    errorBoundary: errorBoundary[active],
    coins: coins[active],
    uploadErrors: uploadErrors[active],
  };
};