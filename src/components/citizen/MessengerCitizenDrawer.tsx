import { CitizenProfileDrawer } from "./CitizenProfileDrawer";
import {
  useCitizenProfile,
  useUpdateMyProfile,
  type CitizenProfile,
  type CitizenVisibility,
} from "@/hooks/use-citizen";
import { useToast } from "@workspace/gdna-ds/hooks/use-toast";

export interface MessengerCitizenDrawerProps {
  /** Peer username to load; null closes the drawer. */
  username: string | null;
  onClose: () => void;
  /** Open the existing conversation with this citizen (no route navigation away). */
  onMessage: (citizen: CitizenProfile) => void;
}

/**
 * Thin bridge used by the messenger's dark conversation list: opening the drawer
 * loads the public citizen card by username via the existing React Query hook and
 * renders the shared CitizenProfileDrawer on the SAME page (no navigation).
 */
export function MessengerCitizenDrawer({ username, onClose, onMessage }: MessengerCitizenDrawerProps) {
  const isOpen = !!username;
  const query = useCitizenProfile(username ?? undefined);
  const update = useUpdateMyProfile();
  const { toast } = useToast();
  const changeVisibility = (visibility: CitizenVisibility) => {
    update.mutate(
      { visibility },
      {
        onSuccess: () => toast({ title: "تم تحديث الخصوصية" }),
        onError: (error) => toast({
          title: "تعذّر تحديث الخصوصية",
          description: error.message,
          variant: "destructive",
        }),
      },
    );
  };
  return (
    <CitizenProfileDrawer
      citizen={query.data}
      isOpen={isOpen}
      isLoading={isOpen && (query.isLoading || query.isFetching) && !query.data}
      onClose={onClose}
      onMessage={onMessage}
      onVisibilityChange={query.data?.isSelf ? changeVisibility : undefined}
      visibilityPending={update.isPending}
    />
  );
}

export default MessengerCitizenDrawer;
