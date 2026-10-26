import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  reportMeasurement,
  telemetryConsent,
  setTelemetryConsent,
  subscribeTelemetryConsent,
} from "./operator-telemetry";

// Force the fetch fallback path (jsdom has no working sendBeacon).
beforeEach(() => {
  localStorage.clear();
  (navigator as unknown as { sendBeacon?: unknown }).sendBeacon = undefined;
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("consent gate", () => {
  it("is OFF by default", () => {
    expect(telemetryConsent()).toBe(false);
  });

  it("does NOT post when consent is off", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 202 }));
    vi.stubGlobal("fetch", fetchMock);
    await reportMeasurement({ surface: "clips", outcome: "success", observedBytes: 1000, clipId: 5 });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("notifies subscribers on consent change", () => {
    const seen: boolean[] = [];
    const unsub = subscribeTelemetryConsent((on) => seen.push(on));
    setTelemetryConsent(true);
    setTelemetryConsent(false);
    unsub();
    setTelemetryConsent(true);
    expect(seen).toEqual([true, false]);
  });
});

describe("reportMeasurement — single-event /measure contract", () => {
  it("posts exactly the contract schema to /api/operators/measure", async () => {
    setTelemetryConsent(true);
    const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 202 }));
    vi.stubGlobal("fetch", fetchMock);

    await reportMeasurement({ surface: "clips", outcome: "success", observedBytes: 1234, clipId: 42 });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(String(url)).toContain("/api/operators/measure");
    expect(init.method).toBe("POST");
    expect(init.credentials).toBe("include");
    const body = JSON.parse(init.body as string);
    expect(typeof body.eventId).toBe("string");
    expect(body.eventId.length).toBeGreaterThan(0);
    expect(body.surface).toBe("clips");
    expect(body.outcome).toBe("success");
    expect(body.observedBytes).toBe(1234);
    expect(body.clipId).toBe(42);
    // No batching, no kind/deliveredBytes fields from the old contract.
    expect(body).not.toHaveProperty("events");
    expect(body).not.toHaveProperty("kind");
    expect(body).not.toHaveProperty("deliveredBytes");
  });

  it("omits clipId when not a clip transfer", async () => {
    setTelemetryConsent(true);
    const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 202 }));
    vi.stubGlobal("fetch", fetchMock);
    await reportMeasurement({ surface: "profile", outcome: "success", observedBytes: 800 });
    const body = JSON.parse(fetchMock.mock.calls[0][1].body as string);
    expect(body).not.toHaveProperty("clipId");
  });

  it("never reports an unknown/speculative byte count", async () => {
    setTelemetryConsent(true);
    const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 202 }));
    vi.stubGlobal("fetch", fetchMock);
    await reportMeasurement({ surface: "clips", outcome: "success", observedBytes: null });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("generates a unique eventId per call for server dedupe", async () => {
    setTelemetryConsent(true);
    const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 202 }));
    vi.stubGlobal("fetch", fetchMock);
    await reportMeasurement({ surface: "lite", outcome: "cache", observedBytes: 0 });
    await reportMeasurement({ surface: "lite", outcome: "cache", observedBytes: 0 });
    const id1 = JSON.parse(fetchMock.mock.calls[0][1].body as string).eventId;
    const id2 = JSON.parse(fetchMock.mock.calls[1][1].body as string).eventId;
    expect(id1).not.toBe(id2);
  });

  it("swallows network failures (best-effort)", async () => {
    setTelemetryConsent(true);
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("offline")));
    await expect(
      reportMeasurement({ surface: "market", outcome: "failure", observedBytes: 0 }),
    ).resolves.toBeUndefined();
  });
});
