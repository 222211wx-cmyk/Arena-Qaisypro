import { describe, expect, it, vi } from "vitest";
import { JSDOM } from "jsdom";
import { readFileSync } from "node:fs";
import path from "node:path";
import { getInstallLang, installText, requestSectionInstall, type InstallLang } from "./lib/section-install";

const publicDir = path.resolve(import.meta.dirname, "../public");
const script = readFileSync(path.join(publicDir, "section-pwa.js"), "utf8");
type InstallApi = { request(section: "clips" | "messages"): Promise<string> };

function page(route: string, base = "/") {
  const dom = new JSDOM('<head><meta name="apple-mobile-web-app-title" content="ARENA"></head>', {
    url: `https://example.test${route}`, runScripts: "outside-only",
  });
  Object.defineProperty(dom.window.document, "currentScript", {
    configurable: true, value: { src: `https://example.test${base}section-pwa.js` },
  });
  dom.window.eval(script);
  const manifest = () => dom.window.document.querySelector<HTMLLinkElement>('link[rel="manifest"]')?.href;
  const apple = () => dom.window.document.querySelector<HTMLLinkElement>('link[rel="apple-touch-icon"]')?.href;
  const title = () => dom.window.document.querySelector('meta[name="apple-mobile-web-app-title"]')?.getAttribute("content");
  const api = (dom.window as unknown as { __gdnaSectionInstall: InstallApi }).__gdnaSectionInstall;
  return { dom, manifest, apple, title, api };
}

describe("section install metadata", () => {
  it.each([
    ["/clips", "clips"], ["/clip/", "clips"], ["/clip/HELX-123456", "clips"],
    ["/messages", "messages"], ["/messagerie/", "messages"], ["/messages/123", "messages"],
  ])("selects the %s section before evaluation", (route, section) => {
    const p = page(route);
    expect(p.manifest()).toBe(`https://example.test/manifest-${section}.json`);
    expect(p.apple()).toBe(`https://example.test/${section}-apple-180.png`);
    expect(p.title()).toBe(`ARENA ${section === "clips" ? "Clips" : "Messages"}`);
    p.dom.window.close();
  });

  it("keeps Lite default and resolves a deployed base path", () => {
    const p = page("/gdna-arena/lite/messages", "/gdna-arena/");
    expect(p.manifest()).toBe("https://example.test/gdna-arena/manifest.json");
    p.dom.window.history.pushState({}, "", "/gdna-arena/clips");
    expect(p.manifest()).toBe("https://example.test/gdna-arena/manifest-clips.json");
    p.dom.window.history.replaceState({}, "", "/gdna-arena/messagerie");
    expect(p.manifest()).toBe("https://example.test/gdna-arena/manifest-messages.json");
    p.dom.window.close();
  });

  it("honors accepted, dismissed, unsupported and never reuses a consumed prompt", async () => {
    const p = page("/clips");
    const fire = (outcome: string) => {
      const event = new p.dom.window.Event("beforeinstallprompt", { cancelable: true });
      const prompt = vi.fn(async () => {});
      Object.assign(event, { prompt, userChoice: Promise.resolve({ outcome }) });
      p.dom.window.dispatchEvent(event);
      expect(event.defaultPrevented).toBe(true);
      return prompt;
    };
    const accepted = fire("accepted");
    expect(await p.api.request("clips")).toBe("accepted");
    expect(accepted).toHaveBeenCalledOnce();
    expect(await p.api.request("clips")).toBe("unsupported");
    fire("dismissed");
    expect(await p.api.request("clips")).toBe("dismissed");
    fire("accepted");
    p.dom.window.history.pushState({}, "", "/messages");
    expect(await p.api.request("messages")).toBe("unsupported");
    p.dom.window.close();
  });

  it("does not capture a Lite install event or reuse another section's event", async () => {
    const p = page("/lite");
    const rootEvent = new p.dom.window.Event("beforeinstallprompt", { cancelable: true });
    p.dom.window.dispatchEvent(rootEvent);
    expect(rootEvent.defaultPrevented).toBe(false);
    p.dom.window.history.pushState({}, "", "/clips");
    expect(await p.api.request("clips")).toBe("unsupported");
    const clipEvent = new p.dom.window.Event("beforeinstallprompt", { cancelable: true });
    Object.assign(clipEvent, { prompt: vi.fn(), userChoice: Promise.resolve({ outcome: "accepted" }) });
    p.dom.window.dispatchEvent(clipEvent);
    p.dom.window.history.pushState({}, "", "/messages");
    expect(await p.api.request("messages")).toBe("unsupported");
    p.dom.window.close();
  });

  it("shows manual instructions instead of reporting a successful iOS install", async () => {
    const p = page("/messages");
    Object.defineProperty(p.dom.window.navigator, "userAgent", { value: "iPhone Safari", configurable: true });
    expect(await p.api.request("messages")).toBe("ios");
    p.dom.window.close();
  });

  it("has distinct stable IDs and full section start URLs without modifying Lite", () => {
    const clips = JSON.parse(readFileSync(path.join(publicDir, "manifest-clips.json"), "utf8"));
    const messages = JSON.parse(readFileSync(path.join(publicDir, "manifest-messages.json"), "utf8"));
    const lite = JSON.parse(readFileSync(path.join(publicDir, "manifest.json"), "utf8"));
    expect([clips.id, messages.id]).toEqual(["./clips", "./messages"]);
    expect([clips.start_url, messages.start_url]).toEqual(["./clips", "./messages"]);
    expect(clips.scope).toBe("./");
    expect(messages.scope).toBe("./");
    expect(lite.start_url).toBe("./lite");
    for (const data of [clips, messages]) {
      for (const icon of data.icons) expect(readFileSync(path.join(publicDir, icon.src)).subarray(0, 8)
        .equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))).toBe(true);
    }
  });
});

describe("localized install guidance", () => {
  const languages: InstallLang[] = ["ar", "en", "fr", "es", "de"];
  it.each(languages)("provides buttons, dismiss label, and all outcomes in %s", lang => {
    for (const key of ["clipsButton", "messagesButton", "dismiss",
      "accepted", "dismissed", "ios", "standalone", "navigating", "unsupported"] as const) {
      expect(installText(lang, key).trim()).not.toBe("");
    }
    expect(installText(lang, "clipsButton")).toContain("Hc");
    expect(installText(lang, "messagesButton")).toContain("Hm");
    expect(installText(lang, "ios")).toMatch(/Safari/);
    expect(installText(lang, "ios")).toMatch(/→/);
  });

  it("defaults to Arabic, honors explicit preference, and ignores unknown languages", () => {
    localStorage.removeItem("gdna_lang");
    history.replaceState({}, "", "/clips");
    expect(getInstallLang()).toBe("ar");
    localStorage.setItem("gdna_lang", "de");
    expect(getInstallLang()).toBe("de");
    history.replaceState({}, "", "/clips?lang=fr");
    expect(getInstallLang()).toBe("fr");
    history.replaceState({}, "", "/clips?lang=unknown");
    expect(getInstallLang()).toBe("de");
    localStorage.removeItem("gdna_lang");
    history.replaceState({}, "", "/");
  });

  it("localizes accepted, dismissed, iOS and unsupported without claiming installation", async () => {
    const results = ["accepted", "dismissed", "ios", "unsupported"] as const;
    for (const lang of languages) {
      for (const result of results) {
        window.__gdnaSectionInstall = { current: () => "clips", request: vi.fn(async () => result) };
        expect(await requestSectionInstall("clips", lang)).toBe(installText(lang, result));
      }
    }
    delete window.__gdnaSectionInstall;
  });
});