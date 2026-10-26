/**
 * use-royal-reserve — Royal Reserve call-credit state (OWNED by this feature).
 *
 * Backend contract (see task):
 *   GET  /api/billing/credit  -> { credit, policy }
 *   POST /api/billing/reserve -> { accepted, idempotencyKey }   (knowing consent)
 *   POST /api/billing/repay   -> { ... }  DEV sandbox simulation only; prod 409.
 *
 * Behaviour guarantees:
 *  - Never activates silently — activation is only ever triggered explicitly.
 *  - Idempotency key per activation/repay attempt; the same key is reused while
 *    a request is in flight so a duplicate tap cannot double-charge.
 *  - Mutations are disabled while pending (duplicate-safe) and surface errors.
 *  - Polls the credit balance every ~6s ONLY while a call is active, so
 *    decreasing minutes are visible; otherwise it does not spam the server.
 *  - Session change (different/again-null user id) clears cached credit state.
 *
 * Does NOT touch useCall.ts — active-call status is read from the caller.
 */
import { useCallback, useEffect, useMemo, useRef } from "react";
import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { apiPath } from "@/lib/network";

export interface ReserveCredit {
  balanceMinutes: number;
  reserveMinutes: number;
  reserveExpiresAt: string | null;
  debtMinor: number;
  currency: "MAD";
  canActivate: boolean;
  simulated: true;
}

export interface ReservePolicy {
  reserveMinutes: number;
  validHours: number;
  packageCostMinor: number;
  /**
   * Backend dev opt-in (ROYAL_CREDIT_SANDBOX=true). Sandbox repayment UI is only
   * shown when this is true AND the app runs in DEV. Absent/false in production.
   */
  repaymentSandboxEnabled?: boolean;
}

// Backend caps a single sandbox repayment at 1000 MAD (100000 minor units).
// Mirror it client-side so we never send an amount the server will reject.
export const MAX_REPAYMENT_MINOR = 100_000;

export interface CreditResponse {
  credit: ReserveCredit;
  policy: ReservePolicy;
}

// Distinguishes a definite, non-retryable client error (4xx) from a transient
// failure (network error / 5xx) so the idempotency key is only dropped when it
// is safe to mint a fresh one.
class ReserveRequestError extends Error {
  readonly status: number;
  readonly definite: boolean;
  constructor(message: string, status: number, definite: boolean) {
    super(message);
    this.name = "ReserveRequestError";
    this.status = status;
    this.definite = definite;
  }
}

