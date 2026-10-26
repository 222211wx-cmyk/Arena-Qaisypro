/** Shared diagnostics for every API fetch, including legacy callers using BASE_URL. */
export async function readApiJson(response: Response): Promise<unknown> {
  const type = response.headers.get("content-type") ?? "";
  const text = await response.text();
  if (!text.trim() && response.status === 204) return null;
  if (type.includes("text/html") || text.trimStart().startsWith("<")) {
    throw new Error(`API returned HTML instead of JSON (HTTP ${response.status}). Check API routing and backend deployment.`);
  }
  try {
    return JSON.parse(text);
  } catch {
    // Do not expose an upstream HTML page, credentials, or arbitrary response body.
    throw new Error(`API returned invalid JSON (HTTP ${response.status}). Check the backend response.`);
  }
}

export function apiOrigin(): string {
  const value = import.meta.env.VITE_API_URL?.trim();
  if (!value) return "";
  const parsed = new URL(value);
  if (parsed.protocol !== "https:" && !(import.meta.env.DEV && parsed.protocol === "http:")) {
    throw new Error("VITE_API_URL must be an HTTPS origin (HTTP is allowed in development only).");
  }
  if (parsed.pathname !== "/" || parsed.search || parsed.hash || parsed.username || parsed.password) {
    throw new Error("VITE_API_URL must be an origin only, without a path or credentials.");
  }
  return parsed.origin;
}

export function installApiTransport() {
  const target = window as Window & { __arenaApiTransport?: boolean };
  if (target.__arenaApiTransport) return;
  const originalFetch = window.fetch.bind(window);
  const origin = apiOrigin();
  const base = (import.meta.env.BASE_URL ?? "/").replace(/\/$/, "");
  const prefix = `${base}/api/`;
  window.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = new URL(input instanceof Request ? input.url : String(input), location.origin);
    const localApi = url.origin === location.origin && url.pathname.startsWith(prefix);
    const remoteApi = !!origin && url.origin === origin && url.pathname.startsWith("/api/");
    let request = input;
    if (localApi && origin) {
      const destination = `${origin}${url.pathname.slice(base.length)}${url.search}`;
      request = input instanceof Request ? new Request(destination, input) : destination;
    }
    const response = await originalFetch(request, init);
    if (localApi || remoteApi) {
      response.json = () => readApiJson(response);
    }
    return response;
  }) as typeof window.fetch;
  target.__arenaApiTransport = true;
}
