/**
 * GDNA Lite — account-scoped, ciphertext-only offline message queue.
 *
 * Contract: docs/lite-offline.md (artifacts/api-server/docs/lite-offline.md).
 *
 * Invariants (never bypass E2EE):
 *  - Only ciphertext (the "e2e:" envelope) is ever stored or sent. Plaintext bodies
 *    never touch disk or the network.
 *  - The database name is suffixed with the signed-in account id; two accounts never
 *    share state and everything is dropped on logout / account change.
 *  - A key-change 409 from the server moves the record to "needs-review" and stops
 *    auto-send. Re-encryption is an explicit, user-driven action.
 *  - Records are never sent while a different account is signed in.
 */
import { openDb, idbGetAll, idbPut, idbDelete, deleteDb } from "./idb";

const STORE = "outbox";
const E2E_PREFIX = "e2e:";

export type QueueStatus = "pending" | "sending" | "needs-review";

export interface QueuedMessage {
  clientMessageId: string;
  accountId: number;
  roomId: number;
  /** Always the E2E envelope ciphertext. NEVER plaintext. */
  ciphertext: string;
  recipientFingerprints: string[];
  createdAt: number;
  status: QueueStatus;
  attempts: number;
  lastError?: string;
  /**
   * When a record entered the "sending" state. Used to recover leases abandoned by
   * a crashed/closed tab: a stale "sending" record is reclaimed as drainable.
   */
  sendingSince?: number;
}

/**
 * A "sending" record older than this is assumed abandoned (tab crashed mid-send)
 * and is safe to reclaim. Idempotency (clientMessageId) makes a re-send harmless:
 * the server returns replayed:true instead of duplicating.
 */
export const SENDING_LEASE_MS = 60_000;

/** Pure: is a record eligible to (re)send now, accounting for abandoned leases? */
export function isDrainable(msg: QueuedMessage, now = Date.now()): boolean {
  if (msg.status === "pending") return true;
  if (msg.status === "sending") {
    return msg.sendingSince == null || now - msg.sendingSince >= SENDING_LEASE_MS;
  }
  return false; // needs-review is never auto-drained
}

export function isCiphertext(value: string): boolean {
  return typeof value === "string" && value.startsWith(E2E_PREFIX);
}

/** Pure helper: is an HTTP status a recipient key-change that needs review? */
export function isKeyChangeStatus(status: number): boolean {
  return status === 409;
}

/**
 * Pure helper: decide the next status after a send outcome.
 *  - ok (201 fresh, or 200 replayed): remove from queue.
 *  - 409 conflict (key change / sender mismatch): needs-review, no auto-resend.
 *  - 410 gone (original deleted/expired): drop it — do not resurrect.
 *  - anything else / network: back to pending for retry, count the attempt.
 */
export function nextStateAfterSend(
  current: QueuedMessage,
  outcome: { ok: true } | { ok: false; status: number; message: string },
): { done: boolean; drop?: boolean; update: Partial<QueuedMessage> } {
  if (outcome.ok) return { done: true, update: {} };
  if (outcome.status === 410) return { done: true, drop: true, update: {} };
  if (isKeyChangeStatus(outcome.status)) {
    return { done: false, update: { status: "needs-review", lastError: outcome.message, sendingSince: undefined } };
  }
  return {
    done: false,
    update: {
      status: "pending",
      attempts: current.attempts + 1,
      lastError: outcome.message,
      sendingSince: undefined,
    },
  };
}

function dbName(accountId: number): string {
  return `gdna-lite-queue:${accountId}`;
}

export class OfflineQueue {
  private db: IDBDatabase | null = null;
  constructor(public readonly accountId: number) {}

  private async handle(): Promise<IDBDatabase> {
    if (!this.db) this.db = await openDb(dbName(this.accountId), STORE, "clientMessageId");
    return this.db;
  }

  /**
   * Enqueue a ciphertext message. Rejects anything that is not the E2E envelope,
   * or that belongs to a different account.
   */
  async enqueue(
    input: Omit<QueuedMessage, "createdAt" | "status" | "attempts">,
  ): Promise<QueuedMessage> {
    if (input.accountId !== this.accountId) {
      throw new Error("Refusing to queue a message for a different account.");
    }
    if (!isCiphertext(input.ciphertext)) {
      throw new Error("Refusing to queue: message body is not E2E ciphertext.");
    }
    if (!input.recipientFingerprints.length) {
      throw new Error("Refusing to queue: no recipient device keys. Connect once online first.");
    }
    const record: QueuedMessage = {
      ...input,
      createdAt: Date.now(),
      status: "pending",
      attempts: 0,
    };
    await idbPut(await this.handle(), STORE, record);
    return record;
  }

  async all(): Promise<QueuedMessage[]> {
    return (await idbGetAll<QueuedMessage>(await this.handle(), STORE)).sort(
      (a, b) => a.createdAt - b.createdAt,
    );
  }

  async pending(): Promise<QueuedMessage[]> {
    return (await this.all()).filter((m) => m.status === "pending");
  }

  /**
   * Records eligible to (re)send now — pending, plus "sending" records whose lease
   * has expired (the tab that owned them crashed or was closed mid-send).
   */
  async drainable(now = Date.now()): Promise<QueuedMessage[]> {
    return (await this.all()).filter((m) => isDrainable(m, now));
  }

  async update(clientMessageId: string, patch: Partial<QueuedMessage>): Promise<void> {
    await this.mutate(clientMessageId, (record) => ({ ...record, ...patch }));
  }

  async remove(clientMessageId: string): Promise<void> {
    await idbDelete(await this.handle(), STORE, clientMessageId);
  }

