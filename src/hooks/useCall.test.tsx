import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fetchAgoraToken, useCall } from "./useCall";

const mocks = vi.hoisted(() => ({
  connectivity: {
    isOnline: true,
    setRealtimeConnecting: vi.fn(),
    setRealtimeConnected: vi.fn(),
  },
}));

vi.mock("agora-rtc-sdk-ng", () => ({ default: {} }));
vi.mock("@/contexts/ConnectivityContext", () => ({
  useConnectivity: () => mocks.connectivity,
}));
vi.mock("@/hooks/use-call-push", () => ({ useCallPush: () => ({}) }));
vi.mock("@/lib/network", () => ({
  apiPath: (path: string) => path,
  websocketUrl: () => "ws://arena.test/ws",
}));
vi.mock("@/lib/amis-e2ee", () => ({
  ensureDeviceIdentity: vi.fn().mockResolvedValue({ deviceId: "device", publicKey: "key", fingerprint: "fingerprint" }),
  encryptCallSecret: vi.fn(),
  decryptCallSecret: vi.fn(),
}));
vi.mock("@/lib/analytics", () => ({ trackCallDeviceOutcome: vi.fn() }));
vi.mock("@/lib/call-rtc-config", () => ({
  fetchCallRtcConfig: vi.fn(),
  preferOpus: vi.fn(),
}));
vi.mock("@/lib/call-ringtone", () => ({
  CallRingtone: class {
    enable = vi.fn().mockResolvedValue(true);
    start = vi.fn();
    stop = vi.fn();
    close = vi.fn();
  },
}));
vi.mock("@/lib/call-notification-action", () => ({
  canApplyNotificationCallAction: () => false,
  readNotificationCallAction: () => null,
  readNotificationCallResume: () => null,
  showForegroundCallNotification: vi.fn(),
  shouldClearTerminalCall: () => true,
}));

class TestWebSocket {
  static readonly CONNECTING = 0;
  static readonly OPEN = 1;
  static readonly CLOSED = 3;

  readyState = TestWebSocket.CONNECTING;
  onopen: (() => void) | null = null;
  onmessage: ((event: MessageEvent<string>) => void | Promise<void>) | null = null;
  onclose: (() => void) | null = null;
  onerror: (() => void) | null = null;
  sent: string[] = [];

  constructor() {
    sockets.push(this);
  }

  send(data: string) {
    this.sent.push(data);
  }

  close() {
    if (this.readyState === TestWebSocket.CLOSED) return;
    this.readyState = TestWebSocket.CLOSED;
    this.onclose?.();
  }

  open() {
    this.readyState = TestWebSocket.OPEN;
    this.onopen?.();
  }

  receive(message: object) {
    void this.onmessage?.({ data: JSON.stringify(message) } as MessageEvent<string>);
  }
}

let sockets: TestWebSocket[] = [];

function sentTypes(socket: TestWebSocket) {
  return socket.sent.map((frame) => JSON.parse(frame) as {
    type: string;
    callId?: string;
    deviceId?: string;
  });
}

