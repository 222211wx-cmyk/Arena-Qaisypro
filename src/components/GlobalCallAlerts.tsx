import type { useCall } from "@/hooks/useCall";

type CallAlertsState = Pick<
  ReturnType<typeof useCall>,
  "secureCallRegistrationStatus"
>;

// Notification permission is an optional, citizen-initiated action in messenger
// settings. Never cover the page with setup reminders, including denied or
// unsupported states. Keep the readiness marker for call diagnostics without
// changing incoming-call handling or existing push subscriptions.
export function GlobalCallAlerts({ call }: { call: CallAlertsState }) {
  return (
    <span className="sr-only" data-testid="call-readiness-status">
      {call.secureCallRegistrationStatus}
    </span>
  );
}

export default GlobalCallAlerts;