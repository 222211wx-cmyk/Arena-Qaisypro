import { describe, it, expect, beforeEach } from "vitest";
import { IDBFactory } from "fake-indexeddb";
import {
  OfflineQueue,
  drainQueue,
  isDrainable,
  isCiphertext,
  nextStateAfterSend,
  SENDING_LEASE_MS,
  MAX_DRAIN_SENDS,
  type QueuedMessage,
} from "./offline-queue";

const CIPHER = "e2e:v1:abcdef";

function base(over: Partial<QueuedMessage> = {}): QueuedMessage {
  return {
    clientMessageId: "id-1",
    accountId: 1,
    roomId: 10,
    ciphertext: CIPHER,
    recipientFingerprints: ["fp1"],
    createdAt: 1000,
    status: "pending",
    attempts: 0,
    ...over,
  };
}

beforeEach(() => {
  // Fresh IndexedDB per test.
  (globalThis as unknown as { indexedDB: IDBFactory }).indexedDB = new IDBFactory();
});

describe("ciphertext guard", () => {
  it("only accepts the e2e envelope", () => {
    expect(isCiphertext("e2e:v1:x")).toBe(true);
    expect(isCiphertext("hello plaintext")).toBe(false);
  });

  it("refuses to enqueue plaintext", async () => {
    const q = new OfflineQueue(1);
    await expect(
      q.enqueue({ clientMessageId: "a", accountId: 1, roomId: 1, ciphertext: "plain", recipientFingerprints: ["fp"] }),
    ).rejects.toThrow(/not E2E ciphertext/);
  });

  it("refuses to enqueue for a different account", async () => {
    const q = new OfflineQueue(1);
    await expect(
      q.enqueue({ clientMessageId: "a", accountId: 2, roomId: 1, ciphertext: CIPHER, recipientFingerprints: ["fp"] }),
    ).rejects.toThrow(/different account/);
  });

  it("refuses to queue without recipient keys (connect once first)", async () => {
    const q = new OfflineQueue(1);
    await expect(
      q.enqueue({ clientMessageId: "a", accountId: 1, roomId: 1, ciphertext: CIPHER, recipientFingerprints: [] }),
    ).rejects.toThrow(/Connect once online first/);
  });
});

describe("lease recovery for interrupted sends", () => {
  it("pending is always drainable", () => {
    expect(isDrainable(base({ status: "pending" }), 5000)).toBe(true);
  });

  it("a fresh sending lease is NOT reclaimed", () => {
    const now = 100_000;
    expect(isDrainable(base({ status: "sending", sendingSince: now }), now + 1000)).toBe(false);
  });

  it("an abandoned sending lease (crashed tab) IS reclaimed after the lease window", () => {
    const now = 100_000;
    expect(isDrainable(base({ status: "sending", sendingSince: now }), now + SENDING_LEASE_MS)).toBe(true);
  });

  it("a sending record with no lease timestamp is reclaimable", () => {
    expect(isDrainable(base({ status: "sending", sendingSince: undefined }), 5000)).toBe(true);
  });

  it("needs-review is never auto-drained", () => {
    expect(isDrainable(base({ status: "needs-review" }), Number.MAX_SAFE_INTEGER)).toBe(false);
  });
});

describe("nextStateAfterSend", () => {
  it("success removes the record", () => {
    expect(nextStateAfterSend(base(), { ok: true })).toEqual({ done: true, update: {} });
  });

  it("410 gone drops the record without counting a send", () => {
    const r = nextStateAfterSend(base(), { ok: false, status: 410, message: "gone" });
    expect(r.done).toBe(true);
    expect(r.drop).toBe(true);
  });

  it("409 moves to needs-review and does not auto-resend", () => {
    const r = nextStateAfterSend(base(), { ok: false, status: 409, message: "keys changed" });
    expect(r.done).toBe(false);
    expect(r.update.status).toBe("needs-review");
  });

  it("transient failure returns to pending and counts the attempt", () => {
    const r = nextStateAfterSend(base({ attempts: 2 }), { ok: false, status: 0, message: "offline" });
    expect(r.update.status).toBe("pending");
    expect(r.update.attempts).toBe(3);
  });
});

