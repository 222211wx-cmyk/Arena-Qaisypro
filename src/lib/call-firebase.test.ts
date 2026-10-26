import { describe, expect, it } from "vitest";
import { parseIncomingGroupCallPush, parseMissedCall, resolvePushCapability } from "./call-firebase";

describe("parseMissedCall", () => {
  it("normalizes an actual Firestore Timestamp-like value to an ISO time", () => {
    const timestamp = { toMillis: () => 1_700_000_000_000 };
    expect(parseMissedCall("call_1", {
      caller: { id: 42, name: "ليلى", avatar: null },
      type: "voice",
      time: timestamp,
      isSeen: false,
      status: "missed",
    })).toEqual({
      id: "call_1",
      caller: { id: 42, name: "ليلى", avatar: null },
      type: "voice",
      time: "2023-11-14T22:13:20.000Z",
      isSeen: false,
      status: "missed",
    });
  });

  it("accepts Timestamp toDate values and rejects malformed Firestore data", () => {
    expect(parseMissedCall("call_2", {
      caller: { id: 3, name: "Omar", avatar: "https://example.test/a.png" },
      type: "video",
      time: { toDate: () => new Date("2025-01-01T00:00:00.000Z") },
      isSeen: true,
      status: "declined",
    })?.time).toBe("2025-01-01T00:00:00.000Z");

    expect(parseMissedCall("call_3", {
      caller: { id: "not-a-number", name: "Omar" },
      type: "video",
      time: { toMillis: () => 1 },
      isSeen: true,
      status: "declined",
    })).toBeNull();
    expect(parseMissedCall("bad/id", {
      caller: { id: 3, name: "Omar" },
      type: "video",
      time: { toMillis: () => 1 },
      isSeen: true,
      status: "declined",
    })).toBeNull();
  });

  it("normalizes the canonical callInvites/missedCalls fields", () => {
    expect(parseMissedCall("invite_7", {
      fromId: 77,
      fromName: "Nour",
      type: "video",
      time: { toMillis: () => 1_700_000_000_000 },
      seen: false,
    })).toEqual({
      id: "invite_7",
      caller: { id: 77, name: "Nour", avatar: null },
      type: "video",
      time: "2023-11-14T22:13:20.000Z",
      isSeen: false,
      status: "missed",
    });
  });

  it("gates FCM readiness independently from Firestore and names missing VAPID", () => {
    expect(resolvePushCapability(true, undefined, true)).toEqual({
      enabled: false,
      reason: "Firebase web push VAPID key is not configured",
    });
    expect(resolvePushCapability(false, "vapid", true, "Push credentials are disabled")).toEqual({
      enabled: false,
      reason: "Push credentials are disabled",
    });
    expect(resolvePushCapability(true, "vapid", false).reason).toContain("IndexedDB");
  });

  it("accepts only a numeric-room, opaque-ID group-call wake-up", () => {
    expect(parseIncomingGroupCallPush({
      type: "INCOMING_GROUP_CALL",
      groupCallId: "group_call-1",
      roomId: "42",
    })).toEqual({ groupCallId: "group_call-1", roomId: 42 });
    expect(parseIncomingGroupCallPush({
      type: "INCOMING_GROUP_CALL",
      groupCallId: "../other",
      roomId: "42",
    })).toBeNull();
    expect(parseIncomingGroupCallPush({
      type: "INCOMING_GROUP_CALL",
      groupCallId: "group_call-1",
      roomId: "not-a-room",
    })).toBeNull();
  });
});