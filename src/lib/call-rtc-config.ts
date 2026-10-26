import { apiPath } from "./network";

/**
 * `hybrid` starts a 1:1 call over direct WebRTC+TURN and may switch to signed
 * Agora only after the server durably acknowledges that provider transition.
 */
export type CallMediaProvider = "agora" | "webrtc" | "hybrid";

export interface CallRtcConfig {
  provider: CallMediaProvider;
  turnConfigured: boolean;
  iceServers: RTCIceServer[];
  credentialExpiresAt?: number;
}

export function validateCallRtcConfig(value: unknown): CallRtcConfig {
  if (!value || typeof value !== "object") throw new Error("Invalid RTC configuration");
  const config = value as Partial<CallRtcConfig>;
  if (config.provider !== "agora" && config.provider !== "webrtc" && config.provider !== "hybrid") {
    throw new Error("Invalid RTC media provider");
  }
  if (!Array.isArray(config.iceServers)) throw new Error("Invalid ICE server list");
  const validServers = config.iceServers.every(server => {
    const urls = typeof server?.urls === "string" ? [server.urls] : server?.urls;
    return Array.isArray(urls) && urls.length > 0 &&
      urls.every(url => typeof url === "string" && /^(stun|stuns|turn|turns):/i.test(url));
  });
  if (!validServers) throw new Error("Invalid ICE server list");

  const hasTurn = config.iceServers.some(server => {
    const urls = typeof server.urls === "string" ? [server.urls] : server.urls;
    return urls.some(url => /^turns?:/i.test(url));
  });
  if (config.provider === "webrtc" && (config.turnConfigured !== true || !hasTurn)) {
    throw new Error("WebRTC provider requires TURN");
  }
  return config as CallRtcConfig;
}

/** Whether direct P2P is actually ready; hybrid must choose Agora when it is not. */
export function canUseHybridWebRtc(config: CallRtcConfig): boolean {
  if (config.provider !== "hybrid") return config.provider === "webrtc";
  return config.turnConfigured === true && config.iceServers.some(server => {
    const urls = typeof server.urls === "string" ? [server.urls] : server.urls;
    return urls.some(url => /^turns?:/i.test(url));
  });
}

/**
 * Encodes the deliberately narrow automatic-fallback gate. In particular,
 * ringing and an already-connected P2P call can never request Agora.
 */
export function shouldRequestHybridFallback(input: {
  config: CallRtcConfig | null;
  negotiated: boolean;
  connectionState: RTCPeerConnectionState | "none";
  mediaConnected: boolean;
  switchRequested: boolean;
}): boolean {
  return input.config?.provider === "hybrid" &&
    input.negotiated &&
    input.connectionState !== "connected" &&
    !input.mediaConnected &&
    !input.switchRequested;
}

export async function fetchCallRtcConfig(): Promise<CallRtcConfig> {
  const response = await fetch(apiPath("/api/rtc/ice-servers"), { credentials: "include" });
  const body = await response.json().catch(() => ({})) as { error?: string };
  if (!response.ok) throw new Error(body.error ?? `RTC configuration failed: HTTP ${response.status}`);
  return validateCallRtcConfig(body);
}

export function preferOpus(transceiver: RTCRtpTransceiver): void {
  const capabilities = RTCRtpReceiver.getCapabilities?.("audio");
  if (!capabilities || typeof transceiver.setCodecPreferences !== "function") return;
  const opus = capabilities.codecs.filter(codec => codec.mimeType.toLowerCase() === "audio/opus");
  if (!opus.length) return;
  const remaining = capabilities.codecs.filter(codec => codec.mimeType.toLowerCase() !== "audio/opus");
  transceiver.setCodecPreferences([...opus, ...remaining]);
}
