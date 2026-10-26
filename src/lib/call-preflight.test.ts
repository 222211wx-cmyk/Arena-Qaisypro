import { afterEach, describe, expect, it, vi } from "vitest";
import { testAgoraPreflight, testTurnRelay } from "./call-preflight";

function response(body: object, ok = true, status = ok ? 200 : 503): Response {
  return {
    ok,
    status,
    json: async () => body,
  } as Response;
}

class FakePeer {
  static instances: FakePeer[] = [];
  onicecandidate: ((event: { candidate: { candidate?: string; type?: string } | null }) => void) | null = null;
  closed = false;

  constructor(_configuration?: RTCConfiguration) {
    FakePeer.instances.push(this);
  }

  createDataChannel() {}

  async createOffer(): Promise<RTCSessionDescriptionInit> {
    return { type: "offer", sdp: "v=0" };
  }

  async setLocalDescription() {
    queueMicrotask(() => this.onicecandidate?.({
      candidate: { candidate: "candidate:1 1 UDP 1 127.0.0.1 3478 typ relay" },
    }));
  }

  close() {
    this.closed = true;
  }
}

afterEach(() => {
  FakePeer.instances = [];
  vi.restoreAllMocks();
});

describe("call preflight diagnostics", () => {
  it("joins an isolated Agora channel and always leaves without publishing", async () => {
    const client = {
      join: vi.fn().mockResolvedValue(undefined),
      leave: vi.fn().mockResolvedValue(undefined),
    };
    const fetchImpl = vi.fn().mockResolvedValue(response({
      channel: "preflight_channel",
      appId: "app",
      token: "signed-token",
      uid: 42,
    }));

    await testAgoraPreflight({
      createClient: () => client,
      fetchImpl,
      timeoutMs: 20,
    });

    expect(client.join).toHaveBeenCalledWith("app", "preflight_channel", "signed-token", 42);
    expect(client.leave).toHaveBeenCalledTimes(1);
    expect(fetchImpl).toHaveBeenCalledWith("/api/rtc/preflight-token", expect.anything());
  });

  it("detects a relay candidate and closes the diagnostic peer", async () => {
    const result = await testTurnRelay({
      fetchImpl: vi.fn().mockResolvedValue(response({
        iceServers: [{ urls: "turns:turn.example.test:443", username: "u", credential: "c" }],
      })),
      RTCPeerConnectionCtor: FakePeer,
      timeoutMs: 20,
    });

    expect(result).toBe(true);
    expect(FakePeer.instances[0]?.closed).toBe(true);
  });

  it("returns false and closes when no relay candidate is gathered", async () => {
    class NoCandidatePeer extends FakePeer {
      override async setLocalDescription() {}
    }
    const result = await testTurnRelay({
      fetchImpl: vi.fn().mockResolvedValue(response({
        iceServers: [{ urls: "turn:turn.example.test:3478", username: "u", credential: "c" }],
      })),
      RTCPeerConnectionCtor: NoCandidatePeer,
      timeoutMs: 5,
    });

    expect(result).toBe(false);
    expect(FakePeer.instances[0]?.closed).toBe(true);
  });
});