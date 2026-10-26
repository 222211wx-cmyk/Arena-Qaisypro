import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { Navbar } from "./navbar";
import { UI_TEXT } from "@/config/platform-directory";
import type { Lang } from "@/contexts/LangContext";

const state = vi.hoisted(() => ({ lang: "ar" as Lang }));
vi.mock("@/contexts/LangContext", () => ({
  useLang: () => ({ lang: state.lang }),
}));
vi.mock("./language-switcher", () => ({
  LanguageSwitcher: () => <button>Language</button>,
}));
afterEach(cleanup);

describe("horizontal platform utilities", () => {
  it.each(["ar", "en", "fr", "es", "de"] as const)("names icon controls in %s and links real settings", lang => {
    state.lang = lang;
    render(<Navbar />);
    expect(screen.getByRole("button", { name: UI_TEXT.tools[lang] })).toBeTruthy();
    expect(screen.getByRole("link", { name: UI_TEXT.settings[lang] }).getAttribute("href"))
      .toBe("/dashboard#account-settings");
    const brand = screen.getByTestId("link-brand-home");
    expect(brand.textContent).toContain("ARENA");
    expect(brand.textContent).toContain("QAISYPRO");
    expect(brand.closest("header")?.getAttribute("dir")).toBe(lang === "ar" ? "rtl" : "ltr");
  });
});