const base = (import.meta.env.BASE_URL ?? "/").replace(/\/$/, "");
const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);
const xhrRequests = new WeakMap<XMLHttpRequest, { method: string; url: string }>();
let browserOnline = typeof navigator === "undefined" ? true : navigator.onLine;

export const OFFLINE_ACTION_BLOCKED_EVENT = "gdna:offline-action-blocked";

export class OfflineMutationError extends Error {
  readonly method: string;
  readonly url: string;

  constructor(method: string, url: string) {
    super("This action needs an internet connection.");
    this.name = "OfflineMutationError";
    this.method = method;
    this.url = url;
  }
}

function mutationMethod(method: string | undefined) {
  return !SAFE_METHODS.has((method ?? "GET").toUpperCase());
}

function reportBlockedMutation(method: string, url: string) {
  window.dispatchEvent(new CustomEvent(OFFLINE_ACTION_BLOCKED_EVENT, {
    detail: { method, url },
  }));
}

export function canPerformNetworkMutation(method = "POST", url = "") {
  if (browserOnline || !mutationMethod(method)) return true;
  reportBlockedMutation(method.toUpperCase(), url);
  return false;
}

/**
 * Installs one browser-wide transport boundary before React renders.
 * Reads remain available offline; writes fail before fetch/XHR can leave the app.
 */
export function installOfflineNetworkGuards() {
  const guardedWindow = window as typeof window & { __gdnaOfflineGuardsInstalled?: boolean };
  if (guardedWindow.__gdnaOfflineGuardsInstalled) return;
  guardedWindow.__gdnaOfflineGuardsInstalled = true;

  const setOnline = () => { browserOnline = true; };
  const setOffline = () => { browserOnline = false; };
  window.addEventListener("online", setOnline);
  window.addEventListener("offline", setOffline);

  const originalFetch = window.fetch.bind(window);
  window.fetch = ((input: RequestInfo | URL, init?: RequestInit) => {
    const method = (init?.method ?? (input instanceof Request ? input.method : "GET")).toUpperCase();
    const url = input instanceof Request ? input.url : String(input);
    if (!browserOnline && mutationMethod(method)) {
      reportBlockedMutation(method, url);
      return Promise.reject(new OfflineMutationError(method, url));
    }
    return originalFetch(input, init);
  }) as typeof window.fetch;

  const originalOpen = XMLHttpRequest.prototype.open;
  const guardedOpen = function (
    this: XMLHttpRequest,
    method: string,
    url: string | URL,
    async: boolean = true,
    username: string | null = null,
    password: string | null = null,
  ) {
    xhrRequests.set(this, { method: method.toUpperCase(), url: String(url) });
    return originalOpen.call(this, method, String(url), async, username, password);
  };
  XMLHttpRequest.prototype.open = guardedOpen as typeof XMLHttpRequest.prototype.open;

  const originalSend = XMLHttpRequest.prototype.send;
  XMLHttpRequest.prototype.send = function (
    this: XMLHttpRequest,
    body?: Document | XMLHttpRequestBodyInit | null,
  ) {
    const request = xhrRequests.get(this);
    if (!browserOnline && request && mutationMethod(request.method)) {
      reportBlockedMutation(request.method, request.url);
      queueMicrotask(() => {
        this.dispatchEvent(new ProgressEvent("error"));
        this.dispatchEvent(new ProgressEvent("loadend"));
      });
      return;
    }
    return originalSend.call(this, body);
  };

  window.addEventListener("unhandledrejection", event => {
    if (event.reason instanceof OfflineMutationError) event.preventDefault();
  });
}

/** Same-origin API path that continues to work when the artifact has a base path. */
export function apiPath(path: string): string {
  if (!path.startsWith("/api/")) throw new Error(`API paths must start with /api/: ${path}`);
  return `${base}${path}`;
}

export function websocketUrl(path = "/api/ws"): string {
  const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
  return `${protocol}//${window.location.host}${apiPath(path)}`;
}