  /**
   * Atomic compare-and-update inside ONE IndexedDB transaction — the same primitive
   * the worker uses (lib/lite-sync-worker.ts `mutate`). The callback runs against the
   * freshly-read record so two drainers can never claim the same message, and a
   * lease-scoped settle cannot resurrect a record another drainer already deleted.
   *
   *   return a record → put it
   *   return null      → delete it
   *   return undefined → no-op (lost the race / precondition failed)
   */
  async mutate(
    clientMessageId: string,
    fn: (record: QueuedMessage) => QueuedMessage | null | undefined,
  ): Promise<QueuedMessage | undefined> {
    const db = await this.handle();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, "readwrite");
      const store = tx.objectStore(STORE);
      const req = store.get(clientMessageId);
      let value: QueuedMessage | undefined;
      req.onsuccess = () => {
        const existing = req.result as QueuedMessage | undefined;
        if (!existing) return; // already gone — never re-create it
        const changed = fn(existing);
        if (changed === undefined) return;
        if (changed === null) store.delete(clientMessageId);
        else {
          value = changed;
          store.put(changed);
        }
      };
      tx.oncomplete = () => resolve(value);
      tx.onerror = tx.onabort = () => reject(tx.error ?? new Error("Queue transaction failed"));
    });
  }

  /**
   * Atomically claim a record for sending: only succeeds if the record is drainable
   * at `now` (pending, or a "sending" lease that expired). Sets a fresh lease and
   * returns the claimed record, or undefined if another drainer won the race.
   */
  async claim(clientMessageId: string, now = Date.now()): Promise<QueuedMessage | undefined> {
    return this.mutate(clientMessageId, (record) => {
      if (!isDrainable(record, now)) return undefined;
      return { ...record, status: "sending", sendingSince: now };
    });
  }

  close(): void {
    try {
      this.db?.close();
    } catch {
      /* ignore */
    }
    this.db = null;
  }

  /** Destroy this account's queue database entirely (logout / account change). */
  static async destroy(accountId: number): Promise<void> {
    await deleteDb(dbName(accountId));
  }
}

/**
 * Sender callback signature. The caller performs the actual credentialed POST and
 * returns the HTTP outcome. The queue never touches plaintext.
 */
export type SendCiphertext = (
  msg: QueuedMessage,
) => Promise<{ ok: true } | { ok: false; status: number; message: string }>;

export interface DrainResult {
  sent: number;
  failed: number;
  needsReview: number;
  /** True when the cap was hit or a record was left pending — a later retry is due. */
  retry: boolean;
}

/** Max sends per drain pass — matches the worker's bounded budget. */
export const MAX_DRAIN_SENDS = 3;

/**
 * Drain one account's queue from a live tab. Concurrency-safe with the worker and
 * with other tabs:
 *  - Each record is claimed atomically (`queue.claim`) — a compare-and-set that only
 *    succeeds if the record is still drainable. If another drainer already claimed or
 *    deleted it, `claim` returns undefined and we skip it (no double send).
 *  - Every settle is lease-scoped: it only mutates the record if it is still
 *    "sending" under OUR lease (`sendingSince` unchanged). A settle therefore never
 *    resurrects a record the worker/another tab has already deleted or re-claimed.
 *  - At most MAX_DRAIN_SENDS POSTs per pass; leftover work sets `retry`.
 *  - `verifyAccount` runs immediately before each send; a mid-drain account switch
 *    releases the lease back to "pending" and stops. The server also rejects a
 *    mismatched `expectedSenderId`.
 *  - 201/200 replay → delete; 410 → delete (no resurrection); 409 → needs-review.
 */
export async function drainQueue(
  queue: OfflineQueue,
  currentAccountId: number | null,
  send: SendCiphertext,
  verifyAccount?: () => number | null | Promise<number | null>,
): Promise<DrainResult> {
  const result: DrainResult = { sent: 0, failed: 0, needsReview: 0, retry: false };
  if (currentAccountId == null || currentAccountId !== queue.accountId) return result;

  const candidates = await queue.all(); // sorted by createdAt
  let sends = 0;

  for (const candidate of candidates) {
    if (candidate.status === "needs-review") continue;
    if (sends >= MAX_DRAIN_SENDS) {
      result.retry = true;
      break;
    }

    const now = Date.now();
    const claimed = await queue.claim(candidate.clientMessageId, now);
    if (!claimed) {
      // Lost the race to the worker/another tab, or no longer drainable.
      result.retry = true;
      continue;
    }
    const lease = claimed.sendingSince;

    // Lease-scoped settle: only acts while WE still own this exact lease.
    const settle = (patch: Partial<QueuedMessage> | null) =>
      queue.mutate(claimed.clientMessageId, (record) => {
        if (record.status !== "sending" || record.sendingSince !== lease) return undefined;
        return patch === null ? null : { ...record, ...patch, sendingSince: undefined };
      });

    // Live auth check immediately before the send.
    if (verifyAccount) {
      const live = await verifyAccount();
      if (live !== queue.accountId) {
        await settle({ status: "pending" });
        result.retry = false;
        break;
      }
    }

    sends++;
    let outcome: { ok: true } | { ok: false; status: number; message: string };
    try {
      outcome = await send(claimed);
    } catch (err) {
      outcome = { ok: false, status: 0, message: err instanceof Error ? err.message : "Send failed" };
    }

    const next = nextStateAfterSend(claimed, outcome);
    if (next.done) {
      await settle(null); // delete under our lease; a no-op if already removed
      if (!next.drop) result.sent++;
    } else if (next.update.status === "needs-review") {
      await settle({ status: "needs-review", lastError: next.update.lastError });
      result.needsReview++;
    } else {
      await settle({ status: "pending", attempts: next.update.attempts, lastError: next.update.lastError });
      result.failed++;
      result.retry = true;
    }
  }
  return result;
}
