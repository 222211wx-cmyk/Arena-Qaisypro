/**
 * Messaging orchestration for Lite. The E2EE library is imported dynamically ONLY
 * here (when entering messages) so it never counts against the core budget.
 *
 * Never sends plaintext. Compose flow: ensure identity → fetch recipient device
 * keys → encrypt with the existing E2EE library → either POST ciphertext (online)
 * or enqueue ciphertext for background sync (offline). Reads decrypt locally.
 */
import { apiPath, safeRead, postJson, ApiError } from "./api";
import { OfflineQueue, drainQueue, type QueuedMessage, type DrainResult } from "./offline-queue";
import type { SessionUser } from "./session";
import { parseMessagingEntitlement, type MessagingEntitlement } from "../lib/messaging-subscription-copy";

type E2EE = typeof import("../lib/amis-e2ee");
let e2eePromise: Promise<E2EE> | null = null;
export function loadE2EE(): Promise<E2EE> {
  if (!e2eePromise) e2eePromise = import("../lib/amis-e2ee");
  return e2eePromise;
}

export interface LiteRoom {
  id: number;
  name: string;
  lastMessagePreview?: string;
}

export interface LiteMessage {
  id: number;
  userId: number;
  username: string;
  content: string;
  createdAt?: string;
}

export interface DecryptedMessage extends LiteMessage {
  plaintext: string | null;
  encrypted: boolean;
  decryptError: boolean;
}

interface DeviceKeyEntry {
  userId: number;
  deviceId: string;
  publicKey: JsonWebKey;
  fingerprint: string;
}

export async function fetchRooms(user: SessionUser, signal?: AbortSignal): Promise<{ rooms: LiteRoom[]; fromSnapshot: boolean }> {
  const res = await safeRead<{ rooms?: LiteRoom[] } | LiteRoom[]>("/api/messages/rooms", {
    accountId: user.id,
    snapshotKey: "rooms",
    signal,
  });
  const rooms = Array.isArray(res.data) ? res.data : (res.data.rooms ?? []);
  return { rooms, fromSnapshot: res.fromSnapshot };
}

export async function fetchMessages(
  user: SessionUser,
  roomId: number,
  signal?: AbortSignal,
): Promise<{ messages: DecryptedMessage[]; fromSnapshot: boolean }> {
  const res = await safeRead<{ messages?: LiteMessage[] } | LiteMessage[]>(
    `/api/messages/rooms/${roomId}`,
    { accountId: user.id, snapshotKey: `room:${roomId}`, signal },
  );
  const raw = Array.isArray(res.data) ? res.data : (res.data.messages ?? []);
  const e2ee = await loadE2EE();
  const decrypted = await Promise.all(
    raw.map(async (m): Promise<DecryptedMessage> => {
      if (!e2ee.isE2EMessage(m.content)) {
        return { ...m, plaintext: m.content, encrypted: false, decryptError: false };
      }
      try {
        const payload = await e2ee.decryptMessagePayload(m.content, user.id);
        const text = payload && payload.kind === "text" ? payload.text : payload ? "[attachment]" : null;
        return { ...m, plaintext: text, encrypted: true, decryptError: text == null };
      } catch {
        return { ...m, plaintext: null, encrypted: true, decryptError: true };
      }
    }),
  );
  return { messages: decrypted, fromSnapshot: res.fromSnapshot };
}

/** Fetch the current recipient device keys for a room. Empty => not set up. */
async function fetchRoomKeys(roomId: number, signal?: AbortSignal): Promise<DeviceKeyEntry[]> {
  const res = await safeRead<{ keys?: DeviceKeyEntry[] } | DeviceKeyEntry[]>(
    `/api/messages/rooms/${roomId}/e2e-keys`,
    { signal },
  );
  const list = Array.isArray(res.data) ? res.data : (res.data.keys ?? []);
  return list.filter((k) => k && typeof k.deviceId === "string" && k.publicKey && k.fingerprint);
}

export class RecipientNotSetUpError extends Error {
  constructor() {
    super("Recipient has not enabled secure messaging.");
    this.name = "RecipientNotSetUpError";
  }
}

/** Compatibility status reader; sending no longer depends on this endpoint. */
export async function fetchMessagingSubscription(): Promise<MessagingEntitlement> {
  const result = await safeRead<unknown>("/api/messages/subscription");
  return parseMessagingEntitlement(result.data);
}

