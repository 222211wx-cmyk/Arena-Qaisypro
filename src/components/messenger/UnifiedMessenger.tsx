import { useState } from "react";
import { Button } from "@workspace/gdna-ds/components/ui/button";
import { api } from "../social/social-i18n";

export interface UnifiedMessengerProps {
  peerId: number;
  peerUsername?: string;
  context?: string;
  triggerLabel?: string;
}

/** Works from React and vanilla integrations; context is never sent as a message. */
export async function openUnifiedMessenger({ peerId }: UnifiedMessengerProps): Promise<void> {
  if (!Number.isSafeInteger(peerId) || peerId <= 0) throw new Error("Invalid citizen");
  const response = await fetch(api("/api/messages/rooms"), {
    method: "POST", credentials: "include", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ type: "direct", targetUserId: peerId }),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error ?? "Cannot open conversation");
  if (!Number.isSafeInteger(data.room?.id)) throw new Error("Invalid conversation response");
  const base = import.meta.env.BASE_URL.replace(/\/$/, "");
  window.location.assign(`${base}/messages?room=${data.room.id}`);
}

export function UnifiedMessenger(props: UnifiedMessengerProps) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  return <span className="inline-flex flex-col gap-1">
    <Button size="sm" variant="outline" disabled={busy} onClick={async () => {
      setBusy(true); setError("");
      try { await openUnifiedMessenger(props); }
      catch (cause) { setError(cause instanceof Error ? cause.message : "Cannot open conversation"); }
      finally { setBusy(false); }
    }}>{busy ? "Opening…" : props.triggerLabel ?? "Message"}</Button>
    {error && <span role="alert" className="text-xs text-destructive">{error}</span>}
  </span>;
}

export default UnifiedMessenger;