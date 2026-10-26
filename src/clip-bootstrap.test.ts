import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

const source = (path: string) => readFileSync(new URL(path, import.meta.url), "utf8");

describe("ultra-light clip bootstrap", () => {
  it("keeps the main entry route-aware and the clip graph free of the React app", () => {
    const main = source("./main.tsx");
    const clip = source("./clip-entry.ts");
    expect(main).not.toMatch(/from\s+["'].\/App["']/);
    expect(main).toContain('import("./clip-entry")');
    expect(main).toContain('import("./app-entry")');
    expect(main).not.toContain('isClipRoute ? import("./clip-entry")');
    expect(main).toContain('rawRoute.replace(/\\/+$/');
    expect(main).toContain('retry.setAttribute("data-testid", `${surface}-startup-retry`)');
    expect(main).toContain('showStartupError("تعذر تشغيل صفحة الكليبز. تحقق من الاتصال وحاول مجدداً.", "clip")');
    expect(main).toContain("window.location.reload()");
    expect(clip).not.toMatch(/from\s+["']react|from\s+["'].\/App|index\.css|AuthProvider/i);
    expect(clip).not.toMatch(/prepareVideo|ffmpeg|MediaRecorder/);
  });

  it("registers the service worker even when the dynamic App entry arrives after load", () => {
    const appEntry = source("./app-entry.tsx");
    expect(appEntry).toContain('document.readyState === "complete"');
    expect(appEntry).toContain('addEventListener("load", registerServiceWorker, { once: true })');
    const clip = source("./clip-entry.ts");
    expect(clip).toContain('if (window.isSecureContext && "serviceWorker" in navigator)');
    expect(clip).not.toContain('if (import.meta.env.PROD && "serviceWorker" in navigator)');
    expect(clip).toContain('navigator.serviceWorker.register(`${BASE}sw.js`');
    const config = source("../vite.config.ts");
    expect(config).toContain('res.setHeader("Cache-Control", "no-store")');
    expect(config).toContain('event.waitUntil(self.clients.claim())');
  });

  it("has an immediate shell, no encoding runtime, and no eager feed playback", () => {
    const html = source("../index.html");
    const clip = source("./clip-entry.ts");
    const feed = source("./components/clips/reelsFeed.ts");
    expect(html).toContain('data-testid="clip-shell"');
    expect(html).toContain("جارٍ تجهيز الرفع");
    expect(html).toContain('route === "/clip" || route === "/clips"');
    expect(html).not.toContain('endsWith("/clip")');
    expect(clip).not.toMatch(/MediaRecorder|@ffmpeg\/|autoplay/i);
    // The Reels feed loads playback URLs lazily: a <video> element is created
    // (and its src assigned) only when a slide is activated by the observer —
    // never eagerly for every clip, and never with a broad preload.
    expect(feed).toContain("function loadPlayback()");
    expect(feed).toContain("if (playbackRequested)");
    expect(feed).toContain('video.removeAttribute("src")');
    expect(feed).toContain("IntersectionObserver");
    expect(feed).not.toMatch(/autoplay/i);
  });

  it("has only a minimum-duration gate with no size or publication-type UI", () => {
    const clip = source("./clip-entry.ts");
    expect(clip).not.toContain("25 * 1024 * 1024");
    expect(clip).not.toMatch(/size-warning|name="purpose"|original-footage|id="rights"/);
    expect(clip).toContain("خاص دقيقة الفوق");
    expect(clip).toContain("readClipDuration");
    expect(clip).toContain("MAX_CLIP_BYTES");
    for (const id of ["clip-file-input", "clip-submit", "clip-progress", "clip-status", "clip-error"]) {
      expect(clip).toContain(`data-testid="${id}"`);
    }
    expect(clip).toContain('dataset.clipReady = "true"');
  });

  it("uploads the original File directly with no compression, queue or storage UI", () => {
    const transport = source("./components/clips/clipUpload.ts");
    const clip = source("./clip-entry.ts");
    expect(transport).toContain("api/clips/presign");
    expect(transport).toContain("api/clips/confirm");
    expect(transport).toContain('xhr.open("PUT", url)');
    expect(transport).toContain("xhr.send(file)");
    expect(transport).not.toMatch(/prepareClip|uploadQueue|indexedDB|localStorage|navigator\.locks|RETRY_DELAYS/);
    expect(clip).not.toMatch(/storage-badge|pending-uploads|Cloudflare|R2|GiB|quota|Préparation|Traitement serveur|>Pause</);
    expect(clip).toContain(">Annuler</button>");
    expect(clip).toContain("mutableControls.forEach(control => { control.disabled = true; })");
    expect(clip).toContain("mutableControls.forEach(control => { control.disabled = false; })");
    expect(source("../vite.config.ts")).not.toContain("uploadWorker");
  });
});