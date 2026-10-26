/** Shared direct WebRTC transport envelope used for offers on the socket. */
export const WEBRTC_TRANSPORT = { provider: "webrtc", version: 1 } as const;

/** Kept as a named alias for durable invitations and older callers. */
export const DEFERRED_WEBRTC_TRANSPORT = WEBRTC_TRANSPORT;

export function isDeferredWebRtcTransport(value: unknown, deferredMedia: unknown): boolean {
  if (!value || typeof value !== "object" || deferredMedia !== true) return false;
  const transport = value as { provider?: unknown; version?: unknown };
  return transport.provider === DEFERRED_WEBRTC_TRANSPORT.provider &&
    transport.version === DEFERRED_WEBRTC_TRANSPORT.version;
}

export function isDirectWebRtcTransport(
  value: unknown,
  deferredMedia: unknown,
  offer: unknown,
): boolean {
  if (deferredMedia === true || !offer || typeof offer !== "object") return false;
  const transport = value as { provider?: unknown; version?: unknown } | null;
  const description = offer as { type?: unknown; sdp?: unknown };
  return transport?.provider === WEBRTC_TRANSPORT.provider &&
    transport?.version === WEBRTC_TRANSPORT.version &&
    description.type === "offer" &&
    typeof description.sdp === "string" &&
    description.sdp.length > 0;
}

/**
 * Provides a cancellation boundary around asynchronous TURN config loading.
 * The continuation is never invoked after cancellation, so it cannot request
 * media, construct a peer connection, or produce SDP for a cancelled call.
 */
export async function afterDeferredConfig<T>(
  isCurrent: () => boolean,
  loadConfig: () => Promise<T>,
  continueSetup: (config: T, isCurrent: () => boolean) => Promise<void>,
): Promise<boolean> {
  const config = await loadConfig();
  if (!isCurrent()) return false;
  await continueSetup(config, isCurrent);
  return isCurrent();
}

export async function loadDeferredConfig<T>(
  isCurrent: () => boolean,
  loadConfig: () => Promise<T>,
): Promise<T | null> {
  const config = await loadConfig();
  return isCurrent() ? config : null;
}