/**
 * Compose + send (or queue) a text message. Always encrypts first. If offline, the
 * ciphertext is queued for background sync. Refuses to queue when a recipient has no
 * device key (must connect once online first).
 */
export async function sendText(
  user: SessionUser,
  roomId: number,
  text: string,
  opts: { online: boolean } = { online: navigator.onLine },
): Promise<{ status: "sent" | "queued"; clientMessageId: string }> {
  const e2ee = await loadE2EE();
  await e2ee.ensureDeviceIdentity(user.id);

  const keys = await fetchRoomKeys(roomId);
  if (keys.length === 0) throw new RecipientNotSetUpError();

  const ciphertext = await e2ee.encryptMessagePayload(
    { kind: "text", text },
    keys.map((k) => ({
      userId: k.userId,
      deviceId: k.deviceId,
      publicKey: k.publicKey,
      fingerprint: k.fingerprint,
    })),
  );
  const clientMessageId = crypto.randomUUID();
  const fingerprints = keys.map((k) => k.fingerprint);

  const queue = new OfflineQueue(user.id);

  if (!opts.online) {
    await queue.enqueue({ clientMessageId, accountId: user.id, roomId, ciphertext, recipientFingerprints: fingerprints });
    queue.close();
    return { status: "queued", clientMessageId };
  }

  try {
    await postJson(`/api/messages/rooms/${roomId}/send`, {
      content: ciphertext,
      type: "text",
      clientMessageId,
      // Server rejects if the live session's sender differs from this id, closing
      // the account-switch window between the auth check and the POST.
      expectedSenderId: user.id,
    });
    queue.close();
    return { status: "sent", clientMessageId };
  } catch (err) {
    // Permanent server denials must never be disguised as successful offline queuing.
    if (err instanceof ApiError && err.status >= 400 && err.status < 500 &&
        ![408, 409, 429].includes(err.status)) {
      queue.close();
      throw err;
    }
    // Key-change 409: do not silently re-encrypt — queue as needs-review.
    if (err instanceof ApiError && err.status === 409) {
      const record = await queue.enqueue({
        clientMessageId,
        accountId: user.id,
        roomId,
        ciphertext,
        recipientFingerprints: fingerprints,
      });
      await queue.update(record.clientMessageId, { status: "needs-review", lastError: err.message });
      queue.close();
      throw err;
    }
    // Transient/offline: queue for retry.
    await queue.enqueue({ clientMessageId, accountId: user.id, roomId, ciphertext, recipientFingerprints: fingerprints });
    queue.close();
    return { status: "queued", clientMessageId };
  }
}

/**
 * Send exactly the stored ciphertext bytes with the record's idempotency id and
 * `expectedSenderId`. Retries never re-encrypt. Worker-safe: no DOM access.
 */
export async function sendQueuedCiphertext(
  msg: QueuedMessage,
): Promise<{ ok: true } | { ok: false; status: number; message: string }> {
  try {
    await postJson(`/api/messages/rooms/${msg.roomId}/send`, {
      content: msg.ciphertext,
      type: "text",
      clientMessageId: msg.clientMessageId,
      expectedSenderId: msg.accountId,
    });
    return { ok: true as const };
  } catch (err) {
    if (err instanceof ApiError) return { ok: false as const, status: err.status, message: err.message };
    return { ok: false as const, status: 0, message: err instanceof Error ? err.message : "Send failed" };
  }
}

/**
 * Drain the account's offline queue by re-POSTing ciphertext with its idempotency
 * id. `verifyAccount` re-checks the live session before every send so a mid-drain
 * account switch cannot leak one account's ciphertext under another session.
 */
export async function syncQueue(
  user: SessionUser,
  verifyAccount?: () => number | null | Promise<number | null>,
): Promise<DrainResult> {
  const queue = new OfflineQueue(user.id);
  const result = await drainQueue(queue, user.id, sendQueuedCiphertext, verifyAccount);
  queue.close();
  return result;
}

export async function pendingCount(user: SessionUser): Promise<number> {
  const queue = new OfflineQueue(user.id);
  const all = await queue.all();
  queue.close();
  return all.length;
}

export function apiMediaUrl(path: string): string {
  return apiPath(path);
}
