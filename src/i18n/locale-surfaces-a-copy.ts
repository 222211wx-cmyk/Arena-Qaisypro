import type { Lang } from "@/contexts/LangContext";

const LOCALES: Record<Lang, string> = {
  en: "en-GB",
  fr: "fr-FR",
  ar: "ar-MA",
  es: "es-ES",
  de: "de-DE",
};

const COPY = {
  logoutFailed: {
    en: "Logout failed",
    fr: "Échec de la déconnexion",
    ar: "فشل تسجيل الخروج",
    es: "Error al cerrar sesión",
    de: "Abmeldung fehlgeschlagen",
  },
} as const;

/** Transposed locale table exposed for translation parity audits. */
export const LOCALE_SURFACES_A_COPY_TABLE = COPY;

export function localeForLang(lang: Lang): string {
  return LOCALES[lang];
}

export function localeSurfacesAText(lang: Lang, key: keyof typeof COPY): string {
  return COPY[key][lang];
}