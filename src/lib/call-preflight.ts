import { apiPath } from "./network";

type FetchLike = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;

interface AgoraCredentials {
  channel: string;
  appId: string;
  token: string;
  uid: number;
}

interface AgoraClientLike {
  join(appId: string, channel: string, token: string, uid: number): Promise<unknown>;
  leave(): Promise<unknown>;
}

interface RelayPeerConnectionLike {
  onicecandidate: ((event: { candidate: { candidate?: string; type?: string } | null }) => void) | null;
  createDataChannel(label: string): unknown;
  createOffer(): Promise<RTCSessionDescriptionInit>;
  setLocalDescription(description: RTCSessionDescriptionInit): Promise<unknown>;
  close(): void;
}

function timeoutError(message: string): Error {
  return new Error(message);
}

function withTimeout<T>(promise: Promise<T>, timeoutMs: number, message: string): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | null = null;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(timeoutError(message)), timeoutMs);
  });
  return Promise.race([promise, timeout]).finally(() => {
    if (timer) clearTimeout(timer);
  });
}

async function readJson(response: Response): Promise<Record<string, unknown>> {
  return await response.json().catch(() => ({})) as Record<string, unknown>;
}

async function fetchPreflightCredentials(
  fetchImpl: FetchLike,
  timeoutMs: number,
): Promise<AgoraCredentials> {
  let lastError: Error | null = null;
  for (let attempt = 0; attempt < 3; attempt++) {
    const response = await withTimeout(
      fetchImpl(apiPath("/api/rtc/preflight-token"), {
        credentials: "include",
        cache: "no-store",
      }),
      timeoutMs,
      "Agora preflight timed out",
    );
    const body = await readJson(response);
    if (response.ok) {
      if (typeof body.channel !== "string" || !body.channel ||
        typeof body.appId !== "string" || !body.appId ||
        typeof body.token !== "string" || !body.token ||
        typeof body.uid !== "number" || !Number.isSafeInteger(body.uid)) {
        throw new Error("Agora preflight returned an invalid token");
      }
      return {
        channel: body.channel,
        appId: body.appId,
        token: body.token,
        uid: body.uid,
      };
    }
    lastError = new Error(typeof body.error === "string" && body.error
      ? body.error
      : `Agora preflight failed: HTTP ${response.status}`);
    if (response.status !== 503 || attempt === 2) break;
    await new Promise(resolve => setTimeout(resolve, 250 * (attempt + 1)));
  }
  throw lastError ?? new Error("Agora preflight failed");
}

/**
 * Joins the server-issued isolated Agora preflight channel without creating
 * microphone/camera tracks or publishing anything. Tokens are intentionally
 * kept local to this function and are never included in logs or errors.
 */
export async function testAgoraPreflight(options: {
  createClient: () => AgoraClientLike;
  fetchImpl?: FetchLike;
  timeoutMs?: number;
}): Promise<void> {
  const fetchImpl = options.fetchImpl ?? fetch;
  const timeoutMs = options.timeoutMs ?? 10_000;
  let client: AgoraClientLike | null = null;
  try {
    const credentials = await fetchPreflightCredentials(fetchImpl, timeoutMs);
    client = options.createClient();
    await withTimeout(
      client.join(credentials.appId, credentials.channel, credentials.token, credentials.uid),
      timeoutMs,
      "Agora preflight join timed out",
    );
    console.info("[CALL] Agora preflight join success", { hasToken: true, uid: credentials.uid });
  } finally {
    if (client) {
      try {
        await withTimeout(
          client.leave(),
          Math.min(2_000, timeoutMs),
          "Agora preflight cleanup timed out",
        );
      } catch {
        // The diagnostic result is determined by join; cleanup is best effort.
      }
    }
  }
}

function validIceServers(value: unknown): value is RTCIceServer[] {
  return Array.isArray(value) && value.length > 0 && value.every(server => {
    if (!server || typeof server !== "object") return false;
    const urls = typeof (server as RTCIceServer).urls === "string"
      ? [(server as RTCIceServer).urls as string]
      : (server as RTCIceServer).urls;
    return Array.isArray(urls) && urls.length > 0 &&
      urls.every(url => typeof url === "string" && /^(stun|stuns|turn|turns):/i.test(url));
  });
}

/**
 * Performs a TURN-only ICE gathering check. It deliberately uses a separate
 * endpoint and peer connection so coturn diagnostics never affect Agora.
 */
export async function testTurnRelay(options: {
  RTCPeerConnectionCtor?: new (configuration?: RTCConfiguration) => RelayPeerConnectionLike;
  fetchImpl?: FetchLike;
  timeoutMs?: number;
} = {}): Promise<boolean> {
  const fetchImpl = options.fetchImpl ?? fetch;
  const timeoutMs = options.timeoutMs ?? 20_000;
  let peer: RelayPeerConnectionLike | null = null;
  let relayFound = false;
  let gatherTimer: ReturnType<typeof setTimeout> | null = null;
  try {
    const response = await withTimeout(
      fetchImpl(apiPath("/api/rtc/turn-ice-servers"), {
        credentials: "include",
        cache: "no-store",
      }),
      timeoutMs,
      "TURN diagnostic timed out",
    );
    const body = await readJson(response);
    if (!response.ok || !validIceServers(body.iceServers)) {
      throw new Error("TURN diagnostic configuration unavailable");
    }
    const PeerConnection = options.RTCPeerConnectionCtor ??
      (globalThis.RTCPeerConnection as unknown as new (configuration?: RTCConfiguration) => RelayPeerConnectionLike);
    if (!PeerConnection) throw new Error("RTCPeerConnection is unavailable");
    peer = new PeerConnection({ iceServers: body.iceServers, iceTransportPolicy: "relay" });
    peer.createDataChannel("gdna-turn-diagnostic");
    const gathered = new Promise<boolean>((resolve) => {
      gatherTimer = setTimeout(() => resolve(false), timeoutMs);
      peer!.onicecandidate = event => {
        const candidate = event.candidate;
        if (candidate && (candidate.type === "relay" || /\btyp relay\b/i.test(candidate.candidate ?? ""))) {
          relayFound = true;
          if (gatherTimer) clearTimeout(gatherTimer);
          gatherTimer = null;
          resolve(true);
        }
      };
    });
    const offer = await peer.createOffer();
    await peer.setLocalDescription(offer);
    relayFound = await gathered;
    if (relayFound) console.info("[CALL] TURN relay diagnostic success");
    else console.warn("[CALL] TURN relay diagnostic failure");
    return relayFound;
  } catch {
    console.warn("[CALL] TURN relay diagnostic failure");
    return false;
  } finally {
    if (gatherTimer) clearTimeout(gatherTimer);
    try { peer?.close(); } catch { /* already closed */ }
  }
}