import { afterEach, describe, expect, it, vi } from "vitest";
import { agoraTurnConfig, fetchAgoraTurnConfig } from "./agora-turn";

describe("Agora custom TURN configuration", () => {
  afterEach(() => vi.unstubAllGlobals());
  it("fetches authenticated credentials under the API prefix", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({
      iceServers: [{ urls: "turn:relay.example:3478", username: "expires:user", credential: "test-hmac" }],
    }) });
    vi.stubGlobal("fetch", fetchMock);
    expect(await fetchAgoraTurnConfig()).not.toBeNull();
    expect(fetchMock).toHaveBeenCalledWith("/api/turn/creds", expect.objectContaining({ credentials: "include" }));
  });
  it("uses ephemeral relay credentials separately from the channel token", () => {
    expect(agoraTurnConfig([{
      urls: ["turn:relay.example:3478?transport=udp", "turn:relay.example:3478?transport=tcp"],
      username: "expires:user", credential: "test-hmac",
    }])).toEqual({
      turnServerURL: "relay.example", username: "expires:user", password: "test-hmac",
      udpport: 3478, tcpport: 3478, security: false, forceturn: false,
    });
  });
  it("keeps TLS separate from plaintext UDP when both are offered", () => {
    expect(agoraTurnConfig([{
      urls: ["turn:relay.example:3478?transport=udp", "turns:relay.example:5349?transport=tcp"],
      username: "expires:user", credential: "test-hmac",
    }])).toEqual({
      turnServerURL: "relay.example", username: "expires:user", password: "test-hmac",
      tcpport: 5349, security: true, forceturn: false,
    });
  });
  it("does not mistake STUN or unauthenticated URLs for a relay", () => {
    expect(agoraTurnConfig([{ urls: "stun:example.com" }, { urls: "turn:example.com" }])).toBeNull();
  });
});