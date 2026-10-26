/* Runs synchronously in the head, before the browser discovers a manifest or
 * dispatches beforeinstallprompt. No React dependency on the Clips route. */
(() => {
  const base = new URL(document.currentScript.src).pathname.replace(/section-pwa\.js$/, "");
  const names = {
    clips: { manifest: "manifest-clips.json", icon: "clips-apple-180.png", title: "ARENA Clips" },
    messages: { manifest: "manifest-messages.json", icon: "messages-apple-180.png", title: "Hm Messages" },
    default: { manifest: "manifest.json", icon: "lite-icon-192.png", title: "ARENA" },
  };
  const current = () => {
    const pathname = location.pathname;
    if (!pathname.startsWith(base)) return "default";
    const route = (pathname.slice(base.length - 1) || "/").replace(/\/+$/, "") || "/";
    if (route === "/clips" || route === "/clip" || /^\/clip\/HELX-\d{6}$/.test(route)) return "clips";
    if (route === "/messages.call" || route === "/message-calle" || route === "/messages" || route === "/messagerie" ||
        route === "/message%20calle" || route === "/message calle" || route.startsWith("/messages/")) return "messages";
    if ((route === "/login" || route === "/register") &&
        /^\/(?:messages\.call|message-calle|messages|messagerie|message(?:%20| )calle)(?:[?#]|$)/.test(new URLSearchParams(location.search).get("next") || "")) return "messages";
    return "default";
  };
  const manifest = document.createElement("link");
  manifest.rel = "manifest";
  const apple = document.createElement("link");
  apple.rel = "apple-touch-icon";
  apple.sizes = "180x180";
  const appleTitle = document.querySelector('meta[name="apple-mobile-web-app-title"]');
  let section = current();
  let pending = null;
  const update = () => {
    const next = current();
    if (next !== section) pending = null; // A prompt belongs to its original manifest.
    section = next;
    manifest.href = base + names[next].manifest;
    apple.href = base + names[next].icon;
    if (appleTitle) appleTitle.content = names[next].title;
  };
  update();
  document.head.append(manifest, apple);
  for (const method of ["pushState", "replaceState"]) {
    const original = history[method];
    history[method] = function (...args) {
      const result = original.apply(this, args);
      update();
      return result;
    };
  }
  window.addEventListener("popstate", update);
  window.addEventListener("beforeinstallprompt", event => {
    if (section === "default") return;
    event.preventDefault();
    pending = { event, section };
  });
  window.addEventListener("appinstalled", () => { pending = null; });
  window.__gdnaSectionInstall = {
    current,
    async request(target) {
      if (target !== "clips" && target !== "messages") return "unsupported";
      // The installable document must be the intended section. In particular,
      // never prompt with the root Lite or the other section's manifest.
      if (current() !== target) {
        location.assign(base + target);
        return "navigating";
      }
      if (window.matchMedia?.("(display-mode: standalone)").matches ||
          navigator.standalone === true) return "standalone";
      if (/iPad|iPhone|iPod/i.test(navigator.userAgent)) return "ios";
      const captured = pending;
      if (!captured || captured.section !== target) return "unsupported";
      pending = null; // browser events are single-use
      try {
        await captured.event.prompt();
        const choice = await captured.event.userChoice;
        return choice?.outcome === "accepted" ? "accepted" : "dismissed";
      } catch {
        return "unsupported";
      }
    },
  };
})();