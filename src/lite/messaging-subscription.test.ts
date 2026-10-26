import { afterEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "./api";
import { fetchMessagingSubscription, sendText } from "./messaging";
import { parseMessagingEntitlement } from "../lib/messaging-subscription-copy";

const { enqueue, close } = vi.hoisted(() => ({ enqueue: vi.fn(), close: vi.fn() }));
vi.mock("./offline-queue", () => ({
  OfflineQueue: class {
    enqueue = enqueue;
    close = close;
  },
  drainQueue: vi.fn(),
}));
vi.mock("../lib/amis-e2ee", () => ({
  ensureDeviceIdentity: vi.fn(),
  encryptMessagePayload: vi.fn(async () => "e2e:v1:ciphertext"),
}));
afterEach(() => { vi.unstubAllGlobals(); vi.clearAllMocks(); });

describe("Lite messaging subscription", () => {
  it("rejects legacy, incomplete, and malformed grants", () => {
    for (const value of [
      { hasActiveSubscription: true },
      { hasActiveSubscription: false, canSendMessages: true },
      { hasActiveSubscription: false, canSendMessages: true, freeMessagesRemaining: -1 },
      { hasActiveSubscription: false, canSendMessages: "true", freeMessagesRemaining: 10 },
    ]) expect(() => parseMessagingEntitlement(value)).toThrow("Invalid messaging entitlement");
  });
  it("fetches live grants without a snapshot and observes revocation", async () => {
    const fetcher = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ hasActiveSubscription: false, canSendMessages: true, freeMessagesRemaining: 1 })))
      .mockResolvedValueOnce(new Response(JSON.stringify({ hasActiveSubscription: false, canSendMessages: false, freeMessagesRemaining: 0 })));
    vi.stubGlobal("fetch", fetcher);
    expect((await fetchMessagingSubscription()).canSendMessages).toBe(true);
    expect((await fetchMessagingSubscription()).canSendMessages).toBe(false);
    expect(fetcher).toHaveBeenCalledTimes(2);
  });
  it("inactive subscriptions cannot send or enqueue", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({ hasActiveSubscription: false, canSendMessages: false, freeMessagesRemaining: 0 }))));
    await expect(sendText({ id: 1, username: "citizen" }, 1, "hello", { online: true })).rejects.toMatchObject({ status: 403 });
    expect(enqueue).not.toHaveBeenCalled();
  });
  it("authoritative send denial is surfaced, never reported as queued success", async () => {
    vi.stubGlobal("fetch", vi.fn()
       .mockResolvedValueOnce(new Response(JSON.stringify({ hasActiveSubscription: false, canSendMessages: true, freeMessagesRemaining: 1 })))
      .mockResolvedValueOnce(new Response(JSON.stringify({ keys: [{ userId: 2, deviceId: "device", publicKey: {}, fingerprint: "fp" }] })))
      .mockResolvedValueOnce(new Response(JSON.stringify({ error: "Messaging subscription inactive" }), { status: 403 })));
    await expect(sendText({ id: 1, username: "citizen" }, 1, "hello", { online: true })).rejects.toBeInstanceOf(ApiError);
    expect(enqueue).not.toHaveBeenCalled();
    expect(close).toHaveBeenCalled();
  });
  it("does not send on legacy production responses", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({ hasActiveSubscription: true }))));
    await expect(sendText({ id: 1, username: "citizen" }, 1, "hello")).rejects.toThrow("Invalid messaging entitlement");
    expect(enqueue).not.toHaveBeenCalled();
  });
});