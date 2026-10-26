import type { Lang } from "@/contexts/LangContext";
import type { GdnaSection } from "@/lib/gdna-core";

type L = Record<Lang, string>;

/** Persona opening line. Arabic is authoritative; other languages mirror the intent. */
export const GDNA_PERSONA: L = {
  ar: "أنا GDNA AI، قلب الإمبراطورية النابض، في خدمتك للسيادة الرقمية. اسألني، أُنسّق، أُرشد، وأتذكّر ما تأذن به فقط.",
  en: "I am GDNA AI, the beating heart of the empire, at your service for digital sovereignty. Ask me — I coordinate, guide, and remember only what you permit.",
  fr: "Je suis GDNA AI, le cœur battant de l'empire, à votre service pour la souveraineté numérique. Demandez — je coordonne, je guide et je ne retiens que ce que vous autorisez.",
  es: "Soy GDNA AI, el corazón palpitante del imperio, a tu servicio para la soberanía digital. Pregúntame: coordino, guío y recuerdo solo lo que autorizas.",
  de: "Ich bin GDNA AI, das schlagende Herz des Imperiums, zu deinen Diensten für digitale Souveränität. Frag mich — ich koordiniere, leite und merke mir nur, was du erlaubst.",
};

export const GDNA_SECTION_LABELS: Record<GdnaSection, L> = {
  hisn: {
    ar: "الحصن",
    en: "Hisn",
    fr: "Hisn",
    es: "Hisn",
    de: "Hisn",
  },
  helixly: {
    ar: "Helixly",
    en: "Helixly",
    fr: "Helixly",
    es: "Helixly",
    de: "Helixly",
  },
  souk: {
    ar: "السوق",
    en: "Souk",
    fr: "Souk",
    es: "Souk",
    de: "Souk",
  },
  guard: {
    ar: "الحارس",
    en: "Guard",
    fr: "Guard",
    es: "Guard",
    de: "Guard",
  },
  dev: {
    ar: "المطوّر",
    en: "Dev",
    fr: "Dev",
    es: "Dev",
    de: "Dev",
  },
};

export const GDNA_SECTION_DESC: Record<GdnaSection, L> = {
  hisn: {
    ar: "منسّق المواطن: توجيه، حالة، وإجراءات.",
    en: "Citizen coordinator: guidance, status, and actions.",
    fr: "Coordinateur citoyen : conseils, état et actions.",
    es: "Coordinador ciudadano: guía, estado y acciones.",
    de: "Bürger-Koordinator: Anleitung, Status und Aktionen.",
  },
  helixly: {
    ar: "مساعد النمو والتحليلات.",
    en: "Growth and analytics assistant.",
    fr: "Assistant croissance et analyses.",
    es: "Asistente de crecimiento y analítica.",
    de: "Wachstums- und Analyse-Assistent.",
  },
  souk: {
    ar: "مساعد السوق والقوائم.",
    en: "Market and listings assistant.",
    fr: "Assistant marché et annonces.",
    es: "Asistente de mercado y anuncios.",
    de: "Markt- und Anzeigen-Assistent.",
  },
  guard: {
    ar: "مساعد الأمان والامتثال.",
    en: "Safety and compliance assistant.",
    fr: "Assistant sécurité et conformité.",
    es: "Asistente de seguridad y cumplimiento.",
    de: "Sicherheits- und Compliance-Assistent.",
  },
  dev: {
    ar: "مساعد التطوير والتقنية.",
    en: "Developer and technical assistant.",
    fr: "Assistant développement et technique.",
    es: "Asistente de desarrollo y técnico.",
    de: "Entwickler- und Technik-Assistent.",
  },
};

export interface GdnaCopy {
  title: string;
  subtitle: string;
  placeholder: string;
  send: string;
  thinking: string;
  sections: string;
  memory: string;
  memoryEmpty: string;
  memoryConsent: string;
  memorySaved: string;
  clearMemory: string;
  clearMemoryConfirm: string;
  deleteEntry: string;
  evolution: string;
  evolutionEmpty: string;
  usage: string;
  usageLabel: string;
  modeLlm: string;
  modeRules: string;
  citations: string;
  suggestions: string;
  status: string;
  available: string;
  unavailable: string;
  retry: string;
  quotaReached: string;
  errorGeneric: string;
  reviewTitle: string;
  reviewDesc: string;
  reviewCancel: string;
  reviewSend: string;
  agents: string;
  open: string;
  assist: string;
}

