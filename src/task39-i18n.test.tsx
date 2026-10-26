import "@testing-library/jest-dom/vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  getLocaleTranslationKeys,
  getLocaleTranslations,
  LangProvider,
  useLang,
  type FullyTranslatedLang,
  type Lang,
} from "@/contexts/LangContext";
import { contentCopy } from "@/i18n/content-discovery-copy";
import { SOCIAL_SUPPORTED_T } from "@/components/social/social-i18n";
import { COMMUNITY_SURFACES_COPY, LEGAL_COPY, ADMIN_COPY, surfaceText, legalText, adminText } from "@/i18n/community-admin-surfaces-copy";
import { COMMUNITY_T } from "@/i18n/community-pages";
import { CONTENT_DISCOVERY_COPY } from "@/i18n/content-discovery-copy";
import { surfaceCopy } from "@/i18n/content-surfaces-copy";
import { coreCopy } from "@/i18n/core-auth-copy";
import { DASHBOARD_COPY_TABLE, dashboardText } from "@/i18n/dashboard-copy";
import { FINAL_LABELS_COPY, finalLabelText } from "@/i18n/final-labels-copy";
import { FINANCE_COPY, financeT } from "@/i18n/finance-copy";
import { FINANCE_ONBOARDING_COPY, onboardingT } from "@/i18n/finance-onboarding-copy";
import { FRIENDS_COPY, friendsCopy } from "@/i18n/friends-copy";
import { GAME_CHROME_COPY, gameText } from "@/i18n/game-chrome";
import { GAME_LOCALE_COPY_TABLE, gameLocaleText } from "@/i18n/game-locale-copy";
import { LOCALE_SURFACES_A_COPY_TABLE, localeSurfacesAText } from "@/i18n/locale-surfaces-a-copy";
import { formatSurfaceDate, formatSurfaceNumber, localeForSurfaceB } from "@/i18n/locale-surfaces-b-copy";
import { getMessengerCopy } from "@/i18n/messenger-complete-copy";
import { sharedCopy } from "@/i18n/shared-components-copy";
import { STORIES_COPY, storiesCopy } from "@/i18n/stories-copy";
import { getReserveCopy } from "@/i18n/royal-reserve-copy";
import { getMissedCallsCopy } from "@/i18n/missed-calls-copy";
import { task39, task39Text } from "@/i18n/task39";
import { TECH_COPY_TABLE, techT } from "@/i18n/tech-surfaces-copy";
import { aboutTraditionsCopy } from "@/globalstar/i18n/about-traditions-copy";
import { adminUploadCopy } from "@/globalstar/i18n/admin-upload-copy";
import { earningsFigureCopy } from "@/globalstar/i18n/earnings-figure-copy";
import { homeRankingCopy } from "@/globalstar/i18n/home-ranking-copy";
import { leaderboardMediaCopy } from "@/globalstar/i18n/leaderboard-media-copy";
import { newsVoteCopy } from "@/globalstar/i18n/news-vote-copy";
import {
  LanguageProvider as GlobalStarLanguageProvider,
  useLanguage,
} from "@/globalstar/contexts/language-context";

const exposedLocales = ["en", "fr", "ar", "es", "de"] as const satisfies readonly FullyTranslatedLang[];
// Marker acronyms are intentionally case-sensitive: Spanish "Todo" is authored copy, not a TODO.
const translationMarker = /\b(?:TODO|FIXME|TBD)\b|[Tt]ranslation[-_ ][Pp]laceholder/;

function interpolationPlaceholders(value: string): string[] {
  return [...value.matchAll(/\{\{?\s*([\w.-]+)\s*\}?\}/g)]
    .map((match) => match[1])
    .sort();
}

