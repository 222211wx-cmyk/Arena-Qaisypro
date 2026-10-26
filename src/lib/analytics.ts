type AnalyticsData = Record<string, string | number | boolean>;
export type CallDeviceKind = "audioinput" | "videoinput" | "audiooutput";
export type CallDeviceOutcome = "switch_succeeded" | "recovery_attempted" | "recovery_succeeded";

declare global {
  interface Window {
    umami?: {
      track(name: string, data?: AnalyticsData): void;
    };
  }
}

export function trackEvent(name: string, data?: AnalyticsData): void {
  if (typeof window === "undefined") return;

  try {
    // Replit injects Umami into published website artifacts at the deployment
    // proxy. It is intentionally absent from the repository and in development.
    window.umami?.track(name, data);
  } catch {
    // Analytics must never interrupt the citizen's active experience.
  }
}

export function trackCallDeviceOutcome(
  deviceKind: CallDeviceKind,
  outcome: CallDeviceOutcome,
): void {
  trackEvent("call_device_outcome", {
    device_kind: deviceKind,
    outcome,
  });
}