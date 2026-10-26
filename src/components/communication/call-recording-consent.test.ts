import { describe, expect, it } from "vitest";
import { RecordingConsentTracker } from "@/client/hooks/useCallRecording";

describe("recording consent gate", () => {
  it("ignores acknowledgements for a different request", () => {
    const tracker = new RecordingConsentTracker("request_123", new Set([2]));
    expect(tracker.accept("request_old", 2)).toBe(false);
    expect(tracker.accept("request_123", 2)).toBe(true);
  });

  it("ignores an acknowledgement from a participant outside the roster", () => {
    const tracker = new RecordingConsentTracker("request_123", new Set([2]));
    expect(tracker.accept("request_123", 99)).toBe(false);
    expect(tracker.accept("request_123", 2)).toBe(true);
  });

  it("does not open recording until every expected participant accepts", () => {
    const tracker = new RecordingConsentTracker("request_123", new Set([2, 3]));
    expect(tracker.accept("request_123", 2)).toBe(false);
    expect(tracker.accept("request_123", 3)).toBe(true);
  });
});