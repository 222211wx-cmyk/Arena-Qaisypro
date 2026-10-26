// @vitest-environment node
import { afterEach, describe, expect, it, vi } from "vitest";
import type { ConfigEnv, UserConfig } from "vite";
import config from "../vite.config";
const evaluate = config as (env: ConfigEnv) => UserConfig;
afterEach(() => vi.unstubAllEnvs());
describe("public Supabase build mapping", () => {
  it("maps unprefixed public configuration without exposing server secrets", () => {
    vi.stubEnv("VITE_SUPABASE_URL", "");
    vi.stubEnv("VITE_SUPABASE_ANON_KEY", "");
    vi.stubEnv("SUPABASE_URL", "https://test.example");
    vi.stubEnv("SUPABASE_ANON_KEY", "test-public-anon");
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "server-only-test-value");
    vi.stubEnv("GDNA_SECRET", "private-gdna-test-value");
    const result = evaluate({ mode: "test", command: "build" });
    expect(result.define).toEqual({
      "import.meta.env.VITE_SUPABASE_URL": JSON.stringify("https://test.example"),
      "import.meta.env.VITE_SUPABASE_ANON_KEY": JSON.stringify("test-public-anon"),
    });
    expect(JSON.stringify(result.define)).not.toContain("server-only-test-value");
    expect(JSON.stringify(result.define)).not.toContain("private-gdna-test-value");
  });
  it("prefers explicit prefixed values", () => {
    vi.stubEnv("VITE_SUPABASE_URL", "https://prefixed.example");
    vi.stubEnv("SUPABASE_URL", "https://legacy.example");
    expect(evaluate({ mode: "test", command: "build" }).define?.["import.meta.env.VITE_SUPABASE_URL"])
      .toBe(JSON.stringify("https://prefixed.example"));
  });
});
