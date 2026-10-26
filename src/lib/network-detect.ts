import { isMessagesEntryPath, messagesReturnPath } from "./messages-entry";
import { recoveryEnrollmentReturnPath } from "./recovery-links";

/** Dependency-free: safe to import before either application entry. */
type Connection = EventTarget & { effectiveType?: string; saveData?: boolean; downlink?: number };
export type NetworkState = {
  forceLiteMode: boolean;
  limitedData: boolean;
  effectiveType: string;
  saveData: boolean;
  downlink: number | null;
};
const KEY = "gdna.limitedData";
const AUTO_LITE_REFS = new Set(["inwi", "orange", "itissalat", "*6", "star6"]);
const connection = () => (navigator as Navigator & { connection?: Connection }).connection;
let manual = false;
try { manual = localStorage.getItem(KEY) === "true"; } catch { /* Storage unavailable. */ }
/**
 * Returns the canonical, allow-listed operator referral that opts into Lite.
 * URLSearchParams performs percent-decoding, so ref=%2A6 is treated as ref=*6.
 * Unknown values are deliberately ignored instead of becoming redirect input.
 */
export function getAutoLiteReferral(search: string): string | null {
  const raw = new URLSearchParams(search.startsWith("?") ? search.slice(1) : search).get("ref");
  if (raw === null) return null;
  const normalized = raw.trim().toLowerCase();
  return AUTO_LITE_REFS.has(normalized) ? normalized : null;
}
/** Explicit full messenger links must never lose rooms/tools to an automatic redirect. */
export function shouldAutoRedirectToLite(route: string, forced: boolean, referral: string | null, search = ""): boolean {
  const path = route.replace(/\/+$/, "") || "/";
  // Explicit Lite recovery/enrollment links must open the full website,
  // otherwise slow networks bounce back to Lite before verification can load.
  if (path === "/recover-account" || path === "/recovery-phone" || path === "/recovery-code" || path === "/recover-with-code") return false;
  // recoveryEnrollmentReturnPath also accepts /recovery-code round-trips.
  if ((path === "/login" || path === "/register") && recoveryEnrollmentReturnPath(search)) return false;
  if (isMessagesEntryPath(path) || path.startsWith("/messages/")) return false;
  if ((path === "/login" || path === "/register") && messagesReturnPath(search)) return false;
  if (path === "/clip" || path === "/clips" || /^\/clip\/HELX-\d{6}$/.test(path)) return false;
  return forced || referral !== null;
}
export function getNetworkState(): NetworkState {
  const c = connection();
  const effectiveType = c?.effectiveType || "unknown";
  const saveData = !!c?.saveData;
  const downlink = typeof c?.downlink === "number" ? c.downlink : null;
  const slow = saveData || ["2g", "slow-2g"].includes(effectiveType) || (downlink !== null && downlink < 0.5);
  return { forceLiteMode: manual || slow, limitedData: manual || slow, effectiveType, saveData, downlink };
}
export function subscribeNetwork(listener: (state: NetworkState) => void): () => void {
  const notify = () => listener(getNetworkState());
  const storage = (event: StorageEvent) => {
    if (event.key === KEY) { manual = event.newValue === "true"; notify(); }
  };
  const c = connection();
  c?.addEventListener("change", notify);
  window.addEventListener("gdna-network-change", notify);
  window.addEventListener("online", notify);
  window.addEventListener("offline", notify);
  window.addEventListener("storage", storage);
  return () => {
    c?.removeEventListener("change", notify);
    window.removeEventListener("gdna-network-change", notify);
    window.removeEventListener("online", notify);
    window.removeEventListener("offline", notify);
    window.removeEventListener("storage", storage);
  };
}
export function setLimitedData(value: boolean): void {
  manual = value;
  try { localStorage.setItem(KEY, String(value)); } catch { /* Keep session preference. */ }
  window.dispatchEvent(new Event("gdna-network-change"));
}
export function authorizeDownload(bytes: number | null, label: string): boolean {
  if (!getNetworkState().limitedData) return true;
  if (bytes !== null && Number.isFinite(bytes) && bytes >= 0 && bytes < 200_000) return true;
  const size = bytes === null || !Number.isFinite(bytes) || bytes < 0 ? "unknown size" : `${(bytes / 1_000_000).toFixed(1)} MB`;
  return window.confirm(`${label} (${size}) — download using limited data?`);
}
