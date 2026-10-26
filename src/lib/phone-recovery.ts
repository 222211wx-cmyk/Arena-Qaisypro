import type { FirebaseOptions } from "firebase/app";
import type { Auth, ConfirmationResult, RecaptchaVerifier, User } from "firebase/auth";
import { apiPath } from "./network";
import type { RecoveryCopy } from "@/i18n/recovery-copy";

export class RecoveryError extends Error {
  constructor(public code: string, message = code) { super(message); }
}

export async function recoveryRequest<T>(path: string, body?: Record<string, string>, signal?: AbortSignal): Promise<T> {
  let response: Response;
  try {
    response = await fetch(apiPath(`/api/auth/recovery/${path}`), {
      method: body ? "POST" : "GET", credentials: "include", cache: "no-store",
      headers: { Accept: "application/json", ...(body ? { "Content-Type": "application/json" } : {}) },
      ...(body ? { body: JSON.stringify(body) } : {}), signal,
    });
  } catch (error) {
    if (signal?.aborted) throw error;
    throw new RecoveryError("network");
  }
  const data = await response.json().catch(() => { throw new RecoveryError("invalid-response"); });
  if (!response.ok) throw new RecoveryError(data.code ?? `http-${response.status}`, data.error ?? "Request failed");
  return data as T;
}

export type RecoveryConfig = { configured: boolean; firebaseConfig: FirebaseOptions | null };
export type RecoveryPhone = { hasVerifiedPhone: boolean; maskedPhone: string | null };

export function recoveryErrorText(error: unknown, copy: RecoveryCopy): string {
  const raw = error instanceof Error ? error.message : "";
  const code = typeof error === "object" && error && "code" in error ? String(error.code).toLowerCase() : "";
  const detail = `${code} ${raw.toLowerCase()}`;
  if (/billing|quota|too-many-requests|http-429/.test(detail)) return copy.billing;
  if (/operation-not-allowed|provider.*disabled|sms.*region|region.*sms/.test(detail)) return copy.provider;
  if (/unauthorized-domain|app-not-authorized/.test(code)) return copy.domain;
  if (/captcha|missing-app-credential|invalid-app-credential|missing-client-identifier/.test(code)) return copy.captcha;
  if (/network|offline/.test(code) || error instanceof TypeError) return copy.network;
  if (/invalid-api-key|invalid-app-id|not.*configured|disabled/.test(code)) return copy.unavailable;
  if (/recovery_origin/.test(code)) return copy.origin;
  // The server deliberately keeps phone/proof/mapping failures generic to
  // prevent account enumeration. Translate that exact public contract.
  if (raw === "Recovery could not be completed. Verify your phone again and retry.") return copy.verificationFailed;
  if (raw === "Current password or phone verification is invalid.") return copy.passwordError;
  if (raw.startsWith("Password must have at least")) return copy.passwordShort;
  if (raw === "Phone recovery is temporarily unavailable." || code === "http-503") return copy.serviceUnavailable;
  if (/invalid-phone|missing-phone/.test(code)) return copy.invalidPhone;
  if (/invalid-verification-code|missing-verification-code/.test(code)) return copy.invalidCode;
  if (/expired|reused|used|stale|invalid-verification-id|invalid-token|invalid-proof|proof/.test(code)) return copy.expired;
  if (/password.*incorrect|incorrect.*password|invalid.*password|wrong-password/.test(code)) return copy.passwordError;
  if (/weak-password|password.*short/.test(code)) return copy.passwordShort;
  if (/not.*enrolled|not.*found|no.*phone|recovery.*unavailable/.test(code)) return copy.notFound;
  if (/conflict|already.*bound|phone.*taken|http-409/.test(code)) return copy.conflict;
  if (/unauthenticated|auth.*required|http-401/.test(code)) return copy.authRequired;
  // Unknown server failures remain explicit instead of silently succeeding.
  return error instanceof RecoveryError && raw !== code ? `${copy.failed} ${raw}` : copy.failed;
}

/**
 * Only imported from the full recovery UI. Uses a separate named app and
 * in-memory Auth; never reads or writes the default call-push/custom-token app.
 */
export async function createPhoneRecoverySession(config: FirebaseOptions, lang: string) {
  const [appSdk, sdk] = await Promise.all([import("firebase/app"), import("firebase/auth")]);
  const app = appSdk.initializeApp(config, `gdna-phone-recovery-${crypto.randomUUID()}`);
  let auth: Auth;
  try {
    auth = sdk.initializeAuth(app, { persistence: sdk.inMemoryPersistence });
    auth.languageCode = lang;
  } catch (error) {
    await appSdk.deleteApp(app);
    throw error;
  }
  let verifier: RecaptchaVerifier | null = null;
  let confirmation: ConfirmationResult | null = null;
  let verifiedUser: User | null = null;
  let closed = false;
  return {
    async send(phone: string, container: HTMLElement) {
      if (closed) throw new RecoveryError("expired");
      const widget = verifier = new sdk.RecaptchaVerifier(auth, container, { size: "normal" });
      await widget.render();
      if (closed) throw new RecoveryError("expired");
      confirmation = await sdk.signInWithPhoneNumber(auth, phone, widget);
      if (closed) { await sdk.signOut(auth); throw new RecoveryError("expired"); }
    },
    async confirm(code: string) {
      if (closed || !confirmation) throw new RecoveryError("expired");
      const result = await confirmation.confirm(code);
      if (closed) { await sdk.signOut(auth); throw new RecoveryError("expired"); }
      verifiedUser = result.user;
    },
    async token() {
      if (closed || !verifiedUser) throw new RecoveryError("expired");
      return verifiedUser.getIdToken(true);
    },
    async close() {
      if (closed) return;
      closed = true;
      confirmation = null;
      verifiedUser = null;
      try { verifier?.clear(); } finally {
        verifier = null;
        try { await sdk.signOut(auth); } finally { await appSdk.deleteApp(app); }
      }
    },
  };
}
export type PhoneRecoverySession = Awaited<ReturnType<typeof createPhoneRecoverySession>>;