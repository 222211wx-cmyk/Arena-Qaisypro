import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { runInNewContext } from "node:vm";
import { describe, expect, it, vi } from "vitest";

type WorkerEvent = {
  oldSubscription?: { endpoint: string; options: Record<string, unknown> } | null;
  newSubscription?: { toJSON: () => unknown } | null;
  data?: { json: () => unknown };
  action?: string;
  notification?: { data?: Record<string, unknown>; close: () => void };
  waitUntil: (promise: Promise<unknown>) => void;
};

function workerHarness() {
  const showNotification = vi.fn().mockResolvedValue(undefined);
  const close = vi.fn();
  const getNotifications = vi.fn().mockResolvedValue([{ close }]);
  const openWindow = vi.fn().mockResolvedValue(undefined);
  const fetch = vi.fn().mockResolvedValue({ ok: true });
  const postMessage = vi.fn();
  const navigate = vi.fn().mockResolvedValue(undefined);
  const subscribe = vi.fn();
  const warn = vi.fn();
  let push: (event: WorkerEvent) => void = () => {};
  let click: (event: WorkerEvent) => void = () => {};
  let change: (event: WorkerEvent) => void = () => {};

  runInNewContext(
    readFileSync(resolve(process.cwd(), "src/service-worker.js"), "utf8"),
    {
      URL,
      Date,
      fetch,
      setTimeout: vi.fn(),
      clearTimeout: vi.fn(),
      AbortController,
      console: { warn },
      self: {
        location: { origin: "https://example.test" },
        addEventListener: (type: string, handler: (event: WorkerEvent) => void) => {
          if (type === "push") push = handler;
          if (type === "notificationclick") click = handler;
          if (type === "pushsubscriptionchange") change = handler;
        },
        registration: {
          scope: "https://example.test/",
          showNotification,
          getNotifications,
          pushManager: { subscribe },
        },
        clients: {
          openWindow,
          matchAll: vi.fn().mockResolvedValue([{
            url: "https://example.test/messages",
            postMessage,
            navigate,
            focus: vi.fn().mockResolvedValue(undefined),
          }]),
        },
      },
    },
  );

  const dispatch = async (handler: (event: WorkerEvent) => void, event: Omit<WorkerEvent, "waitUntil">) => {
    let work: Promise<unknown> = Promise.resolve();
    handler({ ...event, waitUntil: promise => { work = promise; } });
    await work;
  };
  return { push, click, change, subscribe, warn, dispatch, showNotification, getNotifications, close, openWindow, fetch, postMessage, navigate };
}

