import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

const source = (path: string) => readFileSync(new URL(path, import.meta.url), "utf8");

describe("isolated Lite infrastructure routes", () => {
  it("boots exact partner routes through Lite without loading the app entry", () => {
    const main = source("./main.tsx");
    expect(main).toContain('route === "/partners/operators"');
    expect(main).toContain('route === "/partners/dashboard"');
    expect(main.indexOf("isPartnerLiteRoute")).toBeLessThan(main.indexOf('import("./app-entry")'));
  });

  it("keeps operator referrals allow-listed and retains only their canonical value", () => {
    const main = source("./main.tsx");
    const network = source("./lib/network-detect.ts");
    expect(main).toContain("getAutoLiteReferral(window.location.search)");
    expect(main).toContain('query.set("ref", autoLiteReferral)');
    expect(main).toContain('pathname.startsWith("//")');
    expect(main).toContain('pathname.includes("\\\\")');
    expect(main).toContain('query.set("from", safeLocalReturnPath(route, location.search))');
    expect(network).toContain('"inwi", "orange", "itissalat", "*6", "star6"');
    expect(network).not.toContain("labelpackverified");
  });

  it("serves exact partner paths in dev, production, and offline", () => {
    const config = source("../vite.config.ts");
    expect(config).toContain('relative === "/partners/operators"');
    expect(config).toContain('relative === "/partners/dashboard"');
    expect(config).toContain('"partners/operators",');
    expect(config).toContain('"partners/dashboard",');
    expect(config).toContain("isLiteNavigation(url.pathname)");
  });

  it("keeps partner bootstrap font-free and dynamic page graphs out of precache", () => {
    const html = source("../index.html");
    const liteHtml = source("../lite.html");
    const config = source("../vite.config.ts");
    expect(html).toContain("!isLite");
    expect(html).toContain("!autoLiteRef");
    expect(liteHtml).not.toMatch(/fonts\.googleapis|fonts\.gstatic/);
    expect(config).toContain("entry.imports || []");
    expect(config).not.toContain("entry.dynamicImports || []");
  });
});