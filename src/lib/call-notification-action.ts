export type NotificationCallAction = "answer" | "decline";

/** Show a foreground status notification only when the browser already granted
 * permission. It never prompts and never stands in for credential-gated FCM. */
export function showForegroundCallNotification(title: string, body: string): Notification | null {
  if (typeof Notification === "undefined" || Notification.permission !== "granted") return null;
  try {
    return new Notification(title, { body, tag: "gdna-call-status" });
  } catch {
    return null;
  }
}

export interface PendingNotificationCallAction {
  callId: string;
  action: NotificationCallAction;
  accountId: number;
  expiresAt: number;
  resumeSent: boolean;
}

export function readNotificationCallAction(search: string): Omit<PendingNotificationCallAction, "accountId" | "expiresAt" | "resumeSent"> | null {
  const params = new URLSearchParams(search);
  // `callId + action` is the canonical route. `?answer=<id>` remains a
  // narrow compatibility alias for links produced by older workers.
  const answerAlias = params.get("answer");
  const callId = params.get("callId") ?? answerAlias;
  const action = answerAlias ? "answer" : params.get("action");
  if (!callId || !/^[A-Za-z0-9_-]{1,128}$/.test(callId) || (action !== "answer" && action !== "decline")) {
    return null;
  }
  return { callId, action };
}

/** Read a notification's canonical invitation id without granting permission
 * to answer or decline. Used for a plain notification-body click. */
export function readNotificationCallResume(search: string): { callId: string } | null {
  const callId = new URLSearchParams(search).get("callId");
  return callId && /^[A-Za-z0-9_-]{1,128}$/.test(callId) ? { callId } : null;
}

export function canApplyNotificationCallAction(
  pending: PendingNotificationCallAction | null,
  accountId: number | undefined,
  incomingCallId: string | undefined,
  now = Date.now(),
): boolean {
  return !!pending && pending.accountId === accountId && pending.callId === incomingCallId && pending.expiresAt > now;
}

/** Terminal snapshots/events can only tear down their own exact call id. */
export function shouldClearTerminalCall(currentCallId: string | null, terminalCallId: string): boolean {
  return currentCallId !== null && currentCallId === terminalCallId;
}