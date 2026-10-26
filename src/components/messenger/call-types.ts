/**
 * call-types — shared shapes for the classic-messenger call UI that this feature
 * owns.
 *
 * The canonical missed-call / firebase types are defined by the hook worker in
 * `@/lib/call-firebase`; we re-export them so the call UI stays in lockstep with
 * the hook contract without redeclaring (and drifting from) its field types.
 * The incoming-call extras mirror the fields useCall attaches to its incoming
 * payload. None of this edits the hook-owned modules.
 */
export type { MissedCall, FirebaseStatus } from "@/lib/call-firebase";

export type CallMediaType = "video" | "voice";

/** Extra incoming-call fields the hook attaches to the incoming payload. */
export interface IncomingCallExtras {
  callerId?: number;
  callerName?: string;
  callerAvatar?: string | null;
  /** Epoch-ms deadline after which the incoming call auto-expires. */
  expiresAt?: number;
  /** Media stays deferred (not requested) until the callee accepts. */
  deferredMedia?: boolean;
}

/** Browser notification permission, plus the "unsupported" sentinel. */
export type CallNotificationPermission = NotificationPermission | "unsupported";
