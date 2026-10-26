import type { Lang } from "@/contexts/LangContext";

const en = {
  archonSystem: "ARCHON SYSTEM v4.2",
  xp: "XP",
  winRate: "WR",
  clipsHeading: "CLIPS",
  clipsDeleteError: "Could not delete the clip",
  clipsDeleted: "Clip deleted",
  tryAgain: "Try again",
  clipsRightsProtection: "Intellectual property is protected: only the owner may publish the original recording. Every file receives a digital fingerprint, and identical copies are rejected.",
  clipsRecordingGuide: "Recordings made with your phone or camera may be published, provided they are not identical copies of the original.",
  uploading: "Uploading…",
  publishClip: "Publish clip",
  publish: "Publish",
  noClips: "No clips yet",
  noClipsDescription: "Be the first to publish your work — producer, singer, gamer… everyone has a craft.",
  showMore: "Show more",
  fortress: "FORTRESS",
  system: "SYSTEM",
  smartTagline: "GDNA Arena Intelligent System — Real-time analysis · Personalized recommendations",
  neonRacer: "NEON RACER",
  cryptoClash: "CRYPTO CLASH",
  arenaStrike: "ARENA STRIKE",
} as const;

type FinalLabelKey = keyof typeof en;
type FinalLabels = Record<FinalLabelKey, string>;

const fr: FinalLabels = {
  archonSystem: "SYSTÈME ARCHON v4.2",
  xp: "XP",
  winRate: "TV",
  clipsHeading: "CLIPS",
  clipsDeleteError: "Impossible de supprimer le clip",
  clipsDeleted: "Clip supprimé",
  tryAgain: "Réessayez",
  clipsRightsProtection: "La propriété intellectuelle est protégée : seul le propriétaire peut publier l’enregistrement original. Chaque fichier reçoit une empreinte numérique et les copies identiques sont rejetées.",
  clipsRecordingGuide: "Les enregistrements réalisés avec votre téléphone ou votre caméra peuvent être publiés, à condition de ne pas être des copies identiques de l’original.",
  uploading: "Téléversement…",
  publishClip: "Publier le clip",
  publish: "Publier",
  noClips: "Aucun clip pour le moment",
  noClipsDescription: "Soyez le premier à publier votre œuvre — producteur, chanteur, joueur… chacun a son talent.",
  showMore: "Voir plus",
  fortress: "FORTERESSE",
  system: "SYSTÈME",
  smartTagline: "Système intelligent GDNA Arena — Analyse en temps réel · Recommandations personnalisées",
  neonRacer: "NEON RACER",
  cryptoClash: "CRYPTO CLASH",
  arenaStrike: "ARENA STRIKE",
};

const ar: FinalLabels = {
  archonSystem: "نظام ARCHON v4.2",
  xp: "نقاط الخبرة",
  winRate: "نسبة الفوز",
  clipsHeading: "الكليبات",
  clipsDeleteError: "تعذر حذف الكليب",
  clipsDeleted: "تم حذف الكليب",
  tryAgain: "حاول مجدداً",
  clipsRightsProtection: "الملكية الفكرية محمية: لا يحق نشر التسجيل الأصلي إلا لصاحب العمل. يُسجَّل كل ملف ببصمة رقمية وتُرفض النسخ المطابقة.",
  clipsRecordingGuide: "يمكن نشر التسجيلات المصوّرة بهاتفك أو كاميرتك، بشرط ألا تكون نسخة مطابقة للأصل.",
  uploading: "جارٍ الرفع…",
  publishClip: "نشر الكليب",
  publish: "نشر",
  noClips: "لا توجد كليبات حالياً",
  noClipsDescription: "كن أول من ينشر عمله — منتجاً أو مغنياً أو لاعباً… لكل شخص موهبته.",
  showMore: "عرض المزيد",
  fortress: "القلعة",
  system: "النظام",
  smartTagline: "نظام GDNA Arena الذكي — تحليل فوري · توصيات مخصّصة",
  neonRacer: "NEON RACER",
  cryptoClash: "CRYPTO CLASH",
  arenaStrike: "ARENA STRIKE",
};

const es: FinalLabels = {
  archonSystem: "SISTEMA ARCHON v4.2",
  xp: "XP",
  winRate: "PV",
  clipsHeading: "CLIPS",
  clipsDeleteError: "No se pudo eliminar el clip",
  clipsDeleted: "Clip eliminado",
  tryAgain: "Inténtalo de nuevo",
  clipsRightsProtection: "La propiedad intelectual está protegida: solo el propietario puede publicar la grabación original. Cada archivo recibe una huella digital y las copias idénticas se rechazan.",
  clipsRecordingGuide: "Las grabaciones hechas con tu teléfono o cámara pueden publicarse, siempre que no sean copias idénticas del original.",
  uploading: "Subiendo…",
  publishClip: "Publicar clip",
  publish: "Publicar",
  noClips: "Aún no hay clips",
  noClipsDescription: "Sé el primero en publicar tu obra — productor, cantante, jugador… cada persona tiene su talento.",
  showMore: "Ver más",
  fortress: "FORTALEZA",
  system: "SISTEMA",
  smartTagline: "Sistema inteligente de GDNA Arena — Análisis en tiempo real · Recomendaciones personalizadas",
  neonRacer: "NEON RACER",
  cryptoClash: "CRYPTO CLASH",
  arenaStrike: "ARENA STRIKE",
};

const de: FinalLabels = {
  archonSystem: "ARCHON-SYSTEM v4.2",
  xp: "XP",
  winRate: "SR",
  clipsHeading: "CLIPS",
  clipsDeleteError: "Der Clip konnte nicht gelöscht werden",
  clipsDeleted: "Clip gelöscht",
  tryAgain: "Erneut versuchen",
  clipsRightsProtection: "Geistiges Eigentum ist geschützt: Nur der Eigentümer darf die Originalaufnahme veröffentlichen. Jede Datei erhält einen digitalen Fingerabdruck; identische Kopien werden abgelehnt.",
  clipsRecordingGuide: "Aufnahmen mit deinem Smartphone oder deiner Kamera dürfen veröffentlicht werden, sofern sie keine identischen Kopien des Originals sind.",
  uploading: "Wird hochgeladen…",
  publishClip: "Clip veröffentlichen",
  publish: "Veröffentlichen",
  noClips: "Noch keine Clips",
  noClipsDescription: "Veröffentliche als Erste oder Erster dein Werk — ob Produzent, Sängerin, Gamer … jeder hat sein Handwerk.",
  showMore: "Mehr anzeigen",
  fortress: "FESTUNG",
  system: "SYSTEM",
  smartTagline: "Intelligentes System der GDNA Arena — Echtzeitanalyse · Personalisierte Empfehlungen",
  neonRacer: "NEON RACER",
  cryptoClash: "CRYPTO CLASH",
  arenaStrike: "ARENA STRIKE",
};

const copy: Record<Lang, FinalLabels> = { en, fr, ar, es, de };

/** Supported-locale dictionaries exposed for translation parity audits. */
export const FINAL_LABELS_COPY = { en, fr, ar, es, de } as const;

export function finalLabelText(lang: Lang, key: FinalLabelKey): string {
  return copy[lang][key];
}