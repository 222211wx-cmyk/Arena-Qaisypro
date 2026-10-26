import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent } from "@testing-library/dom";
import { mountVideoActions } from "./VideoActions";

beforeEach(() => {
  document.body.innerHTML = '<h1>Clip</h1><video></video><div id="actions"></div>';
  vi.unstubAllGlobals();
});

describe("clip citizen integration", () => {
  it("renders visible owner/avatar /u links without eagerly fetching a profile or AI", async () => {
    const request = vi.fn();
    vi.stubGlobal("fetch", request);
    await mountVideoActions({
      host: document.querySelector("#actions")!, media: document.querySelector("video")!,
      titleElement: document.querySelector("h1")!, clipId: 8,
      initial: { id: 8, title: "Clip", author: { id: 3, username: "a b", avatarUrl: "/avatar.png" }, isOwner: false, liked: false, likeCount: 0, commentCount: 0 },
    });
    const card = document.querySelector(".clip-citizen-mini")!;
    expect(card.querySelector("a")?.getAttribute("href")).toBe("/u/a%20b");
    expect(card.querySelector("img")?.getAttribute("src")).toBe("/avatar.png");
    expect(card.textContent).toContain("Message");
    expect(card.textContent).toContain("Ask AI");
    expect(request).not.toHaveBeenCalled();
    request.mockResolvedValue(Response.json({ comments: [{ username: "reader", content: "Hello" }] }));
    fireEvent.click(document.querySelector('[aria-label="Comments"]')!);
    await vi.waitFor(() => expect(document.querySelector('.comment-list a')?.getAttribute("href")).toBe("/u/reader"));
  });

  it("keeps React, messenger and AI behind explicit dynamic imports", () => {
    const sourceAt = (name: string) => readFileSync(resolve("src/components/clips", name), "utf8");
    const actions = sourceAt("./VideoActions.ts");
    expect(actions).toContain('await import("./ClipCitizenPanel")');
    expect(actions).toContain('await import("../messenger/UnifiedMessenger")');
    expect(actions).not.toMatch(/^import .*?(React|UnifiedMessenger|ClipCitizenPanel|App)/m);
    const panel = sourceAt("./ClipCitizenPanel.tsx");
    expect(panel).toContain('section: "helixly", clipId: options.clipId');
    expect(panel).toContain('disabled={!consent || !prompt.trim() || busy}');
    expect(panel).toContain("Metadata-only assistance");
    for (const name of ["../../clip-entry.ts", "../../clip-player-entry.ts", "./reelsFeed.ts"]) {
      const source = sourceAt(name);
      expect(source).not.toMatch(/^import .*?(ClipCitizenPanel|UnifiedMessenger|App|react-dom)/m);
    }
  });
});