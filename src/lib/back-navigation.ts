import { useEffect, useRef } from "react";
import { registerNavigationLayer, clearForwardSteps } from "./navigation-layers";
export { closeBackLayer, navigateForward } from "./navigation-layers";

export function useBackLayer(active: boolean, back: () => void, priority = 10, forward?: () => void) {
  const action = useRef({ active, back, forward });
  action.current = { active, back, forward };
  useEffect(() => {
    return registerNavigationLayer({
      priority, active: () => action.current.active,
      back: () => {
        const restore = action.current.forward;
        action.current.back();
        return restore;
      },
    });
  }, [priority]);
}

const KEY = "__arenaNavigationDepth";
export function navigationDepth(): number {
  return Number(history.state?.[KEY]) || 0;
}

/** Mark only this app's history, so a direct launch never backs into another site. */
export function trackAppHistory() {
  const push = history.pushState;
  const replace = history.replaceState;
  let initialDepth = navigationDepth();
  if (!initialDepth && document.referrer) {
    try {
      if (new URL(document.referrer).origin === location.origin) initialDepth = 1;
    } catch { /* A direct/invalid referrer is not an app history entry. */ }
  }
  replace.call(history, { ...history.state, [KEY]: initialDepth }, "");
  const trackedPush: History["pushState"] = function (state, unused, url) {
    clearForwardSteps();
    push.call(history, { ...state, [KEY]: navigationDepth() + 1 }, unused, url);
  };
  const trackedReplace: History["replaceState"] = function (state, unused, url) {
    replace.call(history, { ...state, [KEY]: navigationDepth() }, unused, url);
  };
  history.pushState = trackedPush;
  history.replaceState = trackedReplace;
  window.addEventListener("popstate", clearForwardSteps);
  return () => {
    window.removeEventListener("popstate", clearForwardSteps);
    if (history.pushState === trackedPush) history.pushState = push;
    if (history.replaceState === trackedReplace) history.replaceState = replace;
  };
}