describe("Task 39 LangContext translation contract", () => {
  it("keeps EN/FR/AR/ES/DE at the exact same complete 861-key set with valid values and interpolation parity", () => {
    const englishKeys = [...getLocaleTranslationKeys("en")].sort();
    expect(englishKeys).toHaveLength(861);

    for (const locale of exposedLocales) {
      const translations = getLocaleTranslations(locale);
      const localeKeys = [...getLocaleTranslationKeys(locale)].sort();

      expect(localeKeys, `${locale} must have exactly the English keys`).toEqual(englishKeys);
      expect(localeKeys).toHaveLength(861);

      for (const key of englishKeys) {
        const value = translations[key];
        expect(typeof value, `${locale}.${key} must be a string`).toBe("string");
        expect(value.trim(), `${locale}.${key} must not be empty`).not.toBe("");
        expect(value, `${locale}.${key} must not contain a translation marker`).not.toMatch(translationMarker);
        expect(
          interpolationPlaceholders(value),
          `${locale}.${key} must preserve English interpolation placeholders`,
        ).toEqual(interpolationPlaceholders(getLocaleTranslations("en")[key]));
      }
    }
  });

  it("resolves authored Empire, Legal, Chronicle, and Growth/NLP copy in every parity locale instead of fallback copy", () => {
    const expected = {
      en: {
        empire_sub: "Sovereign Digital Platform — International Standards & AI Law",
        legal_title: "Legal Center",
        chrono_badge: "Digital Time Chronicle",
        nlp_badge: "NLP · Self-Development System",
        growth_archon_system: "Archon system",
      },
      es: {
        empire_sub: "Plataforma digital soberana — Normas internacionales y legislación sobre IA",
        legal_title: "Centro legal",
        chrono_badge: "Crónica digital del tiempo",
        nlp_badge: "NLP · Sistema de Desarrollo Personal",
        growth_archon_system: "Sistema de arcontes",
      },
      fr: {
        empire_sub: "Plateforme Numérique Souveraine — Standards Internationaux & Gouvernance IA",
        legal_title: "Centre Légal",
        chrono_badge: "Chronique du Temps Numérique",
        nlp_badge: "NLP · Système de Développement Personnel",
        growth_archon_system: "Système Archon",
      },
      ar: {
        empire_sub: "منصة رقمية ذات سيادة — معايير دولية وحوكمة ذكاء اصطناعي",
        legal_title: "المركز القانوني",
        chrono_badge: "السجل الزمني الرقمي",
        nlp_badge: "NLP · نظام تطوير الذات",
        growth_archon_system: "نظام الأركون",
      },
      de: {
        empire_sub: "Souveräne digitale Plattform – internationale Standards und AI-Recht",
        legal_title: "Rechtszentrum",
        chrono_badge: "Digitale Zeitchronik",
        nlp_badge: "NLP · Selbstentwicklungssystem",
        growth_archon_system: "Archon-System",
      },
    } as const satisfies Record<FullyTranslatedLang, Record<string, string>>;

    for (const locale of exposedLocales) {
      const translations = getLocaleTranslations(locale);
      for (const [key, authoredValue] of Object.entries(expected[locale])) {
        expect(translations[key], `${locale}.${key}`).toBe(authoredValue);
        if (locale !== "en") {
          expect(translations[key], `${locale}.${key} must not use English fallback`).not.toBe(
            getLocaleTranslations("en")[key],
          );
        }
      }
    }
  });
});

const supplementalSources = import.meta.glob(
  [
    "./i18n/*.ts",
    "./globalstar/i18n/*.ts",
    "./components/social/social-i18n.ts",
  ],
  { eager: true, query: "?raw", import: "default" },
) as Record<string, string>;

