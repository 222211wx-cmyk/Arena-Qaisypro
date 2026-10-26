import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { OFFLINE_ACTION_BLOCKED_EVENT } from "@/lib/network";

export type ConnectivityStatus = "online" | "reconnecting" | "offline";

interface ConnectivityContextValue {
  status: ConnectivityStatus;
  isOnline: boolean;
  blockedAction: boolean;
  setRealtimeConnecting: () => void;
  setRealtimeConnected: () => void;
}

const ConnectivityContext = createContext<ConnectivityContextValue | null>(null);

export function ConnectivityProvider({ children }: { children: ReactNode }) {
  const [isOnline, setIsOnline] = useState(() => navigator.onLine);
  const [realtimeConnected, setRealtimeConnectedState] = useState(true);
  const [blockedAction, setBlockedAction] = useState(false);

  useEffect(() => {
    const onOnline = () => setIsOnline(true);
    const onOffline = () => setIsOnline(false);
    let blockedTimer: ReturnType<typeof setTimeout> | undefined;
    const onBlockedAction = () => {
      setBlockedAction(true);
      clearTimeout(blockedTimer);
      blockedTimer = setTimeout(() => setBlockedAction(false), 4_000);
    };
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    window.addEventListener(OFFLINE_ACTION_BLOCKED_EVENT, onBlockedAction);
    return () => {
      clearTimeout(blockedTimer);
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
      window.removeEventListener(OFFLINE_ACTION_BLOCKED_EVENT, onBlockedAction);
    };
  }, []);

  const setRealtimeConnecting = useCallback(() => setRealtimeConnectedState(false), []);
  const setRealtimeConnected = useCallback(() => setRealtimeConnectedState(true), []);
  const status: ConnectivityStatus = !isOnline ? "offline" : realtimeConnected ? "online" : "reconnecting";

  return (
    <ConnectivityContext.Provider value={{ status, isOnline, blockedAction, setRealtimeConnecting, setRealtimeConnected }}>
      {children}
    </ConnectivityContext.Provider>
  );
}

export function useConnectivity() {
  const context = useContext(ConnectivityContext);
  if (!context) throw new Error("useConnectivity must be used inside ConnectivityProvider");
  return context;
}