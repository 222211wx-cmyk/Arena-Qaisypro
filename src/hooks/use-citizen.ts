import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { citizenFetch } from "@/lib/citizen";
import { useAuth } from "@/contexts/AuthContext";

// ── Types (mirror /tmp/citizen-contract.md; backend is source of truth) ──────
export type CitizenStatus = "available" | "busy" | "private";
export type CitizenVisibility = "everyone" | "friends" | "private";

export interface CitizenVideo {
  id: number;
  title: string;
  url: string;
  thumbnailUrl: string | null;
}

export interface CitizenCompatibility {
  percent: number;
  explanation: string;
  method: "shared-interests-city-heuristic";
}

export interface CitizenProfile {
  userId: number;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  coverUrl: string | null;
  city: string | null;
  age: number | null;
  bio: string | null;
  interests: string[];
  status: CitizenStatus;
  visibility: CitizenVisibility;
  stats: { views: number; followers: number; following: number };
  isFollowing: boolean;
  isFriend: boolean;
  isSelf: boolean;
  canMessage: boolean;
  videos: CitizenVideo[];
  mapDiscoverable: boolean;
  compatibility?: CitizenCompatibility;
  // Owner-only extras
  fieldVisibility?: CitizenFieldVisibility;
  aiConsent?: boolean;
}

export type CitizenField =
  | "city"
  | "age"
  | "bio"
  | "interests"
  | "avatarUrl"
  | "coverUrl"
  | "videos";

export type CitizenFieldVisibility = Partial<Record<CitizenField, CitizenVisibility>>;

export interface CitizenProfileUpdate {
  displayName?: string;
  bio?: string | null;
  city?: string | null;
  interests?: string[];
  status?: CitizenStatus;
  visibility?: CitizenVisibility;
  mapDiscoverable?: boolean;
  aiConsent?: boolean;
  fieldVisibility?: CitizenFieldVisibility;
}

export interface CitizenMeta {
  cities: string[];
  interests: string[];
}

export interface CitizenDiscoveryFilters {
  city?: string;
  minAge?: number;
  maxAge?: number;
  interest?: string;
  matchmaking?: boolean;
}

// ── Viewer scope ──────────────────────────────────────────────────────────────
// Every citizen cache is namespaced by the authenticated viewer so that a
// previous session's private/personalized results (me, public profiles with
// isFollowing/canMessage, discovery, map, listings) can NEVER be served to a
// different account after a login switch. Anonymous viewers get their own
// "anon" namespace, and queries do not run until auth has resolved so we never
// populate an anonymous cache with authenticated data (or vice versa).
export type CitizenViewerScope = string;

/** Derive the cache namespace for the current viewer. */
export function citizenViewerScope(userId: number | null | undefined): CitizenViewerScope {
  return userId != null ? `u:${userId}` : "anon";
}

/** Hook: current viewer scope + whether auth has finished loading. */
export function useCitizenViewerScope(): { scope: CitizenViewerScope; ready: boolean } {
  const { user, loading } = useAuth();
  return { scope: citizenViewerScope(user?.id), ready: !loading };
}

// ── Query keys (all viewer-scoped) ─────────────────────────────────────────────
export const citizenKeys = {
  // Meta is public, non-personalized reference data — safe to share across viewers.
  meta: ["citizen", "meta"] as const,
  root: (scope: CitizenViewerScope) => ["citizen", "v", scope] as const,
  me: (scope: CitizenViewerScope) => ["citizen", "v", scope, "me"] as const,
  profile: (scope: CitizenViewerScope, username: string) =>
    ["citizen", "v", scope, "profile", username] as const,
  discoveryPrefix: (scope: CitizenViewerScope) => ["citizen", "v", scope, "discovery"] as const,
  discovery: (scope: CitizenViewerScope, f: CitizenDiscoveryFilters) =>
    ["citizen", "v", scope, "discovery", f] as const,
  map: (scope: CitizenViewerScope) => ["citizen", "v", scope, "map"] as const,
};

function discoveryQuery(f: CitizenDiscoveryFilters): string {
  const q = new URLSearchParams();
  if (f.city) q.set("city", f.city);
  if (f.minAge != null) q.set("minAge", String(f.minAge));
  if (f.maxAge != null) q.set("maxAge", String(f.maxAge));
  if (f.interest) q.set("interest", f.interest);
  if (f.matchmaking) q.set("matchmaking", "true");
  const s = q.toString();
  return s ? `?${s}` : "";
}

