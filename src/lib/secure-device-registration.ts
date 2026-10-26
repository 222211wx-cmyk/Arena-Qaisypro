import { ensureDeviceIdentity } from "@/lib/amis-e2ee";
import { apiPath } from "@/lib/network";

export const SECURE_DEVICE_CAPACITY_CODE = "SECURE_DEVICE_CAPACITY";
export const SECURE_DEVICE_CAPACITY_MESSAGE =
  "بلغت الحد الأقصى للأجهزة الآمنة. ألغِ جهازاً قديماً ثم أعد المحاولة. · Limite d’appareils sécurisés atteinte. Révoquez un ancien appareil puis réessayez.";
export const SECURE_DEVICE_IDENTITY_CONFLICT_CODE = "SECURE_DEVICE_IDENTITY_CONFLICT";
export const SECURE_DEVICE_IDENTITY_CONFLICT_MESSAGE =
  "معرّف هذا الجهاز مرتبط بمفتاح آخر. استعد الهوية الأصلية بمفتاحها الخاص أو سجّل هوية جديدة بمعرّف جهاز جديد صراحةً. لا تحذف المفتاح الحالي أو تُلغِ الأجهزة تلقائياً. · Cet identifiant appartient à une autre clé. Restaurez l’identité privée d’origine ou inscrivez explicitement un nouvel appareil avec un nouvel identifiant. Ne supprimez aucune clé et ne révoquez aucun appareil automatiquement.";

export class SecureDeviceRegistrationError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code: string,
    readonly terminal: boolean,
  ) {
    super(message);
    this.name = "SecureDeviceRegistrationError";
  }
}

export interface RegisteredSecureDevice {
  deviceId: string;
  publicKey: JsonWebKey;
  fingerprint: string;
}

type PendingRegistration = {
  controller: AbortController;
  promise: Promise<RegisteredSecureDevice>;
};

// Registration is intentionally cached only while a request is in flight.
// This collapses Messenger/direct-call/group-call races without suppressing a
// later PUT heartbeat. Account IDs are part of the key and are never shared.
const pendingByAccount = new Map<number, PendingRegistration>();

async function registrationError(response: Response): Promise<SecureDeviceRegistrationError> {
  let body: { error?: unknown; message?: unknown; code?: unknown } = {};
  try {
    body = await response.json() as typeof body;
  } catch { /* An empty/non-JSON failure still gets a typed error. */ }
  const capacity = response.status === 409 &&
    (body.code === SECURE_DEVICE_CAPACITY_CODE ||
      (typeof body.error === "string" && /device limit|capacity/i.test(body.error)));
  const identityConflict = response.status === 409 && body.code === SECURE_DEVICE_IDENTITY_CONFLICT_CODE;
  const detail = typeof body.error === "string"
    ? body.error
    : typeof body.message === "string" ? body.message : "";
  return new SecureDeviceRegistrationError(
    identityConflict ? SECURE_DEVICE_IDENTITY_CONFLICT_MESSAGE :
      capacity ? SECURE_DEVICE_CAPACITY_MESSAGE : (detail || `Secure device registration failed (HTTP ${response.status}).`),
    response.status,
    typeof body.code === "string" ? body.code : capacity ? SECURE_DEVICE_CAPACITY_CODE : "SECURE_DEVICE_REGISTRATION_FAILED",
    capacity || identityConflict,
  );
}

export function registerSecureDevice(userId: number): Promise<RegisteredSecureDevice> {
  const existing = pendingByAccount.get(userId);
  if (existing) return existing.promise;

  const controller = new AbortController();
  const promise = (async () => {
    const identity = await ensureDeviceIdentity(userId);
    const response = await fetch(apiPath("/api/messages/e2e/key"), {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ deviceId: identity.deviceId, publicKey: identity.publicKey }),
      credentials: "include",
      signal: controller.signal,
    });
    if (!response.ok) throw await registrationError(response);
    return identity;
  })().finally(() => {
    if (pendingByAccount.get(userId)?.promise === promise) pendingByAccount.delete(userId);
  });
  pendingByAccount.set(userId, { controller, promise });
  return promise;
}

/** Abort only this authenticated account's in-flight request on logout/switch. */
export function clearSecureDeviceRegistration(userId: number): void {
  const pending = pendingByAccount.get(userId);
  if (!pending) return;
  pendingByAccount.delete(userId);
  pending.controller.abort();
}

export function isTerminalSecureDeviceError(error: unknown): error is SecureDeviceRegistrationError {
  return error instanceof SecureDeviceRegistrationError && error.terminal;
}