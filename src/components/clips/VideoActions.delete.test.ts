import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { mountVideoActions, type VideoActionState } from "./VideoActions";

const ownerState = (isOwner = true): VideoActionState => ({
  id: 42,
  code: "HELX-123456",
  title: "Published clip",
  author: { id: 7, username: "producer" },
  isOwner,
  liked: false,
  likeCount: 0,
  commentCount: 0,
});

async function mount(state = ownerState(), accountId: number | null = 7) {
  const frame = document.createElement("div");
  const media = document.createElement("video");
  const host = document.createElement("div");
  const title = document.createElement("h1");
  frame.append(media);
  document.body.append(frame, host, title);
  const onDeleted = vi.fn();
  await mountVideoActions({
    host, media, titleElement: title, clipId: state.id, accountId,
    initial: state, onDeleted,
  });
  return { media, host, onDeleted };
}

function deleteButton(_host: HTMLElement) {
  document.querySelector<HTMLButtonElement>('[aria-label="More actions"]')!.click();
  return document.querySelector<HTMLButtonElement>('[aria-label="Delete clip"]');
}

describe("published clip owner delete action", () => {
  beforeEach(() => {
    document.body.replaceChildren();
    vi.spyOn(HTMLMediaElement.prototype, "load").mockImplementation(() => {});
    vi.spyOn(HTMLMediaElement.prototype, "pause").mockImplementation(() => {});
    vi.stubGlobal("fetch", vi.fn(async () => Response.json({ deleted: true })));
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("is absent for non-owners and when authenticated identity is missing", async () => {
    expect(deleteButton((await mount(ownerState(false))).host)).toBeNull();
    document.body.replaceChildren();
    expect(deleteButton((await mount(ownerState(true), null)).host)).toBeNull();
    expect(fetch).not.toHaveBeenCalled();
  });

  it("cancels without making a request", async () => {
    vi.spyOn(window, "confirm").mockReturnValue(false);
    const { host } = await mount();
    deleteButton(host)!.click();
    expect(fetch).not.toHaveBeenCalled();
  });

  it("keeps the control available and shows a visible API error", async () => {
    vi.spyOn(window, "confirm").mockReturnValue(true);
    vi.mocked(fetch).mockResolvedValue(Response.json({ error: "Deletion refused" }, { status: 503 }));
    const { host } = await mount();
    const remove = deleteButton(host)!;
    remove.click();
    await vi.waitFor(() => expect(host.textContent).toContain("Deletion refused"));
    expect(remove.disabled).toBe(false);
    expect(host.querySelector(".action-status")?.classList.contains("error")).toBe(true);
  });

  it("sends one DELETE, cleans media resources, and notifies the surface", async () => {
    vi.spyOn(window, "confirm").mockReturnValue(true);
    const { host, media, onDeleted } = await mount();
    media.src = "https://storage.example/clip.mp4";
    const remove = deleteButton(host)!;
    remove.click();
    remove.click();
    await vi.waitFor(() => expect(onDeleted).toHaveBeenCalledWith(42));
    const calls = vi.mocked(fetch).mock.calls;
    expect(calls).toHaveLength(1);
    expect(calls[0][0]).toBe("/api/clips/42");
    expect(calls[0][1]).toMatchObject({ method: "DELETE", credentials: "include" });
    expect(media.hasAttribute("src")).toBe(false);
    expect(media.load).toHaveBeenCalled();
  });
});