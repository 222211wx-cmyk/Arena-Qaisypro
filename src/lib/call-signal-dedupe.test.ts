import { describe, expect, it } from "vitest";
import {
  iceCandidateKey,
  rememberDurableCallSignal,
  rememberRemoteIceCandidate,
} from "./call-signal-dedupe";

describe("durable call signal replay guards", () => {
  it("accepts older signals without ids but deduplicates a durable signalId per call", () => {
    const ledger = new Map<string, Set<string>>();

    expect(rememberDurableCallSignal(ledger, "call-a", undefined)).toBe(true);
    expect(rememberDurableCallSignal(ledger, "call-a", "signal-1")).toBe(true);
    expect(rememberDurableCallSignal(ledger, "call-a", "signal-1")).toBe(false);
    expect(rememberDurableCallSignal(ledger, "call-b", "signal-1")).toBe(true);
  });

  it("does not apply a replayed ICE candidate when no durable id is available", () => {
    const ledger = new Map<string, Set<string>>();
    const candidate = {
      candidate: "candidate:1 1 udp 1 192.0.2.1 9999 typ host",
      sdpMid: "0",
      sdpMLineIndex: 0,
    };

    expect(iceCandidateKey(candidate)).toBeTruthy();
    expect(rememberRemoteIceCandidate(ledger, "call-a", candidate)).toBe(true);
    expect(rememberRemoteIceCandidate(ledger, "call-a", candidate)).toBe(false);
    expect(rememberRemoteIceCandidate(ledger, "call-a", { candidate: "" })).toBe(false);
  });
});