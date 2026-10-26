// @vitest-environment node
import { IDBFactory } from "fake-indexeddb";
import { describe, expect, it, vi } from "vitest";
import { drainLiteOutbox } from "./lite-sync-worker";

const messageId = "00000000-0000-4000-8000-000000000001";
const ciphertext = "e2e:v1:sealed-device-envelope";
const baseline = {
  clientMessageId: messageId, accountId: 7, roomId: 42, ciphertext,
  recipientFingerprints: ["fingerprint"], createdAt: 1, status: "pending", attempts: 0,
};
async function setup(patch: Record<string, unknown> = {}) {
  const idb = new IDBFactory();
  const db = await new Promise<IDBDatabase>((resolve, reject) => {
    const request = idb.open("gdna-lite-queue:7", 1);
    request.onupgradeneeded = () => request.result.createObjectStore("outbox", { keyPath: "clientMessageId" });
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
  });
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction("outbox", "readwrite");
    tx.objectStore("outbox").put({ ...baseline, ...patch });
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  const all = () => new Promise<Array<typeof baseline & { sendingSince?: number }>>(resolve => {
    const request = db.transaction("outbox").objectStore("outbox").getAll();
    request.onsuccess = () => resolve(request.result);
  });
  return { idb, all, close: () => db.close() };
}
function dependencies(idb: IDBFactory, status: number, identity = 7) {
  const request = vi.fn(async (url: URL | RequestInfo, init?: RequestInit) =>
    init?.method === "POST" ? new Response("{}", { status }) : Response.json({ id: identity }));
  return { idb, request: request as unknown as typeof fetch, base: "https://example.test/", now: () => 10_000, sleep: vi.fn(async () => {}) };
}
describe("closed-client ciphertext Background Sync", () => {
  it("drains without any window clients, checking identity and binding every POST", async () => {
    const state = await setup();
    const deps = dependencies(state.idb, 200);
    const result = await drainLiteOutbox(deps);
    expect(result.sent).toBe(1);
    expect(await state.all()).toEqual([]);
    const calls = vi.mocked(deps.request).mock.calls;
    expect(calls.map(([, options]) => options?.method || "GET")).toEqual(["GET", "GET", "POST"]);
    expect(JSON.parse(String(calls[2][1]?.body))).toEqual({ content: ciphertext, clientMessageId: messageId, expectedSenderId: 7 });
    state.close();
  });
  it("does not open or send a different signed-in account's queue", async () => {
    const state = await setup();
    const deps = dependencies(state.idb, 200, 8);
    expect((await drainLiteOutbox(deps)).sent).toBe(0);
    expect(vi.mocked(deps.request).mock.calls).toHaveLength(1);
    expect(await state.all()).toHaveLength(1);
    state.close();
  });
  it("stops when the session switches after the initial check", async () => {
    const state = await setup();
    const deps = dependencies(state.idb, 200);
    vi.mocked(deps.request).mockResolvedValueOnce(Response.json({ id: 7 })).mockResolvedValueOnce(Response.json({ id: 8 }));
    expect((await drainLiteOutbox(deps)).authStopped).toBe(true);
    expect(vi.mocked(deps.request).mock.calls).toHaveLength(2);
    expect((await state.all())[0].status).toBe("pending");
    state.close();
  });
  it.each([409, 400, 404, 422])("marks terminal %s for explicit review without retry", async status => {
    const state = await setup();
    const deps = dependencies(state.idb, status);
    expect((await drainLiteOutbox(deps)).needsReview).toBe(1);
    expect((await state.all())[0].status).toBe("needs-review");
    await drainLiteOutbox(deps);
    expect(vi.mocked(deps.request).mock.calls.filter(([, init]) => init?.method === "POST")).toHaveLength(1);
    state.close();
  });
  it.each([503, 429])("bounds transient %s to three attempts then browser reschedule", async status => {
    const state = await setup();
    const deps = dependencies(state.idb, status);
    expect((await drainLiteOutbox(deps)).retry).toBe(true);
    expect(vi.mocked(deps.request).mock.calls.filter(([, init]) => init?.method === "POST")).toHaveLength(3);
    expect(deps.sleep).toHaveBeenCalledTimes(2);
    expect((await state.all())[0]).toMatchObject({ status: "pending", attempts: 3, sendingSince: undefined });
    state.close();
  });
  it("stops on authentication error without blind retries", async () => {
    const state = await setup();
    const deps = dependencies(state.idb, 401);
    expect((await drainLiteOutbox(deps)).authStopped).toBe(true);
    expect(vi.mocked(deps.request).mock.calls.filter(([, init]) => init?.method === "POST")).toHaveLength(1);
    state.close();
  });
  it("recovers a worker crash from expired sending lease using the same UUID", async () => {
    const state = await setup({ status: "sending", sendingSince: -90_000 });
    expect((await drainLiteOutbox(dependencies(state.idb, 200))).sent).toBe(1);
    expect(await state.all()).toEqual([]);
    state.close();
  });
  it("does not steal an unexpired sender lease", async () => {
    const state = await setup({ status: "sending", sendingSince: 9_000 });
    const deps = dependencies(state.idb, 200);
    expect((await drainLiteOutbox(deps)).sent).toBe(0);
    expect(vi.mocked(deps.request).mock.calls).toHaveLength(1);
    state.close();
  });
  it("atomically claims a record across simultaneous worker wakes", async () => {
    const state = await setup();
    const deps = dependencies(state.idb, 200);
    await Promise.all([drainLiteOutbox(deps), drainLiteOutbox(deps)]);
    expect(vi.mocked(deps.request).mock.calls.filter(([, init]) => init?.method === "POST")).toHaveLength(1);
    expect(await state.all()).toEqual([]);
    state.close();
  });
  it("rejects plaintext and mismatched record ownership", async () => {
    for (const patch of [{ ciphertext: "private plaintext" }, { accountId: 8 }]) {
      const state = await setup(patch);
      const deps = dependencies(state.idb, 200);
      expect((await drainLiteOutbox(deps)).needsReview).toBe(1);
      expect(vi.mocked(deps.request).mock.calls).toHaveLength(1);
      state.close();
    }
  });
});