describe("drainQueue", () => {
  it("does nothing when the signed-in account differs", async () => {
    const q = new OfflineQueue(1);
    await q.enqueue({ clientMessageId: "a", accountId: 1, roomId: 1, ciphertext: CIPHER, recipientFingerprints: ["fp"] });
    const res = await drainQueue(q, 2 /* different account */, async () => ({ ok: true }));
    expect(res.sent).toBe(0);
    expect((await q.all()).length).toBe(1);
  });

  it("sends pending messages and removes them", async () => {
    const q = new OfflineQueue(1);
    await q.enqueue({ clientMessageId: "a", accountId: 1, roomId: 1, ciphertext: CIPHER, recipientFingerprints: ["fp"] });
    const sent: string[] = [];
    const res = await drainQueue(q, 1, async (m) => {
      sent.push(m.ciphertext);
      return { ok: true };
    });
    expect(res.sent).toBe(1);
    expect(sent).toEqual([CIPHER]); // exact bytes, never re-encrypted
    expect((await q.all()).length).toBe(0);
  });

  it("reclaims an abandoned sending lease and re-sends idempotently", async () => {
    const q = new OfflineQueue(1);
    const rec = await q.enqueue({ clientMessageId: "a", accountId: 1, roomId: 1, ciphertext: CIPHER, recipientFingerprints: ["fp"] });
    // Simulate a crashed tab: stuck in "sending" with an old lease.
    await q.update(rec.clientMessageId, { status: "sending", sendingSince: Date.now() - SENDING_LEASE_MS - 1 });
    const res = await drainQueue(q, 1, async () => ({ ok: true }));
    expect(res.sent).toBe(1);
    expect((await q.all()).length).toBe(0);
  });

  it("stops sending mid-drain if the account changes (no cross-account leak)", async () => {
    const q = new OfflineQueue(1);
    await q.enqueue({ clientMessageId: "a", accountId: 1, roomId: 1, ciphertext: CIPHER, recipientFingerprints: ["fp"] });
    await q.enqueue({ clientMessageId: "b", accountId: 1, roomId: 1, ciphertext: CIPHER, recipientFingerprints: ["fp"] });
    let calls = 0;
    // Live account flips to a different id after the first verify.
    let live: number | null = 1;
    const res = await drainQueue(
      q,
      1,
      async () => {
        calls++;
        live = 2; // account switched during the drain
        return { ok: true };
      },
      () => live,
    );
    expect(calls).toBe(1); // second message is not sent
    expect(res.sent).toBe(1);
    expect((await q.all()).length).toBe(1); // the untouched message remains
  });

  it("410 during drain drops the record silently", async () => {
    const q = new OfflineQueue(1);
    await q.enqueue({ clientMessageId: "a", accountId: 1, roomId: 1, ciphertext: CIPHER, recipientFingerprints: ["fp"] });
    const res = await drainQueue(q, 1, async () => ({ ok: false, status: 410, message: "gone" }));
    expect(res.sent).toBe(0);
    expect(res.needsReview).toBe(0);
    expect((await q.all()).length).toBe(0);
  });

  it("409 during drain marks needs-review and keeps the record", async () => {
    const q = new OfflineQueue(1);
    await q.enqueue({ clientMessageId: "a", accountId: 1, roomId: 1, ciphertext: CIPHER, recipientFingerprints: ["fp"] });
    const res = await drainQueue(q, 1, async () => ({ ok: false, status: 409, message: "keys changed" }));
    expect(res.needsReview).toBe(1);
    const all = await q.all();
    expect(all[0].status).toBe("needs-review");
  });
});

describe("atomic claim — concurrency", () => {
  it("only one of two concurrent claims wins", async () => {
    const q = new OfflineQueue(1);
    await q.enqueue({ clientMessageId: "a", accountId: 1, roomId: 1, ciphertext: CIPHER, recipientFingerprints: ["fp"] });
    const [c1, c2] = await Promise.all([q.claim("a"), q.claim("a")]);
    const won = [c1, c2].filter(Boolean);
    expect(won.length).toBe(1); // the other lost the race
    const rec = (await q.all())[0];
    expect(rec.status).toBe("sending");
  });

  it("claim fails on a fresh lease it does not own", async () => {
    const q = new OfflineQueue(1);
    await q.enqueue({ clientMessageId: "a", accountId: 1, roomId: 1, ciphertext: CIPHER, recipientFingerprints: ["fp"] });
    const first = await q.claim("a");
    expect(first).toBeDefined();
    const second = await q.claim("a"); // fresh lease held by "first"
    expect(second).toBeUndefined();
  });
});

