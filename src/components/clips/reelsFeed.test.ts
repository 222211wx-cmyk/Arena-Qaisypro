import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { mountReels, type ReelsController } from "./reelsFeed";

// Minimal touch-event shim: jsdom has no TouchEvent, and the gesture handler
// only reads event.touches[i].clientX/Y and event.changedTouches[i].clientX/Y.
function touch(type: string, x: number, y: number): Event {
  const ev = new Event(type, { bubbles: true, cancelable: true });
  const point = { clientX: x, clientY: y };
  Object.defineProperties(ev, {
    touches: { value: type === "touchend" ? [] : [point] },
    changedTouches: { value: [point] },
  });
  return ev;
}

/** Simulate a single-finger horizontal swipe on an element. */
function swipe(target: EventTarget, fromX: number, toX: number, y = 300) {
  target.dispatchEvent(touch("touchstart", fromX, y));
  target.dispatchEvent(touch("touchmove", toX, y));
  target.dispatchEvent(touch("touchend", toX, y));
}

let controller: ReelsController;

beforeEach(() => {
  vi.spyOn(HTMLMediaElement.prototype, "load").mockImplementation(() => {});
  document.body.innerHTML = '<div id="root"></div>';
  window.history.replaceState(null, "", "/clips");
  // resolveIdentity + loadPage both hit fetch; return an empty, non-degraded feed.
  vi.stubGlobal("fetch", vi.fn(async (url: string) => {
    if (url.includes("/api/auth/me")) return Response.json({ error: "unauthorized" }, { status: 401 });
    return Response.json({ clips: [], hasMore: false, degraded: false });
  }));
});

