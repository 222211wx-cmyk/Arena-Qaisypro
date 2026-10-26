import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

beforeEach(() => {
  vi.resetModules();
  document.body.innerHTML = '<div id="root"></div>';
});

afterEach(() => {
  document.head.querySelectorAll("style").forEach(style => style.remove());
  vi.unstubAllGlobals();
  window.localStorage.clear();
});

const clipBody = () => ({
  clip: {
    id: 42, code: "HELX-123456", name: "My song", originalName: "song.mp3",
    duration: 61, size: 100, created_at: new Date().toISOString(),
    contentType: "audio/mpeg", processingStatus: "ready",
    url: "https://storage.example/song.mp3",
    author: { id: 7, username: "producer" },
    isOwner: false, liked: false, likeCount: 4, commentCount: 2,
  },
});
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

describe("clip player identity + bookmark scope", () => {
  it("persists the save to the server once a delayed identity resolves", async () => {
    let releaseIdentity!: () => void;
    const gate = new Promise<void>(resolve => { releaseIdentity = resolve; });
    const saveCalls: string[] = [];
    vi.stubGlobal("fetch", vi.fn(async (url: string, init?: RequestInit) => {
      if (url.includes("/api/auth/me")) {
        await gate; // identity settles AFTER the clip renders
        return json({ id: 7, username: "producer" });
      }
      if (url.includes("/api/clips/42/save") && init?.method === "POST") {
        saveCalls.push(url);
        return json({ saved: true, saveCount: 3 });
      }
      return json(clipBody());
    }));
    const { renderClipPlayer } = await import("./clip-player-entry");
    renderClipPlayer("HELX-123456");
    // Media can render immediately; actions must wait for identity.
    await vi.waitFor(() => expect(document.querySelector("audio")).not.toBeNull());
    expect(document.querySelector('[aria-label^="Enregistr"]')).toBeNull();
    releaseIdentity();
    await vi.waitFor(() =>
      expect(document.querySelector('[aria-label="Enregistrer"]')).not.toBeNull());
    (document.querySelector('[aria-label="Enregistrer"]') as HTMLButtonElement).click();
    await vi.waitFor(() =>
      expect(document.querySelector('[aria-label="Enregistré"]')).not.toBeNull());
    expect(saveCalls.length).toBe(1);
    // No device-bucket writes for an authenticated citizen.
    expect(window.localStorage.getItem("gdna-arena.saved-clips.7")).toBeNull();
    expect(window.localStorage.getItem("gdna-arena.saved-clips.anon")).toBeNull();
  });

  it("disables bookmark (no anonymous write) when identity lookup fails with a non-401", async () => {
    vi.stubGlobal("fetch", vi.fn(async (url: string) => {
      if (url.includes("/api/auth/me")) return json({ error: "boom" }, 500);
      return json(clipBody());
    }));
    const { renderClipPlayer } = await import("./clip-player-entry");
    renderClipPlayer("HELX-123456");
    await vi.waitFor(() =>
      expect(document.querySelector('[aria-label="Enregistrement indisponible — statut de connexion inconnu"]')).not.toBeNull());
    const button = document.querySelector('[aria-label="Enregistrement indisponible — statut de connexion inconnu"]') as HTMLButtonElement;
    expect(button.disabled).toBe(true);
    button.click();
    expect(window.localStorage.getItem("gdna-arena.saved-clips.anon")).toBeNull();
  });

  it("falls back to the anonymous device bucket only when identity is a confirmed 401", async () => {
    vi.stubGlobal("fetch", vi.fn(async (url: string) => {
      if (url.includes("/api/auth/me")) return json({ error: "unauthorized" }, 401);
      return json(clipBody());
    }));
    const { renderClipPlayer } = await import("./clip-player-entry");
    renderClipPlayer("HELX-123456");
    await vi.waitFor(() =>
      expect(document.querySelector('[aria-label="Enregistrer"]')).not.toBeNull());
    (document.querySelector('[aria-label="Enregistrer"]') as HTMLButtonElement).click();
    await vi.waitFor(() =>
      expect(window.localStorage.getItem("gdna-arena.saved-clips.anon")).toContain("42"));
  });
});

