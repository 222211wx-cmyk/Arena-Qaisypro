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
  it("routes legacy and apiPath callers to a configured backend without touching assets", async () => {
    vi.stubEnv("VITE_API_URL", "https://backend.example.com");
    const fetch = vi.fn(async () => new Response('{"ok":true}'));
    window.fetch = fetch;
    installApiTransport();
    await expect((await window.fetch("/api/auth/me", { credentials: "include" })).json())
      .resolves.toEqual({ ok: true });
    expect(fetch).toHaveBeenLastCalledWith("https://backend.example.com/api/auth/me", { credentials: "include" });
    await window.fetch("/assets/app.js");
    expect(fetch).toHaveBeenLastCalledWith("/assets/app.js", undefined);
  });
  it("guards API JSON reads globally but leaves other fetches intact", async () => {
    vi.stubEnv("VITE_API_URL", "");
    window.fetch = vi.fn(async () => new Response("<html>app</html>"));
    installApiTransport();
    await expect((await window.fetch("/api/auth/me")).json()).rejects.toThrow("API returned HTML");
    expect(await (await window.fetch("/assets/example.html")).text()).toBe("<html>app</html>");
  });
  it("rejects paths and embedded credentials in the backend origin", () => {
    vi.stubEnv("VITE_API_URL", "https://backend.example.com/api");
    expect(apiOrigin).toThrow("origin only");
    vi.stubEnv("VITE_API_URL", "https://name:password@backend.example.com");
    expect(apiOrigin).toThrow("origin only");
  });
});
