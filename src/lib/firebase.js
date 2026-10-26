import { getApp, getApps, initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getMessaging, getToken as firebaseGetToken, onMessage, isSupported } from "firebase/messaging";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
};
export { firebaseConfig };

// Reuse the default app across HMR and the authenticated call client.
export const app = getApps().some(candidate => candidate.name === "[DEFAULT]")
  ? getApp()
  : initializeApp(firebaseConfig);
export const db = getFirestore(app);

// Unsupported browsers may still use Firestore wakeups and in-app
// WebSocket/TURN calls. `isSupported()` is asynchronous because IndexedDB,
// service-worker, and PushManager capability checks are asynchronous in some
// browsers; never let getMessaging throw during ordinary call startup.
const messagingEnvironmentSupported = typeof window !== "undefined"
  && "serviceWorker" in navigator
  && "PushManager" in window
  && "Notification" in window;

export const messaging = messagingEnvironmentSupported
  ? Promise.resolve().then(() => isSupported()).then(supported => supported ? getMessaging(app) : null).catch(() => null)
  : Promise.resolve(null);

export const getMessagingIfSupported = () => messaging;

export function getToken(messaging, options = {}) {
  return firebaseGetToken(messaging, {
    ...options,
    // Call-push config is server-owned and follows the active Firebase
    // project. Keep the environment value only as a local fallback; never
    // overwrite a replacement project's VAPID key with a stale build value.
    vapidKey: options.vapidKey ?? import.meta.env.VITE_FIREBASE_VAPID_KEY,
  });
}

export { onMessage };