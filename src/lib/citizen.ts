import { apiPath } from "@/lib/network";

/** Scoped Instagram-like light theme wrapper class (see src/index.css). */
export const CITIZEN_LIGHT_CLASS = "citizen-light";

/** Public citizen social profile route. Distinct from the archon /citizen/:username page. */
export function citizenProfileHref(username: string): string {
  return `/u/${encodeURIComponent(username)}`;
}

/** Resolve a possibly-relative media URL from the backend into a fetchable src. */
export function citizenMediaSrc(url: string | null | undefined): string | undefined {
  if (!url) return undefined;
  if (/^https?:\/\//i.test(url) || url.startsWith("data:") || url.startsWith("blob:")) return url;
  if (url.startsWith("/api/")) return apiPath(url);
  return url;
}

/** Shared JSON fetcher matching the app's session-cookie auth pattern. */
export async function citizenFetch<T>(
  path: string,
  init?: RequestInit,
): Promise<T> {
  const res = await fetch(apiPath(path), {
    credentials: "include",
    headers:
      init?.body && !(init.body instanceof FormData)
        ? { "Content-Type": "application/json", ...(init?.headers ?? {}) }
        : init?.headers,
    ...init,
  });
  if (!res.ok) {
    let message = `Request failed (${res.status})`;
    let code: string | undefined;
    try {
      const data = (await res.json()) as { error?: string; code?: string };
      if (data?.error) message = data.error;
      code = data?.code;
    } catch {
      /* non-JSON error body */
    }
    const err = new Error(message) as Error & { status?: number; code?: string };
    err.status = res.status;
    err.code = code;
    throw err;
  }
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

export const MOROCCAN_STATUS_LABELS = {
  available: { ar: "متاح للتعارف", key: "available" },
  busy: { ar: "مشغول", key: "busy" },
  private: { ar: "خاص", key: "private" },
} as const;
