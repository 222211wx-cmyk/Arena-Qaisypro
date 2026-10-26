import { createContext, useContext, type ReactNode } from "react";
import { CallProvider } from "@/contexts/CallContext";
import { GroupCallProvider } from "@/contexts/GroupCallContext";

const GlobalCallBoundaryContext = createContext(false);

/**
 * Mount above routing, inside the shell's auth/connectivity providers. The
 * existing CallProvider owns authentication gating and the direct-call overlay.
 * Group calls reuse its signaling events and must remain inside that provider.
 * Nested shell compositions must reuse it rather than open a second socket.
 */
export function GlobalCallBoundary({ children }: { children?: ReactNode }) {
  const alreadyMounted = useContext(GlobalCallBoundaryContext);
  if (alreadyMounted) return <>{children}</>;

  return (
    <GlobalCallBoundaryContext.Provider value={true}>
      <CallProvider>
        <GroupCallProvider>{children}</GroupCallProvider>
      </CallProvider>
    </GlobalCallBoundaryContext.Provider>
  );
}