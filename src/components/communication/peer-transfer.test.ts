import { describe, expect, it } from "vitest";
import {
  CHUNK_BYTES,
  createChunkFrame,
  parseChunkFrame,
  peerTransfer,
  validateTransferMetadata,
} from "@/client/lib/peer-transfer";

class MockDataChannel {
  readyState: RTCDataChannelState = "open";
  bufferedAmount = 0;
  bufferedAmountLowThreshold = 0;
  binaryType: BinaryType = "arraybuffer";
  onopen: ((event: Event) => void) | null = null;
  onclose: ((event: Event) => void) | null = null;
  onerror: ((event: Event) => void) | null = null;
  onmessage: ((event: MessageEvent) => void) | null = null;
  onbufferedamountlow: ((event: Event) => void) | null = null;
  sent: (string | ArrayBuffer)[] = [];
  constructor(readonly label = "gdna-peer-transfer-v1") {}
  send(value: string | ArrayBuffer) { this.sent.push(value); }
  close() { this.readyState = "closed"; }
}

describe("peer transfer protocol", () => {
  it("rejects unsafe metadata and validates fixed-size chunk frames", () => {
    expect(validateTransferMetadata({
      name: "<img src=x>", size: 3, kind: "file", mime: "text/plain",
    })).toBeNull();
    const payload = new Uint8Array(CHUNK_BYTES);
    const frame = createChunkFrame("transfer_123", 4, payload);
    expect(parseChunkFrame(frame)).toMatchObject({ id: "transfer_123", index: 4 });
    expect(() => createChunkFrame("transfer_123", 0, new Uint8Array(CHUNK_BYTES + 1))).toThrow();
  });

  it("creates the data channel before SDP and exposes incoming consent", () => {
    const channel = new MockDataChannel();
    const pc = {
      createDataChannel: (label: string) => {
        expect(label).toBe("gdna-peer-transfer-v1");
        return channel;
      },
      ondatachannel: null,
    } as unknown as RTCPeerConnection;
    const detach = peerTransfer.attach(pc);
    channel.onmessage?.({
      data: JSON.stringify({
        v: 1, t: "request", id: "transfer_123",
        metadata: { name: "note.webm", size: 3, kind: "voice-note", mime: "audio/webm" },
      }),
    } as MessageEvent);
    expect(peerTransfer.getSnapshot().transfers).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: "transfer_123", status: "pending-consent" }),
    ]));
    detach();
  });
});