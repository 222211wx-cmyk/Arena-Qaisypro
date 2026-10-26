import { apiPath } from "./network";
import { registerFcm } from "@/client/lib/communication";

export type FirebaseStatus = "loading" | "disabled" | "ready" | "error";
/** Emitted only after the Arena session has actually logged out. */
export const PUSH_LOGOUT_EVENT = "gdna:auth-logout";
export interface MissedCall {
  id: string;
  caller: { id: number; name: string; avatar?: string | null };
  type: "video" | "voice";
  time: string | number;
  isSeen: boolean;
  status: string;
}

export interface IncomingGroupCallPush {
  groupCallId: string;
  roomId: number;
}

const MISSED_CALL_TYPES = new Set(["video", "voice"]);
const MISSED_CALL_STATUSES = new Set(["ringing", "answered", "declined", "missed", "ended"]);

function normalizeMissedTime(value: unknown): string | null {
  if (value && typeof (value as { toDate?: unknown }).toDate === "function") {
    const date = (value as { toDate(): Date }).toDate();
    return Number.isFinite(date.getTime()) ? date.toISOString() : null;
  }
  if (value && typeof (value as { toMillis?: unknown }).toMillis === "function") {
    const millis = (value as { toMillis(): number }).toMillis();
    return Number.isFinite(millis) ? new Date(millis).toISOString() : null;
  }
  if (typeof value === "number") return Number.isFinite(value) ? new Date(value).toISOString() : null;
  if (typeof value === "string" && Number.isFinite(Date.parse(value))) return new Date(value).toISOString();
  return null;
}

/** Validates the opaque wake-up identifiers before any group-call UI consumes them. */
export function parseIncomingGroupCallPush(value: unknown): IncomingGroupCallPush | null {
  if (!value || typeof value !== "object") return null;
  const data = value as Record<string, unknown>;
  if (data.type !== "INCOMING_GROUP_CALL" && data.event !== "INCOMING_GROUP_CALL") return null;
  const groupCallId = typeof data.groupCallId === "string"
    ? data.groupCallId
    : typeof data.group_call_id === "string"
      ? data.group_call_id
      : "";
  const rawRoomId = data.roomId ?? data.room_id;
  const roomId = typeof rawRoomId === "number"
    ? rawRoomId
    : typeof rawRoomId === "string" && /^\d+$/.test(rawRoomId) ? Number(rawRoomId) : NaN;
  return /^[A-Za-z0-9_-]{1,128}$/.test(groupCallId) && Number.isSafeInteger(roomId) && roomId > 0
    ? { groupCallId, roomId }
    : null;
}

/** Converts Firestore data to the API/UI shape; never expose a Timestamp object. */
export function parseMissedCall(id: string, value: unknown): MissedCall | null {
  if (!/^[A-Za-z0-9_-]{1,128}$/.test(id) || !value || typeof value !== "object") return null;
  const data = value as Record<string, unknown>;
  // callInvites/missedCalls is the canonical Firestore shape. The API still
  // returns the old nested caller shape in some deployments, so normalize both
  // at this boundary and keep the rest of the web UI canonical.
  const caller = data.caller && typeof data.caller === "object"
    ? data.caller as Record<string, unknown>
    : null;
  const rawCallerId = caller?.id ?? data.fromId;
  const callerId = typeof rawCallerId === "number"
    ? rawCallerId
    : typeof rawCallerId === "string" && rawCallerId.trim() !== ""
      ? Number(rawCallerId)
      : NaN;
  const callerName = typeof caller?.name === "string" ? caller.name : data.fromName;
  const type = data.type === "audio" ? "voice" : data.type;
  const seen = typeof data.seen === "boolean" ? data.seen : data.isSeen;
  const rawStatus = typeof data.status === "string" ? data.status : "missed";
  const status = rawStatus === "rejected"
    ? "declined"
    : rawStatus === "cancelled" || rawStatus === "expired"
      ? "missed"
      : rawStatus;
  if (!Number.isSafeInteger(callerId) || callerId < 0 || typeof callerName !== "string" ||
    !MISSED_CALL_TYPES.has(type as string) || typeof seen !== "boolean" ||
    !MISSED_CALL_STATUSES.has(status)) {
    return null;
  }
  const time = normalizeMissedTime(data.time);
  if (!time) return null;
  return {
    id,
    caller: {
      id: callerId,
      name: callerName,
      avatar: typeof caller?.avatar === "string"
        ? caller.avatar
        : typeof data.fromAvatar === "string" ? data.fromAvatar : null,
    },
    type: type as "video" | "voice",
    time,
    isSeen: seen,
    status,
  };
}