describe("critical Clips navigation", () => {
  it("loads grid pages of six lazily without constructing a video player", async () => {
    window.history.replaceState(null, "", "/clips?view=grid");
    vi.stubGlobal("fetch", vi.fn(async (url: string) => {
      if (url.includes("/auth/me")) return Response.json({}, { status: 401 });
      const second = url.includes("before=95");
      return Response.json({
        clips: Array.from({ length: second ? 2 : 6 }, (_, i) => ({
          id: (second ? 94 : 100) - i, title: `Clip ${i}`, thumb: "/poster.webp",
          author: { username: "tester" },
        })),
        hasMore: !second, nextBefore: second ? null : 95,
      });
    }));
    controller = mountReels(document.getElementById("root")!, { onOpenComposer: vi.fn() });
    await vi.waitFor(() => expect(document.querySelectorAll(".reels-grid-cell")).toHaveLength(6));
    expect(document.querySelector("video")).toBeNull();
    expect(document.querySelector(".reels-grid img")?.getAttribute("loading")).toBe("lazy");
    expect(vi.mocked(fetch).mock.calls.filter(([url]) => String(url).includes("/clips/feed"))).toHaveLength(1);
    expect(vi.mocked(fetch).mock.calls.some(([url]) => String(url).includes("limit=6"))).toBe(true);
    const buttons = () => document.querySelectorAll<HTMLButtonElement>(".reels-grid-pagination button");
    expect(buttons()[0].disabled).toBe(true);
    buttons()[1].click();
    await vi.waitFor(() => expect(document.querySelectorAll(".reels-grid-cell")).toHaveLength(2));
    expect(buttons()[1].disabled).toBe(true);
    expect(document.querySelector("video")).toBeNull();
    buttons()[0].click();
    await vi.waitFor(() => expect(document.querySelectorAll(".reels-grid-cell")).toHaveLength(6));
  });

  it("lets a failed grid request retry without starting the reel feed", async () => {
    window.history.replaceState(null, "", "/clips?view=grid");
    vi.stubGlobal("fetch", vi.fn(async () => Response.json({}, { status: 503 })));
    controller = mountReels(document.getElementById("root")!, { onOpenComposer: vi.fn() });
    await vi.waitFor(() => expect(document.querySelector('[data-testid="reels-grid"]')?.textContent).toContain("Réessayer"));
    vi.mocked(fetch).mockImplementation(async () => Response.json({ clips: [], hasMore: false }));
    document.querySelector<HTMLButtonElement>('[data-testid="reels-grid"] button')!.click();
    await vi.waitFor(() => expect(document.querySelector('[data-testid="reels-grid"]')?.textContent).toContain("Aucun Clip"));
    expect(document.querySelector("video")).toBeNull();
  });

  it("requests five clips and offers a visible recovery action after a failed feed request", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.stubGlobal("fetch", vi.fn(async (url: string) => {
      if (url.includes("/auth/me")) return Response.json({}, { status: 401 });
      return Response.json({}, { status: 503 });
    }));
    controller = mountReels(document.getElementById("root")!, { onOpenComposer: vi.fn() });
    await vi.waitFor(() => expect(document.querySelector('[data-testid="reels-state-error"] button')).not.toBeNull());
    expect(vi.mocked(fetch).mock.calls.some(([url]) => String(url).includes("limit=5"))).toBe(true);
    vi.mocked(fetch).mockResolvedValue(Response.json({ clips: [], hasMore: false }));
    document.querySelector<HTMLButtonElement>('[data-testid="reels-state-error"] button')!.click();
    await vi.waitFor(() => expect(document.querySelector('[data-testid="reels-state-empty"]')).not.toBeNull());
  });
  it("does not request private inbox counts for anonymous viewers", async () => {
    controller = mountReels(document.getElementById("root")!, { onOpenComposer: vi.fn() });
    await vi.waitFor(() => expect(document.querySelector('[data-nav="profile"]')?.getAttribute("href")).toBe("/login"));
    expect(vi.mocked(fetch).mock.calls.some(([url]) => String(url).includes("/messages/unread-count"))).toBe(false);
  });

  it("shows the authenticated inbox count using the actual count contract", async () => {
    vi.stubGlobal("fetch", vi.fn(async (url: string) => {
      if (url.includes("/auth/me")) return Response.json({ id: 7, username: "citizen" });
      if (url.includes("/messages/unread-count")) return Response.json({ count: 3 });
      return Response.json({ clips: [], notifications: [], unreadCount: 0, hasMore: false });
    }));
    controller = mountReels(document.getElementById("root")!, { onOpenComposer: vi.fn() });
    await vi.waitFor(() => expect(document.querySelector('[data-nav="inbox"]')?.getAttribute("aria-label")).toBe("Inbox, 3 unread messages"));
  });

  it("keeps Home, Clips, Search, Inbox, Profile in the persistent bottom nav", () => {
    controller = mountReels(document.getElementById("root")!, { onOpenComposer: vi.fn() });
    const labels = [...document.querySelectorAll(".reels-bottomnav .reels-nav-item > span:last-child")]
      .map(node => node.textContent);
    expect(labels).toEqual(["Accueil", "Clips", "Recherche", "Inbox", "Profil"]);
    expect(document.querySelector('[data-nav="inbox"]')?.getAttribute("href")).toBe("/messages");
    expect(document.querySelector('.reels-topbar-left a[href="/"]')).not.toBeNull();
    expect(document.querySelector(".reels-title")?.textContent).toBe("GDNA Arena");
  });

  it("honors view=grid on boot even for an empty feed", async () => {
    window.history.replaceState(null, "", "/clips?view=grid");
    controller = mountReels(document.getElementById("root")!, { onOpenComposer: vi.fn() });
    await vi.waitFor(() => expect(document.querySelector('[data-testid="reels-grid"]')).not.toBeNull());
  });
});

afterEach(() => {
  controller?.destroy();
  vi.unstubAllGlobals();
});