const expectedSupplementalFiles = [
  "./components/social/social-i18n.ts",
  "./globalstar/i18n/about-traditions-copy.ts",
  "./globalstar/i18n/admin-upload-copy.ts",
  "./globalstar/i18n/earnings-figure-copy.ts",
  "./globalstar/i18n/home-ranking-copy.ts",
  "./globalstar/i18n/leaderboard-media-copy.ts",
  "./globalstar/i18n/news-vote-copy.ts",
  "./i18n/community-admin-surfaces-copy.ts",
  "./i18n/community-pages.ts",
  "./i18n/content-discovery-copy.ts",
  "./i18n/content-surfaces-copy.ts",
  "./i18n/core-auth-copy.ts",
  "./i18n/dashboard-copy.ts",
  "./i18n/final-labels-copy.ts",
  "./i18n/finance-copy.ts",
  "./i18n/finance-onboarding-copy.ts",
  "./i18n/friends-copy.ts",
  "./i18n/game-chrome.ts",
  "./i18n/game-locale-copy.ts",
  "./i18n/locale-surfaces-a-copy.ts",
  "./i18n/locale-surfaces-b-copy.ts",
  "./i18n/messenger-complete-copy.ts",
  "./i18n/missed-calls-copy.ts",
  "./i18n/royal-reserve-copy.ts",
  "./i18n/shared-components-copy.ts",
  "./i18n/stories-copy.ts",
  "./i18n/task39.ts",
  "./i18n/tech-surfaces-copy.ts",
] as const;

