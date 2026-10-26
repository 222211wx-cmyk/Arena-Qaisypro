/**
 * Operator partnership API client + shared types for the "Win-Win-Win 2.0"
 * programme. Framework-agnostic (plain fetch, no React) so both the vanilla Lite
 * pages and any React surface can share one typed surface.
 *
 * SOURCE OF TRUTH: artifacts/api-server/docs/operator-api.md (API-owned). These
 * types mirror that contract exactly; do not diverge from it.
 *
 * Honesty invariants encoded here:
 *  - Packs are user-supplied, UNVERIFIED indications; dial code is display-only
 *    (never a tel: purchase), partnershipStatus is "not_signed".
 *  - Referral records attribution only: no verification, provisioning, or commission.
 *  - Science bytes/outcomes are client-reported ("client-reported-not-verified").
 *  - /partners/stats counts are privacy-suppressed below the threshold (null).
 *  - Contact success means PERSISTED; emailSent is always false.
 */

const base = ((): string => {
  try {
    return (import.meta.env.BASE_URL ?? "/").replace(/\/$/, "");
  } catch {
    return "";
  }
})();

const api = (p: string) => `${base}${p}`;

function uuid(): string {
  try {
    if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  } catch {
    /* fall through */
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

// ── Packs ────────────────────────────────────────────────────────────────────

export type PackId = "inwi" | "orange" | "itissalat";

export interface OperatorPack {
  id: PackId;
  name: string;
  priceMad: number;
  priceStatus: "unverified";
  dialCode: string; // "*6#" — display-only, unverified
  dialCodeVerified: boolean;
  officialUrl: string;
  partnershipStatus: "not_signed";
}

export interface OperatorPacksResponse {
  packs: OperatorPack[];
  disclaimer: string;
  privacy: string;
}

// ── Referral ─────────────────────────────────────────────────────────────────

export type ReferralSource = "inwi" | "orange" | "itissalat" | "star6";

export interface ReferralResponse {
  accepted: boolean;
  duplicate: boolean;
}

// ── Science (per-citizen, requires login) ────────────────────────────────────

export interface ScienceSummary {
  month: string; // UTC calendar month, e.g. "2024-06"
  measuredPayloadBytes: number;
  estimatedAvoidedBytes: number;
  /** 0..1 or null without samples. Not uptime/carrier reliability. */
  observedRequestSuccessScore: number | null;
  sampleSize: number;
  comparisonSampleSize: number;
  measurementStatus: "client-reported-not-verified";
  methodology: string;
}

// ── Partner stats (public, privacy-thresholded) ──────────────────────────────

export interface PartnerStats {
  period: "last_30_days";
  privacyThreshold: number;
  suppressed: boolean;
  /** null when suppressed below the privacy threshold. */
  authenticatedCitizens: number | null;
  anonymousReferrals: number | null;
  methodology: string;
}

// ── Partner dashboard (admin only, unsuppressed) ─────────────────────────────

export interface PartnerSourceBreakdown {
  source: string;
  authenticatedCitizens: number;
  anonymousReferrals: number;
}

export interface PartnerInquiry {
  id: number;
  company: string;
  contactEmail: string;
  message: string;
  consent: boolean;
  createdAt: string;
}

export interface PartnerDashboard {
  period: "last_30_days";
  authenticatedCitizens: number;
  anonymousReferrals: number;
  sources: PartnerSourceBreakdown[];
  inquiries: PartnerInquiry[];
}

// ── Contact ──────────────────────────────────────────────────────────────────

export interface ContactInput {
  company: string;
  contactEmail: string;
  message: string;
  consent: true;
  /** Honeypot — must stay empty; sent only to satisfy the field shape. */
  website?: string;
}

export interface ContactResult {
  received: boolean;
  emailSent: false;
}

// ── Errors + transport ───────────────────────────────────────────────────────

export class OperatorApiError extends Error {
  status: number;
  fields?: Record<string, string>;
  constructor(status: number, message: string, fields?: Record<string, string>) {
    super(message);
    this.name = "OperatorApiError";
    this.status = status;
    this.fields = fields;
  }
}

async function getJson<T>(path: string, signal?: AbortSignal): Promise<T> {
  const res = await fetch(api(path), {
    method: "GET",
    credentials: "include",
    headers: { Accept: "application/json" },
    signal,
  });
  if (!res.ok) throw new OperatorApiError(res.status, await errorMessage(res));
  return (await res.json()) as T;
}

async function postJson<T>(path: string, body: unknown, signal?: AbortSignal): Promise<T> {
  const res = await fetch(api(path), {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify(body),
    signal,
  });
  if (!res.ok) {
    let fields: Record<string, string> | undefined;
    let message = `Request failed (${res.status})`;
    try {
      const j = (await res.json()) as { error?: string; fields?: Record<string, string> };
      if (j?.error) message = j.error;
      if (j?.fields) fields = j.fields;
    } catch {
      /* ignore */
    }
    throw new OperatorApiError(res.status, message, fields);
  }
  return res.status === 204 ? (undefined as unknown as T) : ((await res.json()) as T);
}

async function errorMessage(res: Response): Promise<string> {
  try {
    const j = (await res.json()) as { error?: string };
    if (j?.error) return j.error;
  } catch {
    /* ignore */
  }
  return `Request failed (${res.status})`;
}

// ── Public API surface ────────────────────────────────────────────────────────

export function fetchOperatorPacks(signal?: AbortSignal): Promise<OperatorPacksResponse> {
  return getJson<OperatorPacksResponse>("/api/operators/packs", signal);
}

/**
 * Record a referral attribution. The contract is strict: `{source, eventId}`.
 * This neither verifies nor provisions a pack and creates no commission.
 */
export function recordReferral(
  source: ReferralSource,
  signal?: AbortSignal,
): Promise<ReferralResponse> {
  return postJson<ReferralResponse>("/api/operators/referral", { source, eventId: uuid() }, signal);
}

export function fetchScienceSummary(signal?: AbortSignal): Promise<ScienceSummary> {
  return getJson<ScienceSummary>("/api/operators/science", signal);
}

export function fetchPartnerStats(signal?: AbortSignal): Promise<PartnerStats> {
  return getJson<PartnerStats>("/api/partners/stats", signal);
}

export function fetchPartnerDashboard(signal?: AbortSignal): Promise<PartnerDashboard> {
  return getJson<PartnerDashboard>("/api/partners/dashboard", signal);
}

export function submitContact(input: ContactInput, signal?: AbortSignal): Promise<ContactResult> {
  return postJson<ContactResult>("/api/partners/contact", input, signal);
}

// ── Display helpers ────────────────────────────────────────────────────────

const REF_SOURCES: ReferralSource[] = ["inwi", "orange", "itissalat", "star6"];

/** Parse a `?ref=` value into a known referral source, or null. */
export function parseReferral(value: string | null | undefined): ReferralSource | null {
  if (!value) return null;
  const v = value.toLowerCase().trim();
  return (REF_SOURCES as string[]).includes(v) ? (v as ReferralSource) : null;
}