function newIdempotencyKey(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `rr-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

async function fetchCredit(signal?: AbortSignal): Promise<CreditResponse> {
  const res = await fetch(apiPath("/api/billing/credit"), {
    credentials: "include",
    signal,
  });
  if (!res.ok) throw new Error(`credit HTTP ${res.status}`);
  return (await res.json()) as CreditResponse;
}

function creditQueryKey(userId: number | null) {
  return ["billing", "credit", userId] as const;
}

export function useRoyalReserve(
  userId: number | null,
  options: { callActive: boolean; online: boolean },
) {
  const { callActive, online } = options;
  const queryClient = useQueryClient();

  // In-flight idempotent attempt state (preserved across retries; see below).
  const reserveKeyRef = useRef<string | null>(null);
  const repayAttemptRef = useRef<{ key: string; amountMinor: number } | null>(null);

  // ── Session-change clears cached credit + any pending attempt keys ─────────
  const lastUserRef = useRef<number | null>(userId);
  useEffect(() => {
    if (lastUserRef.current !== userId) {
      // Remove the previous session's cached credit so nothing leaks across it.
      queryClient.removeQueries({ queryKey: ["billing", "credit"] });
      // Discard any pending idempotency keys — an old session's key must never
      // be reused to charge a different (new) session.
      reserveKeyRef.current = null;
      repayAttemptRef.current = null;
      lastUserRef.current = userId;
    }
  }, [userId, queryClient]);

  const creditQuery = useQuery({
    queryKey: creditQueryKey(userId),
    queryFn: ({ signal }) => fetchCredit(signal),
    enabled: userId != null && online,
    // Poll only while a call is active so decreasing minutes stay visible.
    // Otherwise do not spam the server.
    refetchInterval: callActive && online ? 6_000 : false,
    refetchOnWindowFocus: false,
    staleTime: 15_000,
    retry: 1,
  });

  const credit = creditQuery.data?.credit ?? null;
  const policy = creditQuery.data?.policy ?? null;

  // Invalidate ONLY this user's credit, and only if the session has not changed
  // since the request began. A response from an old session must never patch a
  // new session's cache (reconciliation and safety).
  const reconcileCredit = useCallback(
    (requestUserId: number | null) => {
      if (requestUserId == null) return;
      if (lastUserRef.current !== requestUserId) return;
      void queryClient.invalidateQueries({ queryKey: creditQueryKey(requestUserId) });
    },
    [queryClient],
  );

  // ── Activation (reserve) — explicit, consent-gated, idempotent ─────────────
  // The idempotency key is minted ONCE per logical attempt and PRESERVED across
  // network failures and retries. A completed-but-unacknowledged request (e.g.
  // the response was lost to a network error) could already have charged the
  // citizen, so reusing the same key lets the server dedupe instead of charging
  // twice. The key is cleared only after a definite success or a definite,
  // non-retryable 4xx client error — never after a network failure or 5xx.
  const reserveMutation = useMutation({
    mutationFn: async () => {
      const requestUserId = userId;
      if (!reserveKeyRef.current) reserveKeyRef.current = newIdempotencyKey();
      const key = reserveKeyRef.current;
      const res = await fetch(apiPath("/api/billing/reserve"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ idempotencyKey: key }),
      });
      if (!res.ok) {
        // Definite client error (except 409, which the server uses for a
        // duplicate/already-applied idempotent request → treat as terminal).
        const definite = (res.status >= 400 && res.status < 500);
        throw new ReserveRequestError(`reserve HTTP ${res.status}`, res.status, definite);
      }
      const body = (await res.json()) as { accepted: boolean; idempotencyKey: string };
      return { body, requestUserId };
    },
    onSuccess: ({ requestUserId }) => {
      reserveKeyRef.current = null; // safe to mint a fresh key next time
      reconcileCredit(requestUserId);
    },
    onError: (error, _vars, _ctx) => {
      // Drop the key ONLY on a definite, non-retryable 4xx so the next attempt
      // starts a clean idempotent request. On network failures / 5xx we KEEP
      // the key so a retry cannot double-charge an already-completed request.
      if (error instanceof ReserveRequestError && error.definite) {
        reserveKeyRef.current = null;
      }
      // Reconcile the current user's credit even on error, since an
      // unacknowledged request may have applied server-side.
      reconcileCredit(userId);
    },
  });

  // ── Repayment — DEVELOPMENT sandbox simulation only ────────────────────────
  // Bind BOTH the idempotency key AND the amount to the logical attempt. A retry
  // must resend the exact same key+amount so an already-applied request is
  // deduped rather than repaid at a different amount.
  const repayMutation = useMutation({
    mutationFn: async (amountMinor: number) => {
      const requestUserId = userId;
      if (!repayAttemptRef.current) {
        repayAttemptRef.current = { key: newIdempotencyKey(), amountMinor: Math.trunc(amountMinor) };
      }
      const attempt = repayAttemptRef.current;
      const res = await fetch(apiPath("/api/billing/repay"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ amountMinor: attempt.amountMinor, idempotencyKey: attempt.key }),
      });
      if (res.status === 409) {
        // Production rejects sandbox repayment — definite, non-retryable.
        throw new ReserveRequestError("repay-not-available", 409, true);
      }
      if (!res.ok) {
        const definite = (res.status >= 400 && res.status < 500);
        throw new ReserveRequestError(`repay HTTP ${res.status}`, res.status, definite);
      }
      await res.json().catch(() => undefined);
      return { requestUserId };
    },
    onSuccess: ({ requestUserId }) => {
      repayAttemptRef.current = null;
      reconcileCredit(requestUserId);
    },
    onError: (error) => {
      if (error instanceof ReserveRequestError && error.definite) {
        repayAttemptRef.current = null;
      }
      reconcileCredit(userId);
    },
  });

  // Store mutation triggers in refs so `reserve`/`repay` stay stable and never
  // re-create from the react-query mutation object changing every render.
  const reserveMutateRef = useRef(reserveMutation.mutate);
  reserveMutateRef.current = reserveMutation.mutate;
  const reserveIsPending = reserveMutation.isPending;
  const repayMutateRef = useRef(repayMutation.mutate);
  repayMutateRef.current = repayMutation.mutate;
  const repayIsPending = repayMutation.isPending;

  const reserve = useCallback(() => {
    // Guard: never activate when the server says we cannot, when offline, or
    // while a request is already in flight (duplicate-safe).
    if (!credit?.canActivate) return;
    if (!online) return;
    if (reserveIsPending) return;
    reserveMutateRef.current();
  }, [credit?.canActivate, online, reserveIsPending]);

  const repay = useCallback(
    (amountMinor: number) => {
      if (!import.meta.env.DEV) return; // sandbox only
      if (repayIsPending) return;
      const clamped = Math.min(Math.trunc(amountMinor), MAX_REPAYMENT_MINOR);
      if (clamped <= 0) return;
      repayMutateRef.current(clamped);
    },
    [repayIsPending],
  );

  const canActivate = useMemo(
    () => Boolean(credit?.canActivate) && online && !reserveIsPending,
    [credit?.canActivate, online, reserveIsPending],
  );

  return {
    credit,
    policy,
    isLoading: creditQuery.isLoading,
    isError: creditQuery.isError,
    refetch: creditQuery.refetch,
    // activation
    reserve,
    canActivate,
    reserveIsPending,
    reserveIsError: reserveMutation.isError,
    // repayment (sandbox)
    repay,
    repayIsPending,
    repayIsError: repayMutation.isError,
    repayErrorNotAvailable:
      repayMutation.error instanceof ReserveRequestError &&
      repayMutation.error.status === 409,
  };
}