interface PushConfig {
  enabled: boolean;
  reason?: string;
  /** Durable call authority is independent from optional Firebase push. */
  callAuthorityReady?: boolean;
  /** Firestore readiness is independent from browser push readiness. */
  pushEnabled?: boolean;
  pushReason?: string;
  firebase?: { apiKey: string; authDomain: string; projectId: string; messagingSenderId: string; appId: string };
  vapidPublicKey?: string;
}

type FirebaseIdentity = {
  projectId?: unknown;
  appId?: unknown;
  messagingSenderId?: unknown;
};

function matchesFirebaseIdentity(left: FirebaseIdentity, right: FirebaseIdentity): boolean {
  return (["projectId", "appId", "messagingSenderId"] as const).every(key =>
    typeof left[key] === "string" &&
    left[key].trim() !== "" &&
    left[key] === right[key],
  );
}

export const PUSH_INSTALLATION_STORAGE_KEY = "gdna-fcm-installation-id";

export function pushInstallationId(): string {
  let storage: Storage | null = null;
  try {
    storage = typeof window !== "undefined" ? window.localStorage : null;
  } catch {
    // Storage may be unavailable in private browsing or an embedded document.
  }
  let existing: string | null = null;
  try {
    existing = storage?.getItem(PUSH_INSTALLATION_STORAGE_KEY) ?? null;
  } catch {
    // Storage may reject reads as well as writes in private browsing.
  }
  if (typeof existing === "string" && /^[A-Za-z0-9_-]{16,128}$/.test(existing)) {
    return existing;
  }
  const generated = typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
    ? crypto.randomUUID()
    : `gdna-${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
  try {
    storage?.setItem(PUSH_INSTALLATION_STORAGE_KEY, generated);
  } catch {
    // Private browsing can expose a storage object that rejects writes. The
    // registration still works for this session; it simply cannot be reused.
  }
  return generated;
}

/** Unmounts are not revocation; only an explicit authenticated logout is. */
export function shouldRevokePushRegistration(revoke = false): boolean {
  return revoke === true;
}

export function resolvePushCapability(
  serverPushEnabled: boolean | undefined,
  vapidPublicKey: string | undefined,
  messagingSupported: boolean,
  serverPushReason?: string,
): { enabled: boolean; reason?: string } {
  const hasVapid = typeof vapidPublicKey === "string" && vapidPublicKey.trim().length > 0;
  if (!hasVapid) {
    return {
      enabled: false,
      reason: serverPushReason ?? "Firebase web push VAPID key is not configured",
    };
  }
  if (serverPushEnabled !== true) {
    return {
      enabled: false,
      reason: serverPushReason ?? "Background call notifications are not configured",
    };
  }
  if (!messagingSupported) {
    return {
      enabled: false,
      reason: "Background call notifications are not supported by this browser (IndexedDB, Push API, and a service worker are required)",
    };
  }
  return { enabled: true };
}

const json = async <T,>(path: string, init?: RequestInit): Promise<T> => {
  const response = await fetch(apiPath(path), { credentials: "include", ...init });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error((body as { error?: string }).error ?? `Call push request failed: HTTP ${response.status}`);
  return body as T;
};

/** Wait for the config-bound worker, not Container.ready (which may be the PWA). */
function waitForMessagingWorker(
  registration: ServiceWorkerRegistration,
  scriptUrl: string,
): Promise<void> {
  return new Promise((resolve, reject) => {
    let settled = false;
    let watched: ServiceWorker | null = null;
    const finish = (error?: Error) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      registration.removeEventListener("updatefound", watch);
      watched?.removeEventListener("statechange", check);
      if (error) reject(error);
      else resolve();
    };
    const check = () => {
      if (registration.active?.state === "activated" && registration.active.scriptURL === scriptUrl) {
        finish();
      } else if (watched?.state === "redundant") {
        finish(new Error("The Firebase notification worker installation was rejected"));
      }
    };
    const watch = () => {
      watched?.removeEventListener("statechange", check);
      watched = registration.installing ?? registration.waiting ?? registration.active;
      watched?.addEventListener("statechange", check);
      check();
    };
    const timeout = setTimeout(() => finish(new Error("The Firebase notification worker did not become active")), 10_000);
    registration.addEventListener("updatefound", watch);
    watch();
  });
}

/**
 * Firebase is loaded only after the server confirms that this deployment is
 * configured. Keeping the SDK behind dynamic imports also keeps normal chat
 * startup independent from optional push infrastructure.
 */
export async function createCallFirebase(
  // `fromName` is advisory push metadata only. The callback intentionally
  // resumes by canonical callId; the authenticated websocket supplies the
  // caller identity before anything is rendered or answered.
  onRinging: (callId: string, fromName?: string) => void,
  onTerminal: (callId: string, status: string) => void,
  onMissedCalls: (items: MissedCall[]) => void,
  onSnapshotError: (error: Error) => void,
) {
  const config = await json<PushConfig>("/api/call-push/config");
  // FCM is an optional wake-up channel. When it is disabled, do not load the
  // Firebase SDK (or create a Firebase session) at all: live calls resume over
  // the authenticated websocket and missed calls come from the REST authority.
  // In particular, this must not be confused with durable call authority
  // readiness, which is reported separately by the config endpoint.
  if (!config.enabled || !config.firebase || config.pushEnabled === false) {
    const pushReason = config.pushReason ?? config.reason ?? "Background call notifications are optional";
    return {
      enabled: false as const,
      reason: pushReason,
      pushEnabled: false,
      pushReason,
    };
  }

  // The app module owns the one public Firebase app instance. Import it only
  // after the server confirms call-push is configured; this keeps optional
  // Firebase startup out of ordinary web sessions and avoids a second
  // initializeApp call.
  const { app, db, firebaseConfig, messaging: messagingReady, getToken, onMessage } = await import("./firebase");
  if (!matchesFirebaseIdentity(config.firebase, app.options) ||
    !matchesFirebaseIdentity(config.firebase, firebaseConfig)) {
    throw new Error("Firebase web configuration does not match the configured call project");
  }
  const messaging = await messagingReady;
  const pushCapability = resolvePushCapability(
    config.pushEnabled,
    config.vapidPublicKey,
    Boolean(messaging),
    config.pushReason,
  );
  let disposed = false;
  let cleanupAuth: (() => Promise<void>) | null = null;
  const unsubs: Array<() => void> = [];
  const callIds = new Set<string>();
  const activeUnsub = new Map<string, () => void>();
  // Firestore is an optional foreground/history channel, not a prerequisite for
  // an HTTP-session-bound FCM registration. Even its authentication may fail
  // without blocking background push or the authoritative WS/REST channels.
  const ready = (async () => {
    const [authSdk, firestoreSdk] = await Promise.all([
      import("firebase/auth"),
      import("firebase/firestore"),
    ]);
    if (disposed) return;
    const auth = authSdk.getAuth(app);
    await authSdk.setPersistence(auth, authSdk.inMemoryPersistence);
    if (disposed) return;
    const session = await json<{ customToken: string; userId: string }>("/api/call-push/session", { method: "POST" });
    if (disposed) return;
    await authSdk.signInWithCustomToken(auth, session.customToken);
    cleanupAuth = async () => {
      // An older cleanup must not sign a newly selected account out.
      if (auth.currentUser?.uid === session.userId) await authSdk.signOut(auth).catch(() => {});
    };
    if (disposed) { await cleanupAuth(); return; }
    let settleReady: (() => void) | null = null;
    let rejectReady: ((error: Error) => void) | null = null;
    const snapshotsReady = new Promise<void>((resolve, reject) => {
      settleReady = resolve;
      rejectReady = reject;
    });
    const readyQueries = new Set<string>();
    const snapshotReady = (query: string) => {
      readyQueries.add(query);
      if (readyQueries.size === 2) settleReady?.();
    };
    const snapshotFailed = (error: Error) => {
      if (disposed) return;
      onSnapshotError(error);
      rejectReady?.(error);
    };
    const watchCall = (callId: string) => {
      if (activeUnsub.has(callId)) return;
      const stop = firestoreSdk.onSnapshot(firestoreSdk.doc(db, "callInvites", callId), snap => {
        if (disposed) return;
        const data = snap.data();
        const status = data?.status;
        // A normally completed call stays durably `answered`; endedAt is the
        // canonical terminal marker and avoids rewriting the lifecycle status.
        const ended = data?.endedAt != null;
        if (ended || (typeof status === "string" && ["declined", "missed", "ended"].includes(status))) {
          activeUnsub.get(callId)?.();
          activeUnsub.delete(callId);
          callIds.delete(callId);
          onTerminal(callId, ended ? "ended" : status as string);
        }
      }, error => {
        activeUnsub.delete(callId);
        if (!disposed) onSnapshotError(error);
      });
      activeUnsub.set(callId, stop);
    };

    const callsQuery = firestoreSdk.query(
      firestoreSdk.collection(db, "callInvites"),
      // Firebase rules and the server store identity claims as numbers.
      firestoreSdk.where("toId", "==", Number(session.userId)),
      firestoreSdk.where("status", "==", "ringing"),
    );
    unsubs.push(firestoreSdk.onSnapshot(callsQuery, snapshot => {
      if (disposed) return;
      snapshot.docChanges().forEach(change => {
        if (change.type === "removed") return;
        const id = change.doc.id;
        if (callIds.has(id)) return;
        callIds.add(id);
        watchCall(id);
        // A Firestore document is only a wake-up signal. The WS resume endpoint
        // returns the authenticated, authoritative invitation envelope.
        onRinging(id);
      });
      snapshotReady("calls");
    }, snapshotFailed));

    const missedQuery = firestoreSdk.query(
      firestoreSdk.collection(db, "users", String(session.userId), "missedCalls"),
      firestoreSdk.orderBy("time", "desc"),
      firestoreSdk.limit(100),
    );
    unsubs.push(firestoreSdk.onSnapshot(missedQuery, snapshot => {
      if (disposed) return;
      const items = snapshot.docs
        .map(doc => parseMissedCall(doc.id, doc.data()))
        .filter((item): item is MissedCall => item !== null)
        .sort((left, right) => Date.parse(right.time as string) - Date.parse(left.time as string));
      onMissedCalls(items);
      snapshotReady("missed");
    }, snapshotFailed));
    await snapshotsReady;
  })();
  // The caller observes errors separately; avoid an unhandled rejection if the
  // optional session fails before its promise is consumed.
  void ready.catch(() => {});

  return {
    enabled: true as const,
    pushEnabled: pushCapability.enabled,
    pushReason: pushCapability.reason,
    vapidPublicKey: config.vapidPublicKey,
    ready,
    async enableMessaging(sessionIsCurrent: () => boolean = () => true) {
      if (!("Notification" in window)) throw new Error("Notifications are not supported by this browser");
      if (!pushCapability.enabled) {
        throw new Error(
          pushCapability.reason
            ?? "Background call notifications are not supported by this browser (IndexedDB, Push API, and a service worker are required)",
        );
      }
      if (!messaging || !getToken || !onMessage) {
        throw new Error("Background call notifications are not supported by this browser (IndexedDB, Push API, and a service worker are required)");
      }
      if (disposed || !sessionIsCurrent()) throw new Error("Call notification session changed");
      const permission = Notification.permission === "default"
        ? await Notification.requestPermission()
        : Notification.permission;
      if (permission !== "granted") return permission;
      if (disposed || !sessionIsCurrent()) throw new Error("Call notification session changed");
      const serviceWorkerUrl = new URL(`${import.meta.env.BASE_URL ?? "/"}firebase-messaging-sw.js`, window.location.origin);
      // This is Firebase's public web configuration, not a credential. Passing
      // it makes background handler initialization synchronous on a cold start.
      serviceWorkerUrl.searchParams.set("firebaseConfig", JSON.stringify(firebaseConfig));
      serviceWorkerUrl.searchParams.set("vapidPublicKey", config.vapidPublicKey ?? "");
      // The config query is part of the worker script URL, so a replacement
      // Firebase project produces a new worker script URL and replaces an old
      // registration instead of reusing its cached project config. Disable
      // the HTTP cache and force the update before asking Firebase for a token
      // so getToken cannot bind a new token to a stale worker.
      const registrationUrl = serviceWorkerUrl.toString();
      const registration = await navigator.serviceWorker.register(registrationUrl, {
        // FCM must never replace the canonical offline/WebPush PWA worker.
        scope: new URL("firebase-cloud-messaging-push-scope/", new URL("./", serviceWorkerUrl)).pathname,
        updateViaCache: "none",
      });
      if (typeof registration.update === "function") await registration.update();
      await waitForMessagingWorker(registration, registrationUrl);
      if (disposed || !sessionIsCurrent()) throw new Error("Call notification session changed");
      let token = await getToken(messaging, {
        vapidKey: config.vapidPublicKey,
        serviceWorkerRegistration: registration,
      });
      if (!token) throw new Error("Firebase did not create a call notification token");
      if (disposed || !sessionIsCurrent()) throw new Error("Call notification session changed");
      // Keep one browser installation stable across reloads. This avoids
      // leaking a new Firestore device row every time a tab mounts while still
      // allowing the server to revoke it on a real logout/session revocation.
      const installationId = pushInstallationId();
      const registerToken = async (revoke = false) => {
        // Keep installation/focus fields in the central registration payload;
        // the API derives the authenticated account/session binding itself.
        const registration = {
          token,
          installationId,
          focused: document.visibilityState === "visible",
          revoke,
        };
        return registerFcm(registration);
      };
      await registerToken();
      if (disposed || !sessionIsCurrent()) throw new Error("Call notification session changed");
      const updateFocus = () => {
        if (disposed || !sessionIsCurrent()) return;
        // Firebase v9 refreshes tokens through getToken rather than an
        // onTokenRefresh callback. Re-check on foreground and re-register a
        // rotated token against the same installation.
        void getToken(messaging, {
          vapidKey: config.vapidPublicKey,
          serviceWorkerRegistration: registration,
        }).then(nextToken => {
          if (!disposed && sessionIsCurrent() && nextToken && nextToken !== token) {
            token = nextToken;
            void registerToken();
          }
        }).catch(() => {});
        void json("/api/call-push/focus", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ installationId, focused: document.visibilityState === "visible" }),
        }).catch(() => {});
      };
      document.addEventListener("visibilitychange", updateFocus);
      const stopMessage = onMessage(messaging, payload => {
        if (disposed || !sessionIsCurrent()) return;
        if (payload.data?.type === "NEW_MESSAGE" || payload.data?.event === "NEW_MESSAGE") {
          // A focused tab already owns the private message UI. Ask the
          // messenger to refresh its authoritative room state instead of
          // duplicating private content in a second foreground notification.
          const roomId = payload.data.roomId;
          const messageId = payload.data.messageId;
          window.dispatchEvent(new CustomEvent("gdna:chat-push", {
            detail: {
              roomId: typeof roomId === "string" ? roomId : undefined,
              messageId: typeof messageId === "string" ? messageId : undefined,
            },
          }));
          return;
        }
        const groupWakeUp = parseIncomingGroupCallPush(payload.data);
        if (groupWakeUp) {
          // This is a wake-up only. GroupCallProvider fetches the authenticated
          // durable invitation; it never trusts FCM participant data or answers
          // from a foreground notification.
          window.dispatchEvent(new CustomEvent("gdna:group-call-push", { detail: groupWakeUp }));
          return;
        }
        const callId = payload.data?.callId || payload.data?.roomId;
        if (!callId) return;
        const fromName = payload.data?.fromName || payload.data?.callerName;
        if (payload.data?.type === "INCOMING_CALL") {
          // Push identity is never trusted. It is passed only as optional
          // context while the callback performs an authenticated WS resume.
          onRinging(callId, typeof fromName === "string" ? fromName : undefined);
        }
        if (payload.data?.type === "CALL_ENDED") onTerminal(callId, "ended");
        if (payload.data?.type === "MISSED_CALL") {
          void fetchMissedCalls()
            .then(result => onMissedCalls(result.items))
            .catch(error => onSnapshotError(error instanceof Error ? error : new Error("Missed calls could not be loaded")));
        }
      });
      return {
        permission,
        cleanup: async (revoke = false) => {
          document.removeEventListener("visibilitychange", updateFocus);
          stopMessage();
          // A tab closing, route change, HMR remount, or account hook
          // re-render must not unregister a still-valid browser token. The
          // authenticated logout path emits PUSH_LOGOUT_EVENT and passes
          // revoke=true; the API also revokes session-bound devices server-side.
          if (shouldRevokePushRegistration(revoke)) {
            await registerToken(true).catch(() => {});
          }
        },
      };
    },
    cleanup: async () => {
      disposed = true;
      activeUnsub.forEach(stop => stop());
      unsubs.forEach(stop => stop());
      await cleanupAuth?.();
    },
  };
}

export async function fetchMissedCalls(): Promise<{ items: MissedCall[]; unseenCount: number }> {
  return json("/api/call-push/missed");
}

export async function markMissedCallsSeen(ids: string[]): Promise<void> {
  await json("/api/call-push/missed/seen", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ids }),
  });
}