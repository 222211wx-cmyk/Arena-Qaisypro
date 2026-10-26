import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { readClipDuration } from "./readClipDuration";

let media: HTMLMediaElement;
const objectURL = vi.fn(() => "blob:test-file");
const revokeURL = vi.fn();
beforeEach(() => {
  vi.useFakeTimers();
  const create = document.createElement.bind(document);
  vi.spyOn(document, "createElement").mockImplementation((tag: string) => {
    const node = create(tag);
    if (tag === "video" || tag === "audio") media = node as HTMLMediaElement;
    return node;
  });
  vi.spyOn(HTMLMediaElement.prototype, "load").mockImplementation(() => {});
  vi.stubGlobal("URL", { createObjectURL: objectURL, revokeObjectURL: revokeURL });
  objectURL.mockClear();
  revokeURL.mockClear();
});
afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});
describe("local clip duration metadata", () => {
  it.each([["audio/mpeg", "AUDIO", 61], ["video/mp4", "VIDEO", 25 * 3600]])(
    "reads %s metadata without an upper duration cap and releases the object URL",
    async (type, tag, duration) => {
      const read = readClipDuration(new File(["media"], "sample", { type }), new AbortController().signal);
      expect(media.tagName).toBe(tag);
      expect(media.preload).toBe("metadata");
      Object.defineProperty(media, "duration", { configurable: true, value: duration });
      media.dispatchEvent(new Event("loadedmetadata"));
      expect(await read).toBe(duration);
      expect(revokeURL).toHaveBeenCalledWith("blob:test-file");
      expect(media.getAttribute("src")).toBeNull();
    },
  );
  it("cancels metadata reading and releases its object URL", async () => {
    const controller = new AbortController();
    const read = readClipDuration(new File(["media"], "sample.mp4"), controller.signal);
    const rejection = expect(read).rejects.toMatchObject({ name: "AbortError" });
    controller.abort();
    await rejection;
    expect(revokeURL).toHaveBeenCalledOnce();
  });
  it("fails with a visible error instead of waiting indefinitely", async () => {
    const read = readClipDuration(new File(["media"], "sample.mp4"), new AbortController().signal);
    const rejection = expect(read).rejects.toThrow("تعذر قراءة مدة الملف");
    await vi.advanceTimersByTimeAsync(4_000);
    await rejection;
    expect(revokeURL).toHaveBeenCalledOnce();
  });
  it("does not seek/decode an unbounded WebM to recover missing duration", async () => {
    const read = readClipDuration(new File(["media"], "sample.webm", { type: "video/webm" }), new AbortController().signal);
    Object.defineProperty(media, "duration", { configurable: true, value: Infinity });
    media.dispatchEvent(new Event("loadedmetadata"));
    expect(media.currentTime).toBe(0);
    const rejection = expect(read).rejects.toThrow();
    await vi.advanceTimersByTimeAsync(4_000);
    await rejection;
  });
});