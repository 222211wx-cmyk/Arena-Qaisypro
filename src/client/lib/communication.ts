/**
 * Browser communication boundary.
 *
 * Service roles:
 * - REST helpers carry authenticated requests to the API; authorization remains
 *   server-derived.
 * - The native WebSocket helpers do not own a socket. CallProvider remains the
 *   one signalling connection for the browser session.
 * - Agora is imported once here so call and group modules do not initialize
 *   competing SDK providers.
 */
import AgoraRTC from "agora-rtc-sdk-ng";
import type { IAgoraRTCClient } from "agora-rtc-sdk-ng";
import { apiPath } from "@/lib/network";

export { AgoraRTC };

export type AgoraJoinCredentials = { appId: string; token: string; uid: number };
export type TurnCredentials = {
  iceServers: RTCIceServer[];
  credentialExpiresAt?: number;
};

async function requestJson<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(apiPath(path), {
    credentials: "include",
    cache: "no-store",
    ...init,
  });
  const body = await response.json().catch(() => ({})) as { error?: unknown };
  if (!response.ok) {
    throw new Error(typeof body.error === "string" && body.error
      ? body.error
      : `Communication request failed: HTTP ${response.status}`);
  }
  return body as T;
}

/** Gets the participant/device-scoped signed Agora token; it never logs it. */
export async function fetchAgoraToken(channel: string, deviceId: string): Promise<AgoraJoinCredentials> {
  const query = new URLSearchParams({ channel, deviceId });
  let lastError: Error | null = null;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const response = await fetch(apiPath(`/api/agora/token?${query.toString()}`), {
      credentials: "include",
      cache: "no-store",
    });
    const body = await response.json().catch(() => ({})) as {
      appId?: unknown; token?: unknown; uid?: unknown; error?: unknown;
    };
    if (response.ok) {
      if (typeof body.appId !== "string" || !body.appId ||
        typeof body.token !== "string" || !body.token ||
        typeof body.uid !== "number" || !Number.isSafeInteger(body.uid)) {
        throw new Error("رمز Agora غير صالح من خدمة المكالمات");
      }
      return { appId: body.appId, token: body.token, uid: body.uid };
    }
    lastError = new Error(typeof body.error === "string" && body.error
      ? body.error
      : `Agora token request failed: HTTP ${response.status}`);
    if (response.status !== 503 || attempt === 2) break;
    // The service advertises a two-second startup window. Retrying at 250/500ms
    // exhausted all attempts before that window had even elapsed.
    const retryAfter = response.headers.get("Retry-After");
    const retrySeconds = retryAfter?.trim() ? Number(retryAfter) : NaN;
    const retryAt = retryAfter ? Date.parse(retryAfter) : NaN;
    const advertisedDelay = Number.isFinite(retrySeconds) && retrySeconds >= 0
      ? retrySeconds * 1_000
      : Number.isFinite(retryAt) ? Math.max(0, retryAt - Date.now()) : NaN;
    const retryDelay = Number.isFinite(advertisedDelay)
      ? Math.min(30_000, advertisedDelay)
      : 250 * (attempt + 1);
    await new Promise(resolve => setTimeout(resolve, retryDelay));
  }
  throw lastError ?? new Error("تعذّر الحصول على رمز Agora");
}

/** TURN credentials are independent from Agora and are safe to use only in RTCConfiguration. */
export async function fetchTurnCredentials(): Promise<TurnCredentials> {
  const body = await requestJson<Partial<TurnCredentials>>("/api/turn/creds");
  if (!Array.isArray(body.iceServers)) throw new Error("Invalid TURN credential response");
  return {
    iceServers: body.iceServers,
    credentialExpiresAt: typeof body.credentialExpiresAt === "number" ? body.credentialExpiresAt : undefined,
  };
}

/** Creates a client only after fetchAgoraToken has supplied a signed token. */
export function createAgoraClient(): IAgoraRTCClient {
  return AgoraRTC.createClient({ mode: "rtc", codec: "vp8" });
}

export async function joinAgoraWithToken(
  channel: string,
  deviceId: string,
): Promise<{ client: IAgoraRTCClient; credentials: AgoraJoinCredentials }> {
  const credentials = await fetchAgoraToken(channel, deviceId);
  const client = createAgoraClient();
  await client.join(credentials.appId, channel, credentials.token, credentials.uid);
  return { client, credentials };
}

export type FcmRegistration = {
  token: string;
  deviceId?: string;
  platform?: string;
  revoke?: boolean;
};

/** Alias-compatible FCM device registration. The server binds it to the session. */
export function registerFcm(registration: FcmRegistration): Promise<unknown> {
  return requestJson("/api/fcm/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(registration),
  });
}

export type FcmSendTarget =
  | { kind: "call"; callId: string }
  | { kind: "message"; roomId: string; messageId: string };

/** Sends only server-derived entity identifiers, never recipient/token metadata. */
export function sendFcm(target: FcmSendTarget): Promise<unknown> {
  return requestJson("/api/fcm/send", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(target),
  });
}

