import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, waitFor } from "@testing-library/dom";
import { openClipCitizenPanel } from "./ClipCitizenPanel";

beforeEach(() => {
  document.body.innerHTML = "";
  HTMLDialogElement.prototype.showModal = function () { this.setAttribute("open", ""); };
  HTMLDialogElement.prototype.close = function () { this.dispatchEvent(new Event("close")); };
});
afterEach(() => {
  document.querySelector<HTMLDialogElement>("dialog")?.close();
  vi.unstubAllGlobals();
});

describe("lazy clip citizen panel", () => {
  it("requires explicit prompt and consent and sends only scoped clip context", async () => {
    const request = vi.fn(async () => Response.json({ text: "The public title describes a journey.", method: "ai" }));
    vi.stubGlobal("fetch", request);
    await openClipCitizenPanel({ mode: "assistant", clipId: 42, peerId: 7, peerUsername: "producer" });
    await waitFor(() => expect(document.querySelector("[data-testid=clip-ai-submit]")).not.toBeNull());
    const submit = document.querySelector<HTMLButtonElement>("[data-testid=clip-ai-submit]")!;
    expect(submit.disabled).toBe(true);
    expect(request).not.toHaveBeenCalled();
    expect(document.body.textContent).toContain("not watch or listen");
    fireEvent.input(document.querySelector("[data-testid=clip-ai-prompt]")!, { target: { value: "What does the title say?" } });
    expect(submit.disabled).toBe(true);
    fireEvent.click(document.querySelector("[data-testid=clip-ai-consent]")!);
    await waitFor(() => expect(submit.disabled).toBe(false));
    fireEvent.click(submit);
    await waitFor(() => expect(document.body.textContent).toContain("The public title describes a journey."));
    expect(request).toHaveBeenCalledWith("/api/ai/citizen-assistant", expect.objectContaining({
      body: JSON.stringify({ section: "helixly", clipId: 42, prompt: "What does the title say?", consent: true }),
    }));
  });

  it("shows public-profile errors rather than inventing a citizen or message permission", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => Response.json({ error: "Profile unavailable" }, { status: 404 })));
    await openClipCitizenPanel({ mode: "profile", clipId: 42, peerId: 7, peerUsername: "producer" });
    await waitFor(() => expect(document.querySelector("[role=alert]")?.textContent).toBe("Profile unavailable"));
    expect(document.querySelector("[data-testid=clip-public-citizen]")).toBeNull();
    expect(document.body.textContent).not.toContain("Opening");
  });
});