import { apiPath } from "./network";
import { pushInstallationId } from "./call-firebase";

export interface BrowserPushConfig {
  enabled: boolean;
  publicKey?: string;
  reason?: string;
}

export interface BrowserCallPushSession {
  enabled: boolean;
  reason?: string;
  permission: NotificationPermission | "unsupported";
  enable: () => Promise<NotificationPermission>;
  cleanup: (revoke?: boolean) => Promise<void>;
}

type WorkerCallMessage = {
  type?: unknown;
  callId?: unknown;
  status?: unknown;
};

const CALL_ID = /^[A-Za-z0-9_-]{1,128}$/;

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(apiPath(path), { credentials: "include", ...init });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error((body as { error?: string }).error ?? `Browser push request failed: HTTP ${response.status}`);
  }
  return body as T;
}

function bounded<T>(promise: Promise<T>, timeoutMs: number, message: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(message)), timeoutMs);
    promise.then(
      value => { clearTimeout(timer); resolve(value); },
      error => { clearTimeout(timer); reject(error); },
    );
  });
}

async function pushConfig(): Promise<BrowserPushConfig> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 5_000);
  try {
    return await request<BrowserPushConfig>("/api/browser-push/config", { signal: controller.signal });
  } catch (error) {
    if (controller.signal.aborted) throw new Error("Call notification configuration timed out");
    throw error;
  } finally {
    clearTimeout(timer);
  }
}

function applicationServerKey(value: string): ArrayBuffer {
  const normalized = value.trim().replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized + "=".repeat((4 - normalized.length % 4) % 4);
  let binary: string;
  try {
    binary = atob(padded);
  } catch {
    throw new Error("The browser push public key is invalid");
  }
  if (binary.length !== 65) throw new Error("The browser push public key is invalid");
  const buffer = new ArrayBuffer(binary.length);
  const bytes = new Uint8Array(buffer);
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
  return buffer;
}

function capabilityReason(): string | null {
  if (typeof window === "undefined" || !("Notification" in window)) {
    return "Notifications are not supported by this browser";
  }
  if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
    return "Background call notifications are not supported by this browser (Push API and a service worker are required)";
  }
  return null;
}

async function canonicalWorker(): Promise<ServiceWorkerRegistration> {
  const base = import.meta.env.BASE_URL || "/";
  const registration = await bounded(
    navigator.serviceWorker.register(`${base}sw.js`, {
      scope: base,
      updateViaCache: "none",
    }),
    10_000,
    "The call notification service worker registration timed out",
  );
  await waitForActiveServiceWorker(registration);
  return registration;
}

/** Waits for this exact registration; ServiceWorkerContainer.ready may refer to another scope. */
export function waitForActiveServiceWorker(
  registration: ServiceWorkerRegistration,
  timeoutMs = 10_000,
): Promise<ServiceWorkerRegistration> {
  if (registration.active?.state === "activated") return Promise.resolve(registration);

  return new Promise((resolve, reject) => {
    let settled = false;
    let watched: ServiceWorker | null = null;
    const finish = (error?: Error) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      registration.removeEventListener("updatefound", watchRegistration);
      watched?.removeEventListener("statechange", checkState);
      if (error) reject(error);
      else resolve(registration);
    };
    const checkState = () => {
      if (registration.active?.state === "activated" || watched?.state === "activated") {
        finish();
      } else if (watched?.state === "redundant") {
        finish(new Error("The call notification service worker installation was rejected"));
      }
    };
    const watchRegistration = () => {
      watched?.removeEventListener("statechange", checkState);
      watched = registration.installing ?? registration.waiting ?? registration.active;
      watched?.addEventListener("statechange", checkState);
      checkState();
    };
    const timeout = setTimeout(() => {
      finish(new Error("The call notification service worker did not become active"));
    }, timeoutMs);
    registration.addEventListener("updatefound", watchRegistration);
    watchRegistration();
  });
}

