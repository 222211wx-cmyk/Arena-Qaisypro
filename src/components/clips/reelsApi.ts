// Typed access to the reels-data-contract endpoints. Every call is same-origin
// under BASE and sends credentials so the session cookie scopes engagement,
// saves, shares, follows, and notifications to the signed-in citizen.

import { fetchSharedClipSession } from "../../lib/account-session-events";

const BASE = import.meta.env.BASE_URL;

export type FeedAuthor = { id: number; username: string; avatarUrl: string | null };

export type FeedClip = {
  id: number;
  user_id: number;
  username: string;
  title: string;
  content_type?: string | null;
  duration_sec?: number | null;
  code?: string | null;
  processing_status?: string | null;
  views?: number | null;
  created_at?: string | null;
  video_url: string;
  thumb: string | null;
  author: FeedAuthor;
  saveCount: number;
  shareCount: number;
  saved: boolean;
};

export type FeedResponse = {
  clips: FeedClip[];
  hasMore: boolean;
  nextBefore: number | null;
  degraded?: boolean;
};

export type Engagement = {
  id: number;
  code: string | null;
  title: string;
  author: FeedAuthor;
  isOwner: boolean;
  liked: boolean;
  likeCount: number;
  commentCount: number;
  saved: boolean;
  saveCount: number;
  shareCount: number;
};

export type Identity =
  | { status: "authenticated"; accountId: number; username: string | null; avatarUrl: string | null }
  | { status: "anonymous" }
  | { status: "unknown" };

export type NotificationItem = {
  id: number;
  title?: string | null;
  body?: string | null;
  linkPath?: string | null;
  sourceRef?: string | null;
  isRead?: boolean;
  createdAt?: string | null;
};

export class ClipFeedError extends Error {
 constructor(public status:number, public retryAfter=0, message='Clips request failed'){super(message);}
}
let feedRetryAt=0;
export function clipFailureMessage(error:unknown):string {
 if(error instanceof ClipFeedError){
  if(error.status===429)return `Trop de requêtes (HTTP 429). Réessayez dans ${Math.max(1,error.retryAfter)} secondes — ce n’est pas un fil vide.`;
  if(error.status===503)return 'Service Clips / base de données temporairement indisponible (HTTP 503). Le contenu n’a pas pu être vérifié. Réessayez.';
  return `Chargement Clips refusé (HTTP ${error.status}). Réessayez ou contactez l’opérateur.`;
 }
 return 'Impossible de charger les Clips. Vérifiez la connexion puis réessayez.';
}

async function getJson<T>(path: string, signal?: AbortSignal): Promise<T> {
  const response = await fetch(`${BASE}api${path}`, {
    credentials: "include",
    cache: "no-store",
    signal,
  });
  if (!response.ok) {
    const seconds=Number(response.headers.get('retry-after'));
    throw new ClipFeedError(response.status,Number.isFinite(seconds)&&seconds>0?Math.min(seconds,900):30);
  }
  return (await response.json()) as T;
}

