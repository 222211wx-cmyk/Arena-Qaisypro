/**
 * Durable signaling can be replayed after a socket reconnect.  `signalId` is
 * intentionally optional so older servers continue to work; when it is
 * present it is the authoritative idempotency key, not SDP/candidate text.
 */
export function rememberDurableCallSignal(
  ledger: Map<string, Set<string>>,
  callId: unknown,
  signalId: unknown,
): boolean {
  if (typeof callId !== "string" || !callId || typeof signalId !== "string" || !signalId) {
    return true;
  }
  let seen = ledger.get(callId);
  if (!seen) {
    seen = new Set<string>();
    ledger.set(callId, seen);
  }
  if (seen.has(signalId)) return false;
  seen.add(signalId);
  // A call has a small finite signaling transcript. Bound malformed/replayed
  // traffic as this ledger is only a browser-side replay guard.
  if (seen.size > 256) seen.delete(seen.values().next().value!);
  if (ledger.size > 32) ledger.delete(ledger.keys().next().value!);
  return true;
}

/** ICE has no required durable signal id, so retain a compact local guard too. */
export function iceCandidateKey(candidate: unknown): string | null {
  if (!candidate || typeof candidate !== "object") return null;
  const value = candidate as {
    candidate?: unknown;
    sdpMid?: unknown;
    sdpMLineIndex?: unknown;
    usernameFragment?: unknown;
  };
  if (typeof value.candidate !== "string" || !value.candidate) return null;
  return [
    value.candidate,
    typeof value.sdpMid === "string" ? value.sdpMid : "",
    typeof value.sdpMLineIndex === "number" ? value.sdpMLineIndex : "",
    typeof value.usernameFragment === "string" ? value.usernameFragment : "",
  ].join("|");
}

export function rememberRemoteIceCandidate(
  ledger: Map<string, Set<string>>,
  callId: string,
  candidate: unknown,
): boolean {
  const key = iceCandidateKey(candidate);
  if (!key) return false;
  let seen = ledger.get(callId);
  if (!seen) {
    seen = new Set<string>();
    ledger.set(callId, seen);
  }
  if (seen.has(key)) return false;
  seen.add(key);
  if (seen.size > 512) seen.delete(seen.values().next().value!);
  return true;
}