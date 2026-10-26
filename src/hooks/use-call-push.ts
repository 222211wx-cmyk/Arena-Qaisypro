import { useCallback, useEffect, useRef, useState } from "react";
import {
  createCallFirebase,
  fetchMissedCalls,
  markMissedCallsSeen as markSeen,
  type FirebaseStatus,
  type MissedCall,
  PUSH_LOGOUT_EVENT,
} from "@/lib/call-firebase";
import {
  createBrowserCallPush,
  type BrowserCallPushSession,
} from "@/lib/browser-call-push";

export function useCallPush(
  user: { id: number } | null,
  resumeCall: (callId: string) => void,
  terminalCall: (callId: string, status: string) => void,
) {
  const [firebaseStatus, setFirebaseStatus] = useState<FirebaseStatus>("loading");
  const [firebaseError, setFirebaseError] = useState<string | null>(null);
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission | "unsupported">(
    typeof Notification === "undefined" ? "unsupported" : Notification.permission,
  );
  const [pushEnabled, setPushEnabled] = useState(false);
  const [pushReason, setPushReason] = useState<string | null>(null);
  const [missedCalls, setMissedCalls] = useState<MissedCall[]>([]);
  const [missedCallsLoading, setMissedCallsLoading] = useState(false);
  const [missedCallsError, setMissedCallsError] = useState(false);
  const firebaseRef = useRef<Awaited<ReturnType<typeof createCallFirebase>> | null>(null);
  const browserPushRef = useRef<BrowserCallPushSession | null>(null);
  const browserBootstrapRef = useRef<(() => Promise<BrowserCallPushSession | null>) | null>(null);
  const pushCleanupRef = useRef<((revoke?: boolean) => Promise<void>) | null>(null);
  const sessionGenerationRef = useRef(0);
  const resumeRef = useRef(resumeCall);
  const terminalRef = useRef(terminalCall);
  resumeRef.current = resumeCall;
  terminalRef.current = terminalCall;

  useEffect(() => {
    const handleLogout = () => {
      // Logout is the only client lifecycle event that revokes a device. A
      // regular component/tab teardown intentionally leaves the registration
      // alive so background FCM remains available after a reload.
      const cleanup = pushCleanupRef.current;
      pushCleanupRef.current = null;
      const browserCleanup = browserPushRef.current?.cleanup;
      browserPushRef.current = null;
      browserBootstrapRef.current = null;
      sessionGenerationRef.current += 1;
      setPushEnabled(false);
      void cleanup?.(true);
      void browserCleanup?.(true);
    };
    window.addEventListener(PUSH_LOGOUT_EVENT, handleLogout);
    return () => window.removeEventListener(PUSH_LOGOUT_EVENT, handleLogout);
  }, []);

  useEffect(() => {
    let cancelled = false;
    const generation = ++sessionGenerationRef.current;
    const isCurrent = () => !cancelled && generation === sessionGenerationRef.current;
    let receivedSnapshot = false;
    // Never render one citizen's missed calls while the next Firebase session
    // is being established.
    setMissedCalls([]);
    setMissedCallsError(false);
    setPushEnabled(false);
    setPushReason(null);
    setNotificationPermission(typeof Notification === "undefined" ? "unsupported" : Notification.permission);
    if (!user) {
      setFirebaseStatus("disabled");
      setFirebaseError(null);
      setMissedCalls([]);
      setMissedCallsLoading(false);
      return;
    }
    setFirebaseStatus("loading");
    setFirebaseError(null);
    setMissedCallsLoading(true);
    const loadMissedCallsFromAuthority = async () => {
      try {
        const missed = await fetchMissedCalls();
        if (isCurrent() && !receivedSnapshot) {
          setMissedCalls(missed.items);
          setMissedCallsError(false);
        }
      } catch (error) {
        if (isCurrent() && !receivedSnapshot) {
          setMissedCallsError(true);
          setFirebaseError(error instanceof Error ? error.message : "Missed calls could not be loaded");
        }
      } finally {
        if (isCurrent()) setMissedCallsLoading(false);
      }
    };
    let browserPending: Promise<BrowserCallPushSession | null> | null = null;
    const loadStandardWebPush = (): Promise<BrowserCallPushSession | null> => {
      if (!isCurrent()) return Promise.resolve(null);
      if (browserPushRef.current) return Promise.resolve(browserPushRef.current);
      if (browserPending) return browserPending;
      browserPending = (async () => {
        try {
          const browserPush = await createBrowserCallPush(
            callId => { if (isCurrent()) resumeRef.current(callId); },
            (callId, status) => { if (isCurrent()) terminalRef.current(callId, status); },
            isCurrent,
            reason => {
              if (!isCurrent()) return;
              setPushEnabled(false);
              setPushReason(reason);
              setFirebaseStatus("error");
            },
          );
          if (!isCurrent()) {
            await browserPush.cleanup();
            return null;
          }
          browserPushRef.current = browserPush;
          setNotificationPermission(browserPush.permission);
          setPushEnabled(browserPush.enabled);
          setPushReason(browserPush.reason ?? null);
          setFirebaseStatus(browserPush.enabled ? "ready" : "disabled");
          return browserPush;
        } catch (error) {
          if (isCurrent()) {
            const reason = error instanceof Error ? error.message : "Browser call notification registration failed";
            setNotificationPermission(typeof Notification === "undefined" ? "unsupported" : Notification.permission);
            setPushEnabled(false);
            setPushReason(reason);
            setFirebaseStatus("error");
          }
          throw error;
        } finally {
          browserPending = null;
        }
      })();
      return browserPending;
    };
    // Keep a retry path even if creating the WebPush session itself fails.
    browserBootstrapRef.current = loadStandardWebPush;
    // Missed-call history must not wait for optional Firebase authentication or
    // Firestore snapshots (which may never arrive offline).
    void loadMissedCallsFromAuthority();
    void createCallFirebase(
      (callId, _fromName) => { if (isCurrent()) resumeRef.current(callId); },
      (callId, status) => { if (isCurrent()) terminalRef.current(callId, status); },
      items => {
        if (isCurrent()) {
          receivedSnapshot = true;
          setMissedCalls(items);
          setMissedCallsLoading(false);
          setMissedCallsError(false);
        }
      },
      error => {
        if (isCurrent()) {
          // A Firestore error is not a push registration error.
          receivedSnapshot = false;
          setFirebaseError(error.message);
          void loadMissedCallsFromAuthority();
        }
      },
    ).then(async firebase => {
      if (!isCurrent()) { if (firebase.enabled) await firebase.cleanup(); return; }
      firebaseRef.current = firebase;
      if (firebase.enabled) {
        // Observe optional history readiness separately; it must never gate
        // restoring an already-granted notification registration.
        void firebase.ready.catch(error => {
          if (!isCurrent()) return;
          receivedSnapshot = false;
          setFirebaseError(error instanceof Error ? error.message : "Firebase call history failed");
          void loadMissedCallsFromAuthority();
        });
      }
      if (!firebase.enabled || !firebase.pushEnabled) {
        // Unsupported/missing FCM capability also falls back, not only the
        // server's explicitly-disabled case. This path never prompts.
        await loadStandardWebPush();
        return;
      }
      setPushEnabled(firebase.pushEnabled);
      setPushReason(firebase.pushReason ?? null);
      setFirebaseStatus(typeof Notification !== "undefined" && Notification.permission === "granted" ? "loading" : "ready");
      // Permission prompts are only made by enableCallNotifications. A prior
      // grant, however, should restore this account's FCM registration.
      if (firebase.pushEnabled && typeof Notification !== "undefined" && Notification.permission === "granted") {
        const result = await firebase.enableMessaging(isCurrent);
        if (typeof result !== "string" && !isCurrent()) {
          await result.cleanup();
          return;
        }
        if (isCurrent() && typeof result !== "string") {
          pushCleanupRef.current = result.cleanup;
          setNotificationPermission(result.permission);
          setFirebaseStatus("ready");
        } else if (isCurrent() && typeof result === "string") {
          setNotificationPermission(result);
          setFirebaseStatus("ready");
          if (result === "denied") setPushReason("Call notification permission was denied in browser settings");
        }
      }
    }).catch(async error => {
      if (isCurrent()) {
        setFirebaseError(error instanceof Error ? error.message : "Firebase call notifications failed");
        // Initialization and granted-permission FCM registration errors both
        // get a standards-based fallback. Surface WebPush failures explicitly.
        await loadStandardWebPush().catch(() => {});
      }
    });
    return () => {
      cancelled = true;
      browserBootstrapRef.current = null;
      const pushCleanup = pushCleanupRef.current;
      pushCleanupRef.current = null;
      void pushCleanup?.();
      const firebase = firebaseRef.current;
      firebaseRef.current = null;
      if (firebase?.enabled) void firebase.cleanup();
      const browserPush = browserPushRef.current;
      browserPushRef.current = null;
      void browserPush?.cleanup();
    };
  }, [user?.id]);

  const enableCallNotifications = useCallback(async () => {
    const generation = sessionGenerationRef.current;
    const isCurrent = () => generation === sessionGenerationRef.current;
    const currentPermission = () => typeof Notification === "undefined" ? "unsupported" as const : Notification.permission;
    const registered = (permission: NotificationPermission | "unsupported") => {
      if (!isCurrent()) return permission;
      setNotificationPermission(permission);
      if (permission === "denied") {
        setPushReason("Call notification permission was denied in browser settings");
      } else if (permission === "granted") {
        setPushEnabled(true);
        setPushReason(null);
        setFirebaseStatus("ready");
      }
      return permission;
    };
    const enableBrowserPush = async () => {
      const browserPush = browserPushRef.current ?? await browserBootstrapRef.current?.();
      if (!isCurrent()) return currentPermission();
      if (!browserPush?.enabled) {
        const permission = browserPush?.permission ?? currentPermission();
        setNotificationPermission(permission);
        return permission;
      }
      const permission = await browserPush.enable();
      return registered(permission);
    };
    try {
      if (browserPushRef.current) return await enableBrowserPush();
      const firebase = firebaseRef.current;
      if (!firebase?.enabled || !firebase.pushEnabled) return await enableBrowserPush();
      if (pushCleanupRef.current) return currentPermission();
      try {
        const result = await firebase.enableMessaging(isCurrent);
        if (!isCurrent()) {
          if (typeof result !== "string") await result.cleanup();
          return currentPermission();
        }
        if (typeof result === "string") return registered(result);
        pushCleanupRef.current = result.cleanup;
        return registered(result.permission);
      } catch (error) {
        if (!isCurrent()) return currentPermission();
        setFirebaseError(error instanceof Error ? error.message : "Firebase call notification registration failed");
        return await enableBrowserPush();
      }
    } catch (error) {
      if (isCurrent()) {
        const reason = error instanceof Error ? error.message : "Background call notifications are unavailable";
        setNotificationPermission(currentPermission());
        setPushEnabled(false);
        setPushReason(reason);
        setFirebaseStatus("error");
      }
      return currentPermission();
    }
  }, []);

  const markMissedCallsSeen = useCallback(async (ids?: string[]) => {
    const selected = ids?.length ? ids : missedCalls.filter(item => !item.isSeen).map(item => item.id);
    if (!selected.length) return;
    await markSeen(selected);
    setMissedCalls(items => items.map(item => selected.includes(item.id) ? { ...item, isSeen: true } : item));
  }, [missedCalls]);

  const refreshMissedCalls = useCallback(async () => {
    if (!user) return;
    setMissedCallsLoading(true);
    setMissedCallsError(false);
    try {
      const missed = await fetchMissedCalls();
      setMissedCalls(missed.items);
    } catch (error) {
      setMissedCallsError(true);
      setFirebaseError(error instanceof Error ? error.message : "Missed calls could not be loaded");
    } finally {
      setMissedCallsLoading(false);
    }
  }, [user?.id]);

  return {
    firebaseStatus, firebaseError, notificationPermission, enableCallNotifications,
    missedCalls, missedCallCount: missedCalls.filter(item => !item.isSeen).length, markMissedCallsSeen,
    missedCallsLoading, missedCallsError, refreshMissedCalls,
    pushEnabled, pushReason,
  };
}