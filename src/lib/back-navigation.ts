import { useEffect, useRef } from "react";
import { registerNavigationLayer, clearForwardSteps, recordAppDepth, resetAppDepth } from "./navigation-layers";
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
  resetAppDepth(initialDepth);
  replace.call(history, { ...history.state, [KEY]: initialDepth }, "");
  const trackedPush: History["pushState"] = function (state, unused, url) {
    clearForwardSteps();
    const depth = navigationDepth() + 1;
    push.call(history, { ...state, [KEY]: depth }, unused, url);
    resetAppDepth(depth);
  };
  const trackedReplace: History["replaceState"] = function (state, unused, url) {
    replace.call(history, { ...state, [KEY]: navigationDepth() }, unused, url);
  };
  history.pushState = trackedPush;
  history.replaceState = trackedReplace;
  const popped = () => { clearForwardSteps(); recordAppDepth(navigationDepth()); };
  window.addEventListener("popstate", popped);
  return () => {
    window.removeEventListener("popstate", popped);
    if (history.pushState === trackedPush) history.pushState = push;
    if (history.replaceState === trackedReplace) history.replaceState = replace;
  };
}