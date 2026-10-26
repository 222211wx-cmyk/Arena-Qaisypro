/**
 * Ephemeral 1:1 transfer transport.
 *
 * `attach(pc)` MUST run on the offerer immediately after constructing its
 * RTCPeerConnection and before its first createOffer(). The answerer uses
 * `attach(pc, { createChannel: false })` before setRemoteDescription().
 * WebRTC data channels are DTLS encrypted by the negotiated peer connection.
 */

export const PEER_TRANSFER_CHANNEL = "gdna-peer-transfer-v1";
export const MAX_TRANSFER_BYTES = 25 * 1024 * 1024;
export const CHUNK_BYTES = 16 * 1024;
const MAX_NAME_LENGTH = 180;
const MAX_ID_LENGTH = 96;
const TRANSFER_TIMEOUT_MS = 2 * 60 * 1000;
const LOW_BUFFER_BYTES = 64 * 1024;
const HIGH_BUFFER_BYTES = 256 * 1024;

export type TransferKind = "file" | "voice-note";
export type TransferStatus = "pending-consent" | "awaiting-consent" | "sending" | "receiving" | "ready" | "complete" | "rejected" | "cancelled" | "error";
export interface TransferMetadata {
  name: string;
  size: number;
  kind: TransferKind;
  mime: string;
}
export interface PeerTransferItem {
  id: string;
  direction: "incoming" | "outgoing";
  metadata: TransferMetadata;
  status: TransferStatus;
  progress: number;
  error?: string;
  blob?: Blob;
}
export interface PeerTransferSnapshot {
  connected: boolean;
  transfers: PeerTransferItem[];
}

type ControlMessage =
  | { v: 1; t: "request"; id: string; metadata: TransferMetadata }
  | { v: 1; t: "accept" | "reject" | "cancel" | "complete"; id: string }
  | { v: 1; t: "received"; id: string; ok: boolean; reason?: string };

interface TransferRecord extends PeerTransferItem {
  file?: Blob;
  chunks?: Uint8Array<ArrayBuffer>[];
  receivedBytes?: number;
  expectedChunk?: number;
  timer?: ReturnType<typeof setTimeout>;
}

interface DataChannelLike {
  readonly readyState: RTCDataChannelState;
  bufferedAmount: number;
  bufferedAmountLowThreshold: number;
  onopen: ((event: Event) => void) | null;
  onclose: ((event: Event) => void) | null;
  onerror: ((event: Event) => void) | null;
  onmessage: ((event: MessageEvent) => void) | null;
  onbufferedamountlow: ((event: Event) => void) | null;
  send(data: string | ArrayBuffer): void;
  close(): void;
}

const idPattern = /^[A-Za-z0-9_-]{8,96}$/;
const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder();

export function validateTransferMetadata(value: unknown): TransferMetadata | null {
  if (!value || typeof value !== "object") return null;
  const candidate = value as Partial<TransferMetadata>;
  if (
    typeof candidate.name !== "string" ||
    !candidate.name.trim() ||
    candidate.name.length > MAX_NAME_LENGTH ||
    /[<>&/\\\u0000-\u001F\u007F]/.test(candidate.name) ||
    typeof candidate.size !== "number" ||
    !Number.isSafeInteger(candidate.size) ||
    candidate.size < 1 ||
    candidate.size > MAX_TRANSFER_BYTES ||
    (candidate.kind !== "file" && candidate.kind !== "voice-note") ||
    typeof candidate.mime !== "string" ||
    candidate.mime.length > 127 ||
    /[<>\u0000-\u001F\u007F]/.test(candidate.mime)
  ) return null;
  return {
    name: candidate.name.trim(),
    size: candidate.size,
    kind: candidate.kind,
    mime: candidate.mime || "application/octet-stream",
  };
}

function isTransferId(value: unknown): value is string {
  return typeof value === "string" && idPattern.test(value);
}

