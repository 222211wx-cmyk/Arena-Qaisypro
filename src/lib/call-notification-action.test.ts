import { describe, expect, it } from "vitest";
import {
  canApplyNotificationCallAction,
  readNotificationCallAction,
  readNotificationCallResume,
  showForegroundCallNotification,
  shouldClearTerminalCall,
} from "./call-notification-action";

describe("notification call actions", () => {
  it("only accepts explicit answer/decline URL actions", () => {
    expect(readNotificationCallAction("?callId=call_1&action=answer")).toEqual({ callId: "call_1", action: "answer" });
    expect(readNotificationCallAction("?callId=call_1&action=decline")).toEqual({ callId: "call_1", action: "decline" });
    expect(readNotificationCallAction("?callId=call_1")).toBeNull(); // passive missed-call click
    expect(readNotificationCallAction("?callId=call_1&action=ring")).toBeNull();
    expect(readNotificationCallAction("?callId=../other&action=answer")).toBeNull();
    expect(readNotificationCallAction("?answer=call_1")).toEqual({ callId: "call_1", action: "answer" });
    expect(readNotificationCallResume("?callId=call_1")).toEqual({ callId: "call_1" });
    expect(readNotificationCallResume("?callId=../other")).toBeNull();
  });

  it("cannot apply a notification action to a different account, invitation, or expired call", () => {
    const pending = { callId: "call_1", action: "answer" as const, accountId: 7, expiresAt: 200, resumeSent: true };
    expect(canApplyNotificationCallAction(pending, 7, "call_1", 100)).toBe(true);
    expect(canApplyNotificationCallAction(pending, 8, "call_1", 100)).toBe(false);
    expect(canApplyNotificationCallAction(pending, 7, "call_2", 100)).toBe(false);
    expect(canApplyNotificationCallAction(pending, 7, "call_1", 200)).toBe(false);
  });

  it("only clears the current call for a matching terminal event", () => {
    expect(shouldClearTerminalCall("current", "old")).toBe(false);
    expect(shouldClearTerminalCall("current", "current")).toBe(true);
    expect(shouldClearTerminalCall(null, "current")).toBe(false);
  });

  it("does not prompt or fake a foreground notification without granted permission", () => {
    const original = globalThis.Notification;
    Object.defineProperty(globalThis, "Notification", {
      configurable: true,
      value: class {} as unknown as typeof Notification,
    });
    Object.defineProperty(Notification, "permission", { configurable: true, value: "default" });
    expect(showForegroundCallNotification("Call", "Declined")).toBeNull();
    Object.defineProperty(globalThis, "Notification", { configurable: true, value: original });
  });
});