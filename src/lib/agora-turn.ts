import type { TurnServerConfig } from "agora-rtc-sdk-ng";
import { apiPath } from "./network";

/** Adapt the authenticated coturn REST credentials to the SDK's TURN API.
 * These credentials configure a relay; they never replace the Agora join token.
 */
export function agoraTurnConfig(iceServers: RTCIceServer[]): TurnServerConfig | null {
  for (const server of iceServers) {
    if (!server.username || typeof server.credential !== "string" || !server.credential) continue;
    const urls = typeof server.urls === "string" ? [server.urls] : server.urls;
    const parsed = urls.map(url => /^(turns?):(?:\/\/)?(\[[^\]]+\]|[^:/?]+)(?::(\d+))?(?:\?transport=(udp|tcp))?$/.exec(url))
      .filter((value): value is RegExpExecArray => value !== null);
    // Prefer TLS when advertised. Use one hostname/security mode per SDK
    // configuration; never silently mix a TLS port with plaintext UDP.
    const first = parsed.find(value => value[1] === "turns") ?? parsed[0];
    if (!first) continue;
    const secure = first[1] === "turns";
    const matching = parsed.filter(value => value[1] === first[1] && value[2] === first[2]);
    const result: TurnServerConfig = {
      turnServerURL: first[2],
      username: server.username,
      password: server.credential,
      forceturn: false,
      security: secure,
    };
    for (const url of matching) {
      const port = Number(url[3] ?? (secure ? 5349 : 3478));
      if (!Number.isInteger(port) || port < 1 || port > 65535) continue;
      if (secure || url[4] === "tcp") result.tcpport = port;
      else result.udpport = port;
    }
    if (result.tcpport || result.udpport) return result;
  }
  return null;
}

export async function fetchAgoraTurnConfig(): Promise<TurnServerConfig | null> {
  try {
    const response = await fetch(apiPath("/api/turn/creds"), {
      credentials: "include",
      cache: "no-store",
      signal: AbortSignal.timeout(5_000),
    });
    if (!response.ok) throw new Error("TURN configuration unavailable");
    const body = await response.json() as { iceServers?: RTCIceServer[] };
    const config = Array.isArray(body.iceServers) ? agoraTurnConfig(body.iceServers) : null;
    if (!config) throw new Error("TURN configuration unavailable");
    return config;
  } catch {
    // Do not turn a relay outage into an Agora call outage, or log credentials.
    console.warn("[CALL] Custom TURN unavailable; using Agora's managed network");
    return null;
  }
}