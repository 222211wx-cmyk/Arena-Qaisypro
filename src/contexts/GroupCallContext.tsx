import { createContext, useContext, type ReactNode } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useCallContext } from "@/contexts/CallContext";
import { useGroupCall } from "@/client/hooks/useGroupCall";
import GroupCallOverlay from "@/components/communication/GroupCallOverlay";

type GroupCallContextValue = ReturnType<typeof useGroupCall>;
const GroupCallContext = createContext<GroupCallContextValue | null>(null);

export function GroupCallProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const directCall = useCallContext();
  const group = useGroupCall(user, directCall.callStatus);

  return (
    <GroupCallContext.Provider value={group}>
      {children}
      <GroupCallOverlay group={group} user={user} />
    </GroupCallContext.Provider>
  );
}

export function useGroupCallContext() {
  const context = useContext(GroupCallContext);
  if (!context) throw new Error("useGroupCallContext must be used inside GroupCallProvider");
  return context;
}