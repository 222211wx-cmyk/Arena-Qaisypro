import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { runInNewContext } from "node:vm";
import { describe, expect, it, vi } from "vitest";

const replacementFirebaseConfig = {
  apiKey: "replacement-test-api-key",
  authDomain: "replacement-project.test",
  projectId: "replacement-project",
  storageBucket: "replacement-project.test",
  messagingSenderId: "987654321",
  appId: "1:987654321:web:replacement",
};

function workerHarness(options: { query?: string } = {}) {
  const showNotification = vi.fn();
  const getNotifications = vi.fn().mockResolvedValue([]);
  const openWindow = vi.fn().mockResolvedValue(undefined);
  const fetch = vi.fn();
  const initializeApp = vi.fn();
  const importScripts = vi.fn();
  const query = options.query === undefined
    ? `?firebaseConfig=${encodeURIComponent(JSON.stringify(replacementFirebaseConfig))}`
    : options.query;
  let background: (payload: {
    notification?: { title?: string; body?: string };
    data?: Record<string, string>;
  }) => unknown = () => {};
  let notificationClick: (event: {
    action?: string;
    notification: { data?: Record<string, unknown>; close: () => void };
    waitUntil: (promise: Promise<unknown>) => void;
  }) => void = () => {};
  runInNewContext(
    readFileSync(resolve(process.cwd(), "public/firebase-messaging-sw.js"), "utf8"),
    {
      importScripts,
      fetch,
      URL,
      setTimeout,
      clearTimeout,
      self: {
        location: { href: `https://example.test/firebase-messaging-sw.js${query}` },
        addEventListener: (type: string, handler: typeof notificationClick) => {
          if (type === "notificationclick") notificationClick = handler;
        },
        registration: { scope: "https://example.test/", showNotification, getNotifications },
        clients: { openWindow, matchAll: vi.fn().mockResolvedValue([]) },
      },
      firebase: {
        initializeApp,
        messaging: () => ({ onBackgroundMessage: (handler: typeof background) => { background = handler; } }),
      },
    },
  );
  return {
    background,
    notificationClick,
    showNotification,
    getNotifications,
    openWindow,
    fetch,
    initializeApp,
    importScripts,
  };
}

async function flushWorkerPromises() {
  for (let index = 0; index < 6; index += 1) await Promise.resolve();
}

