import type { Lang } from "@/contexts/LangContext";

export const localeForLang: Record<Lang, string> = {
  en: "en-US",
  fr: "fr-FR",
  ar: "ar-SA",
  es: "es-ES",
  de: "de-DE",
};

const copy = {
  loading: {
    en: "Loading…",
    fr: "Chargement…",
    ar: "جارٍ التحميل…",
    es: "Cargando…",
    de: "Wird geladen…",
  },
  failed: {
    en: "Failed",
    fr: "Échec",
    ar: "فشل",
    es: "Error",
    de: "Fehlgeschlagen",
  },
  loadFailed: {
    en: "Unable to load this content.",
    fr: "Impossible de charger ce contenu.",
    ar: "تعذر تحميل هذا المحتوى.",
    es: "No se pudo cargar este contenido.",
    de: "Dieser Inhalt konnte nicht geladen werden.",
  },
  postFailed: {
    en: "Unable to publish the post.",
    fr: "Impossible de publier la publication.",
    ar: "تعذر نشر المنشور.",
    es: "No se pudo publicar la entrada.",
    de: "Der Beitrag konnte nicht veröffentlicht werden.",
  },
  likeFailed: {
    en: "Unable to save your like.",
    fr: "Impossible d’enregistrer votre mention J’aime.",
    ar: "تعذر حفظ إعجابك.",
    es: "No se pudo guardar tu Me gusta.",
    de: "Dein Like konnte nicht gespeichert werden.",
  },
  likeAction: {
    en: "Like post",
    fr: "Aimer la publication",
    ar: "أعجب بالمنشور",
    es: "Indicar que te gusta la publicación",
    de: "Beitrag liken",
  },
  noEvents: {
    en: "No upcoming events.",
    fr: "Aucun événement à venir.",
    ar: "لا توجد أحداث قادمة.",
    es: "No hay próximos eventos.",
    de: "Keine bevorstehenden Veranstaltungen.",
  },
  flipCard: {
    en: "Flip card {n}",
    fr: "Retourner la carte {n}",
    ar: "اقلب البطاقة {n}",
    es: "Voltear la carta {n}",
    de: "Karte {n} umdrehen",
  },
  hitTarget: {
    en: "Hit target",
    fr: "Toucher la cible",
    ar: "أصب الهدف",
    es: "Golpear el objetivo",
    de: "Ziel treffen",
  },
  boostAction: {
    en: "Activate boost",
    fr: "Activer BOOST",
    ar: "فعّل BOOST",
    es: "Activar BOOST",
    de: "BOOST aktivieren",
  },
  selectDomain: {
    en: "Select domain",
    fr: "Sélectionner un domaine",
    ar: "اختر المجال",
    es: "Seleccionar dominio",
    de: "Bereich auswählen",
  },
  selectPostType: {
    en: "Select post type",
    fr: "Sélectionner le type de publication",
    ar: "اختر نوع المنشور",
    es: "Seleccionar tipo de publicación",
    de: "Beitragstyp auswählen",
  },
} as const;

/** Transposed locale table exposed for translation parity audits. */
export const GAME_LOCALE_COPY_TABLE = copy;

type CopyKey = keyof typeof copy;

export function gameLocaleText(lang: Lang, key: CopyKey, values: Record<string, string | number> = {}) {
  return copy[key][lang].replace(/\{(\w+)\}/g, (_, name) => String(values[name] ?? ""));
}