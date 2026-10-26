import { readFileSync } from "node:fs";
import { describe, expect, it, vi } from "vitest";
import { debugEnv } from "./lib/debugEnv";
import { STANDALONE_MODE } from "./lib/mockData";
describe("full Arena entry", () => {
  it("never selects Lite for keys, networks, referrals or explicit Lite paths", () => {
    const main = readFileSync("src/main.tsx", "utf8");
    expect(main).not.toContain('import("./lite-entry")');
    expect(main).not.toContain("shouldAutoRedirectToLite");
    expect(main).not.toContain("window.location.replace");
    expect(main).toContain('import("./app-entry")');
    expect(STANDALONE_MODE).toBe(false);
  });
  it("logs only environment presence, never values", () => {
    vi.stubEnv("VITE_SUPABASE_URL", "https://private-test.example");
    vi.stubEnv("VITE_SUPABASE_ANON_KEY", "sensitive-test-value");
    const log = vi.spyOn(console, "info").mockImplementation(() => {});
    debugEnv();
    expect(log).toHaveBeenCalledWith("ENV CHECK:", { SUPABASE_URL: "EXISTS", SUPABASE_KEY: "EXISTS", ARENA_BACKEND: "MISSING" });
    expect(JSON.stringify(log.mock.calls)).not.toContain("sensitive-test-value");
    log.mockRestore(); vi.unstubAllEnvs();
  });
});
