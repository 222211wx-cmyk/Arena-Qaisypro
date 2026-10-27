import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { PlatformLauncher } from "./PlatformLauncher";
import { DIRECTORY } from "@/config/platform-directory";
import { readFileSync } from "node:fs";

vi.mock("@/contexts/LangContext", () => ({ useLang: () => ({ lang: "en" }) }));

afterEach(() => {
  cleanup();
  delete window.umami;
});

describe("platform directory", () => {
  it("shows a public link for every section and copies without navigating", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", { configurable: true, value: { writeText } });
    render(<PlatformLauncher />);
    expect(screen.getAllByRole("textbox")).toHaveLength(DIRECTORY.length);
    fireEvent.click(screen.getByTestId("copy-module-messages"));
    expect(writeText).toHaveBeenCalledWith("/messages");
    await waitFor(() => expect(screen.getByRole("status").textContent).toBe("Link copied"));
  });

  it("reports clipboard failure and leaves a selectable link", async () => {
    Object.defineProperty(navigator, "clipboard", {
      configurable: true, value: { writeText: vi.fn().mockRejectedValue(new Error("denied")) },
    });
    render(<PlatformLauncher />);
    fireEvent.click(screen.getByTestId("copy-module-clips"));
    await waitFor(() => expect(screen.getByRole("status").textContent).toContain("Could not copy"));
    expect((screen.getByRole("textbox", { name: "Section link — Clips" }) as HTMLInputElement).value)
      .toBe("/clips");
  });

  it("lists leaderboard first and Calls & Messages last", () => {
    render(<PlatformLauncher />);
    const links = screen.getAllByRole("link");
    expect(links[0].getAttribute("href")).toBe("/leaderboard");
    expect(links.at(-1)?.getAttribute("href")).toBe("/messages");
  });

  it("has no duplicate routes and no admin routes", () => {
    const routes = DIRECTORY.map(d => d.route);
    expect(new Set(routes).size).toBe(routes.length);
    expect(routes.some(r => r.startsWith("/admin") || r.includes(":"))).toBe(false);
    expect(routes).not.toContain("/amis");
    expect(new Set(DIRECTORY.map(d => d.icon)).size).toBe(DIRECTORY.length);
  });

  it("targets registered routes rather than aliases or missing pages", () => {
    const app = readFileSync("src/App.tsx", "utf8");
    for (const entry of DIRECTORY) {
      if (entry.route === "/messages") {
        expect(app).toContain('path={MESSAGES_ENTRY_PATH}');
      } else {
        expect(app).toContain(`path="${entry.route}"`);
      }
    }
  });

  it("includes every historical primary section", () => {
    const routes = DIRECTORY.map(d => d.route);
    for (const r of ["/games", "/shop", "/growth", "/fortress", "/sport", "/music", "/cinema", "/news", "/chronicle", "/smart", "/social"]) {
      expect(routes).toContain(r);
    }
  });

  it("has labels in all five languages", () => {
    for (const d of DIRECTORY) for (const l of ["ar", "en", "fr", "es", "de"] as const) expect(d.names[l]).toBeTruthy();
  });

  it.each(["clips", "messages", "arena", "social"])("tracks only deliberate %s clicks", (module) => {
    const track = vi.fn();
    window.umami = { track };
    render(<PlatformLauncher />);
    expect(track).not.toHaveBeenCalled();
    fireEvent.click(screen.getByTestId(`link-module-${module}`));
    expect(track).toHaveBeenCalledExactlyOnceWith("homepage_module_click", { module });
  });
});
