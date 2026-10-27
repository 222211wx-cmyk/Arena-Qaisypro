import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { DIRECTORY } from "@/config/platform-directory";

const source = readFileSync("src/pages/home.tsx", "utf8");
describe("restored full Arena home", () => {
  it("keeps the full directory, citizen section, elite carousel and live previews", () => {
    for (const component of ["PlatformLauncher", "HomeCitizenSection", "EliteCarousel", "TopLegendsPreview", "RecentActivity"]) {
      expect(source).toContain(`<${component}`);
    }
    expect(DIRECTORY.some(section => section.route === "/sport")).toBe(true);
    expect(source).toContain("#C9A84C");
  });
  it("loads the actual shared styles with Tailwind, keeping gold tokens", () => {
    const css = readFileSync("src/index.css", "utf8");
    expect(css).toContain('@import "./lib/gdna-ds/styles.css"');
    expect(css).toContain("--primary: 45.9 64.6% 52.4%");
    expect(readFileSync("src/lib/gdna-ds/styles.css", "utf8")).toContain("@tailwind utilities");
  });
});
