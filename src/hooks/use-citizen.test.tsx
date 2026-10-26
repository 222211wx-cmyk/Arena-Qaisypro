/**
 * Regression tests for citizen social cache isolation.
 *
 * The correctness-critical guarantee: a previous session's private/personalized
 * citizen data (me, public profiles, discovery, map) can NEVER be served to a
 * different account after a login switch, because every cache key is namespaced
 * by the authenticated viewer and "me" never runs for anonymous viewers.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { createElement } from "react";

(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

// ── Mocks ──────────────────────────────────────────────────────────────────────
const citizenFetch = vi.fn();
vi.mock("@/lib/citizen", () => ({
  citizenFetch: (...args: unknown[]) => citizenFetch(...args),
  citizenProfileHref: (u: string) => `/u/${u}`,
  citizenMediaSrc: (u: string) => u,
  CITIZEN_LIGHT_CLASS: "citizen-light",
}));

let authState: { user: { id: number; isAdult: boolean | null } | null; loading: boolean };
vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => authState,
}));

import {
  citizenViewerScope,
  citizenKeys,
  useCitizenViewerScope,
  useMyCitizenProfile,
  useCitizenProfile,
  useUpdateMyProfile,
} from "./use-citizen";

function wrapper(qc: QueryClient) {
  return ({ children }: { children: ReactNode }) =>
    createElement(QueryClientProvider, { client: qc }, children);
}

beforeEach(() => {
  citizenFetch.mockReset();
  authState = { user: null, loading: false };
});

afterEach(() => {
  vi.clearAllMocks();
});

describe("citizen viewer scope", () => {
  it("namespaces distinct users apart and anonymous into its own bucket", () => {
    expect(citizenViewerScope(1)).toBe("u:1");
    expect(citizenViewerScope(2)).toBe("u:2");
    expect(citizenViewerScope(null)).toBe("anon");
    expect(citizenViewerScope(undefined)).toBe("anon");
    expect(citizenViewerScope(1)).not.toBe(citizenViewerScope(2));
  });

  it("produces different query keys for the same resource across viewers", () => {
    const meA = citizenKeys.me("u:1");
    const meB = citizenKeys.me("u:2");
    const meAnon = citizenKeys.me("anon");
    expect(meA).not.toEqual(meB);
    expect(meA).not.toEqual(meAnon);

    const profA = citizenKeys.profile("u:1", "sara");
    const profB = citizenKeys.profile("u:2", "sara");
    expect(profA).not.toEqual(profB);

    const discA = citizenKeys.discovery("u:1", { city: "Rabat" });
    const discB = citizenKeys.discovery("u:2", { city: "Rabat" });
    expect(discA).not.toEqual(discB);
  });

  it("exposes the current viewer scope + readiness from auth", () => {
    authState = { user: { id: 7, isAdult: true }, loading: false };
    const qc = new QueryClient();
    const { result } = renderHook(() => useCitizenViewerScope(), { wrapper: wrapper(qc) });
    expect(result.current.scope).toBe("u:7");
    expect(result.current.ready).toBe(true);

    authState = { user: null, loading: true };
    const { result: r2 } = renderHook(() => useCitizenViewerScope(), { wrapper: wrapper(qc) });
    expect(r2.current.scope).toBe("anon");
    expect(r2.current.ready).toBe(false);
  });
});

describe("useMyCitizenProfile isolation", () => {
  it("does not fetch while auth is still loading (no wrong public cache)", () => {
    authState = { user: null, loading: true };
    const qc = new QueryClient();
    renderHook(() => useMyCitizenProfile(), { wrapper: wrapper(qc) });
    expect(citizenFetch).not.toHaveBeenCalled();
  });

  it("never fetches 'me' for an anonymous viewer", () => {
    authState = { user: null, loading: false };
    const qc = new QueryClient();
    const { result } = renderHook(() => useMyCitizenProfile(), { wrapper: wrapper(qc) });
    expect(citizenFetch).not.toHaveBeenCalled();
    expect(result.current.fetchStatus).toBe("idle");
  });

  it("caches 'me' under the viewer scope, so a login switch cannot serve stale data", async () => {
    // Session A
    authState = { user: { id: 1, isAdult: true }, loading: false };
    citizenFetch.mockResolvedValueOnce({ userId: 1, username: "alice", isSelf: true });
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const { result, unmount } = renderHook(() => useMyCitizenProfile(), {
      wrapper: wrapper(qc),
    });
    await waitFor(() => expect(result.current.data?.username).toBe("alice"));
    unmount();

    // Session B — different user id -> different cache key -> must refetch, and
    // must never return session A's cached "alice".
    authState = { user: { id: 2, isAdult: true }, loading: false };
    citizenFetch.mockResolvedValueOnce({ userId: 2, username: "bob", isSelf: true });
    const { result: r2 } = renderHook(() => useMyCitizenProfile(), { wrapper: wrapper(qc) });

    await waitFor(() => expect(r2.current.data?.username).toBe("bob"));
    expect(r2.current.data?.username).not.toBe("alice");

    // Session A's data still lives under its own key, untouched by session B.
    expect(qc.getQueryData(citizenKeys.me("u:1"))).toMatchObject({ username: "alice" });
    expect(qc.getQueryData(citizenKeys.me("u:2"))).toMatchObject({ username: "bob" });
  });
});

describe("useCitizenProfile isolation", () => {
  it("keys a public profile by viewer so personalized fields cannot cross accounts", async () => {
    // Viewer 1 sees isFollowing=true for sara
    authState = { user: { id: 1, isAdult: true }, loading: false };
    citizenFetch.mockResolvedValueOnce({ userId: 9, username: "sara", isFollowing: true });
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const { result, unmount } = renderHook(() => useCitizenProfile("sara"), {
      wrapper: wrapper(qc),
    });
    await waitFor(() => expect(result.current.data?.isFollowing).toBe(true));
    unmount();

    // Viewer 2 must get a fresh, separately-keyed result (isFollowing=false).
    authState = { user: { id: 2, isAdult: true }, loading: false };
    citizenFetch.mockResolvedValueOnce({ userId: 9, username: "sara", isFollowing: false });
    const { result: r2 } = renderHook(() => useCitizenProfile("sara"), { wrapper: wrapper(qc) });
    await waitFor(() => expect(r2.current.data?.isFollowing).toBe(false));

    expect(qc.getQueryData(citizenKeys.profile("u:1", "sara"))).toMatchObject({ isFollowing: true });
    expect(qc.getQueryData(citizenKeys.profile("u:2", "sara"))).toMatchObject({ isFollowing: false });
  });
});

describe("useUpdateMyProfile privacy visibility", () => {
  it("persists a visibility change via the existing API and reflects it on the shared me + profile caches", async () => {
    authState = { user: { id: 1, isAdult: true }, loading: false };
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });

    // Seed the shared caches with the owner's current (public) profile.
    const seeded = { userId: 1, username: "alice", isSelf: true, visibility: "everyone" as const };
    qc.setQueryData(citizenKeys.me("u:1"), seeded);
    qc.setQueryData(citizenKeys.profile("u:1", "alice"), seeded);

    // The server returns the updated profile with the new visibility.
    citizenFetch.mockResolvedValueOnce({ ...seeded, visibility: "friends" });

    const { result } = renderHook(() => useUpdateMyProfile(), { wrapper: wrapper(qc) });

    await result.current.mutateAsync({ visibility: "friends" });

    // Only the visibility change is sent, through the existing PUT endpoint.
    expect(citizenFetch).toHaveBeenCalledWith(
      "/api/citizen-profiles/me",
      expect.objectContaining({ method: "PUT", body: JSON.stringify({ visibility: "friends" }) }),
    );

    // Both shared caches now reflect the new visibility, so any surface showing
    // this profile (drawer, /u/:username, discovery) sees the change.
    await waitFor(() => {
      expect(qc.getQueryData(citizenKeys.me("u:1"))).toMatchObject({ visibility: "friends" });
      expect(qc.getQueryData(citizenKeys.profile("u:1", "alice"))).toMatchObject({ visibility: "friends" });
    });
  });
});
