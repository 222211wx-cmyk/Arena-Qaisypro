import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { GlobalCallAlerts } from "./GlobalCallAlerts";

describe("GlobalCallAlerts", () => {
  it.each(["default", "denied", "unsupported", "granted"])(
    "never nags or requests notification permission in the %s state",
    notificationPermission => {
      const call = {
        secureCallRegistrationStatus: "ready" as const,
        notificationPermission,
        soundBlocked: true,
        enableCallSound: vi.fn(),
        enableCallNotifications: vi.fn(),
      };
      const { rerender } = render(<GlobalCallAlerts call={call} />);
      expect(screen.queryByTestId("global-call-alerts")).toBeNull();
      expect(screen.queryByRole("button")).toBeNull();
      expect(call.enableCallSound).not.toHaveBeenCalled();
      expect(call.enableCallNotifications).not.toHaveBeenCalled();

      rerender(<GlobalCallAlerts call={call} />);
      expect(screen.queryByTestId("global-call-alerts")).toBeNull();
      expect(call.enableCallNotifications).not.toHaveBeenCalled();
    },
  );

  it.each(["registering", "error", "ready"] as const)(
    "retains silent diagnostics without a floating prompt for %s registration",
    secureCallRegistrationStatus => {
      render(<GlobalCallAlerts call={{ secureCallRegistrationStatus }} />);
      const marker = screen.getByTestId("call-readiness-status");
      expect(marker.textContent).toBe(secureCallRegistrationStatus);
      expect(marker.className).toBe("sr-only");
      expect(marker.hasAttribute("aria-live")).toBe(false);
      expect(screen.queryByRole("alert")).toBeNull();
    },
  );
});