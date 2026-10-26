import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  clearSecureDeviceRegistration,
  isTerminalSecureDeviceError,
  registerSecureDevice,
  SECURE_DEVICE_CAPACITY_CODE,
  SECURE_DEVICE_IDENTITY_CONFLICT_CODE,
} from "./secure-device-registration";
import { ensureDeviceIdentity } from "./amis-e2ee";

vi.mock("./amis-e2ee", () => ({
  ensureDeviceIdentity: vi.fn(),
}));
vi.mock("./network", () => ({ apiPath: (path: string) => path }));

const identity = {
  deviceId: "device_1234567890abcdef",
  publicKey: { kty: "RSA" } as JsonWebKey,
  fingerprint: "fingerprint",
};

describe("shared secure-device registration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    clearSecureDeviceRegistration(7);
    clearSecureDeviceRegistration(8);
    vi.mocked(ensureDeviceIdentity).mockResolvedValue(identity);
  });

  it("deduplicates concurrent PUTs but permits a later heartbeat", async () => {
    let release!: () => void;
    const firstResponse = new Promise<void>(resolve => { release = resolve; });
    const request = vi.fn()
      .mockImplementationOnce(async () => {
        await firstResponse;
        return { ok: true, status: 200 };
      })
      .mockResolvedValue({ ok: true, status: 200 });
    vi.stubGlobal("fetch", request);

    const one = registerSecureDevice(7);
    const two = registerSecureDevice(7);
    expect(one).toBe(two);
    await vi.waitFor(() => expect(request).toHaveBeenCalledTimes(1));
    release();
    await expect(Promise.all([one, two])).resolves.toEqual([identity, identity]);

    await registerSecureDevice(7);
    expect(request).toHaveBeenCalledTimes(2);
  });

  it("never shares an in-flight registration across authenticated accounts", async () => {
    const request = vi.fn().mockResolvedValue({ ok: true, status: 200 });
    vi.stubGlobal("fetch", request);
    await Promise.all([registerSecureDevice(7), registerSecureDevice(8)]);
    expect(request).toHaveBeenCalledTimes(2);
    expect(ensureDeviceIdentity).toHaveBeenCalledWith(7);
    expect(ensureDeviceIdentity).toHaveBeenCalledWith(8);
  });

  it("returns a typed terminal capacity error without clearing private identity", async () => {
    const request = vi.fn().mockResolvedValue({
      ok: false,
      status: 409,
      json: vi.fn().mockResolvedValue({
        code: SECURE_DEVICE_CAPACITY_CODE,
        error: "Secure device limit reached; revoke an old device first",
      }),
    });
    vi.stubGlobal("fetch", request);

    const error = await registerSecureDevice(7).catch(value => value);
    expect(isTerminalSecureDeviceError(error)).toBe(true);
    expect(error.code).toBe(SECURE_DEVICE_CAPACITY_CODE);
    expect(error.message).toContain("Limite d’appareils sécurisés");
    expect(ensureDeviceIdentity).toHaveBeenCalledTimes(1);
    // Registration owns no IndexedDB deletion path; it only reads/creates the
    // persistent identity and publishes its public half.
    expect(request).toHaveBeenCalledWith("/api/messages/e2e/key", expect.objectContaining({ method: "PUT" }));
  });

  it("makes same-device different-key 409 terminal with identity-specific Arabic recovery, never deleting the private key", async () => {
    const request = vi.fn().mockResolvedValue({
      ok: false,
      status: 409,
      json: vi.fn().mockResolvedValue({
        code: SECURE_DEVICE_IDENTITY_CONFLICT_CODE,
        error: "Secure device ID belongs to a different key; preserve your existing private identity or enroll a new device",
      }),
    });
    vi.stubGlobal("fetch", request);

    const error = await registerSecureDevice(7).catch(value => value);
    expect(isTerminalSecureDeviceError(error)).toBe(true);
    expect(error.code).toBe(SECURE_DEVICE_IDENTITY_CONFLICT_CODE);
    expect(error.message).toContain("معرّف هذا الجهاز مرتبط بمفتاح آخر");
    expect(error.message).toContain("لا تحذف المفتاح الحالي");
    expect(error.message).not.toContain("الحد الأقصى");
    expect(error.message).not.toContain("ألغِ جهازاً قديماً");
    expect(ensureDeviceIdentity).toHaveBeenCalledTimes(1);
    expect(request).toHaveBeenCalledTimes(1);
    expect(request).toHaveBeenCalledWith("/api/messages/e2e/key", expect.objectContaining({ method: "PUT" }));
  });
});