import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent } from "@testing-library/dom";
import { mountVideoActions, type VideoActionState } from "./VideoActions";

const state: VideoActionState = {
  id: 42,
  code: "HELX-123456",
  title: "Original title",
  author: { id: 7, username: "producer" },
  isOwner: true,
  liked: false,
  likeCount: 4,
  commentCount: 0,
};

beforeEach(() => {
  window.localStorage.clear();
  document.body.innerHTML = '<h1 id="title">Original title</h1><video></video><div id="actions"></div>';
});

describe("VideoActions", () => {
  it("defensively disables looping on every mounted clip media element", async () => {
    const media = document.querySelector("video") as HTMLVideoElement;
    media.loop = true;
    await mountVideoActions({
      host: document.getElementById("actions")!,
      media,
      titleElement: document.getElementById("title")!,
      clipId: 42,
      initial: { ...state },
    });
    expect(media.loop).toBe(false);
  });

  it("persists a heart and reflects the returned count", async () => {
    const fetchMock = vi.fn(async () => Response.json({ liked: true, likeCount: 5 }));
    vi.stubGlobal("fetch", fetchMock);
    await mountVideoActions({
      host: document.getElementById("actions")!,
      media: document.querySelector("video")!,
      titleElement: document.getElementById("title")!,
      clipId: 42,
      initial: { ...state },
    });
    fireEvent.click(document.querySelector('[aria-label="Like"]')!);
    await vi.waitFor(() => expect(document.querySelector('[aria-label="Unlike"]')?.textContent).toContain("5"));
    expect(fetchMock).toHaveBeenCalledWith(expect.stringContaining("/api/clips/42/like"), expect.objectContaining({
      method: "POST",
      credentials: "include",
    }));
  });

  it("persists a save via the server endpoint and reflects the returned count", async () => {
    const fetchMock = vi.fn(async () => Response.json({ saved: true, saveCount: 9 }));
    vi.stubGlobal("fetch", fetchMock);
    await mountVideoActions({
      host: document.getElementById("actions")!,
      media: document.querySelector("video")!,
      titleElement: document.getElementById("title")!,
      clipId: 42,
      accountId: 7,
      initial: { ...state, saved: false, saveCount: 8 },
    });
    const save = document.querySelector('[aria-label="Enregistrer"]') as HTMLButtonElement;
    expect(save.getAttribute("aria-pressed")).toBe("false");
    fireEvent.click(save);
    await vi.waitFor(() =>
      expect(document.querySelector('[aria-label="Enregistré"]')?.getAttribute("aria-pressed")).toBe("true"),
    );
    expect(document.querySelector('[aria-label="Enregistré"]')?.textContent).toContain("9");
    expect(fetchMock).toHaveBeenCalledWith(expect.stringContaining("/api/clips/42/save"), expect.objectContaining({
      method: "POST",
      credentials: "include",
    }));
  });

  it("falls back to a device-only save when identity is unknown", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => Response.json({})));
    await mountVideoActions({
      host: document.getElementById("actions")!,
      media: document.querySelector("video")!,
      titleElement: document.getElementById("title")!,
      clipId: 42,
      accountId: null,
      initial: { ...state },
    });
    const save = document.querySelector('[aria-label="Enregistrer"]') as HTMLButtonElement;
    fireEvent.click(save);
    await vi.waitFor(() =>
      expect(document.querySelector('[aria-label="Enregistré sur cet appareil"]')?.getAttribute("aria-pressed")).toBe("true"),
    );
    expect(window.localStorage.getItem("gdna-arena.saved-clips.anon")).toContain("42");
  });

  it("renders the author as a real profile link, plus title and audio label", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => Response.json({})));
    await mountVideoActions({
      host: document.getElementById("actions")!,
      media: document.querySelector("video")!,
      titleElement: document.getElementById("title")!,
      clipId: 42,
      contentType: "audio/mpeg",
      initial: { ...state },
    });
    const link = document.querySelector(".clip-meta-author-link") as HTMLAnchorElement;
    expect(link).not.toBeNull();
    expect(link.textContent).toBe("@producer");
    expect(link.getAttribute("href")).toContain("u/producer");
    expect(document.querySelector(".clip-meta-title")?.textContent).toBe("Original title");
    expect(document.querySelector(".clip-meta-audio")?.textContent).toBe("Original audio");
  });

  it("exposes secondary actions inside the three-dot menu", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => Response.json({})));
    await mountVideoActions({
      host: document.getElementById("actions")!,
      media: document.querySelector("video")!,
      titleElement: document.getElementById("title")!,
      clipId: 42,
      accountId: 7,
      initial: { ...state },
    });
    const more = document.querySelector('[aria-label="More actions"]') as HTMLButtonElement;
    expect(more.getAttribute("aria-expanded")).toBe("false");
    expect(document.querySelector('[role="menu"]')?.hasAttribute("hidden")).toBe(true);
    fireEvent.click(more);
    expect(more.getAttribute("aria-expanded")).toBe("true");
    expect(document.querySelector('[aria-label="Copy link"]')).not.toBeNull();
    expect(document.querySelector('[aria-label="Fullscreen"]')).not.toBeNull();
    expect(document.querySelector('[aria-label="Zoom"]')).not.toBeNull();
    expect(document.querySelector('[aria-label="Edit title"]')).not.toBeNull();
  });

  it("always requests fullscreen on the supplied navigation shell, never the media", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => Response.json({})));
    const shell = document.createElement("div");
    document.body.append(shell);
    const shellFullscreen = vi.fn(async () => {});
    const mediaFullscreen = vi.fn(async () => {});
    Object.defineProperty(shell, "requestFullscreen", { configurable: true, value: shellFullscreen });
    Object.defineProperty(document.querySelector("video")!, "requestFullscreen", {
      configurable: true,
      value: mediaFullscreen,
    });
    await mountVideoActions({
      host: document.getElementById("actions")!,
      media: document.querySelector("video")!,
      titleElement: document.getElementById("title")!,
      fullscreenTarget: shell,
      clipId: 42,
      initial: { ...state },
    });
    fireEvent.click(document.querySelector('[aria-label="Fullscreen"]')!);
    await vi.waitFor(() => expect(shellFullscreen).toHaveBeenCalledOnce());
    expect(mediaFullscreen).not.toHaveBeenCalled();
  });

  it("shows owner title editing and persists the returned title", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => Response.json({ clip: { title: "Saved title" } })));
    await mountVideoActions({
      host: document.getElementById("actions")!,
      media: document.querySelector("video")!,
      titleElement: document.getElementById("title")!,
      clipId: 42,
      initial: { ...state },
    });
    fireEvent.click(document.querySelector('[aria-label="Edit title"]')!);
    const input = document.querySelector('[aria-label="Clip title"]') as HTMLInputElement;
    fireEvent.input(input, { target: { value: "Saved title" } });
    fireEvent.submit(input.closest("form")!);
    await vi.waitFor(() => expect(document.getElementById("title")?.textContent).toBe("Saved title"));
  });

  it("renders the owner title editor INSIDE the visible caption node (never a detached element)", async () => {
    // Regression: the Reels feed passed a detached <span> as titleElement, so the
    // owner editor input mounted off-DOM and was invisible. The editor must render
    // into the exact on-screen node the caller supplies, and that node must be
    // connected to the document so the input is actually visible/focusable.
    vi.stubGlobal("fetch", vi.fn(async () => Response.json({ clip: { title: "x" } })));
    const caption = document.createElement("p");
    caption.className = "reels-caption";
    caption.setAttribute("dir", "auto");
    caption.textContent = "Original title";
    document.body.appendChild(caption); // the real, on-screen caption
    await mountVideoActions({
      host: document.getElementById("actions")!,
      media: document.querySelector("video")!,
      titleElement: caption,
      clipId: 42,
      initial: { ...state },
    });
    fireEvent.click(document.querySelector('[aria-label="Edit title"]')!);
    const input = document.querySelector('[aria-label="Clip title"]') as HTMLInputElement;
    expect(input).not.toBeNull();
    // The input lives inside the supplied caption node and is on-screen.
    expect(caption.contains(input)).toBe(true);
    expect(input.isConnected).toBe(true);
    expect(input.value).toBe("Original title");
  });

  it("hydrate() merges a late engagement snapshot but never clobbers a user mutation", async () => {
    // Regression: like/comment reset to 0 after reload because the feed seeds
    // liked:false/0 and the later /engagement fetch never re-rendered the rail.
    vi.stubGlobal("fetch", vi.fn(async () => Response.json({ liked: true, likeCount: 2 })));
    const handle = await mountVideoActions({
      host: document.getElementById("actions")!,
      media: document.querySelector("video")!,
      titleElement: document.getElementById("title")!,
      clipId: 42,
      initial: { ...state, liked: false, likeCount: 0, commentCount: 0 },
    });
    // Rail starts at the (empty) feed-row seed.
    expect(document.querySelector('[aria-label="Like"]')?.textContent).toContain("0");
    // A late engagement snapshot hydrates the persisted state into the controls.
    handle.hydrate({ liked: true, likeCount: 1, commentCount: 3 });
    expect(document.querySelector('[aria-label="Unlike"]')).not.toBeNull();
    expect(document.querySelector('[aria-label="Unlike"]')?.textContent).toContain("1");
    const commentBtn = document.querySelector('[aria-label="Comments"]')!;
    expect(commentBtn.textContent).toContain("3");
    // Now the viewer likes; a subsequent (stale) snapshot must NOT overwrite the
    // applied state — hydration is latched to the first snapshot only.
    fireEvent.click(document.querySelector('[aria-label="Unlike"]')!);
    await vi.waitFor(() => expect(document.querySelector('[aria-label="Unlike"]')?.textContent).toContain("2"));
    handle.hydrate({ liked: false, likeCount: 0, commentCount: 0 });
    // User's mutation stands and the latch ignores the stale second snapshot.
    expect(document.querySelector('[aria-label="Unlike"]')?.textContent).toContain("2");
    expect(commentBtn.textContent).toContain("3");
  });

  it("exposes a selectable URL when clipboard paths are blocked", async () => {
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText: vi.fn(async () => { throw new DOMException("Blocked", "NotAllowedError"); }) },
    });
    Object.defineProperty(document, "execCommand", {
      configurable: true,
      value: vi.fn(() => false),
    });
    await mountVideoActions({
      host: document.getElementById("actions")!,
      media: document.querySelector("video")!,
      titleElement: document.getElementById("title")!,
      clipId: 42,
      initial: { ...state },
    });
    fireEvent.click(document.querySelector('[aria-label="Copy link"]')!);
    await vi.waitFor(() => expect(document.querySelector('[aria-label="Share link"]')).not.toBeNull());
    expect((document.querySelector('[aria-label="Share link"]') as HTMLInputElement).value).toContain("/clips/42");
    expect(document.querySelector(".action-status")?.textContent).not.toContain("Link copied");
  });
});