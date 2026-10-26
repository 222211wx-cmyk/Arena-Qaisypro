import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { MessengerAssistant, NO_REPLY_DELAY_MS, pendingReplyAt } from "./MessengerAssistant";
import type { DmMessage } from "../social/social-types";

const message = (id: number, userId: number, time: number): DmMessage => ({
  id, roomId: 1, userId, username: `citizen${userId}`, content: "private", type: "text",
  createdAt: new Date(time).toISOString(),
});
afterEach(() => { cleanup(); vi.useRealTimers(); vi.unstubAllGlobals(); });

describe("consent-only messenger assistant", () => {
  it("tracks the first pending outgoing message and cancels on a peer reply", () => {
    expect(pendingReplyAt([], 1)).toBeNull();
    expect(pendingReplyAt([message(1, 1, 1000), message(2, 1, 2000)], 1)).toBe(1000 + NO_REPLY_DELAY_MS);
    expect(pendingReplyAt([message(1, 1, 1000), message(2, 2, 2000)], 1)).toBeNull();
  });
  it("offers at five minutes without sending any private content or impersonating the peer", () => {
    vi.useFakeTimers(); vi.setSystemTime(1000);
    const fetch = vi.fn(); vi.stubGlobal("fetch", fetch);
    render(<MessengerAssistant messages={[message(1, 1, 1000)]} userId={1} onDraft={vi.fn()} />);
    expect(screen.queryByText(/No reply for 5 minutes/)).toBeNull();
    act(() => vi.advanceTimersByTime(NO_REPLY_DELAY_MS - 1));
    expect(screen.queryByText(/No reply for 5 minutes/)).toBeNull();
    act(() => vi.advanceTimersByTime(1));
    fireEvent.click(screen.getByText(/No reply for 5 minutes/));
    expect(screen.getByText(/AI is not this person/)).toBeTruthy();
    expect((screen.getByText("Translate") as HTMLButtonElement).disabled).toBe(true);
    expect(fetch).not.toHaveBeenCalled();
  });
  it("links to own consent settings and shares only explicit sender instructions", async () => {
    const fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ text: "My suggested follow-up" }) });
    vi.stubGlobal("fetch", fetch);
    const onDraft = vi.fn();
    render(<MessengerAssistant messages={[message(1, 1, Date.now())]} userId={1}
      ownUsername="sender" onDraft={onDraft} />);
    fireEvent.click(screen.getByLabelText("Enable translation and AI composer"));
    expect(screen.getByText("Open my profile to enable AI permission").closest("a")?.getAttribute("href"))
      .toMatch(/\/u\/sender$/);
    fireEvent.change(screen.getByLabelText("Text explicitly shared with AI"), { target: { value: "Help me politely follow up" } });
    expect(fetch).not.toHaveBeenCalled();
    fireEvent.click(screen.getByLabelText("Consent to send this text to AI"));
    await act(async () => { fireEvent.click(screen.getByText("Draft my follow-up")); });
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(JSON.parse(fetch.mock.calls[0][1].body)).toEqual({
      section: "auto-reply", prompt: "Help me politely follow up", consent: true,
    });
    expect(onDraft).not.toHaveBeenCalled();
    expect(screen.getByText("GDNA AI draft — not a reply from your contact")).toBeTruthy();
    fireEvent.click(screen.getByText("Use in my composer (review before sending)"));
    expect(onDraft).toHaveBeenCalledWith("My suggested follow-up");
    expect(fetch).toHaveBeenCalledTimes(1);
  });
  it("auto translation defaults off, shares incoming text only and deduplicates by language", async () => {
    const fetch = vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => ({ text: "Translated incoming" }) });
    vi.stubGlobal("fetch", fetch);
    const messages = [
      message(1, 1, 1000), { ...message(2, 2, 2000), content: "Bonjour" },
      { ...message(3, 2, 3000), type: "file", fileUrl: "/attachment" },
      { ...message(4, 2, 4000), decryptionFailed: true },
      { ...message(5, 2, 5000), content: "e2e:v1:opaque" },
      { ...message(6, 2, 6000), content: "x".repeat(4001) },
    ];
    const view = render(<MessengerAssistant messages={messages} userId={1} onDraft={vi.fn()} />);
    fireEvent.click(screen.getByLabelText("Enable translation and AI composer"));
    expect(fetch).not.toHaveBeenCalled();
    fireEvent.change(screen.getByLabelText("Translation language"), { target: { value: "fr" } });
    expect(fetch).not.toHaveBeenCalled();
    fireEvent.click(screen.getByLabelText("I consent to automatically translate incoming text"));
    await screen.findByText("Translated incoming");
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(JSON.parse(fetch.mock.calls[0][1].body)).toEqual({
      section: "translate", text: "Bonjour", targetLanguage: "fr", consent: true,
    });
    expect(screen.getByText(/Message #2/)).toBeTruthy();
    view.rerender(<MessengerAssistant messages={[...messages]} userId={1} onDraft={vi.fn()} />);
    expect(fetch).toHaveBeenCalledTimes(1);
    fireEvent.change(screen.getByLabelText("Translation language"), { target: { value: "en" } });
    await waitFor(() => expect(fetch).toHaveBeenCalledTimes(2));
    expect(JSON.parse(fetch.mock.calls[1][1].body).targetLanguage).toBe("en");
    fireEvent.click(screen.getByLabelText("I consent to automatically translate incoming text"));
    view.rerender(<MessengerAssistant messages={[...messages, message(7, 2, 7000)]} userId={1} onDraft={vi.fn()} />);
    expect(fetch).toHaveBeenCalledTimes(2);
  });
  it.each([403, 503])("stops automatic sharing and reports provider/consent error %s", async status => {
    const fetch = vi.fn().mockResolvedValue({ ok: false, status });
    vi.stubGlobal("fetch", fetch);
    render(<MessengerAssistant messages={[message(1, 2, 1000), message(2, 2, 2000)]} userId={1} onDraft={vi.fn()} />);
    fireEvent.click(screen.getByLabelText("Enable translation and AI composer"));
    fireEvent.click(screen.getByLabelText("I consent to automatically translate incoming text"));
    expect(await screen.findByRole("alert")).toBeTruthy();
    expect(screen.getByRole("alert").textContent).toMatch(status === 403 ? /own profile/ : /provider unavailable/);
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(screen.getByLabelText("I consent to automatically translate incoming text").getAttribute("aria-checked")).toBe("false");
  });
  it("aborts active sharing on disable and room switch, with new room consent off", async () => {
    const fetch = vi.fn().mockImplementation(() => new Promise(() => {}));
    vi.stubGlobal("fetch", fetch);
    const view = render(<MessengerAssistant key="room1" messages={[message(1, 2, 1000)]} userId={1} onDraft={vi.fn()} />);
    fireEvent.click(screen.getByLabelText("Enable translation and AI composer"));
    fireEvent.click(screen.getByLabelText("I consent to automatically translate incoming text"));
    expect(fetch).toHaveBeenCalledTimes(1);
    const firstSignal = fetch.mock.calls[0][1].signal;
    fireEvent.click(screen.getByLabelText("I consent to automatically translate incoming text"));
    expect(firstSignal.aborted).toBe(true);
    fireEvent.click(screen.getByLabelText("I consent to automatically translate incoming text"));
    expect(fetch).toHaveBeenCalledTimes(2);
    const secondSignal = fetch.mock.calls[1][1].signal;
    view.rerender(<MessengerAssistant key="room2" messages={[message(2, 2, 2000)]} userId={1} onDraft={vi.fn()} />);
    expect(secondSignal.aborted).toBe(true);
    fireEvent.click(screen.getByLabelText("Enable translation and AI composer"));
    expect(screen.getByLabelText("I consent to automatically translate incoming text").getAttribute("aria-checked")).toBe("false");
    expect(fetch).toHaveBeenCalledTimes(2);
  });
});