describe("code-based clip player", () => {
  it("deletes an owned direct clip and returns toward the grid after cleaning media", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.spyOn(window, "confirm").mockReturnValue(true);
    const requests: Array<[string, RequestInit | undefined]> = [];
    vi.stubGlobal("fetch", vi.fn(async (url: string, init?: RequestInit) => {
      requests.push([url, init]);
      if (url.includes("/api/auth/me")) return json({ id: 7, username: "producer" });
      if (url.includes("/engagement")) return json({ engagement: {
        id: 42, code: "HELX-123456", title: "My song",
        author: { id: 7, username: "producer", avatarUrl: null },
        isOwner: true, liked: false, likeCount: 4, commentCount: 2,
        saved: false, saveCount: 0, shareCount: 0,
      } });
      if (url.endsWith("/api/clips/42") && init?.method === "DELETE") return json({ deleted: true });
      return json(clipBody());
    }));
    vi.spyOn(HTMLMediaElement.prototype, "load").mockImplementation(() => {});
    vi.spyOn(HTMLMediaElement.prototype, "pause").mockImplementation(() => {});
    const { renderClipPlayer } = await import("./clip-player-entry");
    renderClipPlayer("HELX-123456");
    await vi.waitFor(() => expect(document.querySelector('[aria-label="Delete clip"]')).not.toBeNull());
    document.querySelector<HTMLButtonElement>('[aria-label="More actions"]')!.click();
    document.querySelector<HTMLButtonElement>('[aria-label="Delete clip"]')!.click();
    await vi.waitFor(() => expect(requests.some(([url, init]) =>
      url.endsWith("/api/clips/42") && init?.method === "DELETE")).toBe(true));
    await vi.waitFor(() => expect(document.querySelector("audio")?.hasAttribute("src")).toBe(false));
  });

  it("loads a direct URL and uses the correct native media element", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({
      clip: {
        id: 42,
        code: "HELX-123456",
        name: "My song",
        originalName: "song.mp3",
        duration: 61,
        size: 100,
        created_at: new Date().toISOString(),
        contentType: "audio/mpeg",
        processingStatus: "ready",
        url: "https://storage.example/song.mp3",
        author: { id: 7, username: "producer" },
        isOwner: false,
        liked: false,
        likeCount: 4,
        commentCount: 2,
      },
    }), { status: 200, headers: { "Content-Type": "application/json" } })));
    const { renderClipPlayer } = await import("./clip-player-entry");
    renderClipPlayer("HELX-123456");
    await vi.waitFor(() => expect(document.querySelector("audio")).not.toBeNull());
    expect((document.querySelector("audio") as HTMLAudioElement).src).toBe("https://storage.example/song.mp3");
    expect(document.getElementById("player-name")?.textContent).toBe("My song");
    expect(document.querySelector('[aria-label="Like"]')?.textContent).toContain("4");
    expect(document.querySelector('[aria-label="Comments"]')?.textContent).toContain("2");
    expect(document.querySelector('[aria-label="Message"]')).not.toBeNull();
    expect(document.querySelector('[aria-label="Fullscreen"]')).not.toBeNull();
    expect(document.querySelectorAll(".direct-bottomnav .direct-nav-item")).toHaveLength(4);
    expect(document.querySelector('[aria-label="Retour à l’accueil"]')?.getAttribute("href")).toBe("/");
    expect(document.querySelector('[aria-label="Fermer le lecteur et afficher la grille"]')?.getAttribute("href"))
      .toBe("/clips?view=grid");
    expect(document.querySelector("audio")?.getAttribute("controlsList")).toBe("nofullscreen");
    expect((document.querySelector("audio") as HTMLAudioElement).loop).toBe(false);
    expect(document.body.dataset.clipReady).toBe("true");
  });

  it("shows an actionable retry when loading fails", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response(
      JSON.stringify({ error: "الكليب غير موجود" }),
      { status: 404, headers: { "Content-Type": "application/json" } },
    )));
    const { renderClipPlayer } = await import("./clip-player-entry");
    renderClipPlayer("HELX-654321");
    await vi.waitFor(() => expect(document.getElementById("player-error")?.textContent).toBe("الكليب غير موجود"));
    expect((document.getElementById("player-retry") as HTMLButtonElement).hidden).toBe(false);
  });
});