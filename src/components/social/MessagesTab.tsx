/**
 * MessagesTab — thin wrapper around the unified AMIS Messenger (embedded variant).
 * Kept as a separate file so social.tsx keeps its import; props are ignored —
 * Messenger reads user/lang from context itself.
 */
import Messenger from "../messenger/Messenger";

interface Props {
  user?: { id: number; username: string } | null;
  st?: Record<string, string>;
  dir?: string;
}

export default function MessagesTab(_props: Props) {
  return <Messenger variant="embedded" />;
}