describe("Reels tools panel — close gesture from within the panel", () => {
  it("closes the open tools panel on a right-swipe that STARTS on the panel", async () => {
    controller = mountReels(document.getElementById("root")!, { onOpenComposer: vi.fn() });
    const shell = document.querySelector<HTMLElement>('[data-testid="reels-shell"]')!;
    const panel = document.querySelector<HTMLElement>(".reels-tools-panel")!;

    // Open the tools via the hamburger (setTools(true)).
    document.querySelector<HTMLButtonElement>('[aria-label="Menu"]')!.click();
    expect(shell.dataset.tools).toBe("open");

    // A right-swipe originating on the PANEL (a sibling of the track) must reach
    // the shared handler and close it — the regression this fixes.
    swipe(panel, 60, 200);
    expect(shell.dataset.tools).toBe("closed");
  });

  it("does not close the panel from a swipe that starts on a text input (editing preserved)", async () => {
    controller = mountReels(document.getElementById("root")!, { onOpenComposer: vi.fn() });
    const shell = document.querySelector<HTMLElement>('[data-testid="reels-shell"]')!;
    const panel = document.querySelector<HTMLElement>(".reels-tools-panel")!;

    document.querySelector<HTMLButtonElement>('[aria-label="Menu"]')!.click();
    expect(shell.dataset.tools).toBe("open");

    // Simulate a horizontal drag that begins inside a text field (e.g. the owner
    // title editor / caret selection): it must be ignored, not treated as close.
    const input = document.createElement("input");
    panel.appendChild(input);
    swipe(input, 60, 200);
    expect(shell.dataset.tools).toBe("open");
  });

  it("ignores a vertical drag on the panel (no feed navigation, panel scroll preserved)", async () => {
    controller = mountReels(document.getElementById("root")!, { onOpenComposer: vi.fn() });
    const shell = document.querySelector<HTMLElement>('[data-testid="reels-shell"]')!;
    const panel = document.querySelector<HTMLElement>(".reels-tools-panel")!;

    document.querySelector<HTMLButtonElement>('[aria-label="Menu"]')!.click();
    expect(shell.dataset.tools).toBe("open");

    // A vertical drag must not close the panel nor navigate the feed.
    panel.dispatchEvent(touch("touchstart", 100, 100));
    panel.dispatchEvent(touch("touchmove", 100, 260));
    panel.dispatchEvent(touch("touchend", 100, 260));
    expect(shell.dataset.tools).toBe("open");
  });
});

const feedClip = (id: number) => ({
  id,
  user_id: 7,
  username: "producer",
  title: `Clip ${id}`,
  video_url: `https://storage.example/${id}.mp4`,
  thumb: null,
  author: { id: 7, username: "producer", avatarUrl: null },
  saveCount: 0,
  shareCount: 0,
  saved: false,
});