export type GroupCallType = "audio" | "video";
export const GROUP_APIS = {
  create(input: { roomId: number; type: GroupCallType; deviceId: string; e2e: unknown }) {
    return requestJson<unknown>("/api/communication/groups", {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(input),
    });
  },
  get(callId: string) {
    return requestJson<unknown>(`/api/communication/groups/${encodeURIComponent(callId)}`);
  },
  incoming() {
    return requestJson<unknown>("/api/communication/groups/incoming");
  },
  answer(callId: string, input: { deviceId: string }) {
    return requestJson<unknown>(`/api/communication/groups/${encodeURIComponent(callId)}/answer`, {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(input),
    });
  },
  end(callId: string, input: { deviceId: string }) {
    return requestJson<unknown>(`/api/communication/groups/${encodeURIComponent(callId)}/end`, {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(input),
    });
  },
  reject(callId: string, input?: { deviceId: string }) {
    return requestJson<unknown>(`/api/communication/groups/${encodeURIComponent(callId)}/reject`, {
      method: "POST",
      headers: input ? { "Content-Type": "application/json" } : undefined,
      body: input ? JSON.stringify(input) : undefined,
    });
  },
} as const;
/** Canonical lower-case group API alias for injected communication clients. */
export const groups = GROUP_APIS;

export type SocketFrame = Record<string, unknown> & { type: string };
export function createNativeWebSocket(url: string): WebSocket {
  return new WebSocket(url);
}
export function sendSocketFrame(socket: WebSocket | null, frame: SocketFrame): boolean {
  if (!socket || socket.readyState !== WebSocket.OPEN) return false;
  socket.send(JSON.stringify(frame));
  return true;
}
export function subscribeSocketMessages(
  socket: WebSocket,
  listener: (frame: SocketFrame) => void,
): () => void {
  const onMessage = (event: MessageEvent<string>) => {
    try {
      const value = JSON.parse(event.data) as SocketFrame;
      if (value && typeof value.type === "string") listener(value);
    } catch { /* malformed frames are not application events */ }
  };
  socket.addEventListener("message", onMessage);
  return () => socket.removeEventListener("message", onMessage);
}

/** Presence remains session/server-owned; these helpers only express frames. */
export const presence = {
  register: (deviceId: string) => ({ type: "register", deviceId }),
  resumeCall: (callId: string) => ({ type: "call-resume", callId }),
};

type PeerConnectionListener = (peerConnection: RTCPeerConnection | null) => void;
const peerConnectionListeners = new Set<PeerConnectionListener>();
let activePeerConnection: RTCPeerConnection | null = null;

/** Transfer modules attach their data channel through this explicit call-owned bridge. */
export function subscribePeerConnection(listener: PeerConnectionListener): () => void {
  peerConnectionListeners.add(listener);
  listener(activePeerConnection);
  return () => peerConnectionListeners.delete(listener);
}
export function publishPeerConnection(peerConnection: RTCPeerConnection | null): void {
  activePeerConnection = peerConnection;
  peerConnectionListeners.forEach(listener => listener(peerConnection));
}

export type InjectedCallController = {
  startCall?: (target: string, withVideo?: boolean) => unknown;
  startGroupCall?: (roomId: string | number, type: GroupCallType) => unknown;
  /** Resolve a numeric user id through the caller's authenticated public API. */
  resolveUsername?: (userId: number) => string | Promise<string>;
};

/** Resolves an id using the authenticated public communication API. */
export async function fetchCommunicationUsername(userId: number): Promise<string> {
  if (!Number.isSafeInteger(userId) || userId < 1) throw new Error("A valid direct-call user id is required.");
  const body = await requestJson<{ userId?: unknown; username?: unknown }>(
    `/api/communication/users/${encodeURIComponent(String(userId))}`,
  );
  if (body.userId !== userId || typeof body.username !== "string" || !body.username.trim()) {
    throw new Error("Direct call target lookup returned an invalid user.");
  }
  return body.username;
}

/** Dependency-injected facade; no global mutable hook/controller state is used. */
export async function startCall(
  controller: InjectedCallController,
  toUserId: string | number,
  type: GroupCallType = "audio",
  isGroup = false,
): Promise<unknown> {
  if (isGroup) {
    if (!controller.startGroupCall) throw new Error("Group calling is unavailable");
    if (typeof toUserId === "number" && (!Number.isSafeInteger(toUserId) || toUserId < 1)) {
      throw new Error("A valid group room id is required.");
    }
    return controller.startGroupCall(toUserId, type);
  }
  if (!controller.startCall) throw new Error("Direct calling is unavailable");
  if (typeof toUserId === "number") {
    const username = await (controller.resolveUsername ?? fetchCommunicationUsername)(toUserId);
    if (typeof username !== "string" || !username.trim()) {
      throw new Error("Direct call facade could not resolve the target username.");
    }
    return controller.startCall(username, type === "video");
  }
  return controller.startCall(toUserId, type === "video");
}

/** Public injected client; it has no module-global mutable controller state. */
export function createCommunication(controller: InjectedCallController) {
  return {
    groups: GROUP_APIS,
    startCall: (toUserId: string | number, type: GroupCallType = "audio", isGroup = false) =>
      startCall(controller, toUserId, type, isGroup),
  };
}