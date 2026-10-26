/**
 * Consented measurement reporting for GDNA Lite operator programme.
 *
 * Frontend-owned (this agent). Vanilla / dependency-free so it is safe to import
 * from the no-React Lite bundle without growing its core budget.
 *
 * Contract: `POST /api/operators/measure` (single event, no batches). See
 * artifacts/api-server/docs/operator-api.md.
 *
 * What it does:
 *  - Reports ONE measured Lite read per call: surface, outcome, a single
 *    `observedBytes` count, and an optional `clipId`.
 *  - Sends ONLY when the citizen has opted in. Consent is OFF by default.
 *  - Sends NO plaintext content, NO PII, and NO full URLs — only the coarse
 *    fields above plus a client-generated `eventId` for server-side dedupe.
 *  - A savings/clip event is emitted ONLY after an actual successful transfer
 *    (real bytes received), never on a button click, a prediction, or a render.
 *  - Costs zero paid AI. Best-effort: failures never interrupt the citizen.
 */

const base = ((): string => {
  try {
    return (import.meta.env.BASE_URL ?? "/").replace(/\/$/, "");
  } catch {
    return "";
  }
})();

const CONSENT_KEY = "gdna.operatorTelemetry"; // "true" | "false"
const ENDPOINT = "/api/operators/measure";

export type MeasureSurface =
  | "lite"
  | "clips"
  | "citizens"
  | "market"
  | "profile"
  | "chat";
export type MeasureOutcome = "success" | "failure" | "cache";

export interface MeasureEvent {
  eventId: string;
  surface: MeasureSurface;
  outcome: MeasureOutcome;
  /** Integer ≥ 0. Actually observed bytes — never a speculative/fixed value. */
  observedBytes: number;
  /** Present only for real clip transfers. */
  clipId?: number;
}

type ConsentListener = (on: boolean) => void;

const listeners = new Set<ConsentListener>();

function uuid(): string {
  try {
    if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
      return crypto.randomUUID();
    }
  } catch {
    /* fall through */
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

/** Consent is opt-in; absent preference means OFF. */
export function telemetryConsent(): boolean {
  try {
    return localStorage.getItem(CONSENT_KEY) === "true";
  } catch {
    return false;
  }
}

export function setTelemetryConsent(on: boolean): void {
  try {
    localStorage.setItem(CONSENT_KEY, on ? "true" : "false");
  } catch {
    /* preference is best-effort */
  }
  for (const fn of listeners) {
    try {
      fn(on);
    } catch {
      /* a listener must never break instrumentation */
    }
  }
}

export function subscribeTelemetryConsent(fn: ConsentListener): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

function sanitizeBytes(v: number | null | undefined): number | null {
  if (typeof v !== "number" || !Number.isFinite(v) || v < 0) return null;
  return Math.round(v);
}

/**
 * Report one measured Lite read. No-op unless consent is granted or bytes are
 * unknown. Only the coarse fields below leave the device — never a URL, query
 * string, or content. Fire-and-forget; resolves even on failure.
 *
 * Call this ONLY when a real outcome is known:
 *  - `success` with the actual bytes received (e.g. after an audio/blob transfer),
 *  - `failure` after a failed transfer,
 *  - `cache` when served from a local snapshot/cache.
 * Do NOT call it on a click, a prediction, or a render.
 */
export async function reportMeasurement(input: {
  surface: MeasureSurface;
  outcome: MeasureOutcome;
  observedBytes: number | null;
  clipId?: number;
}): Promise<void> {
  if (!telemetryConsent()) return;
  const bytes = sanitizeBytes(input.observedBytes);
  if (bytes == null) return; // never report an unknown/speculative byte count

  const event: MeasureEvent = {
    eventId: uuid(),
    surface: input.surface,
    outcome: input.outcome,
    observedBytes: bytes,
  };
  if (typeof input.clipId === "number" && Number.isFinite(input.clipId)) {
    event.clipId = Math.round(input.clipId);
  }

  const body = JSON.stringify(event);
  const url = `${base}${ENDPOINT}`;
  try {
    const beacon =
      typeof navigator !== "undefined" &&
      typeof navigator.sendBeacon === "function";
    if (
      beacon &&
      navigator.sendBeacon(url, new Blob([body], { type: "application/json" }))
    ) {
      return; // queued by the browser
    }
    await fetch(url, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body,
      keepalive: true,
    });
  } catch {
    // Telemetry is best-effort; a transient failure is dropped silently.
  }
}
