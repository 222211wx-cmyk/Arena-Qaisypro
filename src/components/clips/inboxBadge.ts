/** Authenticated-only, visibility-aware polling for the standalone clip shell. */
export function mountInboxBadge(link: HTMLAnchorElement): () => void {
  let stopped = false;
  let pageHidden = false;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let request: AbortController | undefined;
  const badge = document.createElement("span");
  badge.className = "reels-badge";
  badge.setAttribute("aria-hidden", "true");
  badge.hidden = true;
  link.append(badge);

  function pause() {
    clearTimeout(timer);
    request?.abort();
    request = undefined;
  }
  async function refresh() {
    if (stopped || pageHidden || document.hidden || request) return;
    const controller = new AbortController();
    request = controller;
    try {
      const response = await fetch(`${import.meta.env.BASE_URL}api/messages/unread-count`, {
        credentials: "include", cache: "no-store", signal: controller.signal,
      });
      const data = await response.json();
      if (!response.ok || !Number.isSafeInteger(data.count) || data.count < 0) throw new Error("Unread count unavailable");
      if (controller.signal.aborted) return;
      badge.hidden = data.count === 0;
      badge.textContent = data.count > 99 ? "99+" : String(data.count);
      link.setAttribute("aria-label", data.count > 0 ? `Inbox, ${data.count} unread messages` : "Inbox, no unread messages");
      link.removeAttribute("title");
    } catch {
      if (!controller.signal.aborted) {
        badge.hidden = true;
        link.setAttribute("aria-label", "Inbox, unread count unavailable");
        link.title = "Unread count unavailable";
      }
    } finally {
      if (request === controller) {
        request = undefined;
        if (!stopped && !pageHidden && !document.hidden) timer = setTimeout(() => void refresh(), 30_000);
      }
    }
  }
  const visibility = () => { pause(); if (!document.hidden) void refresh(); };
  const pagehide = () => { pageHidden = true; pause(); };
  const pageshow = () => { pageHidden = false; void refresh(); };
  document.addEventListener("visibilitychange", visibility);
  window.addEventListener("pagehide", pagehide);
  window.addEventListener("pageshow", pageshow);
  void refresh();
  return () => {
    stopped = true; pause(); badge.remove();
    document.removeEventListener("visibilitychange", visibility);
    window.removeEventListener("pagehide", pagehide);
    window.removeEventListener("pageshow", pageshow);
  };
}