describe("no resurrection — lease-scoped settle", () => {
  it("mutate never re-creates a record deleted by another drainer", async () => {
    const q = new OfflineQueue(1);
    await q.enqueue({ clientMessageId: "a", accountId: 1, roomId: 1, ciphertext: CIPHER, recipientFingerprints: ["fp"] });
    // Drainer A claims and deletes (successful send).
    const claimed = await q.claim("a");
    await q.remove("a");
    // Drainer B tries to settle its (now stale) lease — must be a no-op, not resurrect.
    const settled = await q.mutate("a", (record) =>
      record.sendingSince === claimed!.sendingSince ? { ...record, status: "pending", sendingSince: undefined } : undefined,
    );
    expect(settled).toBeUndefined();
    expect((await q.all()).length).toBe(0); // still gone
  });

  it("a stale-lease settle does not overwrite a re-claimed record", async () => {
    const q = new OfflineQueue(1);
    await q.enqueue({ clientMessageId: "a", accountId: 1, roomId: 1, ciphertext: CIPHER, recipientFingerprints: ["fp"] });
    const first = await q.claim("a", 1000);
    // First lease expires; a second drainer reclaims with a new lease.
    const second = await q.claim("a", 1000 + SENDING_LEASE_MS);
    expect(second).toBeDefined();
    expect(second!.sendingSince).not.toBe(first!.sendingSince);
    // The first drainer's late settle is scoped to its old lease → no-op.
    const stale = await q.mutate("a", (record) =>
      record.sendingSince === first!.sendingSince ? null : undefined,
    );
    expect(stale).toBeUndefined();
    expect((await q.all())[0].sendingSince).toBe(second!.sendingSince);
  });

  it("drainQueue with a send that races a concurrent delete does not resurrect", async () => {
    const q = new OfflineQueue(1);
    await q.enqueue({ clientMessageId: "a", accountId: 1, roomId: 1, ciphertext: CIPHER, recipientFingerprints: ["fp"] });
    const res = await drainQueue(q, 1, async (m) => {
      // Simulate the worker deleting the record mid-flight (successful worker send).
      await q.remove(m.clientMessageId);
      return { ok: true };
    });
    // Our settle(null) is lease-scoped against a now-missing record → no-op.
    expect((await q.all()).length).toBe(0);
    expect(res.sent).toBe(1);
  });
});

describe("bounded UI drain", () => {
  it("caps sends at MAX_DRAIN_SENDS and flags retry", async () => {
    const q = new OfflineQueue(1);
    for (let i = 0; i < MAX_DRAIN_SENDS + 2; i++) {
      await q.enqueue({ clientMessageId: `m${i}`, accountId: 1, roomId: 1, ciphertext: CIPHER, recipientFingerprints: ["fp"] });
    }
    let calls = 0;
    const res = await drainQueue(q, 1, async () => {
      calls++;
      return { ok: true };
    });
    expect(calls).toBe(MAX_DRAIN_SENDS);
    expect(res.sent).toBe(MAX_DRAIN_SENDS);
    expect(res.retry).toBe(true);
    expect((await q.all()).length).toBe(2); // leftovers remain for the next pass
  });

  it("skips needs-review records without sending", async () => {
    const q = new OfflineQueue(1);
    const rec = await q.enqueue({ clientMessageId: "a", accountId: 1, roomId: 1, ciphertext: CIPHER, recipientFingerprints: ["fp"] });
    await q.update(rec.clientMessageId, { status: "needs-review" });
    let calls = 0;
    const res = await drainQueue(q, 1, async () => {
      calls++;
      return { ok: true };
    });
    expect(calls).toBe(0);
    expect(res.sent).toBe(0);
  });
});

describe("account change / destroy", () => {
  it("destroys one account's queue without touching another", async () => {
    const q1 = new OfflineQueue(1);
    const q2 = new OfflineQueue(2);
    await q1.enqueue({ clientMessageId: "a", accountId: 1, roomId: 1, ciphertext: CIPHER, recipientFingerprints: ["fp"] });
    await q2.enqueue({ clientMessageId: "b", accountId: 2, roomId: 1, ciphertext: CIPHER, recipientFingerprints: ["fp"] });
    q1.close();
    q2.close();

    await OfflineQueue.destroy(1);

    const q1b = new OfflineQueue(1);
    const q2b = new OfflineQueue(2);
    expect((await q1b.all()).length).toBe(0);
    expect((await q2b.all()).length).toBe(1);
  });
});
