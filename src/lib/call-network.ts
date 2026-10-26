export type NetworkAdvisory = "offline" | "weak" | "normal" | "unknown";

export interface CallNetworkState {
  /** Browser reachability hint only; it does not prove internet access. */
  browserOnline: boolean;
  /** Browser estimate only; never presented as the device's actual bearer. */
  effectiveType: string | null;
  connectionType: string | null;
  advisory: NetworkAdvisory;
}

interface BrowserConnection extends EventTarget {
  effectiveType?: string;
  type?: string;
  saveData?: boolean;
  downlink?: number;
}

type NavigatorWithConnection = Navigator & {
  connection?: BrowserConnection;
  mozConnection?: BrowserConnection;
  webkitConnection?: BrowserConnection;
};

function connectionFor(navigatorValue: NavigatorWithConnection): BrowserConnection | undefined {
  return navigatorValue.connection ?? navigatorValue.mozConnection ?? navigatorValue.webkitConnection;
}

export function readCallNetworkState(navigatorValue: NavigatorWithConnection): CallNetworkState {
  const connection = connectionFor(navigatorValue);
  const browserOnline = navigatorValue.onLine;
  const effectiveType = connection?.effectiveType ?? null;
  const connectionType = connection?.type ?? null;
  const weakEstimate =
    connection?.saveData === true ||
    effectiveType === "slow-2g" ||
    effectiveType === "2g" ||
    (typeof connection?.downlink === "number" && connection.downlink > 0 && connection.downlink < 0.8);

  return {
    browserOnline,
    effectiveType,
    connectionType,
    advisory: !browserOnline ? "offline" : weakEstimate ? "weak" : connection ? "normal" : "unknown",
  };
}

export function subscribeCallNetwork(
  navigatorValue: NavigatorWithConnection,
  windowValue: Window,
  listener: (state: CallNetworkState) => void,
): () => void {
  const connection = connectionFor(navigatorValue);
  const emit = () => listener(readCallNetworkState(navigatorValue));
  windowValue.addEventListener("online", emit);
  windowValue.addEventListener("offline", emit);
  connection?.addEventListener("change", emit);
  return () => {
    windowValue.removeEventListener("online", emit);
    windowValue.removeEventListener("offline", emit);
    connection?.removeEventListener("change", emit);
  };
}