describe("Task 39 supplemental copy coverage", () => {
  type LocaleSnapshots = Record<FullyTranslatedLang, unknown>;

  const selectSupported = (table: Record<string, unknown>): LocaleSnapshots =>
    Object.fromEntries(exposedLocales.map((locale) => [locale, table[locale]])) as LocaleSnapshots;

  const fromGetter = (getter: (locale: FullyTranslatedLang) => unknown): LocaleSnapshots =>
    Object.fromEntries(exposedLocales.map((locale) => [locale, getter(locale)])) as LocaleSnapshots;

  const keysOf = <T extends Record<string, unknown>>(value: T) =>
    Object.keys(value) as Array<keyof T & string>;

  const placeholderValues = (template: string | undefined): Record<string, string> =>
    Object.fromEntries(interpolationPlaceholders(template ?? "").map((name) => [name, `{${name}}`]));

  const fromKeyGetter = <K extends string>(
    keys: readonly K[],
    getter: (locale: FullyTranslatedLang, key: K, values: Record<string, string>) => unknown,
    englishTemplates?: Record<K, string>,
  ): LocaleSnapshots =>
    Object.fromEntries(exposedLocales.map((locale) => [
      locale,
      Object.fromEntries(keys.map((key) => [
        key,
        getter(locale, key, placeholderValues(englishTemplates?.[key])),
      ])),
    ])) as LocaleSnapshots;

  const mergeSnapshots = (...snapshots: LocaleSnapshots[]): LocaleSnapshots =>
    Object.fromEntries(exposedLocales.map((locale) => [
      locale,
      Object.assign({}, ...snapshots.map((snapshot) => snapshot[locale])),
    ])) as LocaleSnapshots;

  const communitySurfaceSnapshots = fromKeyGetter(
    keysOf(COMMUNITY_SURFACES_COPY),
    (locale, key, values) => surfaceText(locale, key, values),
    Object.fromEntries(keysOf(COMMUNITY_SURFACES_COPY).map((key) => [key, COMMUNITY_SURFACES_COPY[key].en])),
  );
  const communityLegalSnapshots = fromKeyGetter(
    keysOf(LEGAL_COPY),
    (locale, key) => legalText(locale, key),
  );
  const communityAdminSnapshots = fromKeyGetter(
    keysOf(ADMIN_COPY),
    (locale, key, values) => adminText(locale, key, values),
    Object.fromEntries(keysOf(ADMIN_COPY).map((key) => [key, ADMIN_COPY[key].en])),
  );

  const runtimeManifest = {
    "./components/social/social-i18n.ts": selectSupported(SOCIAL_SUPPORTED_T),
    "./globalstar/i18n/about-traditions-copy.ts": fromGetter(aboutTraditionsCopy),
    "./globalstar/i18n/admin-upload-copy.ts": fromGetter(adminUploadCopy),
    "./globalstar/i18n/earnings-figure-copy.ts": fromGetter(earningsFigureCopy),
    "./globalstar/i18n/home-ranking-copy.ts": fromGetter(homeRankingCopy),
    "./globalstar/i18n/leaderboard-media-copy.ts": fromGetter(leaderboardMediaCopy),
    "./globalstar/i18n/news-vote-copy.ts": fromGetter(newsVoteCopy),
    "./i18n/community-admin-surfaces-copy.ts": mergeSnapshots(
      communitySurfaceSnapshots,
      communityLegalSnapshots,
      communityAdminSnapshots,
    ),
    "./i18n/community-pages.ts": selectSupported(COMMUNITY_T),
    "./i18n/content-discovery-copy.ts": fromKeyGetter(
      keysOf(CONTENT_DISCOVERY_COPY.en),
      (locale, key, values) => contentCopy(locale, key, values),
      CONTENT_DISCOVERY_COPY.en,
    ),
    "./i18n/content-surfaces-copy.ts": fromGetter(surfaceCopy),
    "./i18n/core-auth-copy.ts": fromGetter(coreCopy),
    "./i18n/dashboard-copy.ts": fromKeyGetter(
      keysOf(DASHBOARD_COPY_TABLE),
      (locale, key, values) => dashboardText(locale, key, values),
      Object.fromEntries(keysOf(DASHBOARD_COPY_TABLE).map((key) => [key, DASHBOARD_COPY_TABLE[key].en])),
    ),
    "./i18n/final-labels-copy.ts": fromKeyGetter(
      keysOf(FINAL_LABELS_COPY.en),
      (locale, key) => finalLabelText(locale, key),
    ),
    "./i18n/finance-copy.ts": fromKeyGetter(
      keysOf(FINANCE_COPY),
      (locale, key) => financeT(locale, key),
    ),
    "./i18n/finance-onboarding-copy.ts": fromKeyGetter(
      keysOf(FINANCE_ONBOARDING_COPY.en),
      (locale, key, values) => onboardingT(locale, key, values),
      FINANCE_ONBOARDING_COPY.en,
    ),
    "./i18n/friends-copy.ts": fromKeyGetter(
      keysOf(FRIENDS_COPY.en),
      (locale, key, values) => friendsCopy(locale, key, values),
      FRIENDS_COPY.en,
    ),
    "./i18n/game-chrome.ts": fromKeyGetter(
      keysOf(GAME_CHROME_COPY.en),
      (locale, key, values) => gameText(locale, key, values),
      GAME_CHROME_COPY.en,
    ),
    "./i18n/game-locale-copy.ts": fromKeyGetter(
      keysOf(GAME_LOCALE_COPY_TABLE),
      (locale, key, values) => gameLocaleText(locale, key, values),
      Object.fromEntries(keysOf(GAME_LOCALE_COPY_TABLE).map((key) => [key, GAME_LOCALE_COPY_TABLE[key].en])),
    ),
    "./i18n/locale-surfaces-a-copy.ts": fromKeyGetter(
      keysOf(LOCALE_SURFACES_A_COPY_TABLE),
      (locale, key) => localeSurfacesAText(locale, key),
    ),
    "./i18n/locale-surfaces-b-copy.ts": fromGetter((locale) => ({
      intlLocale: localeForSurfaceB[locale],
      number: formatSurfaceNumber(locale, 1234.5),
      date: formatSurfaceDate(locale, "2026-01-02T00:00:00Z", { timeZone: "UTC" }),
    })),
    "./i18n/messenger-complete-copy.ts": fromGetter(getMessengerCopy),
    "./i18n/missed-calls-copy.ts": fromGetter(getMissedCallsCopy),
    "./i18n/royal-reserve-copy.ts": fromGetter(getReserveCopy),
    "./i18n/shared-components-copy.ts": fromGetter(sharedCopy),
    "./i18n/stories-copy.ts": fromKeyGetter(
      keysOf(STORIES_COPY.en),
      (locale, key, values) => storiesCopy(locale, key, values),
      STORIES_COPY.en,
    ),
    "./i18n/task39.ts": fromKeyGetter(
      keysOf(task39),
      (locale, key, values) => task39Text(locale, key, values),
      Object.fromEntries(keysOf(task39).map((key) => [key, task39[key].en])),
    ),
    "./i18n/tech-surfaces-copy.ts": fromKeyGetter(
      keysOf(TECH_COPY_TABLE),
      (locale, key, values) => techT(locale, key, values),
      Object.fromEntries(keysOf(TECH_COPY_TABLE).map((key) => [key, TECH_COPY_TABLE[key][0]])),
    ),
  } satisfies Record<(typeof expectedSupplementalFiles)[number], LocaleSnapshots>;

  function flattenLeaves(value: unknown, path = "root", leaves = new Map<string, string>()): Map<string, string> {
    if (typeof value === "function") {
      const placeholders = Array.from(
        { length: Math.max(1, value.length) },
        (_, index) => `{argument${index + 1}}`,
      );
      return flattenLeaves((value as (...args: string[]) => unknown)(...placeholders), path, leaves);
    }
    if (typeof value === "string") {
      leaves.set(path, value);
      return leaves;
    }
    if (Array.isArray(value)) {
      value.forEach((item, index) => flattenLeaves(item, `${path}[${index}]`, leaves));
      return leaves;
    }
    if (value && typeof value === "object") {
      for (const [key, child] of Object.entries(value)) {
        flattenLeaves(child, `${path}.${key}`, leaves);
      }
      return leaves;
    }
    throw new Error(`${path} is a non-string supplemental copy leaf (${String(value)})`);
  }

  it("registers every supplemental i18n file in the exhaustive runtime parity manifest", () => {
    expect(Object.keys(supplementalSources).sort()).toEqual([...expectedSupplementalFiles].sort());
    expect(Object.keys(runtimeManifest).sort()).toEqual([...expectedSupplementalFiles].sort());
  });

  it("recursively enforces runtime path, non-empty value, marker, and interpolation parity for every supplemental module", () => {
    for (const file of expectedSupplementalFiles) {
      const snapshots = runtimeManifest[file];
      const english = flattenLeaves(snapshots.en);
      const englishPaths = [...english.keys()].sort();
      expect(englishPaths.length, `${file} must expose runtime copy leaves`).toBeGreaterThan(0);

      for (const locale of exposedLocales) {
        const localized = flattenLeaves(snapshots[locale]);
        expect([...localized.keys()].sort(), `${file} ${locale} leaf paths`).toEqual(englishPaths);
        for (const path of englishPaths) {
          const value = localized.get(path)!;
          expect(value.trim(), `${file} ${locale} ${path} must not be empty`).not.toBe("");
          expect(value, `${file} ${locale} ${path} must not contain a marker`).not.toMatch(translationMarker);
          expect(interpolationPlaceholders(value), `${file} ${locale} ${path} placeholders`).toEqual(
            interpolationPlaceholders(english.get(path)!),
          );
        }
      }
    }
  });

  it("forbids supported-locale English spread/fallback definitions and keeps content-discovery Spanish `all` exactly `Todo`", () => {
    const forbiddenSupportedFallbacks = [
      ["supported locale object spreading English", /\b(?:const|let|var)\s+(?:fr|ar|es)\b[^=]*=\s*\{[^}]*\.\.\.en\b/s],
      ["nullish/OR fallback to an English identifier", /(?:\?\?|\|\|)\s*(?:en\b|[\w.[\]'"]+\.en\b|[\w.]+\[['"]en['"]\])/],
      ["nullish/OR fallback to the untranslated key", /(?:\?\?|\|\|)\s*key\b/],
      ["task39 English fallback", /task39\s*\[[^\]]+\]\s*(?:\?\.|\.)en\b/],
      ["entry English-to-key fallback", /entry\s*(?:\?\.|\.)en\s*(?:\?\?|\|\|)\s*key\b/],
      ["partial Lang string copy table", /Partial\s*<\s*Record\s*<\s*Lang\s*,\s*string\s*>\s*>/],
      ["German-to-English object alias", /\bde\s*:\s*(?:en\b|["']en(?:-[A-Z]{2})?["'])/],
      ["German object spreading English", /\b(?:const|let|var)\s+de\b[^=]*=\s*\{[^}]*\.\.\.en\b/s],
      ["German-to-English conditional fallback", /(?:lang|language)\s*===\s*["']de["']\s*\?\s*(?:["']en["']|en\b)/],
      ["German-to-English return fallback", /if\s*\([^)]*(?:lang|language)\s*===\s*["']de["'][^)]*\)\s*return\s+(?:["']en["']|en\b)/],
    ] as const;

    for (const file of expectedSupplementalFiles) {
      const source = supplementalSources[file];
      for (const [description, pattern] of forbiddenSupportedFallbacks) {
        expect(source, `${file} must not contain ${description}`).not.toMatch(pattern);
      }
      expect(source, `${file} must not contain empty supported-locale blocks`).not.toMatch(
        /\b(?:const|export\s+const)\s+(?:en|fr|ar|es)\b[^=]*=\s*\{\s*\}/,
      );
    }
    expect(contentCopy("es", "all")).toBe("Todo");
  });
});

function LanguageSwitchProbe() {
  const { lang, setLang, t } = useLang();
  return (
    <>
      <output data-testid="active-language">{lang}</output>
      <output data-testid="empire-copy">{t("empire_sub")}</output>
      <output data-testid="chronicle-copy">{t("chrono_badge")}</output>
      <output data-testid="growth-copy">{t("growth_archon_system")}</output>
      {(["es", "fr", "ar", "de"] as const satisfies readonly Lang[]).map((locale) => (
        <button key={locale} type="button" onClick={() => setLang(locale)}>
          {locale}
        </button>
      ))}
    </>
  );
}

function GlobalStarLanguageProbe() {
  const { language, setLanguage, t, isRTL } = useLanguage();
  return (
    <>
      <output data-testid="globalstar-language">{language}</output>
      <output data-testid="globalstar-rtl">{String(isRTL)}</output>
      <output data-testid="globalstar-home">{t("home")}</output>
      <output data-testid="globalstar-ranking">{t("ranking")}</output>
      <output data-testid="globalstar-traditions">{t("traditions")}</output>
      <output data-testid="globalstar-earnings">{t("earnings")}</output>
      <button type="button" onClick={() => setLanguage("de")}>GlobalStar Deutsch</button>
      <button type="button" onClick={() => setLanguage("ar")}>GlobalStar العربية</button>
    </>
  );
}

describe("Task 39 rendered LangProvider switching", () => {
  const resetBrowserLanguageState = () => {
    localStorage.clear();
    window.history.replaceState({}, "", "/?lang=en");
    document.documentElement.lang = "";
    document.documentElement.dir = "";
  };

  beforeEach(resetBrowserLanguageState);
  afterEach(resetBrowserLanguageState);

  it("updates authored Empire, Chronicle, and Growth/NLP text immediately for EN→ES→FR→AR→DE and synchronizes html lang/dir", () => {
    render(
      <LangProvider>
        <LanguageSwitchProbe />
      </LangProvider>,
    );

    const assertRendered = (
      locale: FullyTranslatedLang,
      direction: "ltr" | "rtl",
      empire: string,
      chronicle: string,
      growth: string,
    ) => {
      expect(screen.getByTestId("active-language")).toHaveTextContent(locale);
      expect(screen.getByTestId("empire-copy")).toHaveTextContent(empire);
      expect(screen.getByTestId("chronicle-copy")).toHaveTextContent(chronicle);
      expect(screen.getByTestId("growth-copy")).toHaveTextContent(growth);
      expect(document.documentElement).toHaveAttribute("lang", locale);
      expect(document.documentElement).toHaveAttribute("dir", direction);
    };

    assertRendered(
      "en",
      "ltr",
      "Sovereign Digital Platform — International Standards & AI Law",
      "Digital Time Chronicle",
      "Archon system",
    );

    fireEvent.click(screen.getByRole("button", { name: "es" }));
    assertRendered(
      "es",
      "ltr",
      "Plataforma digital soberana — Normas internacionales y legislación sobre IA",
      "Crónica digital del tiempo",
      "Sistema de arcontes",
    );

    fireEvent.click(screen.getByRole("button", { name: "fr" }));
    assertRendered(
      "fr",
      "ltr",
      "Plateforme Numérique Souveraine — Standards Internationaux & Gouvernance IA",
      "Chronique du Temps Numérique",
      "Système Archon",
    );

    fireEvent.click(screen.getByRole("button", { name: "ar" }));
    assertRendered(
      "ar",
      "rtl",
      "منصة رقمية ذات سيادة — معايير دولية وحوكمة ذكاء اصطناعي",
      "السجل الزمني الرقمي",
      "نظام الأركون",
    );

    fireEvent.click(screen.getByRole("button", { name: "de" }));
    assertRendered(
      "de",
      "ltr",
      "Souveräne digitale Plattform – internationale Standards und AI-Recht",
      "Digitale Zeitchronik",
      "Archon-System",
    );
  });

  it("keeps the nested GlobalStar shared language context authored and synchronized for German and Arabic", () => {
    render(
      <LangProvider>
        <GlobalStarLanguageProvider>
          <GlobalStarLanguageProbe />
        </GlobalStarLanguageProvider>
      </LangProvider>,
    );

    fireEvent.click(screen.getByRole("button", { name: "GlobalStar Deutsch" }));
    expect(screen.getByTestId("globalstar-language")).toHaveTextContent("de");
    expect(screen.getByTestId("globalstar-rtl")).toHaveTextContent("false");
    expect(screen.getByTestId("globalstar-home")).toHaveTextContent("Startseite");
    expect(screen.getByTestId("globalstar-ranking")).toHaveTextContent("Ranglisten");
    expect(screen.getByTestId("globalstar-traditions")).toHaveTextContent("Kulturerbe");
    expect(screen.getByTestId("globalstar-earnings")).toHaveTextContent("Meine Einnahmen");
    expect(screen.getByTestId("globalstar-home")).not.toHaveTextContent("Home");
    expect(screen.getByTestId("globalstar-ranking")).not.toHaveTextContent("Rankings");
    expect(screen.getByTestId("globalstar-traditions")).not.toHaveTextContent("Heritage");
    expect(screen.getByTestId("globalstar-earnings")).not.toHaveTextContent("My Earnings");
    expect(document.documentElement).toHaveAttribute("lang", "de");
    expect(document.documentElement).toHaveAttribute("dir", "ltr");

    fireEvent.click(screen.getByRole("button", { name: "GlobalStar العربية" }));
    expect(screen.getByTestId("globalstar-language")).toHaveTextContent("ar");
    expect(screen.getByTestId("globalstar-rtl")).toHaveTextContent("true");
    expect(screen.getByTestId("globalstar-home")).toHaveTextContent("الرئيسية");
    expect(screen.getByTestId("globalstar-ranking")).toHaveTextContent("التصنيفات");
    expect(screen.getByTestId("globalstar-traditions")).toHaveTextContent("التراث");
    expect(screen.getByTestId("globalstar-earnings")).toHaveTextContent("أرباحي");
    expect(document.documentElement).toHaveAttribute("lang", "ar");
    expect(document.documentElement).toHaveAttribute("dir", "rtl");
  });
});