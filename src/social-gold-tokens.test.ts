import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { GOLD, GOLD_A } from "./components/social/social-i18n";

const source = (path: string) =>
  readFileSync(fileURLToPath(new URL(path, import.meta.url)), "utf8");

describe("social gold tokens", () => {
  it("creates CSS-valid primary token colors", () => {
    expect(GOLD).toBe("hsl(var(--primary))");
    expect(GOLD_A(0.125)).toBe("hsl(var(--primary) / 0.125)");
  });

  it("does not append legacy hex alpha to GOLD in social overview or related pages", () => {
    const legacyGoldAlpha = /\$\{GOLD\}(?:[0-9a-f]{1,2})\b|\bGOLD\s*\+\s*["'][0-9a-f]{1,2}["']/i;
    for (const path of [
      "./components/social/CommunicationMatrix.tsx",
      "./pages/social.tsx",
      "./pages/friends.tsx",
      "./pages/press.tsx",
    ]) {
      expect(source(path)).not.toMatch(legacyGoldAlpha);
    }
  });
});