/** Worker-only ciphertext replay. Keep this module free of UI and crypto imports.
 * Shared queue contract: gdna-lite-queue:<accountId>/outbox, v1.
 * sendingSince and isDrainable come from the UI-owned queue contract; missing
 * timestamps on legacy "sending" records are expired.
 * expectedSenderId is enforced by the API to close the session-check/POST race.
 */
import { isDrainable, type QueuedMessage as RecordEntry } from "../lite/offline-queue";
type Dependencies = {
  idb: IDBFactory;
  request: typeof fetch;
  base: string;
  now: () => number;
  sleep: (milliseconds: number) => Promise<void>;
};
export type SyncResult = { sent: number; needsReview: number; retry: boolean; authStopped: boolean };
const STORE = "outbox";
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function openExisting(idb: IDBFactory, accountId: number): Promise<IDBDatabase | null> {
  return new Promise((resolve, reject) => {
    const request = idb.open(`gdna-lite-queue:${accountId}`, 1);
    // Never manufacture another account's queue merely because a sync fired.
    let absent = false;
    request.onupgradeneeded = () => { absent = true; request.transaction?.abort(); };
    request.onerror = () => absent ? resolve(null) : reject(request.error);
    request.onsuccess = () => {
      const db = request.result;
      db.onversionchange = () => db.close(); // Logout/delete must not be blocked.
      if (!db.objectStoreNames.contains(STORE)) { db.close(); resolve(null); }
      else resolve(db);
    };
  });
}

function records(db: IDBDatabase): Promise<RecordEntry[]> {
  return new Promise((resolve, reject) => {
    const request = db.transaction(STORE).objectStore(STORE).getAll();
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/** Atomic compare-and-update prevents two sync events claiming the same record. */
function mutate(db: IDBDatabase, id: string, update: (record: RecordEntry) => RecordEntry | null | undefined): Promise<RecordEntry | undefined> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    const store = tx.objectStore(STORE);
    const request = store.get(id);
    let value: RecordEntry | undefined;
    request.onsuccess = () => {
      if (!request.result) return;
      const changed = update(request.result);
      if (changed === undefined) return;
      if (changed === null) store.delete(id);
      else { value = changed; store.put(changed); }
    };
    tx.oncomplete = () => resolve(value);
    tx.onerror = tx.onabort = () => reject(tx.error || new Error("Queue transaction failed"));
  });
}

async function session(deps: Dependencies): Promise<number | null> {
  const response = await deps.request(new URL("api/auth/me", deps.base), {
    credentials: "include", cache: "no-store", signal: AbortSignal.timeout(15_000),
  });
  if (response.status === 401 || response.status === 403) return null;
  if (!response.ok) throw new Error("Unable to verify current session");
  const user = await response.json() as { id?: unknown };
  return typeof user.id === "number" && Number.isSafeInteger(user.id) && user.id > 0 ? user.id : null;
}

export async function drainLiteOutbox(deps: Dependencies): Promise<SyncResult> {
  const result: SyncResult = { sent: 0, needsReview: 0, retry: false, authStopped: false };
  let accountId: number | null;
  try { accountId = await session(deps); }
  catch { return { ...result, retry: true }; }
  if (accountId === null) return { ...result, authStopped: true };
  const db = await openExisting(deps.idb, accountId);
  if (!db) return result;
  let sends = 0;
  try {
    for (const item of (await records(db)).sort((a, b) => a.createdAt - b.createdAt)) {
      if (item.status === "needs-review") continue;
      if (sends >= 3) { result.retry = true; break; }
      const claimed = await mutate(db, item.clientMessageId, record => {
        if (!isDrainable(record, deps.now())) return;
        return { ...record, status: "sending", sendingSince: deps.now() };
      });
      if (!claimed) { result.retry = true; continue; }
      // A lease can expire after worker termination; the stable message UUID
      // makes replay safe even if the last successful response was lost.
      const settle = (patch: Partial<RecordEntry> | null) => mutate(db, claimed.clientMessageId, record => {
        if (record.status !== "sending" || record.sendingSince !== claimed.sendingSince) return;
        return patch === null ? null : { ...record, ...patch, sendingSince: undefined };
      });
      if (claimed.accountId !== accountId || !Number.isSafeInteger(claimed.roomId) || claimed.roomId <= 0 ||
          !UUID.test(claimed.clientMessageId) || typeof claimed.ciphertext !== "string" ||
          !claimed.ciphertext.startsWith("e2e:v1:") || !Array.isArray(claimed.recipientFingerprints) ||
          !claimed.recipientFingerprints.length || claimed.recipientFingerprints.some(key => typeof key !== "string" || !key)) {
        await settle({ status: "needs-review", lastError: "Invalid ciphertext queue record. Review required." });
        result.needsReview++;
        continue;
      }
      let completed = false;
      while (sends < 3 && !completed) {
        // Refresh the shared 60s lease before each bounded (15s + 15s) attempt.
        const renewed = await mutate(db, claimed.clientMessageId, record =>
          record.status === "sending" && record.sendingSince === claimed.sendingSince
            ? { ...record, sendingSince: deps.now() } : undefined);
        if (!renewed) return { ...result, retry: true };
        claimed.sendingSince = renewed.sendingSince;
        // A live tab can switch accounts at any time. Check immediately before
        // every send AND bind identity in the server-validated request body.
        let identity: number | null;
        try { identity = await session(deps); }
        catch {
          await settle({ status: "pending", lastError: "Unable to verify session; waiting for connection." });
          result.retry = true;
          return result;
        }
        if (identity !== accountId) {
          await settle({ status: "pending", lastError: "Sign in to the original account to send." });
          return { ...result, retry: false, authStopped: true };
        }
        sends++;
        let status = 0;
        try {
          const response = await deps.request(new URL(`api/messages/rooms/${claimed.roomId}/send`, deps.base), {
            method: "POST", credentials: "include", cache: "no-store",
            headers: { "Content-Type": "application/json" }, signal: AbortSignal.timeout(15_000),
            body: JSON.stringify({
              content: claimed.ciphertext, clientMessageId: claimed.clientMessageId,
              expectedSenderId: accountId,
            }),
          });
          status = response.status;
          if (response.ok) {
            await settle(null);
            result.sent++;
            completed = true;
            continue;
          }
        } catch { /* Preserve ciphertext for bounded retry; no response body retained. */ }
        if (status === 401 || status === 403) {
          await settle({ status: status === 403 ? "needs-review" : "pending", lastError: "Authentication or access changed. Open Lite to review." });
          if (status === 403) result.needsReview++;
          return { ...result, retry: false, authStopped: true };
        }
        if (status >= 400 && status < 500 && status !== 429) {
          await settle({
            status: "needs-review",
            lastError: status === 409 ? "Secure device keys or message identity changed. Explicit review required." : `Send rejected (${status}). Review required.`,
          });
          result.needsReview++;
          completed = true;
        } else {
          await mutate(db, claimed.clientMessageId, record => record.sendingSince === claimed.sendingSince
            ? { ...record, attempts: (record.attempts || 0) + 1 } : undefined);
          if (sends < 3) await deps.sleep(500 * 2 ** (sends - 1) + Math.floor(Math.random() * 250));
          else {
            await settle({ status: "pending", lastError: "Connection or service unavailable. Waiting to retry." });
            result.retry = true;
          }
        }
      }
    }
    return result;
  } finally { db.close(); }
}