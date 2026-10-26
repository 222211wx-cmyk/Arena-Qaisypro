/**
 * Vanilla-shell bridge. No React, call SDK, or app stylesheet enters the static
 * Lite/Clips graph. Only an authoritative signed-in session loads the island.
 */
type CallRoot = { dispose: () => void };
type Boundary = { setAccount: (accountId: number | null) => void; dispose: () => void };

const boundaries = new WeakMap<HTMLElement, Boundary>();
const base = import.meta.env.BASE_URL.replace(/\/$/, "");

export function createLightweightCallBoundary(host: HTMLElement): Boundary {
  const existing = boundaries.get(host);
  if (existing) return existing;

  let disposed = false;
  let accountId: number | null = null;
  let generation = 0;
  let callRoot: CallRoot | null = null;
  let islandHost: HTMLDivElement | null = null;
  let sessionRequest: AbortController | null = null;

  function clearRoot() {
    callRoot?.dispose();
    callRoot = null;
    islandHost?.remove();
    islandHost = null;
  }

  function loadController() {
    if (disposed || accountId === null) return;
    const expectedGeneration = ++generation;
    clearRoot();
    // Keep this import in its own control-flow branch, never together with the
    // full App import (Vite otherwise merges heavy preload dependencies).
    void import("./lightweight-call-root").then(module => {
      if (disposed || expectedGeneration !== generation || accountId === null) return;
      islandHost = document.createElement("div");
      islandHost.dataset.globalCallRoot = "true";
      islandHost.className = "dark global-call-session";
      host.append(islandHost);
      callRoot = module.mountLightweightCallRoot(islandHost);
    }).catch(error => {
      if (disposed || expectedGeneration !== generation) return;
      console.error("Incoming call controller could not load", error);
      clearRoot();
      islandHost = document.createElement("div");
      islandHost.setAttribute("role", "alert");
      islandHost.dataset.globalCallError = "true";
      const message = document.createElement("p");
      message.textContent = "Incoming calls are unavailable. Please reconnect and retry.";
      const retry = document.createElement("button");
      retry.type = "button";
      retry.textContent = "Retry incoming calls";
      retry.onclick = loadController;
      islandHost.append(message, retry);
      host.append(islandHost);
    });
  }

  function setAccount(nextId: number | null) {
    if (disposed) return;
    // A shell login/logout notification supersedes any older foreground check.
    sessionRequest?.abort();
    sessionRequest = null;
    if (nextId === accountId) return;
    accountId = nextId;
    ++generation;
    clearRoot();
    if (accountId !== null) loadController();
  }

  // Foreground/reconnect checks also catch cookie login/logout in another
  // shell or tab, without background polling or a guest call-SDK download.
  async function refreshAccount() {
    if (disposed || !navigator.onLine) return;
    sessionRequest?.abort();
    const request = new AbortController();
    sessionRequest = request;
    const timeout = window.setTimeout(() => request.abort(), 12_000);
    try {
      const response = await fetch(`${base}/api/auth/me`, {
        credentials: "include", cache: "no-store", signal: request.signal,
      });
      if (disposed || request.signal.aborted) return;
      if (response.status === 401) {
        setAccount(null);
      } else if (response.ok) {
        const user = await response.json();
        if (!disposed && !request.signal.aborted && Number.isSafeInteger(user?.id)) setAccount(user.id);
      } else {
        console.error("Incoming call session check failed:", response.status);
      }
    } catch (error) {
      if (!request.signal.aborted) console.error("Incoming call session check failed", error);
    } finally {
      window.clearTimeout(timeout);
      if (sessionRequest === request) sessionRequest = null;
    }
  }

  const onForeground = () => {
    if (document.visibilityState === "visible") void refreshAccount();
  };
  const onOnline = () => void refreshAccount();
  const onPageShow = (event: PageTransitionEvent) => {
    if (event.persisted) void refreshAccount();
  };
  const onPageHide = (event: PageTransitionEvent) => {
    if (!event.persisted) boundary.dispose();
  };
  document.addEventListener("visibilitychange", onForeground);
  window.addEventListener("online", onOnline);
  window.addEventListener("pageshow", onPageShow);
  window.addEventListener("pagehide", onPageHide);

  const boundary: Boundary = {
    setAccount,
    dispose() {
      if (disposed) return;
      disposed = true;
      ++generation;
      sessionRequest?.abort();
      clearRoot();
      document.removeEventListener("visibilitychange", onForeground);
      window.removeEventListener("online", onOnline);
      window.removeEventListener("pageshow", onPageShow);
      window.removeEventListener("pagehide", onPageHide);
      boundaries.delete(host);
    },
  };
  boundaries.set(host, boundary);
  return boundary;
}