describe("Reels poster and actions lifecycle", () => {
  beforeEach(() => {
    vi.spyOn(HTMLMediaElement.prototype, "play").mockResolvedValue();
    vi.spyOn(HTMLMediaElement.prototype, "pause").mockImplementation(() => {});
  });

  it("opens Clip 13 from search with its existing media URL and never searches again on click", async () => {
    Object.defineProperty(HTMLElement.prototype, "scrollIntoView", { configurable: true, value: vi.fn() });
    const clip = feedClip(13);
    vi.stubGlobal("fetch", vi.fn(async (url: string) => {
      if (url.includes("/auth/me")) return Response.json({}, { status: 401 });
      if (url.includes("/clips/feed")) {
        return Response.json({ clips: url.includes("q=") ? [clip] : [], hasMore: false });
      }
      return Response.json({ engagement: {} });
    }));
    controller = mountReels(document.getElementById("root")!, { onOpenComposer: vi.fn() });
    await vi.waitFor(() => expect(document.querySelector('[data-testid="reels-state-empty"]')).not.toBeNull());
    document.querySelector<HTMLButtonElement>('.reels-topbar [aria-label="Rechercher"]')!.click();
    const input = document.querySelector<HTMLInputElement>('.reels-search-input')!;
    input.value = "producer";
    input.dispatchEvent(new Event("input"));
    await vi.waitFor(() => expect(document.querySelector('.reels-search [aria-label="Clip 13"]')).not.toBeNull());
    const searchesBefore = vi.mocked(fetch).mock.calls.filter(([url]) => String(url).includes("/clips/feed")).length;
    document.querySelector<HTMLButtonElement>('.reels-search [aria-label="Clip 13"]')!.click();
    const video = document.querySelector<HTMLVideoElement>('[data-clip-id="13"] video');
    expect(video).not.toBeNull();
    expect(video!.querySelector("source")?.src).toBe(clip.video_url);
    expect(video!.controls).toBe(true);
    expect(video!.playsInline).toBe(true);
    expect(video!.play).toHaveBeenCalled();
    await Promise.resolve();
    expect(vi.mocked(fetch).mock.calls.filter(([url]) => String(url).includes("/clips/feed"))).toHaveLength(searchesBefore);
    expect(document.querySelector('.reels-search')).toBeNull();
    expect(document.body.textContent).not.toContain("Recherche indisponible");
  });

  it("bypasses search for Clip 13 and creates the native R2-backed stream player on click", async () => {
    controller = mountReels(document.getElementById("root")!, { onOpenComposer: vi.fn() });
    await vi.waitFor(() => expect(document.querySelector('[data-testid="reels-state-empty"]')).not.toBeNull());
    const before = vi.mocked(fetch).mock.calls.length;
    document.querySelector<HTMLButtonElement>('.reels-topbar [aria-label="Rechercher"]')!.click();
    const input = document.querySelector<HTMLInputElement>('.reels-search-input')!;
    input.value = "Clip 13";
    input.dispatchEvent(new Event("input"));
    await vi.waitFor(() => expect(document.querySelector('.reels-search [aria-label="Clip 13"]')).not.toBeNull());
    expect(document.querySelector("video")).toBeNull();
    document.querySelector<HTMLButtonElement>('.reels-search [aria-label="Clip 13"]')!.click();
    const video = document.querySelector<HTMLVideoElement>(".reels-search video")!;
    expect(video.getAttribute("src")).toBe("/api/clips/stream?id=13");
    expect(video.controls && video.autoplay && video.playsInline).toBe(true);
    expect(video.play).toHaveBeenCalled();
    expect(vi.mocked(fetch).mock.calls).toHaveLength(before);
    expect(document.body.textContent).not.toContain("Recherche indisponible");
  });

  const feed = (engagement?: () => Promise<Response>) => {
    vi.stubGlobal("fetch", vi.fn(async (url: string) => {
      if (url.includes("/api/auth/me")) return Response.json({}, { status: 401 });
      if (url.includes("/api/clips/feed")) {
        return Response.json({ clips: [{ ...feedClip(9), thumb: "/poster.webp" }], hasMore: false, nextBefore: null });
      }
      if (url.includes("/engagement") && engagement) return engagement();
      return Response.json({ engagement: {
        liked: false, likeCount: 0, commentCount: 0, saved: false, saveCount: 0, shareCount: 0,
      } });
    }));
    controller = mountReels(document.getElementById("root")!, { onOpenComposer: vi.fn() });
  };

  it("uses one native player, loads its typed source, and starts only on a direct click", async () => {
    vi.mocked(HTMLMediaElement.prototype.play).mockRejectedValueOnce(new DOMException("blocked", "NotAllowedError"));
    feed();
    await vi.waitFor(() => expect(document.querySelector("video")).not.toBeNull());
    const video = document.querySelector("video")!;
    const poster = document.querySelector<HTMLElement>(".reels-poster")!;
    expect(video.controls).toBe(true);
    expect(video.playsInline).toBe(true);
    expect(video.autoplay).toBe(false);
    expect(video.muted).toBe(false);
    expect(video.preload).toBe("metadata");
    expect(video.querySelector("source")?.type).toBe("video/mp4");
    expect(video.querySelector("source")?.src).toBe("https://storage.example/9.mp4");
    expect(HTMLMediaElement.prototype.load).toHaveBeenCalled();
    expect(video.style.pointerEvents).toBe("auto");
    expect(video.style.zIndex).toBe("10");
    expect(poster.style.pointerEvents).toBe("none");
    expect(document.querySelector<HTMLElement>(".reels-center")?.style.pointerEvents).toBe("none");
    expect(document.querySelector<HTMLElement>(".reels-fs-pill")?.style.pointerEvents).toBe("auto");
    expect(HTMLMediaElement.prototype.play).not.toHaveBeenCalled();
    expect(document.querySelector(".reels-play")).toBeNull();
    video.dispatchEvent(new Event("loadeddata"));
    expect(poster.style.display).not.toBe("none");
    const playbackClick = new MouseEvent("click", { bubbles: true, cancelable: true });
    video.dispatchEvent(playbackClick);
    expect(playbackClick.defaultPrevented).toBe(true);
    await Promise.resolve();
    // The poster doesn't consume clicks directed at the media surface.
    video.click();
    expect(HTMLMediaElement.prototype.play).toHaveBeenCalledTimes(2);
    expect(poster.style.display).not.toBe("none");
    Object.defineProperty(video, "paused", { configurable: true, value: false });
    video.dispatchEvent(new Event("playing"));
    expect(poster.style.display).toBe("none");
    vi.mocked(HTMLMediaElement.prototype.pause).mockClear();
    video.click();
    expect(HTMLMediaElement.prototype.pause).toHaveBeenCalledTimes(1);
    expect(HTMLMediaElement.prototype.play).toHaveBeenCalledTimes(2);
    video.dispatchEvent(new Event("play"));
    expect(document.querySelector(".reels-play-instruction")).toBeNull();
    video.dispatchEvent(new Event("pause"));
    expect(video.controls).toBe(true);
  });

  it("reveals only a rendered frame and restores the poster on deactivation until resumed playback", async () => {
    feed();
    await vi.waitFor(() => expect(document.querySelector("video")).not.toBeNull());
    const video = document.querySelector("video")!;
    const poster = document.querySelector<HTMLElement>(".reels-poster")!;
    let paused = false;
    Object.defineProperty(video, "paused", { configurable: true, get: () => paused });
    const frames: Array<() => void> = [];
    Object.defineProperty(video, "requestVideoFrameCallback", {
      configurable: true, value: (callback: () => void) => { frames.push(callback); return frames.length; },
    });
    video.dispatchEvent(new Event("loadeddata"));
    video.dispatchEvent(new Event("playing"));
    expect(poster.style.display).not.toBe("none");
    frames.shift()!();
    expect(poster.style.display).toBe("none");
    paused = true;
    video.dispatchEvent(new Event("pause"));
    expect(poster.style.display).toBe("none"); // the already rendered paused frame remains visible
    controller.pause();
    expect(poster.style.display).not.toBe("none");
    expect(video.isConnected).toBe(false);
    controller.resume();
    expect(video.isConnected).toBe(true);
    expect(poster.style.display).not.toBe("none");
    paused = false;
    video.dispatchEvent(new Event("playing"));
    frames.shift()!();
    expect(poster.style.display).toBe("none");
  });

  it("retries an actions mount skipped while disconnected, without duplicate controls", async () => {
    let release!: (response: Response) => void;
    const pending = new Promise<Response>(resolve => { release = resolve; });
    feed(() => pending);
    await vi.waitFor(() => expect(vi.mocked(fetch).mock.calls.some(([url]) => String(url).includes("/engagement"))).toBe(true));
    controller.pause();
    release(Response.json({ engagement: {
      liked: false, likeCount: 0, commentCount: 0, saved: false, saveCount: 0, shareCount: 0,
    } }));
    await new Promise(resolve => setTimeout(resolve, 0));
    expect(document.querySelector(".clip-rail")).toBeNull();
    controller.resume();
    await vi.waitFor(() => expect(document.querySelectorAll(".clip-rail")).toHaveLength(1));
    controller.pause();
    controller.resume();
    expect(document.querySelectorAll(".clip-rail")).toHaveLength(1);
    expect(vi.mocked(fetch).mock.calls.filter(([url]) => String(url).includes("/engagement"))).toHaveLength(2);
  });

  it("does not resurrect actions after the feed is destroyed during engagement loading", async () => {
    let release!: (response: Response) => void;
    feed(() => new Promise<Response>(resolve => { release = resolve; }));
    await vi.waitFor(() => expect(vi.mocked(fetch).mock.calls.some(([url]) => String(url).includes("/engagement"))).toBe(true));
    controller.destroy();
    release(Response.json({ engagement: {
      liked: false, likeCount: 0, commentCount: 0, saved: false, saveCount: 0, shareCount: 0,
    } }));
    await new Promise(resolve => setTimeout(resolve, 0));
    expect(document.querySelector(".clip-rail")).toBeNull();
    expect(document.querySelector(".reels-shell")).toBeNull();
  });
});

