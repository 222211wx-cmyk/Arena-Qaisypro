import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
const source = (path: string) => readFileSync(new URL(path, import.meta.url), "utf8");
describe("black and gold appearance", () => {
  it("removes the brown demo banner and top connectivity alert from the shell", () => {
    expect(source("../index.html")).not.toContain("Standalone mock mode");
    expect(source("./App.tsx")).not.toContain("ConnectivityBanner");
  });
  it("uses black and gold without global blue button or link overrides", () => {
    const css = source("./index.css");
    expect(css).toContain("background-color: #000");
    expect(css).not.toContain("#00BFFF");
    expect(source("../index.html")).toContain("family=Cairo:");
  });
});