describe("useCall signaling reconnect", () => {
  const getUserMedia = vi.fn();

  beforeEach(() => {
    sockets = [];
    getUserMedia.mockClear();
    vi.useFakeTimers();
    vi.stubGlobal("WebSocket", TestWebSocket);
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true }));
    Object.defineProperty(navigator, "mediaDevices", {
      configurable: true,
      value: { getUserMedia },
    });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("does not send an offer before the socket registration acknowledgement", async () => {
    const { result, unmount } = renderHook(() => useCall({ id: 7, username: "caller" }));
    await act(async () => { sockets[0].open(); });
    await act(async () => { await result.current.startCall("recipient", false); });
    expect(sentTypes(sockets[0]).map(frame => frame.type)).toEqual(["register"]);
    expect(result.current.callStatus).toBe("idle");
    expect(getUserMedia).not.toHaveBeenCalled();
    unmount();
  });

  it("keeps a ringing recipient intact and resumes it after a signaling socket restart", async () => {
    const { result, unmount } = renderHook(() => useCall({ id: 7, username: "recipient" }));
    const firstSocket = sockets[0];

    await act(async () => {
      firstSocket.open();
      firstSocket.receive({ type: "registered", userId: 7 });
    });
    const firstDeviceId = sentTypes(firstSocket).find(frame => frame.type === "register")?.deviceId;
    expect(firstDeviceId).toMatch(/^calltab_[A-Za-z0-9_-]{16,128}$/);
    await act(async () => {
      firstSocket.receive({
        type: "call-incoming",
        signalId: "invitation-1",
        callId: "call-restart-safe",
        from: "caller",
        video: true,
        deferredMedia: false,
        transport: { provider: "webrtc", version: 1 },
        offer: { type: "offer", sdp: "v=0" },
      });
    });

    expect(result.current.callStatus).toBe("ringing");
    expect(result.current.incomingCall?.callId).toBe("call-restart-safe");
    expect(getUserMedia).not.toHaveBeenCalled();

    await act(async () => {
      firstSocket.close();
      await vi.advanceTimersByTimeAsync(2_000);
    });

    // The browser's local invitation survives the transient signaling loss.
    expect(result.current.callStatus).toBe("ringing");
    expect(result.current.incomingCall?.callId).toBe("call-restart-safe");
    expect(getUserMedia).not.toHaveBeenCalled();

    const secondSocket = sockets[1];
    await act(async () => {
      secondSocket.open();
      secondSocket.receive({ type: "registered", userId: 7 });
    });

    expect(sentTypes(secondSocket)).toContainEqual({
      type: "call-resume",
      callId: "call-restart-safe",
    });
    expect(sentTypes(secondSocket).find(frame => frame.type === "register")?.deviceId).toBe(firstDeviceId);
    expect(result.current.callStatus).toBe("ringing");
    expect(getUserMedia).not.toHaveBeenCalled();
    unmount();
  });

  it("does not auto-answer an Agora invitation or request media before consent", async () => {
    const { result, unmount } = renderHook(() => useCall({ id: 7, username: "recipient" }));
    const socket = sockets[0];

    await act(async () => {
      socket.open();
      socket.receive({ type: "registered", userId: 7 });
      socket.receive({
        type: "call-incoming",
        signalId: "agora-invitation-1",
        callId: "call-agora-consent",
        from: "caller",
        video: true,
        offer: null,
        deferredMedia: false,
        transport: { provider: "agora", version: 1 },
        e2e: { devices: {} },
      });
    });

    expect(result.current.callStatus).toBe("ringing");
    expect(result.current.incomingCall?.transport).toEqual({ provider: "agora", version: 1 });
    expect(getUserMedia).not.toHaveBeenCalled();
    expect(sentTypes(socket)).not.toContainEqual(expect.objectContaining({ type: "call-answer" }));

    await act(async () => {
      socket.receive({
        type: "call-resumed",
        signalId: "agora-resume-1",
        callId: "call-agora-consent",
        from: "caller",
        video: true,
        offer: null,
        deferredMedia: false,
        transport: { provider: "agora", version: 1 },
      });
    });
    expect(result.current.callError).toBeNull();
    expect(result.current.callStatus).toBe("ringing");
    unmount();
  });

  it("requires a complete participant token and never falls back after rejection", async () => {
    const request = vi.fn()
      .mockResolvedValueOnce({
        ok: false,
        status: 403,
        json: vi.fn().mockResolvedValue({ error: "Not a participant of this call" }),
      });
    vi.stubGlobal("fetch", request);

    await expect(fetchAgoraToken("call-token-rejected", "calltab_device")).rejects.toThrow(
      "Not a participant of this call",
    );
    expect(request).toHaveBeenCalledTimes(1);
    expect(String(request.mock.calls[0][0])).toContain("/api/agora/token?channel=call-token-rejected&deviceId=calltab_device");
  });

  it("retries explicit token readiness and returns only safe join metadata", async () => {
    const request = vi.fn()
      .mockResolvedValueOnce({
        ok: false,
        status: 503,
        json: vi.fn().mockResolvedValue({ error: "Secure call service is starting" }),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: vi.fn().mockResolvedValue({ appId: "app", token: "signed-token", uid: 7 }),
      });
    vi.stubGlobal("fetch", request);

    const token = fetchAgoraToken("call-token-ready", "calltab_device");
    await vi.advanceTimersByTimeAsync(250);
    await expect(token).resolves.toEqual({
      appId: "app",
      token: "signed-token",
      uid: 7,
    });
    expect(request).toHaveBeenCalledTimes(2);
  });

  it("does not report secure incoming calls ready when key registration returns an HTTP error", async () => {
    const request = vi.fn().mockResolvedValue({
      ok: false,
      status: 503,
      json: vi.fn().mockResolvedValue({ error: "Secure registration is unavailable" }),
    });
    vi.stubGlobal("fetch", request);

    const { result, unmount } = renderHook(() => useCall({ id: 7, username: "recipient" }));
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(result.current.secureCallRegistrationStatus).toBe("error");
    expect(result.current.secureCallRegistrationError).toBe("Secure registration is unavailable");

    await act(async () => {
      result.current.retrySecureCallRegistration();
      await Promise.resolve();
      await Promise.resolve();
    });
    expect(request).toHaveBeenCalledTimes(2);
    unmount();
  });

  it("treats device-capacity 409 as terminal until an explicit retry", async () => {
    const request = vi.fn()
      .mockResolvedValueOnce({
        ok: false,
        status: 409,
        json: vi.fn().mockResolvedValue({
          code: "SECURE_DEVICE_CAPACITY",
          error: "Secure device limit reached; revoke an old device first",
        }),
      })
      // Represents the explicit retry after the citizen confirms revocation.
      .mockResolvedValueOnce({ ok: true, status: 200 });
    vi.stubGlobal("fetch", request);

    const { result, unmount } = renderHook(() => useCall({ id: 7, username: "recipient" }));
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(result.current.secureCallRegistrationStatus).toBe("error");
    expect(result.current.secureCallRegistrationError).toContain("بلغت الحد الأقصى");
    await act(async () => {
      window.dispatchEvent(new Event("focus"));
      window.dispatchEvent(new Event("online"));
      document.dispatchEvent(new Event("visibilitychange"));
      await vi.advanceTimersByTimeAsync(60_000);
    });
    expect(request).toHaveBeenCalledTimes(1);

    await act(async () => {
      result.current.retrySecureCallRegistration();
      await Promise.resolve();
      await Promise.resolve();
    });
    expect(request).toHaveBeenCalledTimes(2);
    expect(result.current.secureCallRegistrationStatus).toBe("ready");
    unmount();
  });

  it("does not retry identity-conflict 409 on focus, reconnect, or timers", async () => {
    const request = vi.fn().mockResolvedValue({
      ok: false,
      status: 409,
      json: vi.fn().mockResolvedValue({
        code: "SECURE_DEVICE_IDENTITY_CONFLICT",
        error: "Secure device ID belongs to a different key",
      }),
    });
    vi.stubGlobal("fetch", request);

    const { result, unmount } = renderHook(() => useCall({ id: 7, username: "recipient" }));
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();
    });
    expect(result.current.secureCallRegistrationStatus).toBe("error");
    expect(result.current.secureCallRegistrationError).toContain("معرّف هذا الجهاز");
    await act(async () => {
      window.dispatchEvent(new Event("focus"));
      window.dispatchEvent(new Event("online"));
      document.dispatchEvent(new Event("visibilitychange"));
      await vi.advanceTimersByTimeAsync(60_000);
    });
    expect(request).toHaveBeenCalledTimes(1);
    unmount();
  });

  it("does not revalidate a ready key or recreate signaling when the window regains focus", async () => {
    const request = vi.fn().mockResolvedValue({ ok: true, status: 204 });
    vi.stubGlobal("fetch", request);
    const { result, unmount } = renderHook(() => useCall({ id: 7, username: "recipient" }));
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });
    expect(result.current.secureCallRegistrationStatus).toBe("ready");
    expect(request).toHaveBeenCalledOnce();
    expect(sockets).toHaveLength(1);

    await act(async () => {
      window.dispatchEvent(new Event("focus"));
      await Promise.resolve();
    });
    expect(result.current.secureCallRegistrationStatus).toBe("ready");
    expect(request).toHaveBeenCalledOnce();
    expect(sockets).toHaveLength(1);
    unmount();
  });
});
