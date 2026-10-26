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
  it("routes real API requests to the configured backend instead of demo fixtures", async () => {
    vi.stubEnv("VITE_API_URL", "https://backend.example.com");
    const fetch = vi.fn(async () => Response.json({ id: 7, username: "Citizen" }));
    window.fetch = fetch;
    installApiTransport();
    const response = await window.fetch("/api/auth/me");
    expect((await response.json()).username).toBe("Citizen");
    expect(fetch).toHaveBeenCalledWith("https://backend.example.com/api/auth/me", undefined);
    expect(apiOrigin()).toBe("https://backend.example.com");
  });
  it("does not fabricate successful shared services without a backend", async () => {
    vi.stubEnv("VITE_API_URL", "");
    window.fetch = vi.fn(async () => new Response("<!DOCTYPE html>"));
    installApiTransport();
    const response = await window.fetch("/api/finance/manual-payouts", { method: "POST" });
    await expect(response.json()).rejects.toThrow("API returned HTML");
  });
});
