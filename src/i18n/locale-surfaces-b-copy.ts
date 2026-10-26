import type { Lang } from "@/contexts/LangContext";

export const localeForSurfaceB: Record<Lang, string> = {
  en: "en-US",
  fr: "fr-FR",
  ar: "ar-MA",
  es: "es-ES",
  de: "de-DE",
};

export function formatSurfaceNumber(
  lang: Lang,
  value: number,
  options?: Intl.NumberFormatOptions,
): string {
  return new Intl.NumberFormat(localeForSurfaceB[lang], options).format(value);
}

export function formatSurfaceDate(
  lang: Lang,
  value: string | number | Date,
  options?: Intl.DateTimeFormatOptions,
): string {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return new Intl.DateTimeFormat(localeForSurfaceB[lang], options).format(date);
}