import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
const source = (path: string) => readFileSync(new URL(path, import.meta.url), "utf8");
describe("navy gold blue appearance", () => {
  it("removes the brown demo banner and top connectivity alert from the shell", () => {
    expect(source("../index.html")).not.toContain("Standalone mock mode");
    expect(source("./App.tsx")).not.toContain("ConnectivityBanner");
  });
  it("sets the requested navy body, gold headings, blue accents and gradient controls", () => {
    const css = source("./index.css");
    expect(css).toContain("background-color: #0A0E1A !important");
    expect(css).toContain("color: #FFD700 !important");
    expect(css).toContain("color: #00BFFF !important");
    expect(css).toContain("background: linear-gradient(90deg, #D4AF37, #00BFFF)");
    expect(css).toContain("background: #141A2E !important");
    expect(source("./lib/gdna-ds/components/ui/card.tsx")).toContain("card rounded-lg");
  });
});
