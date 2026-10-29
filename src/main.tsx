import { installApiTransport } from "./lib/api-transport";
import { debugEnv } from "./lib/debugEnv";

debugEnv();
installApiTransport();

const base = import.meta.env.BASE_URL.replace(/\/$/, "");
const rawRoute = window.location.pathname.slice(base.length) || "/";
const route = rawRoute.length > 1 ? rawRoute.replace(/\/+$/, "") : rawRoute;
const clipCode = route.match(/^\/clip\/(HELX-\d{6})$/)?.[1] ?? route.match(/^\/clips\/([1-9]\d*)$/)?.[1];
const isClipRoute = route === "/clip" || route === "/clips" || route === "/publish";
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
// Old Lite bookmarks now open the full Arena home; keep referral parameters.
if (route === "/lite" || route.startsWith("/lite/")) {
  window.history.replaceState(null, "", `${base}/${location.search}${location.hash}`);
}
// Full Arena is independent of keys, connection speed, and referral parameters.
if (clipCode) {
  void import("./clip-player-entry").then(module => module.renderClipPlayer(clipCode)).catch(showClipStartupError);
} else if (isClipRoute) {
  void import("./clip-entry").catch(showClipStartupError);
} else {
  void import("./app-entry").catch(error => {
    console.error("Application startup failed", error);
    showStartupError("تعذر تحميل الصفحة. تحقق من الاتصال واضغط إعادة المحاولة. لن تُحذف رسائلك أو مفاتيح التشفير.", "app");
  });
}

// One shared local translation control for React and standalone clip surfaces.
void import('./lib/clone-translation').then(({mountCloneTranslation})=>mountCloneTranslation());