function parseControl(value: unknown): ControlMessage | null {
  if (typeof value !== "string" || value.length > 2048) return null;
  try {
    const parsed = JSON.parse(value) as Partial<ControlMessage>;
    if (parsed.v !== 1 || !isTransferId(parsed.id) || typeof parsed.t !== "string") return null;
    if (parsed.t === "request") {
      const metadata = validateTransferMetadata(parsed.metadata);
      return metadata ? { v: 1, t: "request", id: parsed.id, metadata } : null;
    }
    if (parsed.t === "received") {
      return typeof parsed.ok === "boolean"
        ? { v: 1, t: "received", id: parsed.id, ok: parsed.ok, reason: typeof parsed.reason === "string" ? parsed.reason.slice(0, 160) : undefined }
        : null;
    }
    return parsed.t === "accept" || parsed.t === "reject" || parsed.t === "cancel" || parsed.t === "complete"
      ? { v: 1, t: parsed.t, id: parsed.id }
      : null;
  } catch {
    return null;
  }
}

/** The binary frame has transfer id, ordered chunk index, then <=16KiB data. */
export function createChunkFrame(id: string, index: number, chunk: Uint8Array): ArrayBuffer {
  if (!isTransferId(id) || !Number.isSafeInteger(index) || index < 0 || chunk.byteLength > CHUNK_BYTES) {
    throw new Error("Invalid transfer chunk");
  }
  const idBytes = textEncoder.encode(id);
  const frame = new Uint8Array(2 + idBytes.byteLength + 4 + chunk.byteLength);
  new DataView(frame.buffer).setUint16(0, idBytes.byteLength);
  frame.set(idBytes, 2);
  new DataView(frame.buffer).setUint32(2 + idBytes.byteLength, index);
  frame.set(chunk, 2 + idBytes.byteLength + 4);
  return frame.buffer;
}

export function parseChunkFrame(value: ArrayBuffer): { id: string; index: number; chunk: Uint8Array<ArrayBuffer> } | null {
  if (value.byteLength < 2 + 8 + 4 || value.byteLength > 2 + MAX_ID_LENGTH + 4 + CHUNK_BYTES) return null;
  const frame = new Uint8Array(value);
  const idLength = new DataView(value).getUint16(0);
  if (idLength < 8 || idLength > MAX_ID_LENGTH || value.byteLength < 2 + idLength + 4) return null;
  const id = textDecoder.decode(frame.subarray(2, 2 + idLength));
  if (!isTransferId(id)) return null;
  const index = new DataView(value).getUint32(2 + idLength);
  const chunk = new Uint8Array(frame.slice(2 + idLength + 4));
  return chunk.byteLength <= CHUNK_BYTES ? { id, index, chunk } : null;
}

function makeId(): string {
  return crypto.randomUUID().replace(/-/g, "_");
}

class PeerTransferManager {
  private channel: DataChannelLike | null = null;
  private records = new Map<string, TransferRecord>();
  private listeners = new Set<() => void>();

