import { describe, expect, it, vi } from "vitest";
import {
  DEFERRED_WEBRTC_TRANSPORT,
  WEBRTC_TRANSPORT,
  afterDeferredConfig,
  isDirectWebRtcTransport,
  isDeferredWebRtcTransport,
  loadDeferredConfig,
} from "./call-deferred";

describe("deferred call media protocol", () => {
  it("accepts only the existing deferred WebRTC transport object", () => {
    expect(isDeferredWebRtcTransport(DEFERRED_WEBRTC_TRANSPORT, true)).toBe(true);
    expect(isDeferredWebRtcTransport("webrtc", true)).toBe(false);
    expect(isDeferredWebRtcTransport({ provider: "webrtc", version: 2 }, true)).toBe(false);
    expect(isDeferredWebRtcTransport({ provider: "agora", version: 1 }, true)).toBe(false);
    expect(isDeferredWebRtcTransport(DEFERRED_WEBRTC_TRANSPORT, false)).toBe(false);
  });

  it("recognizes an immediate caller offer while keeping deferredMedia false", () => {
    const offer = { type: "offer", sdp: "v=0\r\n" };
    const invitation = {
      type: "call-offer",
      offer,
      deferredMedia: false,
      transport: WEBRTC_TRANSPORT,
    };

    expect(invitation.deferredMedia).toBe(false);
    expect(isDirectWebRtcTransport(invitation.transport, invitation.deferredMedia, invitation.offer)).toBe(true);
    expect(isDirectWebRtcTransport(DEFERRED_WEBRTC_TRANSPORT, true, null)).toBe(false);
    expect(isDirectWebRtcTransport(WEBRTC_TRANSPORT, false, null)).toBe(false);
  });

  it("keeps a direct incoming offer data-only before the answer action", () => {
    const getUserMedia = vi.fn();
    const answer = () => getUserMedia();
    const offer = { type: "offer", sdp: "v=0\r\n" };
    const incoming = {
      type: "call-incoming",
      offer,
      deferredMedia: false,
      transport: WEBRTC_TRANSPORT,
    };

    // Rendering the fullscreen invitation only stores the offer. Media setup
    // begins only when the explicit Answer action invokes the media operation.
    expect(isDirectWebRtcTransport(incoming.transport, incoming.deferredMedia, incoming.offer)).toBe(true);
    expect(getUserMedia).not.toHaveBeenCalled();
    answer();
    expect(getUserMedia).toHaveBeenCalledTimes(1);
  });

  it("keeps the ringing invitation signaling-only until acceptance begins setup", async () => {
    const getUserMedia = vi.fn();
    const createPeerConnection = vi.fn();
    const createOffer = vi.fn();
    const invitation = {
      type: "call-offer",
      offer: null,
      deferredMedia: true,
      transport: DEFERRED_WEBRTC_TRANSPORT,
    };

    // Emitting the invitation has no media side effects.
    expect(invitation).toMatchObject({ offer: null, deferredMedia: true });
    expect(getUserMedia).not.toHaveBeenCalled();
    expect(createPeerConnection).not.toHaveBeenCalled();
    expect(createOffer).not.toHaveBeenCalled();

    await afterDeferredConfig(
      () => true,
      async () => ({ turn: true }),
      async () => {
        getUserMedia();
        createPeerConnection();
        createOffer();
      },
    );
    expect(getUserMedia).toHaveBeenCalledTimes(1);
    expect(createPeerConnection).toHaveBeenCalledTimes(1);
    expect(createOffer).toHaveBeenCalledTimes(1);
  });

  it("does not create media, a peer connection, or SDP after cancellation races async config", async () => {
    let resolveConfig!: (config: { turn: true }) => void;
    const config = new Promise<{ turn: true }>(resolve => { resolveConfig = resolve; });
    const getUserMedia = vi.fn();
    const createPeerConnection = vi.fn();
    const createOffer = vi.fn();
    let current = true;

    const loading = loadDeferredConfig(
      () => current,
      () => config,
    );
    current = false;
    resolveConfig({ turn: true });

    await expect(loading).resolves.toBeNull();
    expect(getUserMedia).not.toHaveBeenCalled();
    expect(createPeerConnection).not.toHaveBeenCalled();
    expect(createOffer).not.toHaveBeenCalled();
  });
});