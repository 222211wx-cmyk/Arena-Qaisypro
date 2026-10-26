import { afterEach, describe, expect, it, vi } from "vitest";
import { apiOrigin, installApiTransport, readApiJson } from "./api-transport";
const originalFetch = window.fetch;
afterEach(() => {
  window.fetch = originalFetch;
  delete (window as Window & { __arenaApiTransport?: boolean }).__arenaApiTransport;
  vi.unstubAllEnvs();
});
describe("API JSON diagnostics", () => {
  it("rejects HTML even when returned with HTTP 200", async () => {
    await expect(readApiJson(new Response("<!DOCTYPE html><h1>App</h1>", {
      headers: { "Content-Type": "text/html" },
    }))).rejects.toThrow("API returned HTML instead of JSON");
  });
  it("does not leak invalid upstream bodies", async () => {
    await expect(readApiJson(new Response("private upstream diagnostics", { status: 502 })))
      .rejects.toThrow("API returned invalid JSON (HTTP 502)");
  });
  it("preserves valid success and error JSON and supports no content", async () => {
    expect(await readApiJson(new Response('{"error":"unauthorized"}', { status: 401 })))
      .toEqual({ error: "unauthorized" });
    expect(await readApiJson(new Response(null, { status: 204 }))).toBeNull();
  });
  it("never sends API requests to the network, even if an old API origin remains configured", async () => {
    vi.stubEnv("VITE_API_URL", "https://backend.example.com");
    const fetch = vi.fn(async () => new Response("<!DOCTYPE html>"));
    window.fetch = fetch;
    installApiTransport();
    const response = await window.fetch("/api/auth/me");
    expect((await response.json()).username).toBe("Guest");
    expect(fetch).not.toHaveBeenCalled();
    await window.fetch("/assets/app.js");
    expect(fetch).toHaveBeenCalledWith("/assets/app.js", undefined);
    expect(apiOrigin()).toBe("");
  });
  it("returns explicit JSON unavailability for unsupported shared services, never HTML", async () => {
    window.fetch = vi.fn();
    installApiTransport();
    const response = await window.fetch("/api/finance/manual-payouts", { method: "POST" });
    expect(response.status).toBe(501);
    expect((await response.json()).demo).toBe(true);
  });

});