describe("standard call push worker", () => {
  const oldSubscription = {
    endpoint: "https://fcm.googleapis.com/fcm/send/previous",
    options: { userVisibleOnly: true, applicationServerKey: "test-public-key" },
  };
  const replacement = {
    endpoint: "https://fcm.googleapis.com/fcm/send/replacement",
    keys: { p256dh: "public-test-key", auth: "test-auth-key" },
  };

  it("renews an issued subscription with the original endpoint and same-origin credentials", async () => {
    const worker = workerHarness();
    await worker.dispatch(worker.change, {
      oldSubscription,
      newSubscription: { toJSON: () => replacement },
    });
    expect(worker.subscribe).not.toHaveBeenCalled();
    expect(worker.fetch).toHaveBeenCalledWith(
      "https://example.test/api/browser-push/subscriptions/renew",
      expect.objectContaining({
        method: "POST",
        credentials: "same-origin",
        body: JSON.stringify({ oldEndpoint: oldSubscription.endpoint, subscription: replacement }),
      }),
    );
    expect(worker.warn).not.toHaveBeenCalled();
  });

  it("resubscribes using the original application-server key when newSubscription is null", async () => {
    const worker = workerHarness();
    worker.subscribe.mockResolvedValue({ toJSON: () => replacement });
    await worker.dispatch(worker.change, { oldSubscription, newSubscription: null });
    expect(worker.subscribe).toHaveBeenCalledWith(oldSubscription.options);
    expect(worker.fetch).toHaveBeenCalledOnce();
  });

  it("reports a rejected renewal to open pages without logging subscription credentials", async () => {
    const worker = workerHarness();
    worker.fetch.mockResolvedValue({ ok: false, status: 401 });
    await worker.dispatch(worker.change, { oldSubscription, newSubscription: { toJSON: () => replacement } });
    expect(worker.postMessage).toHaveBeenCalledWith({ type: "GDNA_PUSH_RENEWAL_FAILED" });
    expect(worker.warn).toHaveBeenCalledOnce();
    expect(JSON.stringify(worker.warn.mock.calls)).not.toContain(oldSubscription.endpoint);
  });

  it("does not register an unowned endpoint when the previous subscription is missing", async () => {
    const worker = workerHarness();
    await worker.dispatch(worker.change, { oldSubscription: null, newSubscription: { toJSON: () => replacement } });
    expect(worker.fetch).not.toHaveBeenCalled();
    expect(worker.subscribe).not.toHaveBeenCalled();
    expect(worker.postMessage).toHaveBeenCalledWith({ type: "GDNA_PUSH_RENEWAL_FAILED" });
  });

  it("reports offline renewal failures so foreground pages can offer recovery", async () => {
    const worker = workerHarness();
    worker.fetch.mockRejectedValue(new Error("Network unavailable"));
    await worker.dispatch(worker.change, { oldSubscription, newSubscription: { toJSON: () => replacement } });
    expect(worker.postMessage).toHaveBeenCalledWith({ type: "GDNA_PUSH_RENEWAL_FAILED" });
  });

  it("accepts lowercase incoming_call but ignores malformed push JSON", async () => {
    const worker = workerHarness();
    await worker.dispatch(worker.push, { data: { json: () => ({ type: "incoming_call", callId: "lowercase", callerName: "Caller" }) } });
    expect(worker.showNotification).toHaveBeenCalledOnce();
    await worker.dispatch(worker.push, { data: { json: () => { throw new Error("Invalid JSON"); } } });
    expect(worker.showNotification).toHaveBeenCalledOnce();
  });

  it("declines through the authenticated call endpoint instead of answering", async () => {
    const worker = workerHarness();
    await worker.dispatch(worker.click, {
      action: "decline",
      notification: { data: { kind: "incoming", callId: "reject_me", expiresAt: Date.now() + 20_000 }, close: vi.fn() },
    });
    expect(worker.fetch).toHaveBeenCalledWith(
      "https://example.test/api/call/decline?id=reject_me",
      expect.objectContaining({ method: "POST", credentials: "same-origin" }),
    );
    expect(worker.navigate).toHaveBeenCalledWith("https://example.test/messages?callId=reject_me");
  });

  it("shows a canonical incoming notification and resumes foreground clients", async () => {
    const worker = workerHarness();
    await worker.dispatch(worker.push, {
      data: { json: () => ({
        type: "INCOMING_CALL",
        callId: "call_123",
        fromName: "Caller",
        expiresAt: Date.now() + 20_000,
      }) },
    });

    expect(worker.showNotification).toHaveBeenCalledWith(
      "مكالمة واردة من Caller",
      expect.objectContaining({
        tag: "gdna-incoming-call-call_123",
        requireInteraction: true,
        silent: false,
        actions: [{ action: "answer", title: "الرد" }, { action: "decline", title: "رفض" }],
      }),
    );
    expect(worker.postMessage).toHaveBeenCalledWith({ type: "GDNA_CALL_INVITATION", callId: "call_123" });
  });

  it("ignores expired invitations and closes any stale matching card", async () => {
    const worker = workerHarness();
    await worker.dispatch(worker.push, {
      data: { json: () => ({ type: "INCOMING_CALL", callId: "expired", expiresAt: Date.now() - 1 }) },
    });
    expect(worker.showNotification).not.toHaveBeenCalled();
    expect(worker.getNotifications).toHaveBeenCalledWith({ tag: "gdna-incoming-call-expired" });
    expect(worker.close).toHaveBeenCalled();
  });

  it("uses the validated answer URL while a body click stays passive", async () => {
    const answer = workerHarness();
    await answer.dispatch(answer.click, {
      action: "answer",
      notification: {
        data: { kind: "incoming", callId: "answer_me", expiresAt: Date.now() + 20_000 },
        close: vi.fn(),
      },
    });
    expect(answer.fetch).not.toHaveBeenCalled();
    expect(answer.navigate).toHaveBeenCalledWith(
      "https://example.test/messages?callId=answer_me&action=answer",
    );
    expect(answer.openWindow).not.toHaveBeenCalled();

    const passive = workerHarness();
    await passive.dispatch(passive.click, {
      action: "",
      notification: {
        data: { kind: "incoming", callId: "answer_me", expiresAt: Date.now() + 20_000 },
        close: vi.fn(),
      },
    });
    expect(passive.fetch).not.toHaveBeenCalled();
    expect(passive.navigate).toHaveBeenCalledWith(
      "https://example.test/messages?callId=answer_me",
    );
    expect(passive.openWindow).not.toHaveBeenCalled();
  });

  it("closes a ringing card when a terminal push arrives", async () => {
    const worker = workerHarness();
    await worker.dispatch(worker.push, {
      data: { json: () => ({ type: "CALL_ENDED", callId: "done_123" }) },
    });
    expect(worker.getNotifications).toHaveBeenCalledWith({ tag: "gdna-incoming-call-done_123" });
    expect(worker.close).toHaveBeenCalled();
    expect(worker.postMessage).toHaveBeenCalledWith({
      type: "GDNA_CALL_TERMINAL",
      callId: "done_123",
      status: "ended",
    });
  });
});