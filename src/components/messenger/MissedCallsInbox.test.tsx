import "@testing-library/jest-dom/vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { MissedCallsInbox } from "./MissedCallsInbox";
import type { MissedCall } from "./call-types";
import { MISSED_VIDEO_CALL_AR, MISSED_VOICE_CALL_AR } from "@/i18n/missed-calls-copy";

const ROWS: MissedCall[] = [
  { id: "a", caller: { id: "1", name: "Layla" }, type: "video", time: new Date().toISOString(), isSeen: false, status: "missed" },
  { id: "b", caller: { id: "2", name: "Omar" }, type: "voice", time: new Date().toISOString(), isSeen: true, status: "missed" },
];

function baseProps() {
  return {
    lang: "ar",
    missedCalls: ROWS,
    missedCallCount: 1,
    markMissedCallsSeen: vi.fn(),
    active: true,
  };
}

describe("MissedCallsInbox", () => {
  it("renders exact Arabic missed video / voice labels", () => {
    render(<MissedCallsInbox {...baseProps()} />);
    expect(screen.getByText(MISSED_VIDEO_CALL_AR)).toBeVisible();
    expect(screen.getByText(MISSED_VOICE_CALL_AR)).toBeVisible();
  });

  it("marks visible unseen rows seen once loaded and the tab is active", () => {
    const mark = vi.fn();
    render(<MissedCallsInbox {...baseProps()} markMissedCallsSeen={mark} />);
    expect(mark).toHaveBeenCalledTimes(1);
    expect(mark).toHaveBeenCalledWith(["a"]);
  });

  it("does not mark seen while the tab is inactive", () => {
    const mark = vi.fn();
    render(<MissedCallsInbox {...baseProps()} active={false} markMissedCallsSeen={mark} />);
    expect(mark).not.toHaveBeenCalled();
  });

  it("shows loading, empty and error states without mock rows", () => {
    const { rerender } = render(<MissedCallsInbox {...baseProps()} loading missedCalls={[]} />);
    expect(screen.getByTestId("missed-calls-loading")).toBeVisible();

    rerender(<MissedCallsInbox {...baseProps()} loading={false} missedCalls={[]} missedCallCount={0} />);
    expect(screen.getByTestId("missed-calls-empty")).toBeVisible();

    const onRetry = vi.fn();
    rerender(<MissedCallsInbox {...baseProps()} error missedCalls={[]} missedCallCount={0} onRetry={onRetry} />);
    fireEvent.click(screen.getByTestId("button-retry-missed-calls"));
    expect(onRetry).toHaveBeenCalledOnce();
  });

  it("is honest about disabled background notifications while keeping in-app calling", () => {
    render(<MissedCallsInbox {...baseProps()} firebaseStatus="disabled" />);
    expect(screen.getByTestId("missed-calls-firebase-status")).toHaveTextContent(
      "إشعارات الخلفية غير مُهيّأة",
    );
  });

  it("offers a notification permission CTA on a user gesture", () => {
    const enable = vi.fn();
    render(
      <MissedCallsInbox
        {...baseProps()}
        notificationPermission="default"
        enableCallNotifications={enable}
      />,
    );
    fireEvent.click(screen.getByTestId("button-enable-call-notifications"));
    expect(enable).toHaveBeenCalledOnce();
  });

  it("offers an enable-sound CTA when sound is blocked", () => {
    const enableSound = vi.fn();
    render(
      <MissedCallsInbox {...baseProps()} soundBlocked enableCallSound={enableSound} />,
    );
    fireEvent.click(screen.getByTestId("button-enable-call-sound"));
    expect(enableSound).toHaveBeenCalledOnce();
  });
});
