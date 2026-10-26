/**
 * Cookie-session invalidation only. Messages are hints, never identity or tokens:
 * every consumer must verify /auth/me. Keep Lite's existing transport names.
 */
const CHANNEL = "gdna-lite:account";
const LAST_ACCOUNT = "gdna-lite:last-account";
const EVENT_KEY = "gdna-lite:account-event";
const listeners = new Set<() => void>();
let channel: BroadcastChannel | null = null;
let stopTransport: (() => void) | null = null;
let timer: ReturnType<typeof setTimeout> | undefined;
let lastEvent: string | undefined;

function receive(eventId?: string) {
  if (eventId && eventId === lastEvent) return;
  if (eventId) lastEvent = eventId;
  // Legacy Lite emits both storage and channel messages. Coalesce that pair.
  if (timer !== undefined) return;
  timer = setTimeout(() => {
    timer = undefined;
    listeners.forEach(listener => listener());
  }, 80);
}

function connect() {
  if (stopTransport || typeof window === "undefined") return;
  try {
    if (typeof BroadcastChannel !== "undefined") channel = new BroadcastChannel(CHANNEL);
  } catch { /* Storage events still work when channels are unavailable. */ }
  if (channel) channel.onmessage = event => {
    if (event.data?.type === "account-change") receive(event.data.eventId);
  };
  const onStorage = (event: StorageEvent) => {
    if (event.key === LAST_ACCOUNT) receive();
    if (event.key === EVENT_KEY && event.newValue) receive(event.newValue);
  };
  window.addEventListener("storage", onStorage);
  stopTransport = () => {
    window.removeEventListener("storage", onStorage);
    channel?.close();
    channel = null;
    if (timer !== undefined) clearTimeout(timer);
    timer = undefined;
    stopTransport = null;
  };
}

export function subscribeAccountChanges(listener: () => void): () => void {
  listeners.add(listener);
  connect();
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0) stopTransport?.();
  };
}

/** Call only after a confirmed mutation or a verified identity change. */
export function announceAccountChange(accountId?: number | null): void {
  const eventId = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  lastEvent = eventId;
  try {
    // Backward compatibility for old Lite tabs; never consume this as identity.
    if (accountId === null) localStorage.removeItem(LAST_ACCOUNT);
    else if (accountId !== undefined) localStorage.setItem(LAST_ACCOUNT, String(accountId));
    localStorage.setItem(EVENT_KEY, eventId);
  } catch { /* Cookies and channel transport do not require localStorage. */ }
  try {
    const sender = channel ?? new BroadcastChannel(CHANNEL);
    sender.postMessage({ type: "account-change", eventId });
    if (sender !== channel) sender.close();
  } catch { /* Storage transport covers browsers without BroadcastChannel. */ }
}

/** Foreground hints do not announce account changes or reload the page. */
export function subscribeSessionWake(refresh: () => void): () => void {
  let queued: ReturnType<typeof setTimeout> | undefined;
  const wake = () => {
    if (document.visibilityState === "hidden" || queued !== undefined) return;
    queued = setTimeout(() => { queued = undefined; refresh(); }, 80);
  };
  window.addEventListener("focus", wake);
  window.addEventListener("pageshow", wake);
  window.addEventListener("online", wake);
  document.addEventListener("visibilitychange", wake);
  return () => {
    window.removeEventListener("focus", wake);
    window.removeEventListener("pageshow", wake);
    window.removeEventListener("online", wake);
    document.removeEventListener("visibilitychange", wake);
    if (queued !== undefined) clearTimeout(queued);
  };
}

// Clips' feed and composer share only an in-flight check, never a cached identity.
let clipSessionFlight: Promise<Response> | null = null;
export async function fetchSharedClipSession(): Promise<Response> {
  if (!clipSessionFlight) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 12_000);
    const base = (import.meta.env.BASE_URL ?? "/").replace(/\/$/, "");
    const flight = fetch(`${base}/api/auth/me`, {
      credentials: "include", cache: "no-store", signal: controller.signal,
    }).finally(() => {
      clearTimeout(timer);
      if (clipSessionFlight === flight) clipSessionFlight = null;
    });
    clipSessionFlight = flight;
  }
  return (await clipSessionFlight).clone();
}