  getSnapshot = (): PeerTransferSnapshot => ({
    connected: this.channel?.readyState === "open",
    transfers: [...this.records.values()].map(({ file, chunks, timer, ...item }) => ({ ...item })),
  });

  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => { this.listeners.delete(listener); };
  };

  private emit() {
    this.listeners.forEach(listener => listener());
  }

  attach(pc: RTCPeerConnection, options: { createChannel?: boolean } = {}) {
    const createChannel = options.createChannel ?? true;
    if (this.channel) this.detach("A new call connection replaced this transfer channel");
    if (createChannel) this.bindChannel(pc.createDataChannel(PEER_TRANSFER_CHANNEL, { ordered: true }));
    const previous = pc.ondatachannel;
    pc.ondatachannel = (event) => {
      previous?.call(pc, event);
      if (event.channel.label === PEER_TRANSFER_CHANNEL) this.bindChannel(event.channel);
    };
    return () => this.detach("Call ended");
  }

  private bindChannel(channel: RTCDataChannel) {
    if (this.channel && this.channel !== channel) this.detach("Transfer channel replaced");
    this.channel = channel;
    channel.binaryType = "arraybuffer";
    channel.bufferedAmountLowThreshold = LOW_BUFFER_BYTES;
    channel.onopen = () => this.emit();
    channel.onerror = () => this.detach("Secure transfer channel failed");
    channel.onclose = () => this.detach("Secure transfer channel closed");
    channel.onmessage = event => { void this.onMessage(event); };
    this.emit();
  }

  private detach(reason: string) {
    const channel = this.channel;
    this.channel = null;
    if (channel && channel.readyState !== "closed") {
      channel.onclose = null;
      try { channel.close(); } catch { /* already closed */ }
    }
    for (const record of this.records.values()) {
      if (record.timer) clearTimeout(record.timer);
      record.file = undefined;
      record.chunks = undefined;
    }
    this.records.clear();
    this.emit();
  }

  private sendControl(message: ControlMessage) {
    if (!this.channel || this.channel.readyState !== "open") throw new Error("No secure in-call transfer channel is available");
    this.channel.send(JSON.stringify(message));
  }

  private arm(record: TransferRecord) {
    if (record.timer) clearTimeout(record.timer);
    record.timer = setTimeout(() => {
      this.cancel(record.id, "Transfer timed out");
    }, TRANSFER_TIMEOUT_MS);
  }

  private finish(record: TransferRecord, status: TransferStatus, error?: string) {
    if (record.timer) clearTimeout(record.timer);
    record.timer = undefined;
    record.status = status;
    record.error = error;
    this.emit();
  }

  private fail(record: TransferRecord, reason: string) {
    this.finish(record, "error", reason);
    record.chunks = undefined;
    record.file = undefined;
  }

  async sendFile(file: File | Blob, requested: Omit<TransferMetadata, "size">): Promise<string> {
    const metadata = validateTransferMetadata({ ...requested, size: file.size });
    if (!metadata) throw new Error(`Files must be 1 byte–${MAX_TRANSFER_BYTES / 1024 / 1024}MB with a safe name`);
    if (!this.channel || this.channel.readyState !== "open") throw new Error("In-call transfers are unavailable. Use the chat attachment instead.");
    const id = makeId();
    const record: TransferRecord = { id, direction: "outgoing", metadata, status: "awaiting-consent", progress: 0, file };
    this.records.set(id, record);
    this.arm(record);
    this.sendControl({ v: 1, t: "request", id, metadata });
    this.emit();
    return id;
  }

  accept(id: string) {
    const record = this.records.get(id);
    if (!record || record.direction !== "incoming" || record.status !== "pending-consent") return;
    record.status = "receiving";
    record.progress = 0;
    record.chunks = [];
    record.receivedBytes = 0;
    record.expectedChunk = 0;
    this.arm(record);
    this.sendControl({ v: 1, t: "accept", id });
    this.emit();
  }

  reject(id: string) {
    const record = this.records.get(id);
    if (!record || record.direction !== "incoming" || record.status !== "pending-consent") return;
    this.sendControl({ v: 1, t: "reject", id });
    this.finish(record, "rejected");
  }

  cancel(id: string, reason = "Cancelled") {
    const record = this.records.get(id);
    if (!record || ["complete", "ready", "rejected", "cancelled", "error"].includes(record.status)) return;
    try { this.sendControl({ v: 1, t: "cancel", id }); } catch { /* channel already closed */ }
    this.finish(record, "cancelled", reason);
    record.chunks = undefined;
    record.file = undefined;
  }

  download(id: string) {
    const record = this.records.get(id);
    if (!record?.blob || record.status !== "ready") return;
    const href = URL.createObjectURL(record.blob);
    const anchor = document.createElement("a");
    anchor.href = href;
    anchor.download = record.metadata.name;
    anchor.rel = "noopener";
    anchor.click();
    window.setTimeout(() => URL.revokeObjectURL(href), 0);
  }

  private async onMessage(event: MessageEvent) {
    if (typeof event.data === "string") {
      const message = parseControl(event.data);
      if (message) await this.onControl(message);
      return;
    }
    const data = event.data instanceof ArrayBuffer
      ? event.data
      : event.data instanceof Blob ? await event.data.arrayBuffer() : null;
    if (data) this.onChunk(data);
  }

  private async onControl(message: ControlMessage) {
    if (message.t === "request") {
      if (this.records.has(message.id)) return;
      const record: TransferRecord = {
        id: message.id, direction: "incoming", metadata: message.metadata,
        status: "pending-consent", progress: 0,
      };
      this.records.set(record.id, record);
      this.arm(record);
      this.emit();
      return;
    }
    const record = this.records.get(message.id);
    if (!record) return;
    if (message.t === "accept" && record.direction === "outgoing" && record.status === "awaiting-consent") {
      record.status = "sending";
      this.arm(record);
      this.emit();
      try {
        await this.sendChunks(record);
        this.sendControl({ v: 1, t: "complete", id: record.id });
      } catch (error) {
        this.fail(record, error instanceof Error ? error.message : "Transfer failed");
      }
      return;
    }
    if (message.t === "reject") {
      record.file = undefined;
      return this.finish(record, "rejected");
    }
    if (message.t === "cancel") {
      record.file = undefined;
      record.chunks = undefined;
      return this.finish(record, "cancelled", "Cancelled by the other participant");
    }
    if (message.t === "complete" && record.direction === "incoming" && record.status === "receiving") {
      const valid = record.receivedBytes === record.metadata.size;
      if (!valid) {
        this.sendControl({ v: 1, t: "received", id: record.id, ok: false, reason: "Received byte count did not match" });
        return this.fail(record, "Transfer was incomplete");
      }
      record.blob = new Blob(record.chunks, { type: record.metadata.mime });
      record.chunks = undefined;
      this.finish(record, "ready");
      this.sendControl({ v: 1, t: "received", id: record.id, ok: true });
      return;
    }
    if (message.t === "received" && record.direction === "outgoing") {
      record.file = undefined;
      return message.ok
        ? this.finish(record, "complete")
        : this.fail(record, message.reason || "Recipient could not verify the transfer");
    }
  }

  private onChunk(frameValue: ArrayBuffer) {
    const frame = parseChunkFrame(frameValue);
    if (!frame) return;
    const record = this.records.get(frame.id);
    if (!record || record.direction !== "incoming" || record.status !== "receiving") return;
    if (frame.index !== record.expectedChunk || (record.receivedBytes ?? 0) + frame.chunk.byteLength > record.metadata.size) {
      this.cancel(record.id, "Invalid transfer chunk sequence");
      return;
    }
    record.chunks?.push(frame.chunk);
    record.receivedBytes = (record.receivedBytes ?? 0) + frame.chunk.byteLength;
    record.expectedChunk = (record.expectedChunk ?? 0) + 1;
    record.progress = Math.min(100, Math.round((record.receivedBytes / record.metadata.size) * 100));
    this.arm(record);
    this.emit();
  }

  private async sendChunks(record: TransferRecord) {
    if (!record.file) throw new Error("Selected file is unavailable");
    for (let offset = 0, index = 0; offset < record.file.size; offset += CHUNK_BYTES, index += 1) {
      if (record.status !== "sending") throw new Error("Transfer cancelled");
      await this.waitForBuffer();
      const bytes = new Uint8Array(await record.file.slice(offset, offset + CHUNK_BYTES).arrayBuffer());
      if (!this.channel || this.channel.readyState !== "open") throw new Error("Secure transfer channel closed");
      this.channel.send(createChunkFrame(record.id, index, bytes));
      record.progress = Math.min(100, Math.round(((offset + bytes.byteLength) / record.metadata.size) * 100));
      this.arm(record);
      this.emit();
    }
  }

  private waitForBuffer(): Promise<void> {
    const channel = this.channel;
    if (!channel || channel.readyState !== "open") return Promise.reject(new Error("Secure transfer channel closed"));
    if (channel.bufferedAmount < HIGH_BUFFER_BYTES) return Promise.resolve();
    return new Promise((resolve, reject) => {
      const timeout = window.setTimeout(() => {
        channel.onbufferedamountlow = null;
        reject(new Error("Transfer paused because the connection is too slow"));
      }, 30_000);
      channel.onbufferedamountlow = () => {
        window.clearTimeout(timeout);
        channel.onbufferedamountlow = null;
        resolve();
      };
    });
  }
}

/** Shared manager. UI subscribes here; it never creates a channel after SDP. */
export const peerTransfer = new PeerTransferManager();