async function bindSubscription(
  registration: ServiceWorkerRegistration,
  publicKey: string,
  isCurrent: () => boolean,
): Promise<PushSubscription> {
  const key = applicationServerKey(publicKey);
  let existing = await bounded(
    registration.pushManager.getSubscription(),
    10_000,
    "Checking the existing call notification subscription timed out",
  );
  const existingKey = existing?.options.applicationServerKey;
  if (existing && existingKey) {
    const left = new Uint8Array(existingKey);
    const right = new Uint8Array(key);
    const matches = left.length === right.length && left.every((byte, index) => byte === right[index]);
    if (!matches) {
      await existing.unsubscribe();
      existing = null;
    }
  }
  let acceptLateResult = true;
  const created = existing ? null : registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: key,
  });
  const pending = existing ? Promise.resolve(existing) : created!;
  // A platform push service (notably headless Chromium without GCM) can leave
  // subscribe pending forever. A late result must not bind an obsolete session.
  void pending.then(subscription => {
    if ((!acceptLateResult || !isCurrent()) && !existing) void subscription.unsubscribe().catch(() => {});
  }).catch(() => {});
  let subscription: PushSubscription;
  try {
    subscription = await bounded(
      pending,
      15_000,
      "This browser's push service did not create a call notification subscription",
    );
  } catch (error) {
    acceptLateResult = false;
    throw error;
  }
  if (!isCurrent()) {
    if (!existing) await subscription.unsubscribe().catch(() => {});
    throw new Error("Call notification session changed before the device could be registered");
  }
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 5_000);
  try {
    await request("/api/browser-push/subscriptions", {
      method: "POST",
      signal: controller.signal,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        subscription: subscription.toJSON(),
        installationId: pushInstallationId(),
      }),
    });
    if (!isCurrent()) {
      await request("/api/browser-push/subscriptions", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ installationId: pushInstallationId() }),
      }).catch(() => {});
      throw new Error("Call notification session changed before the device could be registered");
    }
  } catch (error) {
    if (controller.signal.aborted) throw new Error("Registering this browser for call notifications timed out");
    throw error;
  } finally {
    clearTimeout(timer);
  }
  return subscription;
}

/**
 * Initializes standard Web Push without prompting. A previously granted
 * permission is restored and rebound to the authenticated session; only
 * enable(), which is called from an explicit UI gesture, may prompt.
 */
export async function createBrowserCallPush(
  onRinging: (callId: string) => void,
  onTerminal: (callId: string, status: string) => void,
  sessionIsCurrent: () => boolean = () => true,
  onRenewalError: (reason: string) => void = () => {},
): Promise<BrowserCallPushSession> {
  const unsupported = capabilityReason();
  if (unsupported) {
    return {
      enabled: false,
      reason: unsupported,
      permission: "unsupported",
      enable: async () => { throw new Error(unsupported); },
      cleanup: async () => {},
    };
  }

  const config = await pushConfig();
  const publicKey = typeof config.publicKey === "string" ? config.publicKey.trim() : "";
  if (!config.enabled || !publicKey) {
    const reason = config.reason ?? "Background call notifications are not configured";
    return {
      enabled: false,
      reason,
      permission: Notification.permission,
      enable: async () => Notification.permission,
      cleanup: async () => {},
    };
  }

  let disposed = false;
  let registration: ServiceWorkerRegistration | null = null;
  const onWorkerMessage = (event: MessageEvent<WorkerCallMessage>) => {
    if (disposed || !sessionIsCurrent() || !event.data) return;
    if (event.data.type === "GDNA_PUSH_RENEWAL_FAILED") {
      onRenewalError("Call notification renewal failed. Enable call alerts again to restore background notifications.");
      return;
    }
    if (!CALL_ID.test(String(event.data.callId ?? ""))) return;
    const callId = String(event.data.callId);
    if (event.data.type === "GDNA_CALL_INVITATION") onRinging(callId);
    if (event.data.type === "GDNA_CALL_TERMINAL") {
      onTerminal(callId, typeof event.data.status === "string" ? event.data.status : "ended");
    }
  };
  navigator.serviceWorker.addEventListener("message", onWorkerMessage);

  const restore = async () => {
    registration ??= await canonicalWorker();
    if (!sessionIsCurrent() || disposed) throw new Error("Call notification session changed");
    if (Notification.permission === "granted") {
      await bindSubscription(registration, publicKey, () => sessionIsCurrent() && !disposed);
    }
  };
  try {
    await restore();
  } catch (error) {
    disposed = true;
    navigator.serviceWorker.removeEventListener("message", onWorkerMessage);
    throw error;
  }

  return {
    enabled: true,
    reason: Notification.permission === "denied"
      ? "Call notification permission was denied in browser settings"
      : undefined,
    permission: Notification.permission,
    async enable() {
      // This is deliberately the sole permission prompt in this module.
      const permission = Notification.permission === "default"
        ? await Notification.requestPermission()
        : Notification.permission;
      if (permission !== "granted") return permission;
      await restore();
      return permission;
    },
    async cleanup(revoke = false) {
      disposed = true;
      navigator.serviceWorker.removeEventListener("message", onWorkerMessage);
      if (!revoke) return;
      await request("/api/browser-push/subscriptions", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ installationId: pushInstallationId() }),
      }).catch(() => {});
    },
  };
}