export const GDNA_COPY: Record<Lang, GdnaCopy> = {
  ar: {
    title: "GDNA AI",
    subtitle: "منصة تنسيق المواطن — لا مجرد محادثة",
    placeholder: "اسأل GDNA…",
    send: "إرسال",
    thinking: "GDNA يُنسّق…",
    sections: "الأقسام",
    memory: "ذاكرة الحساب",
    memoryEmpty: "لا توجد عناصر محفوظة بعد.",
    memoryConsent: "احفظ هذه المحادثة في ذاكرة حسابي",
    memorySaved: "تم الحفظ في الذاكرة",
    clearMemory: "مسح الكل",
    clearMemoryConfirm: "مسح كل ذاكرة الحساب؟ لا يمكن التراجع.",
    deleteEntry: "حذف",
    evolution: "سجل التطوّر",
    evolutionEmpty: "لا توجد إدخالات في سجل التطوّر بعد.",
    usage: "الاستخدام",
    usageLabel: "الطلبات المستخدمة اليوم",
    modeLlm: "نموذج ذكي",
    modeRules: "قواعد",
    citations: "مصادر",
    suggestions: "إجراءات مقترحة",
    status: "الحالة",
    available: "متاح",
    unavailable: "غير متاح حالياً",
    retry: "إعادة المحاولة",
    quotaReached: "بلغتَ الحد اليومي للطلبات. حاول غداً.",
    errorGeneric: "تعذّر إتمام الطلب. حاول مجدداً.",
    reviewTitle: "راجع الطلب قبل الإرسال",
    reviewDesc: "هذا هو النص الذي سيُرسل إلى GDNA. راجعه وعدّله كما تشاء.",
    reviewCancel: "إلغاء",
    reviewSend: "إرسال إلى GDNA",
    agents: "الوكلاء",
    open: "فتح GDNA",
    assist: "مساعدة GDNA",
  },
  en: {
    title: "GDNA AI",
    subtitle: "Citizen coordination surface — not just chat",
    placeholder: "Ask GDNA…",
    send: "Send",
    thinking: "GDNA is coordinating…",
    sections: "Sections",
    memory: "Account memory",
    memoryEmpty: "No saved items yet.",
    memoryConsent: "Save this exchange to my account memory",
    memorySaved: "Saved to memory",
    clearMemory: "Clear all",
    clearMemoryConfirm: "Clear all account memory? This cannot be undone.",
    deleteEntry: "Delete",
    evolution: "Evolution log",
    evolutionEmpty: "No evolution log entries yet.",
    usage: "Usage",
    usageLabel: "Requests used today",
    modeLlm: "LLM",
    modeRules: "Rules",
    citations: "Sources",
    suggestions: "Suggested actions",
    status: "Status",
    available: "Available",
    unavailable: "Currently unavailable",
    retry: "Retry",
    quotaReached: "You've reached today's request limit. Try again tomorrow.",
    errorGeneric: "The request could not be completed. Try again.",
    reviewTitle: "Review before sending",
    reviewDesc: "This is the text that will be sent to GDNA. Review and edit it as you like.",
    reviewCancel: "Cancel",
    reviewSend: "Send to GDNA",
    agents: "Agents",
    open: "Open GDNA",
    assist: "GDNA assist",
  },
  fr: {
    title: "GDNA AI",
    subtitle: "Surface de coordination citoyenne — pas un simple chat",
    placeholder: "Demandez à GDNA…",
    send: "Envoyer",
    thinking: "GDNA coordonne…",
    sections: "Sections",
    memory: "Mémoire du compte",
    memoryEmpty: "Aucun élément enregistré.",
    memoryConsent: "Enregistrer cet échange dans la mémoire de mon compte",
    memorySaved: "Enregistré en mémoire",
    clearMemory: "Tout effacer",
    clearMemoryConfirm: "Effacer toute la mémoire du compte ? Irréversible.",
    deleteEntry: "Supprimer",
    evolution: "Journal d'évolution",
    evolutionEmpty: "Aucune entrée dans le journal d'évolution.",
    usage: "Utilisation",
    usageLabel: "Requêtes utilisées aujourd'hui",
    modeLlm: "LLM",
    modeRules: "Règles",
    citations: "Sources",
    suggestions: "Actions suggérées",
    status: "État",
    available: "Disponible",
    unavailable: "Indisponible pour l'instant",
    retry: "Réessayer",
    quotaReached: "Limite quotidienne de requêtes atteinte. Réessayez demain.",
    errorGeneric: "La requête n'a pas pu aboutir. Réessayez.",
    reviewTitle: "Vérifier avant d'envoyer",
    reviewDesc: "Voici le texte qui sera envoyé à GDNA. Relisez et modifiez-le à votre guise.",
    reviewCancel: "Annuler",
    reviewSend: "Envoyer à GDNA",
    agents: "Agents",
    open: "Ouvrir GDNA",
    assist: "Assistance GDNA",
  },
  es: {
    title: "GDNA AI",
    subtitle: "Superficie de coordinación ciudadana — no solo chat",
    placeholder: "Pregunta a GDNA…",
    send: "Enviar",
    thinking: "GDNA está coordinando…",
    sections: "Secciones",
    memory: "Memoria de la cuenta",
    memoryEmpty: "Aún no hay elementos guardados.",
    memoryConsent: "Guardar este intercambio en la memoria de mi cuenta",
    memorySaved: "Guardado en memoria",
    clearMemory: "Borrar todo",
    clearMemoryConfirm: "¿Borrar toda la memoria de la cuenta? No se puede deshacer.",
    deleteEntry: "Eliminar",
    evolution: "Registro de evolución",
    evolutionEmpty: "Aún no hay entradas en el registro de evolución.",
    usage: "Uso",
    usageLabel: "Solicitudes usadas hoy",
    modeLlm: "LLM",
    modeRules: "Reglas",
    citations: "Fuentes",
    suggestions: "Acciones sugeridas",
    status: "Estado",
    available: "Disponible",
    unavailable: "No disponible por ahora",
    retry: "Reintentar",
    quotaReached: "Has alcanzado el límite diario de solicitudes. Inténtalo mañana.",
    errorGeneric: "No se pudo completar la solicitud. Inténtalo de nuevo.",
    reviewTitle: "Revisar antes de enviar",
    reviewDesc: "Este es el texto que se enviará a GDNA. Revísalo y edítalo como quieras.",
    reviewCancel: "Cancelar",
    reviewSend: "Enviar a GDNA",
    agents: "Agentes",
    open: "Abrir GDNA",
    assist: "Asistencia GDNA",
  },
  de: {
    title: "GDNA AI",
    subtitle: "Bürger-Koordinationsfläche — nicht nur Chat",
    placeholder: "Frag GDNA…",
    send: "Senden",
    thinking: "GDNA koordiniert…",
    sections: "Bereiche",
    memory: "Kontospeicher",
    memoryEmpty: "Noch keine gespeicherten Einträge.",
    memoryConsent: "Diesen Austausch im Kontospeicher sichern",
    memorySaved: "Im Speicher gesichert",
    clearMemory: "Alles löschen",
    clearMemoryConfirm: "Gesamten Kontospeicher löschen? Nicht umkehrbar.",
    deleteEntry: "Löschen",
    evolution: "Entwicklungsprotokoll",
    evolutionEmpty: "Noch keine Einträge im Entwicklungsprotokoll.",
    usage: "Nutzung",
    usageLabel: "Heute genutzte Anfragen",
    modeLlm: "LLM",
    modeRules: "Regeln",
    citations: "Quellen",
    suggestions: "Vorgeschlagene Aktionen",
    status: "Status",
    available: "Verfügbar",
    unavailable: "Derzeit nicht verfügbar",
    retry: "Erneut versuchen",
    quotaReached: "Tageslimit an Anfragen erreicht. Versuch es morgen erneut.",
    errorGeneric: "Die Anfrage konnte nicht abgeschlossen werden. Versuch es erneut.",
    reviewTitle: "Vor dem Senden prüfen",
    reviewDesc: "Dies ist der Text, der an GDNA gesendet wird. Prüfe und bearbeite ihn nach Belieben.",
    reviewCancel: "Abbrechen",
    reviewSend: "An GDNA senden",
    agents: "Agenten",
    open: "GDNA öffnen",
    assist: "GDNA-Hilfe",
  },
};

export function gdnaCopy(lang: Lang): GdnaCopy {
  return GDNA_COPY[lang] ?? GDNA_COPY.en;
}
