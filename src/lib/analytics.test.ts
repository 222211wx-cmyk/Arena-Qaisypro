import { afterEach, describe, expect, it, vi } from "vitest";
import { trackCallDeviceOutcome, trackEvent } from "./analytics";

describe("trackEvent", () => {
  afterEach(() => {
    delete window.umami;
  });

  it("is a safe no-op when analytics is unavailable", () => {
    expect(() => trackEvent("call_device_outcome", {
      device_kind: "audioinput",
      outcome: "switch_succeeded",
    })).not.toThrow();
  });

  it("does not surface tracker failures into an active call", () => {
    window.umami = {
      track: vi.fn(() => {
        throw new Error("tracker failed");
      }),
    };

    expect(() => trackEvent("call_device_outcome", {
      device_kind: "videoinput",
      outcome: "recovery_succeeded",
    })).not.toThrow();
  });

  it.each([
    ["audioinput", "recovery_attempted"],
    ["videoinput", "recovery_succeeded"],
    ["audiooutput", "switch_succeeded"],
  ] as const)("delivers %s %s with only privacy-safe dimensions", (deviceKind, outcome) => {
    const track = vi.fn();
    window.umami = { track };

    trackCallDeviceOutcome(deviceKind, outcome);

    expect(track).toHaveBeenCalledOnce();
    expect(track).toHaveBeenCalledWith("call_device_outcome", {
      device_kind: deviceKind,
      outcome,
    });
    expect(Object.keys(track.mock.calls[0][1] ?? {})).toEqual(["device_kind", "outcome"]);
  });
});