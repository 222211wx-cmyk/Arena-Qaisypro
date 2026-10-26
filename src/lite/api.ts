/**
 * Safe read API helper for Lite.
 * - Same-origin, credentialed (shares the React app's auth session cookie).
 * - Retries transient failures up to 3 times with exponential backoff + jitter.
 * - On ultimate failure, falls back to an account-scoped IndexedDB snapshot.
 * - Successful reads are written back to the snapshot store.
 *
 * This is a private, account-scoped fallback. It is NOT the shared service-worker
 * cache and it never caches the private message send endpoint.
 */
import { openDb, idbGet, idbPut } from "./idb";

const base = (import.meta.env.BASE_URL ?? "/").replace(/\/$/, "");

export function apiPath(path: string): string {
  if (!path.startsWith("/api/")) throw new Error(`API paths must start with /api/: ${path}`);
  return `${base}${path}`;
}

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

const SNAPSHOT_STORE = "snapshots";
let snapshotDb: IDBDatabase | null = null;
let snapshotAccount: number | null = null;

async function snapshotStore(accountId: number | null): Promise<IDBDatabase | null> {
  if (accountId == null) return null;
  if (snapshotDb && snapshotAccount === accountId) return snapshotDb;
  try {
    snapshotDb = await openDb(`gdna-lite-snapshot:${accountId}`, SNAPSHOT_STORE, "key");
    snapshotAccount = accountId;
    return snapshotDb;
  } catch {
    return null;
  }
}

export function resetSnapshotHandle(): void {
  try {
    snapshotDb?.close();
  } catch {
    /* ignore */
  }
  snapshotDb = null;
  snapshotAccount = null;
}

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

function retryable(status: number): boolean {
  return status === 0 || status === 408 || status === 429 || status >= 500;
}

export interface SafeReadResult<T> {
  data: T;
  fromSnapshot: boolean;
}

/**
 * GET a JSON resource. `snapshotKey` scopes the offline fallback to the account.
 * Pass `accountId` from the current session; omit to skip snapshotting.
 */
export async function safeRead<T>(
  path: string,
  opts: { accountId?: number | null; snapshotKey?: string; signal?: AbortSignal } = {},
): Promise<SafeReadResult<T>> {
  const url = apiPath(path);
  const maxAttempts = 3;
  let lastStatus = 0;
  let lastMessage = "Request failed";

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    if (attempt > 0) {
      const backoff = Math.min(4000, 300 * 2 ** (attempt - 1));
      await delay(backoff + Math.random() * backoff * 0.5);
    }
    try {
      const res = await fetch(url, {
        method: "GET",
        credentials: "include",
        headers: { Accept: "application/json" },
        signal: opts.signal,
      });
      if (res.status === 401) throw new ApiError(401, "Login required");
      if (!res.ok) {
        lastStatus = res.status;
        lastMessage = `Request failed (${res.status})`;
        if (retryable(res.status) && attempt < maxAttempts - 1) continue;
        throw new ApiError(res.status, lastMessage);
      }
      const data = (res.status === 204 ? (undefined as unknown as T) : ((await res.json()) as T));
      if (opts.snapshotKey && opts.accountId != null) {
        const db = await snapshotStore(opts.accountId);
        if (db) {
          try {
            await idbPut(db, SNAPSHOT_STORE, { key: opts.snapshotKey, data, savedAt: Date.now() });
          } catch {
            /* snapshot is best-effort */
          }
        }
      }
      return { data, fromSnapshot: false };
    } catch (err) {
      if (opts.signal?.aborted) throw err;
      if (err instanceof ApiError && err.status === 401) throw err;
      lastStatus = err instanceof ApiError ? err.status : 0;
      lastMessage = err instanceof Error ? err.message : lastMessage;
      // network-level failure (status 0) is retryable
      if (attempt < maxAttempts - 1 && (lastStatus === 0 || retryable(lastStatus))) continue;
      // exhausted — try snapshot
      if (opts.snapshotKey && opts.accountId != null) {
        const db = await snapshotStore(opts.accountId);
        if (db) {
          try {
            const snap = await idbGet<{ key: string; data: T; savedAt: number }>(
              db,
              SNAPSHOT_STORE,
              opts.snapshotKey,
            );
            if (snap) return { data: snap.data, fromSnapshot: true };
          } catch {
            /* fall through */
          }
        }
      }
      throw new ApiError(lastStatus, lastMessage);
    }
  }
  throw new ApiError(lastStatus, lastMessage);
}

/** Credentialed POST that does NOT retry (writes must be idempotent/explicit). */
export async function postJson<T>(path: string, body: unknown, signal?: AbortSignal): Promise<T> {
  const res = await fetch(apiPath(path), {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify(body),
    signal,
  });
  if (!res.ok) {
    let message = `Request failed (${res.status})`;
    try {
      const j = (await res.json()) as { error?: string };
      if (j?.error) message = j.error;
    } catch {
      /* ignore */
    }
    throw new ApiError(res.status, message);
  }
  return res.status === 204 ? (undefined as unknown as T) : ((await res.json()) as T);
}
