/**
 * Canonical provider-neutral consent signalling. The socket/core integration
 * validates call membership and forwards outbound detail only to call members.
 *
 * Outbound event: `gdna:recording-control-send`
 * detail: { callId, requestId, action: request|accept|reject|stop|revoke }
 *
 * Inbound event: `gdna:recording-control`
 * detail: { callId, requestId, action, serverFromUserId }
 */
export type RecordingControlAction = "request" | "accept" | "reject" | "stop" | "revoke";
export interface OutboundRecordingControl {
  callId: string;
  requestId: string;
  action: RecordingControlAction;
}
export interface IncomingRecordingControl extends OutboundRecordingControl {
  serverFromUserId: number;
}

const inboundEvent = "gdna:recording-control";
const outboundEvent = "gdna:recording-control-send";
const actions: RecordingControlAction[] = ["request", "accept", "reject", "stop", "revoke"];

function hasBaseShape(value: unknown): value is OutboundRecordingControl {
  if (!value || typeof value !== "object") return false;
  const control = value as Partial<OutboundRecordingControl>;
  return typeof control.callId === "string" && control.callId.length > 0 && control.callId.length <= 128 &&
    typeof control.requestId === "string" && /^[A-Za-z0-9_-]{8,96}$/.test(control.requestId) &&
    actions.includes(control.action as RecordingControlAction);
}

export function isIncomingRecordingControl(value: unknown): value is IncomingRecordingControl {
  return hasBaseShape(value) && Number.isSafeInteger((value as Partial<IncomingRecordingControl>).serverFromUserId) &&
    (value as IncomingRecordingControl).serverFromUserId > 0;
}

export function subscribeRecordingControl(listener: (control: IncomingRecordingControl) => void) {
  const handler = (event: Event) => {
    const control = (event as CustomEvent<unknown>).detail;
    if (isIncomingRecordingControl(control)) listener(control);
  };
  window.addEventListener(inboundEvent, handler);
  return () => window.removeEventListener(inboundEvent, handler);
}

export const onIncomingRecordingControl = subscribeRecordingControl;

export function sendRecordingControl(control: OutboundRecordingControl) {
  if (!hasBaseShape(control)) throw new Error("Invalid recording-control signal");
  window.dispatchEvent(new CustomEvent<OutboundRecordingControl>(outboundEvent, { detail: control }));
}