// ── Queries ───────────────────────────────────────────────────────────────────
export function useCitizenMeta() {
  return useQuery({
    queryKey: citizenKeys.meta,
    queryFn: () => citizenFetch<CitizenMeta>("/api/citizen-profiles/meta"),
    staleTime: 5 * 60 * 1000,
  });
}

export function useMyCitizenProfile(enabled = true) {
  const { scope, ready } = useCitizenViewerScope();
  return useQuery({
    queryKey: citizenKeys.me(scope),
    queryFn: () => citizenFetch<CitizenProfile>("/api/citizen-profiles/me"),
    // Never run before auth resolves, and never fetch "me" for anonymous viewers.
    enabled: enabled && ready && scope !== "anon",
    retry: false,
  });
}

export function useCitizenProfile(username: string | undefined) {
  const { scope, ready } = useCitizenViewerScope();
  return useQuery({
    queryKey: citizenKeys.profile(scope, username ?? ""),
    queryFn: () =>
      citizenFetch<CitizenProfile>(`/api/citizen-profiles/${encodeURIComponent(username!)}`),
    enabled: !!username && ready,
    retry: false,
  });
}

export function useCitizenDiscovery(filters: CitizenDiscoveryFilters, enabled = true) {
  const { scope, ready } = useCitizenViewerScope();
  return useQuery({
    queryKey: citizenKeys.discovery(scope, filters),
    queryFn: () =>
      citizenFetch<{ profiles: CitizenProfile[] }>(
        `/api/citizen-profiles${discoveryQuery(filters)}`,
      ),
    enabled: enabled && ready,
  });
}

export function useCitizenMap(enabled = true) {
  const { scope, ready } = useCitizenViewerScope();
  return useQuery({
    queryKey: citizenKeys.map(scope),
    queryFn: () => citizenFetch<{ profiles: CitizenProfile[] }>("/api/citizen-profiles/map"),
    enabled: enabled && ready,
  });
}

// ── Mutations ─────────────────────────────────────────────────────────────────
export function useUpdateMyProfile() {
  const qc = useQueryClient();
  const { scope } = useCitizenViewerScope();
  return useMutation({
    mutationFn: (data: CitizenProfileUpdate) =>
      citizenFetch<CitizenProfile>("/api/citizen-profiles/me", {
        method: "PUT",
        body: JSON.stringify(data),
      }),
    onSuccess: (profile) => {
      qc.setQueryData(citizenKeys.me(scope), profile);
      qc.setQueryData(citizenKeys.profile(scope, profile.username), profile);
      // Privacy/visibility changes affect what this viewer's discovery returns.
      void qc.invalidateQueries({ queryKey: citizenKeys.discoveryPrefix(scope) });
      void qc.invalidateQueries({ queryKey: citizenKeys.map(scope) });
    },
  });
}

export function useUploadProfileMedia() {
  const qc = useQueryClient();
  const { scope } = useCitizenViewerScope();
  return useMutation({
    mutationFn: async ({ kind, file }: { kind: "avatar" | "cover"; file: File }) => {
      const form = new FormData();
      form.append("image", file);
      return citizenFetch<{ url: string }>(
        `/api/citizen-profiles/me/media?kind=${kind}`,
        { method: "POST", body: form },
      );
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: citizenKeys.me(scope) });
    },
  });
}

export function useFollowCitizen() {
  const qc = useQueryClient();
  const { scope } = useCitizenViewerScope();
  const patchFollow = (username: string, following: boolean) => {
    qc.setQueryData<CitizenProfile>(citizenKeys.profile(scope, username), (old) =>
      old
        ? {
            ...old,
            isFollowing: following,
            stats: {
              ...old.stats,
              followers: Math.max(0, old.stats.followers + (following ? 1 : -1)),
            },
          }
        : old,
    );
  };
  return useMutation({
    mutationFn: ({ username, follow }: { username: string; follow: boolean }) =>
      citizenFetch<{ success: true }>(
        `/api/citizen-profiles/${encodeURIComponent(username)}/follow`,
        { method: follow ? "POST" : "DELETE" },
      ),
    onMutate: ({ username, follow }) => patchFollow(username, follow),
    onError: (_e, { username, follow }) => patchFollow(username, !follow),
    onSuccess: () => {
      // Refresh this viewer's own following/followers counts and any list that
      // reflects the follow relationship.
      void qc.invalidateQueries({ queryKey: citizenKeys.me(scope) });
      void qc.invalidateQueries({ queryKey: citizenKeys.discoveryPrefix(scope) });
    },
  });
}