describe("requested Firebase background worker", () => {
  it("initializes the replacement project from the worker URL with compat 10.7.0", () => {
    const worker = workerHarness();
    expect(worker.initializeApp).toHaveBeenCalledWith(replacementFirebaseConfig);
    expect(worker.importScripts).toHaveBeenCalledWith("https://www.gstatic.com/firebasejs/10.7.0/firebase-messaging-compat.js");
  });

  it("keeps notification clicks available when the Firebase config is missing", async () => {
    const worker = workerHarness({ query: "" });
    expect(worker.initializeApp).not.toHaveBeenCalled();
    expect(worker.importScripts).not.toHaveBeenCalled();

    let waited: Promise<unknown> | undefined;
    worker.notificationClick({
      notification: { data: {}, close: vi.fn() },
      waitUntil: promise => { waited = promise; },
    });
    await waited;
    expect(worker.openWindow).toHaveBeenCalledWith("https://example.test/messages");
  });

  it("skips messaging when the Firebase config is malformed or incomplete", () => {
    const malformed = workerHarness({ query: "?firebaseConfig=not-json" });
    expect(malformed.initializeApp).not.toHaveBeenCalled();
    expect(malformed.importScripts).not.toHaveBeenCalled();

    const incomplete = workerHarness({
      query: `?firebaseConfig=${encodeURIComponent(JSON.stringify({ ...replacementFirebaseConfig, appId: "" }))}`,
    });
    expect(incomplete.initializeApp).not.toHaveBeenCalled();
    expect(incomplete.importScripts).not.toHaveBeenCalled();
  });

  it("shows supplied notification content", () => {
    const worker = workerHarness();
    worker.background({ notification: { title: "Incoming call", body: "A caller is ringing" } });
    expect(worker.showNotification).toHaveBeenCalledWith("Incoming call", {
      body: "A caller is ringing", icon: "/icon.png",
    });
  });

  it("uses the exact Arabic defaults for data-only messages", () => {
    const worker = workerHarness();
    worker.background({});
    expect(worker.showNotification).toHaveBeenCalledWith("مكالمة جديدة", {
      body: "مكالمة فيديو فائتة", icon: "/icon.png",
    });
  });

  it("renders NEW_MESSAGE separately without call actions or private route data", async () => {
    const worker = workerHarness();
    worker.background({
      data: {
        type: "NEW_MESSAGE",
        roomId: "42",
        messageId: "message_7",
        fromName: "Nour",
        title: "رسالة جديدة",
        body: "لديك رسالة جديدة",
        url: "/messages?roomId=42",
      },
    });
    await flushWorkerPromises();
    expect(worker.showNotification).toHaveBeenCalledWith("رسالة جديدة", expect.objectContaining({
      body: "لديك رسالة جديدة",
      tag: "gdna-new-message-42",
      data: {
        kind: "message",
        type: "NEW_MESSAGE",
        roomId: "42",
        messageId: "message_7",
        fromName: "Nour",
        url: "https://example.test/messages?roomId=42",
      },
    }));
    const [, options] = worker.showNotification.mock.calls[0];
    expect(options.actions).toBeUndefined();
  });

  it("opens the same-origin message room and ignores an untrusted payload URL", async () => {
    const worker = workerHarness();
    let waited: Promise<unknown> | undefined;
    const close = vi.fn();
    worker.notificationClick({
      notification: {
        data: {
          kind: "message",
          type: "NEW_MESSAGE",
          roomId: "42",
          url: "https://evil.example/messages?roomId=99",
        },
        close,
      },
      waitUntil: promise => { waited = promise; },
    });
    await waited;
    expect(close).toHaveBeenCalled();
    expect(worker.openWindow).toHaveBeenCalledWith(
      "https://example.test/messages?roomId=42",
    );
  });

  it("renders canonical incoming calls with Arabic answer/decline actions", async () => {
    const worker = workerHarness();
    worker.background({
      data: {
        callId: "call_1",
        fromName: "ليلى",
        title: "مكالمة واردة",
        type: "INCOMING_CALL",
        expiresAt: String(Date.now() + 30_000),
      },
    });
    await flushWorkerPromises();
    const [, options] = worker.showNotification.mock.calls[0];
    expect(options).toMatchObject({
      requireInteraction: true,
      vibrate: [200, 100, 200, 100, 200],
      data: expect.objectContaining({ callId: "call_1", fromName: "ليلى", kind: "incoming" }),
    });
    expect(options.actions).toEqual([
      { action: "answer", title: "الرد" },
      { action: "decline", title: "رفض" },
    ]);
  });

  it("renders a targeted incoming group call with explicit actions", async () => {
    const worker = workerHarness();
    worker.background({
      data: {
        type: "INCOMING_GROUP_CALL",
        groupCallId: "group_call-7",
        roomId: "42",
        fromName: "ليلى",
      },
    });
    await flushWorkerPromises();
    const [, options] = worker.showNotification.mock.calls[0];
    expect(options).toMatchObject({
      tag: "gdna-incoming-group-call-group_call-7",
      requireInteraction: true,
      data: {
        kind: "incoming-group",
        groupCallId: "group_call-7",
        roomId: "42",
      },
    });
    expect(options.actions).toEqual([
      { action: "answer", title: "الرد" },
      { action: "reject", title: "رفض" },
    ]);
  });

  it("routes group actions separately and keeps a group body click passive", async () => {
    const worker = workerHarness();
    const data = { kind: "incoming-group", groupCallId: "group_call-8", roomId: "42", type: "INCOMING_GROUP_CALL" };
    let waited: Promise<unknown> | undefined;
    worker.notificationClick({
      action: "answer",
      notification: { data, close: vi.fn() },
      waitUntil: promise => { waited = promise; },
    });
    await waited;
    expect(worker.openWindow).toHaveBeenCalledWith(
      "https://example.test/messages?roomId=42&groupCallId=group_call-8&groupCallAction=answer",
    );

    const passive = workerHarness();
    passive.notificationClick({
      notification: { data, close: vi.fn() },
      waitUntil: promise => { waited = promise; },
    });
    await waited;
    expect(passive.openWindow).toHaveBeenCalledWith(
      "https://example.test/messages?roomId=42&groupCallId=group_call-8",
    );
  });

  it("body-clicks an incoming call passively without auto-answering", async () => {
    const worker = workerHarness();
    worker.background({
      data: { callId: "call_2", type: "INCOMING_CALL", expiresAt: String(Date.now() + 30_000) },
    });
    await flushWorkerPromises();
    const [, options] = worker.showNotification.mock.calls[0];
    const close = vi.fn();
    let waited: Promise<unknown> | undefined;
    worker.notificationClick({
      notification: { data: options.data, close },
      waitUntil: promise => { waited = promise; },
    });
    await waited;
    expect(close).toHaveBeenCalled();
    expect(worker.openWindow).toHaveBeenCalledWith(
      "https://example.test/messages?callId=call_2",
    );
  });

  it("declines through the authenticated same-origin endpoint and falls back to an action URL", async () => {
    const worker = workerHarness();
    worker.fetch.mockResolvedValue({ ok: true });
    let waited: Promise<unknown> | undefined;
    worker.notificationClick({
      action: "decline",
      notification: {
        data: { callId: "call_3", kind: "incoming", type: "INCOMING_CALL" },
        close: vi.fn(),
      },
      waitUntil: promise => { waited = promise; },
    });
    await waited;
    expect(worker.fetch).toHaveBeenCalledWith(
      "https://example.test/api/call/decline?id=call_3",
      expect.objectContaining({ method: "POST", credentials: "same-origin" }),
    );
    expect(worker.openWindow).toHaveBeenCalledWith("https://example.test/messages?callId=call_3");

    const failed = workerHarness();
    failed.fetch.mockRejectedValue(new Error("offline"));
    let fallbackWaited: Promise<unknown> | undefined;
    failed.notificationClick({
      action: "decline",
      notification: {
        data: { callId: "call_4", kind: "incoming", type: "INCOMING_CALL" },
        close: vi.fn(),
      },
      waitUntil: promise => { fallbackWaited = promise; },
    });
    await fallbackWaited;
    expect(failed.openWindow).toHaveBeenCalledWith(
      "https://example.test/messages?callId=call_4&action=decline",
    );
  });

  it("rejects expired incoming calls and closes them when their timer expires", async () => {
    const expired = workerHarness();
    expired.background({
      data: { callId: "expired", type: "INCOMING_CALL", expiresAt: String(Date.now() - 1) },
    });
    expect(expired.showNotification).not.toHaveBeenCalled();

    vi.useFakeTimers();
    try {
      const worker = workerHarness();
      const notification = { close: vi.fn() };
      worker.getNotifications.mockResolvedValue([notification]);
      const backgroundDone = worker.background({
        data: { callId: "timer", type: "INCOMING_CALL", expiresAt: String(Date.now() + 30_000) },
      });
      await vi.advanceTimersByTimeAsync(30_000);
      await backgroundDone;
      expect(notification.close).toHaveBeenCalled();
    } finally {
      vi.useRealTimers();
    }
  });

  it("opens the missed-calls inbox without answer actions", async () => {
    const worker = workerHarness();
    worker.background({
      data: {
        roomId: "legacy_room",
        fromName: "Nour",
        type: "MISSED_CALL",
        title: "مكالمة فائتة من Nour",
      },
    });
    await flushWorkerPromises();
    const [, options] = worker.showNotification.mock.calls[0];
    expect(options.actions).toBeUndefined();
    let waited: Promise<unknown> | undefined;
    worker.notificationClick({
      action: "",
      notification: { data: options.data, close: vi.fn() },
      waitUntil: promise => { waited = promise; },
    });
    await waited;
    expect(worker.openWindow).toHaveBeenCalledWith("https://example.test/missed-calls");
  });

  it("closes the matching incoming card before showing a missed-call card", async () => {
    vi.useFakeTimers();
    try {
      const worker = workerHarness();
      const incoming = { close: vi.fn() };
      worker.getNotifications.mockResolvedValue([incoming]);
      worker.background({
        data: {
          callId: "call_5",
          type: "INCOMING_CALL",
          expiresAt: String(Date.now() + 30_000),
        },
      });
      await flushWorkerPromises();
      expect(worker.showNotification).toHaveBeenCalledTimes(1);

      worker.background({
        data: { callId: "call_5", type: "MISSED_CALL", title: "مكالمة فائتة" },
      });
      await flushWorkerPromises();
      expect(incoming.close).toHaveBeenCalled();
      expect(worker.showNotification).toHaveBeenCalledTimes(2);
      expect(worker.showNotification.mock.calls[1][1].actions).toBeUndefined();
    } finally {
      vi.useRealTimers();
    }
  });

  it("closes the matching incoming card on a terminal call push", async () => {
    const worker = workerHarness();
    const incoming = { close: vi.fn() };
    worker.getNotifications.mockResolvedValue([incoming]);
    await worker.background({
      data: { callId: "call_6", type: "CALL_ENDED" },
    });
    expect(incoming.close).toHaveBeenCalled();
    expect(worker.showNotification).not.toHaveBeenCalled();
  });
});