async function sendJson<T>(path: string, method: string, body?: unknown): Promise<T> {
  const response = await fetch(`${BASE}api${path}`, {
    method,
    credentials: "include",
    headers: body !== undefined ? { "Content-Type": "application/json" } : undefined,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const data = (await response.json().catch(() => ({}))) as Record<string, unknown> & { error?: string };
  if (!response.ok) throw new Error(typeof data.error === "string" ? data.error : `Request failed (${response.status})`);
  return data as T;
}

/** Fetch a page of the reels feed, newest first. `before` paginates; `q` searches. */
export async function fetchFeed(
  opts: { before?: number | null; limit?: number; q?: string },
  signal?: AbortSignal,
): Promise<FeedResponse> {
  if(Date.now()<feedRetryAt)throw new ClipFeedError(429,Math.ceil((feedRetryAt-Date.now())/1000));
  const params = new URLSearchParams();
  if (opts.before != null) params.set("before", String(opts.before));
  params.set("limit", String(Math.min(Math.max(opts.limit ?? 5, 1), 6)));
  if (opts.q && opts.q.trim()) params.set("q", opts.q.trim());
  const controller = new AbortController();
  const abort = () => controller.abort(signal?.reason);
  if (signal?.aborted) abort();
  signal?.addEventListener("abort", abort, { once: true });
  // A feed metadata request must produce a retry state rather than an infinite
  // loading shell. This deadline is unrelated to encoding or multipart uploads.
  const timer = setTimeout(() => controller.abort(new Error("Le fil met trop de temps à répondre. Réessayez.")), 15_000);
  try {
    const data = await getJson<FeedResponse>(`/clips/feed?${params.toString()}`, controller.signal);
    if (!data || !Array.isArray(data.clips)) throw new Error("Invalid clips feed response — retry instead of assuming an empty feed.");
    return {
      clips: data.clips,
      hasMore: Boolean(data.hasMore),
      nextBefore: data.nextBefore ?? null,
      degraded: Boolean(data.degraded),
    };
  } catch(error) {
    if(error instanceof ClipFeedError && error.status===429)feedRetryAt=Date.now()+error.retryAfter*1000;
    throw error;
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener("abort", abort);
  }
}

export async function fetchEngagement(clipId: number, signal?: AbortSignal): Promise<Engagement> {
  const data = await getJson<{ engagement: Engagement }>(`/clips/${clipId}/engagement`, signal);
  return data.engagement;
}

export async function deleteClip(clipId: number): Promise<void> {
  await sendJson(`/clips/${clipId}`, "DELETE");
}

/** Resolve the viewer. Only a 401 confirms anonymous; other failures stay unknown. */
export async function resolveIdentity(timeoutMs = 8_000): Promise<Identity> {
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetchSharedClipSession();
    if (controller.signal.aborted) return { status: "unknown" };
    if (response.status === 401) return { status: "anonymous" };
    if (!response.ok) return { status: "unknown" };
    const me = (await response.json().catch(() => null)) as
      | { id?: unknown; username?: unknown; avatarUrl?: unknown; avatar_url?: unknown; avatar?: unknown }
      | null;
    if (me && Number.isSafeInteger(me.id) && (me.id as number) > 0 && typeof me.username === "string") {
      const avatar = (me.avatarUrl ?? me.avatar_url ?? me.avatar) as unknown;
      return {
        status: "authenticated",
        accountId: me.id as number,
        username: typeof me.username === "string" ? me.username : null,
        avatarUrl: typeof avatar === "string" && avatar ? avatar : null,
      };
    }
    return { status: "unknown" };
  } catch {
    return { status: "unknown" };
  } finally {
    window.clearTimeout(timer);
  }
}

export async function fetchFollowStatus(username: string, signal?: AbortSignal): Promise<boolean> {
  const data = await getJson<{ isFollowing: boolean }>(
    `/citizens/${encodeURIComponent(username)}/follow-status`, signal,
  );
  return Boolean(data.isFollowing);
}

export async function follow(username: string): Promise<boolean> {
  const data = await sendJson<{ isFollowing: boolean }>(`/citizens/${encodeURIComponent(username)}/follow`, "POST");
  return Boolean(data.isFollowing);
}

export async function unfollow(username: string): Promise<boolean> {
  const data = await sendJson<{ isFollowing: boolean }>(`/citizens/${encodeURIComponent(username)}/follow`, "DELETE");
  return Boolean(data.isFollowing);
}

export async function fetchNotifications(
  signal?: AbortSignal,
): Promise<{ notifications: NotificationItem[]; unreadCount: number }> {
  const data = await getJson<{ notifications: NotificationItem[]; unreadCount: number }>(`/notifications`, signal);
  return {
    notifications: Array.isArray(data.notifications) ? data.notifications : [],
    unreadCount: Number(data.unreadCount ?? 0),
  };
}

export async function markAllNotificationsRead(): Promise<void> {
  await sendJson(`/notifications/read-all`, "POST");
}

export async function markNotificationRead(id: number): Promise<void> {
  await sendJson(`/notifications/${id}/read`, "POST");
}