describe("Reels natural-end progression", () => {
  beforeEach(() => {
    Object.defineProperty(HTMLMediaElement.prototype, "play", {
      configurable: true,
      value: vi.fn(async () => {}),
    });
    Object.defineProperty(HTMLMediaElement.prototype, "pause", {
      configurable: true,
      value: vi.fn(),
    });
    Object.defineProperty(HTMLElement.prototype, "scrollIntoView", {
      configurable: true,
      value: vi.fn(),
    });
  });

  it("advances once to the next ordered post and never enables looping", async () => {
    vi.stubGlobal("fetch", vi.fn(async (url: string) => {
      if (url.includes("/api/auth/me")) return Response.json({}, { status: 401 });
      if (url.includes("/api/clips/feed")) {
        return Response.json({ clips: [feedClip(2), feedClip(1)], hasMore: false, nextBefore: null });
      }
      return Response.json({ engagement: {
        liked: false, likeCount: 0, commentCount: 0, saved: false, saveCount: 0, shareCount: 0,
      } });
    }));
    controller = mountReels(document.getElementById("root")!, { onOpenComposer: vi.fn() });
    await vi.waitFor(() => expect(document.querySelectorAll("video")).toHaveLength(1));
    const first = document.querySelector("video") as HTMLVideoElement;
    expect(first.loop).toBe(false);
    first.dispatchEvent(new Event("error"));
    expect(document.querySelector(".reels-media-error [type=button]")?.textContent).toBe("Réessayer");
    first.dispatchEvent(new Event("loadeddata"));
    expect(document.querySelector(".reels-media-error")).toBeNull();
    first.dispatchEvent(new Event("play"));
    expect(first.controls).toBe(true);

    first.dispatchEvent(new Event("ended"));
    await vi.waitFor(() => expect(document.querySelector('[data-clip-id="1"] video')).not.toBeNull());
    expect(document.querySelectorAll("video")).toHaveLength(1);
    expect(first.isConnected).toBe(false);
    expect(first.hasAttribute("src")).toBe(false);
    const secondSlide = document.querySelector<HTMLElement>('[data-clip-id="1"]')!;
    expect(secondSlide.scrollIntoView).toHaveBeenCalledOnce();
    expect((secondSlide.querySelector("video") as HTMLVideoElement).loop).toBe(false);

    // A stale duplicate ended notification cannot skip or advance twice.
    first.dispatchEvent(new Event("ended"));
    expect(secondSlide.scrollIntoView).toHaveBeenCalledOnce();
  });

  it("removes a successfully deleted owner clip and activates the next clip", async () => {
    vi.spyOn(window, "confirm").mockReturnValue(true);
    vi.stubGlobal("fetch", vi.fn(async (url: string, init?: RequestInit) => {
      if (url.includes("/api/auth/me")) return Response.json({ id: 7, username: "producer" });
      if (url.includes("/api/clips/feed")) {
        return Response.json({ clips: [feedClip(2), feedClip(1)], hasMore: false, nextBefore: null });
      }
      if (url.includes("/engagement")) {
        const id = url.includes("/2/") ? 2 : 1;
        return Response.json({ engagement: {
          id, code: null, title: `Clip ${id}`, author: { id: 7, username: "producer", avatarUrl: null },
          isOwner: true, liked: false, likeCount: 0, commentCount: 0,
          saved: false, saveCount: 0, shareCount: 0,
        } });
      }
      if (url.endsWith("/api/clips/2") && init?.method === "DELETE") {
        return Response.json({ deleted: true });
      }
      return Response.json({});
    }));
    controller = mountReels(document.getElementById("root")!, { onOpenComposer: vi.fn() });
    await vi.waitFor(() => expect(document.querySelector('[data-clip-id="2"] [aria-label="Delete clip"]')).not.toBeNull());
    document.querySelector<HTMLButtonElement>('[data-clip-id="2"] [aria-label="More actions"]')!.click();
    document.querySelector<HTMLButtonElement>('[data-clip-id="2"] [aria-label="Delete clip"]')!.click();
    await vi.waitFor(() => expect(document.querySelector('[data-clip-id="2"]')).toBeNull());
    expect(document.querySelector('[data-clip-id="1"] video')).not.toBeNull();
    expect(document.querySelectorAll("video")).toHaveLength(1);
  });

  it("leaves the genuine final item stopped and keeps play/pause visible", async () => {
    vi.stubGlobal("fetch", vi.fn(async (url: string) => {
      if (url.includes("/api/auth/me")) return Response.json({}, { status: 401 });
      if (url.includes("/api/clips/feed")) {
        return Response.json({ clips: [feedClip(9)], hasMore: false, nextBefore: null });
      }
      return Response.json({ engagement: {
        liked: false, likeCount: 0, commentCount: 0, saved: false, saveCount: 0, shareCount: 0,
      } });
    }));
    controller = mountReels(document.getElementById("root")!, { onOpenComposer: vi.fn() });
    await vi.waitFor(() => expect(document.querySelector("video")).not.toBeNull());
    document.querySelector("video")!.dispatchEvent(new Event("ended"));
    await Promise.resolve();

    expect(HTMLElement.prototype.scrollIntoView).not.toHaveBeenCalled();
    const control = document.querySelector<HTMLVideoElement>("video")!;
    expect(control.controls).toBe(true);
    expect(control.isConnected).toBe(true);
  });

  it("does not advance after pagination if the citizen pauses the feed while waiting", async () => {
    let releasePage!: () => void;
    const pageGate = new Promise<void>(resolve => { releasePage = resolve; });
    let feedCalls = 0;
    vi.stubGlobal("fetch", vi.fn(async (url: string) => {
      if (url.includes("/api/auth/me")) return Response.json({}, { status: 401 });
      if (url.includes("/api/clips/feed")) {
        feedCalls++;
        if (feedCalls === 1) {
          return Response.json({ clips: [feedClip(2)], hasMore: true, nextBefore: 2 });
        }
        await pageGate;
        return Response.json({ clips: [feedClip(1)], hasMore: false, nextBefore: null });
      }
      return Response.json({ engagement: {
        liked: false, likeCount: 0, commentCount: 0, saved: false, saveCount: 0, shareCount: 0,
      } });
    }));
    controller = mountReels(document.getElementById("root")!, { onOpenComposer: vi.fn() });
    await vi.waitFor(() => expect(document.querySelector("video")).not.toBeNull());
    const first = document.querySelector("video")!;
    first.dispatchEvent(new Event("ended"));
    first.dispatchEvent(new Event("ended"));
    await vi.waitFor(() => expect(feedCalls).toBe(2));
    controller.pause();
    releasePage();
    await vi.waitFor(() => expect(document.querySelectorAll("video")).toHaveLength(0));

    expect(feedCalls).toBe(2);
    expect(HTMLElement.prototype.scrollIntoView).not.toHaveBeenCalled();
  });

  it("ignores a late page when search covers the feed during the end race", async () => {
    let releasePage!: () => void;
    const pageGate = new Promise<void>(resolve => { releasePage = resolve; });
    let feedCalls = 0;
    vi.stubGlobal("fetch", vi.fn(async (url: string) => {
      if (url.includes("/api/auth/me")) return Response.json({}, { status: 401 });
      if (url.includes("/api/clips/feed")) {
        feedCalls++;
        if (feedCalls === 1) {
          return Response.json({ clips: [feedClip(2)], hasMore: true, nextBefore: 2 });
        }
        await pageGate;
        return Response.json({ clips: [feedClip(1)], hasMore: false, nextBefore: null });
      }
      return Response.json({ engagement: {
        liked: false, likeCount: 0, commentCount: 0, saved: false, saveCount: 0, shareCount: 0,
      } });
    }));
    controller = mountReels(document.getElementById("root")!, { onOpenComposer: vi.fn() });
    await vi.waitFor(() => expect(document.querySelector("video")).not.toBeNull());
    document.querySelector("video")!.dispatchEvent(new Event("ended"));
    await vi.waitFor(() => expect(feedCalls).toBe(2));
    document.querySelector<HTMLButtonElement>('[aria-label="Rechercher"]')!.click();
    releasePage();
    await vi.waitFor(() => expect(document.querySelectorAll("video")).toHaveLength(0));

    expect(document.querySelector('[data-testid="reels-search"]')).not.toBeNull();
    expect(HTMLElement.prototype.scrollIntoView).not.toHaveBeenCalled();
  });
});
