/**
 * use-network-status — a scoped network listener for call and messaging UI.
 *
 * Reports the browser's actual connectivity from navigator.onLine and, when the
 * Network Information API is present, its .type / .effectiveType. It never
 * invents a bearer (no fake "WiFi"/"4G"). When the physical type is unknown it
 * reports only that the network is available. effectiveType is surfaced as a
 * speed ESTIMATE, not a physical carrier.
 *
 * This hook intentionally uses its own listeners rather than editing the shared
 * call hook, so it stays conflict-free until the network agent integrates a
 * canonical hook.
 */
import { useEffect, useState } from "react";

// Minimal shape of the (non-standard) Network Information API.
interface NetworkInformationLike extends EventTarget {
  type?: string;          // physical-ish bearer: "wifi" | "cellular" | "ethernet" | ...
  effectiveType?: string; // speed estimate: "slow-2g" | "2g" | "3g" | "4g"
}

function getConnection(): NetworkInformationLike | undefined {
  if (typeof navigator === "undefined") return undefined;
  const nav = navigator as Navigator & {
    connection?: NetworkInformationLike;
    mozConnection?: NetworkInformationLike;
    webkitConnection?: NetworkInformationLike;
  };
  return nav.connection ?? nav.mozConnection ?? nav.webkitConnection;
}

export interface NetworkStatus {
  /** Actual browser connectivity. */
  online: boolean;
  /** Physical bearer when the API exposes it, else null (never fabricated). */
  connectionType: string | null;
  /** Speed estimate ("4g" etc) when available — NOT a physical bearer. */
  effectiveType: string | null;
}

function read(): NetworkStatus {
  const online = typeof navigator === "undefined" ? true : navigator.onLine;
  const connection = getConnection();
  const rawType = connection?.type;
  // "unknown"/"none" are not useful bearers — treat them as unavailable.
  const connectionType =
    rawType && rawType !== "unknown" && rawType !== "none" ? rawType : null;
  const effectiveType = connection?.effectiveType ?? null;
  return { online, connectionType, effectiveType };
}

export function useNetworkStatus(): NetworkStatus {
  const [status, setStatus] = useState<NetworkStatus>(() => read());

  useEffect(() => {
    const update = () => setStatus(read());
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    const connection = getConnection();
    connection?.addEventListener?.("change", update);
    // Re-read once on mount in case values changed before listeners attached.
    update();
    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
      connection?.removeEventListener?.("change", update);
    };
  }, []);

  return status;
}
