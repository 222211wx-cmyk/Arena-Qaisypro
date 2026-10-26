import { describe, expect, it } from "vitest";
import {
  canUseHybridWebRtc,
  shouldRequestHybridFallback,
  validateCallRtcConfig,
} from "./call-rtc-config";

describe("validateCallRtcConfig", () => {
  it("accepts the authenticated WebRTC/TURN response", () => {
    expect(validateCallRtcConfig({
      provider: "webrtc",
      turnConfigured: true,
      iceServers: [{ urls: "turns:turn.example.test:443", username: "citizen", credential: "token" }],
    }).provider).toBe("webrtc");
  });

  it("will not route WebRTC without a TURN server", () => {
    expect(() => validateCallRtcConfig({
      provider: "webrtc",
      turnConfigured: true,
      iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
    })).toThrow("requires TURN");
  });

  it("accepts Agora without TURN because Agora owns the media path", () => {
    expect(validateCallRtcConfig({
      provider: "agora",
      turnConfigured: false,
      iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
    }).provider).toBe("agora");
  });

  it("keeps hybrid explicit and chooses Agora rather than pretending P2P is ready without TURN", () => {
    const config = validateCallRtcConfig({
      provider: "hybrid",
      turnConfigured: false,
      iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
    });
    expect(config.provider).toBe("hybrid");
    expect(canUseHybridWebRtc(config)).toBe(false);
  });

  it("permits hybrid P2P only when authenticated TURN is present", () => {
    const config = validateCallRtcConfig({
      provider: "hybrid",
      turnConfigured: true,
      iceServers: [{ urls: "turn:turn.example.test:3478", username: "citizen", credential: "signed" }],
    });
    expect(canUseHybridWebRtc(config)).toBe(true);
  });

  it("requests hybrid fallback only after negotiation and never when direct media connected", () => {
    const config = validateCallRtcConfig({
      provider: "hybrid",
      turnConfigured: true,
      iceServers: [{ urls: "turn:turn.example.test:3478", username: "citizen", credential: "signed" }],
    });
    expect(shouldRequestHybridFallback({
      config, negotiated: false, connectionState: "connecting", mediaConnected: false, switchRequested: false,
    })).toBe(false);
    expect(shouldRequestHybridFallback({
      config, negotiated: true, connectionState: "connected", mediaConnected: true, switchRequested: false,
    })).toBe(false);
    expect(shouldRequestHybridFallback({
      config, negotiated: true, connectionState: "connecting", mediaConnected: false, switchRequested: false,
    })).toBe(true);
  });
});
