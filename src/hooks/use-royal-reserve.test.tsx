/**
 * Tests for use-royal-reserve — focused on the idempotency/retry safety
 * guarantees and session isolation, which are the correctness-critical parts.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { createElement } from "react";
import {
  MAX_REPAYMENT_MINOR,
  useRoyalReserve,
  type CreditResponse,
} from "./use-royal-reserve";

// React needs this flag set for act(...) support under the test runner.
(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

// apiPath just prefixes a base; stub it to identity so URLs are predictable.
vi.mock("@/lib/network", () => ({ apiPath: (p: string) => p }));

function makeCredit(overrides: Partial<CreditResponse["credit"]> = {}): CreditResponse {
  return {
    credit: {
      balanceMinutes: 30,
      reserveMinutes: 0,
      reserveExpiresAt: null,
      debtMinor: 0,
      currency: "MAD",
      canActivate: true,
      simulated: true,
      ...overrides,
    },
    policy: { reserveMinutes: 120, validHours: 48, packageCostMinor: 1500 },
  };
}

function wrapper() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return ({ children }: { children: ReactNode }) =>
    createElement(QueryClientProvider, { client }, children);
}

const fetchMock = vi.fn();

beforeEach(() => {
  fetchMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

function jsonResponse(body: unknown, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  } as Response;
}

describe("useRoyalReserve idempotency + retry safety", () => {
  it("loads credit for the current user when online", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(makeCredit()));
    const { result } = renderHook(
      () => useRoyalReserve(1, { callActive: false, online: true }),
      { wrapper: wrapper() },
    );
    await waitFor(() => expect(result.current.credit).not.toBeNull());
    expect(result.current.credit?.balanceMinutes).toBe(30);
    expect(result.current.policy?.reserveMinutes).toBe(120);
  });

  it("preserves the idempotency key across a network failure so a retry does not double-charge", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(makeCredit())); // credit load
    const { result } = renderHook(
      () => useRoyalReserve(1, { callActive: false, online: true }),
      { wrapper: wrapper() },
    );
    await waitFor(() => expect(result.current.canActivate).toBe(true));

    // First activation: transient network failure (fetch rejects).
    fetchMock.mockRejectedValueOnce(new Error("network down"));
    await act(async () => {
      result.current.reserve();
      await waitFor(() => expect(result.current.reserveIsError).toBe(true));
    });

    // Retry succeeds. Capture the key sent on both POST attempts.
    fetchMock.mockResolvedValueOnce(jsonResponse({ accepted: true, idempotencyKey: "srv" }));
    fetchMock.mockResolvedValue(jsonResponse(makeCredit({ reserveMinutes: 120 })));
    await act(async () => {
      result.current.reserve();
      await waitFor(() => expect(result.current.reserveIsPending).toBe(false));
    });

    const reserveCalls = fetchMock.mock.calls.filter(
      ([url]) => url === "/api/billing/reserve",
    );
    expect(reserveCalls.length).toBe(2);
    const key1 = JSON.parse(reserveCalls[0][1].body as string).idempotencyKey;
    const key2 = JSON.parse(reserveCalls[1][1].body as string).idempotencyKey;
    expect(key1).toBeTruthy();
    expect(key2).toBe(key1); // SAME key reused after the network failure
  });

  it("mints a fresh key after a definite 4xx (safe to start a new request)", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(makeCredit()));
    const { result } = renderHook(
      () => useRoyalReserve(1, { callActive: false, online: true }),
      { wrapper: wrapper() },
    );
    await waitFor(() => expect(result.current.canActivate).toBe(true));

    fetchMock.mockResolvedValueOnce(jsonResponse({ error: "bad" }, 400));
    await act(async () => {
      result.current.reserve();
      await waitFor(() => expect(result.current.reserveIsError).toBe(true));
    });

    fetchMock.mockResolvedValueOnce(jsonResponse({ accepted: true, idempotencyKey: "srv" }));
    fetchMock.mockResolvedValue(jsonResponse(makeCredit()));
    await act(async () => {
      result.current.reserve();
      await waitFor(() => expect(result.current.reserveIsPending).toBe(false));
    });

    const reserveCalls = fetchMock.mock.calls.filter(([url]) => url === "/api/billing/reserve");
    const key1 = JSON.parse(reserveCalls[0][1].body as string).idempotencyKey;
    const key2 = JSON.parse(reserveCalls[1][1].body as string).idempotencyKey;
    expect(key2).not.toBe(key1); // NEW key after a definite client error
  });

  it("does not activate when the server says canActivate is false", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(makeCredit({ canActivate: false })));
    const { result } = renderHook(
      () => useRoyalReserve(1, { callActive: false, online: true }),
      { wrapper: wrapper() },
    );
    await waitFor(() => expect(result.current.credit).not.toBeNull());
    expect(result.current.canActivate).toBe(false);
    act(() => result.current.reserve());
    expect(
      fetchMock.mock.calls.some(([url]) => url === "/api/billing/reserve"),
    ).toBe(false);
  });

  it("clamps sandbox repayment to the 1000 MAD backend cap", async () => {
    // Force DEV so repay is allowed.
    vi.stubEnv("DEV", true);
    fetchMock.mockResolvedValueOnce(jsonResponse(makeCredit({ debtMinor: 250_000 })));
    const { result } = renderHook(
      () => useRoyalReserve(1, { callActive: false, online: true }),
      { wrapper: wrapper() },
    );
    await waitFor(() => expect(result.current.credit).not.toBeNull());

    fetchMock.mockResolvedValueOnce(jsonResponse({ ok: true }));
    fetchMock.mockResolvedValue(jsonResponse(makeCredit()));
    await act(async () => {
      result.current.repay(250_000); // over the cap
      await waitFor(() => expect(result.current.repayIsPending).toBe(false));
    });

    const repayCall = fetchMock.mock.calls.find(([url]) => url === "/api/billing/repay");
    expect(repayCall).toBeDefined();
    const sent = JSON.parse(repayCall![1].body as string);
    expect(sent.amountMinor).toBe(MAX_REPAYMENT_MINOR);
    vi.unstubAllEnvs();
  });

  it("resends the same key+amount on a repay retry after a network failure", async () => {
    vi.stubEnv("DEV", true);
    fetchMock.mockResolvedValueOnce(jsonResponse(makeCredit({ debtMinor: 5_000 })));
    const { result } = renderHook(
      () => useRoyalReserve(1, { callActive: false, online: true }),
      { wrapper: wrapper() },
    );
    await waitFor(() => expect(result.current.credit).not.toBeNull());

    fetchMock.mockRejectedValueOnce(new Error("network down"));
    await act(async () => {
      result.current.repay(5_000);
      await waitFor(() => expect(result.current.repayIsError).toBe(true));
    });

    fetchMock.mockResolvedValueOnce(jsonResponse({ ok: true }));
    fetchMock.mockResolvedValue(jsonResponse(makeCredit()));
    await act(async () => {
      result.current.repay(5_000);
      await waitFor(() => expect(result.current.repayIsPending).toBe(false));
    });

    const repayCalls = fetchMock.mock.calls.filter(([url]) => url === "/api/billing/repay");
    expect(repayCalls.length).toBe(2);
    const a = JSON.parse(repayCalls[0][1].body as string);
    const b = JSON.parse(repayCalls[1][1].body as string);
    expect(b.idempotencyKey).toBe(a.idempotencyKey);
    expect(b.amountMinor).toBe(a.amountMinor);
    vi.unstubAllEnvs();
  });

  it("treats a 409 repay as not-available (production rejects sandbox)", async () => {
    vi.stubEnv("DEV", true);
    fetchMock.mockResolvedValueOnce(jsonResponse(makeCredit({ debtMinor: 5_000 })));
    const { result } = renderHook(
      () => useRoyalReserve(1, { callActive: false, online: true }),
      { wrapper: wrapper() },
    );
    await waitFor(() => expect(result.current.credit).not.toBeNull());

    fetchMock.mockResolvedValueOnce(jsonResponse({ error: "prod" }, 409));
    fetchMock.mockResolvedValue(jsonResponse(makeCredit()));
    await act(async () => {
      result.current.repay(5_000);
      await waitFor(() => expect(result.current.repayIsError).toBe(true));
    });
    expect(result.current.repayErrorNotAvailable).toBe(true);
    vi.unstubAllEnvs();
  });

  it("clears cached credit when the session (user id) changes", async () => {
    fetchMock.mockResolvedValue(jsonResponse(makeCredit({ balanceMinutes: 30 })));
    const { result, rerender } = renderHook(
      ({ id }: { id: number }) => useRoyalReserve(id, { callActive: false, online: true }),
      { wrapper: wrapper(), initialProps: { id: 1 } },
    );
    await waitFor(() => expect(result.current.credit?.balanceMinutes).toBe(30));

    // New session: credit must not still reflect the previous user's cache
    // (a fresh fetch for the new id repopulates it).
    fetchMock.mockResolvedValue(jsonResponse(makeCredit({ balanceMinutes: 99 })));
    rerender({ id: 2 });
    await waitFor(() => expect(result.current.credit?.balanceMinutes).toBe(99));
  });
});
