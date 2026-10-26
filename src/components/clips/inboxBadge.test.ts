import { afterEach, describe, expect, it, vi } from "vitest";
import { mountInboxBadge } from "./inboxBadge";

let dispose: (() => void) | undefined;
afterEach(() => { dispose?.(); vi.useRealTimers(); vi.unstubAllGlobals(); vi.restoreAllMocks(); });

describe("standalone inbox badge", () => {
  it("consumes count, pauses hidden/pagehide, resumes visible, and cleans up", async () => {
    vi.useFakeTimers();
    let hidden = false;
    vi.spyOn(document, "hidden", "get").mockImplementation(() => hidden);
    const request = vi.fn(async () => Response.json({ count: 12 }));
    vi.stubGlobal("fetch", request);
    const link = document.createElement("a");
    dispose = mountInboxBadge(link);
    await vi.advanceTimersByTimeAsync(0);
    expect(request).toHaveBeenCalledWith("/api/messages/unread-count", expect.objectContaining({ credentials: "include", cache: "no-store" }));
    expect(link.getAttribute("aria-label")).toBe("Inbox, 12 unread messages");
    expect(link.querySelector(".reels-badge")?.textContent).toBe("12");
    hidden = true;
    document.dispatchEvent(new Event("visibilitychange"));
    await vi.advanceTimersByTimeAsync(60_000);
    expect(request).toHaveBeenCalledTimes(1);
    hidden = false;
    document.dispatchEvent(new Event("visibilitychange"));
    await vi.advanceTimersByTimeAsync(0);
    expect(request).toHaveBeenCalledTimes(2);
    window.dispatchEvent(new Event("pagehide"));
    await vi.advanceTimersByTimeAsync(60_000);
    expect(request).toHaveBeenCalledTimes(2);
    window.dispatchEvent(new Event("pageshow"));
    await vi.advanceTimersByTimeAsync(0);
    expect(request).toHaveBeenCalledTimes(3);
    dispose();
    await vi.advanceTimersByTimeAsync(60_000);
    document.dispatchEvent(new Event("visibilitychange"));
    expect(request).toHaveBeenCalledTimes(3);
  });
});