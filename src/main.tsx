import { installApiTransport } from "./lib/api-transport";
import { getAutoLiteReferral, getNetworkState, shouldAutoRedirectToLite } from "./lib/network-detect";

installApiTransport();

const base = import.meta.env.BASE_URL.replace(/\/$/, "");
const rawRoute = window.location.pathname.slice(base.length) || "/";
const route = rawRoute.length > 1 ? rawRoute.replace(/\/+$/, "") : rawRoute;
const clipCode = route.match(/^\/clip\/(HELX-\d{6})$/)?.[1] ?? route.match(/^\/clips\/([1-9]\d*)$/)?.[1];
const isClipRoute = route === "/clip" || route === "/clips" || route === "/publish";
const isPartnerLiteRoute = route === "/partners/operators" || route === "/partners/dashboard";
const autoLiteReferral = getAutoLiteReferral(window.location.search);

function safeLocalReturnPath(pathname: string, search: string): string {
  // Reject protocol-relative and backslash-shaped destinations even though this
  // value currently comes from Location. This keeps `from` safe if a downstream
  // Lite page later exposes it as a return link.
  if (!pathname.startsWith("/") || pathname.startsWith("//") || pathname.includes("\\")) return "/";
  return pathname + search;
}

function showClipStartupError() {
  showStartupError("تعذر تشغيل صفحة الكليبز. تحقق من الاتصال وحاول مجدداً.", "clip");
}

function showStartupError(messageText: string, surface: string) {
  const root = document.getElementById("root");
  if (!root) return;
  root.innerHTML = "";
  const main = document.createElement("main");
  main.dir = "rtl";
  main.setAttribute("data-testid", `${surface}-startup-error`);
  const message = document.createElement("p");
  message.setAttribute("role", "alert");
  message.textContent = messageText;
  const retry = document.createElement("button");
  retry.type = "button";
  retry.setAttribute("data-testid", `${surface}-startup-retry`);
  retry.textContent = "إعادة المحاولة";
  retry.addEventListener("click", () => window.location.reload());
  main.append(message, retry);
  root.append(main);
}

// Keep these imports in distinct branches. A conditional import expression makes
// Vite merge both dependency lists and eagerly fetch the App stylesheet.
if (route === "/lite" || route.startsWith("/lite/") || isPartnerLiteRoute) {
  if ("serviceWorker" in navigator) {
    void navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`, { scope: import.meta.env.BASE_URL })
      .catch(error => console.error("Lite offline installation failed", error));
  }
  void import("./lite-entry").then(module => module.mountLite(document.getElementById("root")!)).catch(error => {
    console.error("Lite startup failed", error);
    const root = document.getElementById("root");
    if (root) root.textContent = "Unable to open Lite. Please reconnect and reload.";
  });
} else if (shouldAutoRedirectToLite(route, getNetworkState().forceLiteMode, autoLiteReferral, location.search)) {
  const query = new URLSearchParams();
  query.set("from", safeLocalReturnPath(route, location.search));
  if (autoLiteReferral !== null) query.set("ref", autoLiteReferral);
  window.location.replace(`${base}/lite?${query.toString()}`);
} else if (clipCode) {
  void import("./clip-player-entry").then(module => module.renderClipPlayer(clipCode)).catch(showClipStartupError);
} else if (isClipRoute) {
  void import("./clip-entry").catch(showClipStartupError);
} else {
  void import("./app-entry").catch(error => {
    console.error("Application startup failed", error);
    showStartupError("تعذر تحميل الصفحة. تحقق من الاتصال واضغط إعادة المحاولة. لن تُحذف رسائلك أو مفاتيح التشفير.", "app");
  });
}
