/**
 * Worker-safe queue drain for Background Sync.
 *
 * The infrastructure SW imports this to drain the ciphertext outbox WITHOUT any open
 * client (true Background Sync). It touches only: IndexedDB (via OfflineQueue),
 * `fetch` with credentials, and `crypto` — all available in a ServiceWorkerGlobalScope.
 * It does NOT touch `window`, `localStorage`, `document`, or the E2EE library, and it
 * never re-encrypts: it re-sends exactly the stored bytes with the record's
 * idempotency id + `expectedSenderId`.
 *
 * Because a SW has no persisted "current account", the caller passes the account id.
 * The drain re-verifies the live session against `/api/auth/me` before each send
 * (per-message live auth) so a background sync can never send one account's
 * ciphertext under another signed-in session. The server also rejects a mismatched
 * `expectedSenderId`.
 *
 * Suggested infra wiring (in the SW):
 *
 *   import { drainOutboxInWorker, knownQueueAccountIds } from "<lite>/sw-drain";
 *   self.addEventListener("sync", (e) => {
 *     if (e.tag === "gdna-lite-outbox") e.waitUntil(drainAllKnownAccounts());
 *   });
 *   async function drainAllKnownAccounts() {
 *     for (const id of await knownQueueAccountIds()) await drainOutboxInWorker(id);
 *   }
 */
import { OfflineQueue, drainQueue, type DrainResult } from "./offline-queue";
import { sendQueuedCiphertext } from "./messaging";

const base = (import.meta.env.BASE_URL ?? "/").replace(/\/$/, "");

/** Credentialed session check usable inside a ServiceWorker (no DOM). */
async function liveAccountId(): Promise<number | null> {
  try {
    const res = await fetch(`${base}/api/auth/me`, {
      credentials: "include",
      headers: { Accept: "application/json" },
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { id?: number };
    return typeof data.id === "number" ? data.id : null;
  } catch {
    return null;
  }
}

/**
 * Drain one account's outbox from a worker context. Sends only when the live session
 * still belongs to that account.
 */
export async function drainOutboxInWorker(accountId: number): Promise<DrainResult> {
  const live = await liveAccountId();
  if (live !== accountId) return { sent: 0, failed: 0, needsReview: 0, retry: false };
  const queue = new OfflineQueue(accountId);
  const result = await drainQueue(queue, accountId, sendQueuedCiphertext, liveAccountId);
  queue.close();
  return result;
}

/**
 * Enumerate account ids that currently have a Lite outbox database, so a Background
 * Sync can drain whichever account the device last used. Requires
 * `indexedDB.databases()` (Chromium); returns [] where unavailable, in which case
 * the infra SW should fall back to postMessage-driven drain from an open client.
 */
export async function knownQueueAccountIds(): Promise<number[]> {
  const idb = (globalThis as unknown as { indexedDB?: IDBFactory }).indexedDB;
  const list = (idb as unknown as { databases?: () => Promise<{ name?: string }[]> })?.databases;
  if (typeof list !== "function") return [];
  try {
    const dbs = await list.call(idb);
    const ids: number[] = [];
    for (const d of dbs) {
      const m = d.name?.match(/^gdna-lite-queue:(\d+)$/);
      if (m) ids.push(Number(m[1]));
    }
    return ids;
  } catch {
    return [];
  }
}
