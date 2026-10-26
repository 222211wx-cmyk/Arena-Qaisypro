export interface E2ERecipientKey {
  userId: number;
  deviceId: string;
  publicKey: JsonWebKey;
  fingerprint: string;
}

export interface SecureAttachmentMetadata {
  key: string;
  iv: string;
  mime: string;
  name: string;
  size: number;
  kind: "image" | "video" | "audio" | "file";
}

export type SecureMessagePayload =
  | { kind: "text"; text: string }
  | { kind: "attachment"; attachment: SecureAttachmentMetadata };

export interface CallSecretEnvelope {
  wrappedSecret: string;
  fingerprint: string;
}

type Identity = {
  userId: number;
  deviceId: string;
  privateKey: CryptoKey;
  publicKey: CryptoKey;
  fingerprint: string;
};

const DB_NAME = "gdna-amis-e2ee";
const STORE = "identities";
const PREFIX = "e2e:v1:";
const encoder = new TextEncoder();
const decoder = new TextDecoder();
const identityPromises = new Map<number, Promise<{ deviceId: string; publicKey: JsonWebKey; fingerprint: string }>>();

function webCrypto(): Crypto {
  if (!globalThis.crypto?.subtle || !globalThis.crypto.getRandomValues) {
    throw new Error("Web Crypto API is unavailable.");
  }
  return globalThis.crypto;
}

function db(): Promise<IDBDatabase> {
  if (!globalThis.indexedDB) throw new Error("IndexedDB is unavailable; device identity cannot be accessed.");
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(STORE)) request.result.createObjectStore(STORE, { keyPath: "userId" });
    };
    request.onerror = () => reject(new Error(`Unable to open device identity storage: ${request.error?.message ?? "unknown error"}`));
    request.onsuccess = () => resolve(request.result);
  });
}

async function readIdentity(userId: number): Promise<Identity | undefined> {
  const database = await db();
  try {
    return await new Promise<Identity | undefined>((resolve, reject) => {
      const request = database.transaction(STORE, "readonly").objectStore(STORE).get(userId);
      request.onerror = () => reject(new Error(`Unable to read device identity: ${request.error?.message ?? "unknown error"}`));
      request.onsuccess = () => resolve(request.result as Identity | undefined);
    });
  } finally {
    database.close();
  }
}

async function saveIdentity(identity: Identity): Promise<void> {
  const database = await db();
  try {
    await new Promise<void>((resolve, reject) => {
      const transaction = database.transaction(STORE, "readwrite");
      transaction.objectStore(STORE).put(identity);
      transaction.onabort = () => reject(new Error(`Unable to save device identity: ${transaction.error?.message ?? "unknown error"}`));
      transaction.oncomplete = () => resolve();
    });
  } finally {
    database.close();
  }
}

function b64url(bytes: ArrayBuffer | Uint8Array): string {
  const values = new Uint8Array(bytes);
  let binary = "";
  for (const value of values) binary += String.fromCharCode(value);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/u, "");
}

function fromB64url(value: string): ArrayBuffer {
  if (!/^[A-Za-z0-9_-]*$/u.test(value) || value.length % 4 === 1) throw new Error("Invalid base64url value.");
  const padded = value.replace(/-/g, "+").replace(/_/g, "/") + "=".repeat((4 - (value.length % 4)) % 4);
  try {
    const binary = atob(padded);
    const bytes = new Uint8Array(binary.length);
    for (let index = 0; index < binary.length; index++) bytes[index] = binary.charCodeAt(index);
    return bytes.buffer;
  } catch {
    throw new Error("Invalid base64url value.");
  }
}

function canonicalPublicKey(key: JsonWebKey): string {
  if (!key || typeof key !== "object" || key.kty !== "RSA" || typeof key.n !== "string" || typeof key.e !== "string") {
    throw new Error("Invalid RSA public key.");
  }
  return JSON.stringify({ kty: key.kty, n: key.n, e: key.e });
}

async function fingerprint(key: JsonWebKey): Promise<string> {
  return b64url(await webCrypto().subtle.digest("SHA-256", encoder.encode(canonicalPublicKey(key))));
}

function validUserId(userId: number): void {
  if (!Number.isSafeInteger(userId)) throw new Error("A valid user id is required.");
}

async function publicJwk(identity: Identity): Promise<JsonWebKey> {
  return webCrypto().subtle.exportKey("jwk", identity.publicKey);
}

async function createOrReadDeviceIdentity(userId: number): Promise<{ deviceId: string; publicKey: JsonWebKey; fingerprint: string }> {
  validUserId(userId);
  const existing = await readIdentity(userId);
  if (existing?.privateKey && existing.publicKey && existing.fingerprint) {
    const deviceId = existing.deviceId || crypto.randomUUID().replace(/-/g, "");
    if (!existing.deviceId) await saveIdentity({ ...existing, deviceId });
    return { deviceId, publicKey: await publicJwk(existing), fingerprint: existing.fingerprint };
  }
  const pair = await webCrypto().subtle.generateKey(
    { name: "RSA-OAEP", modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: "SHA-256" },
    false,
    ["encrypt", "decrypt"],
  ) as CryptoKeyPair;
  const key = await webCrypto().subtle.exportKey("jwk", pair.publicKey);
  const identity = {
    userId,
    deviceId: crypto.randomUUID().replace(/-/g, ""),
    privateKey: pair.privateKey,
    publicKey: pair.publicKey,
    fingerprint: await fingerprint(key),
  };
  await saveIdentity(identity);
  return { deviceId: identity.deviceId, publicKey: key, fingerprint: identity.fingerprint };
}

export function ensureDeviceIdentity(userId: number): Promise<{
  deviceId: string;
  publicKey: JsonWebKey;
  fingerprint: string;
}> {
  validUserId(userId);
  const pending = identityPromises.get(userId);
  if (pending) return pending;
  const task = createOrReadDeviceIdentity(userId).finally(() => {
    if (identityPromises.get(userId) === task) identityPromises.delete(userId);
  });
  identityPromises.set(userId, task);
  return task;
}

export async function getDeviceFingerprint(userId: number): Promise<string> {
  validUserId(userId);
  const identity = await readIdentity(userId);
  if (!identity) throw new Error("No device identity exists for this user.");
  return identity.fingerprint;
}

async function importRecipient(key: JsonWebKey): Promise<CryptoKey> {
  canonicalPublicKey(key);
  try {
    return await webCrypto().subtle.importKey("jwk", key, { name: "RSA-OAEP", hash: "SHA-256" }, false, ["encrypt"]);
  } catch {
    throw new Error("Invalid recipient RSA public key.");
  }
}

function validAttachment(value: unknown): value is SecureAttachmentMetadata {
  if (!value || typeof value !== "object") return false;
  const item = value as Record<string, unknown>;
  return typeof item.key === "string" && typeof item.iv === "string" && typeof item.mime === "string" &&
    typeof item.name === "string" && typeof item.size === "number" && Number.isSafeInteger(item.size) && item.size >= 0 &&
    (item.kind === "image" || item.kind === "video" || item.kind === "audio" || item.kind === "file");
}

function validPayload(value: unknown): value is SecureMessagePayload {
  if (!value || typeof value !== "object") return false;
  const item = value as Record<string, unknown>;
  return (item.kind === "text" && typeof item.text === "string") ||
    (item.kind === "attachment" && validAttachment(item.attachment));
}

export function isE2EMessage(value: string): boolean {
  return typeof value === "string" && value.startsWith(PREFIX);
}

export async function encryptMessagePayload(payload: SecureMessagePayload, recipients: E2ERecipientKey[]): Promise<string> {
  if (!validPayload(payload)) throw new Error("Invalid secure message payload.");
  if (!recipients.length) throw new Error("At least one recipient is required.");
  const devices = new Set<string>();
  for (const recipient of recipients) {
    validUserId(recipient.userId);
    if (typeof recipient.deviceId !== "string" || !/^[A-Za-z0-9_-]{16,80}$/u.test(recipient.deviceId)) {
      throw new Error("A valid recipient device id is required.");
    }
    const recipientDevice = `${recipient.userId}.${recipient.deviceId}`;
    if (devices.has(recipientDevice)) throw new Error("Duplicate recipient device id.");
    if (typeof recipient.fingerprint !== "string" || !recipient.fingerprint) throw new Error("Recipient fingerprint is required.");
    if (recipient.fingerprint !== await fingerprint(recipient.publicKey)) throw new Error("Recipient fingerprint does not match its public key.");
    devices.add(recipientDevice);
  }
  const crypto = webCrypto();
  const aes = await crypto.subtle.generateKey({ name: "AES-GCM", length: 256 }, true, ["encrypt", "decrypt"]);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ciphertext = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, aes, encoder.encode(JSON.stringify(payload)));
  const raw = await crypto.subtle.exportKey("raw", aes);
  const keys: Record<string, { wrappedKey: string; fingerprint: string }> = {};
  await Promise.all(recipients.map(async (recipient) => {
    const wrapped = await crypto.subtle.encrypt({ name: "RSA-OAEP" }, await importRecipient(recipient.publicKey), raw);
    keys[`${recipient.userId}.${recipient.deviceId}`] = {
      wrappedKey: b64url(wrapped),
      fingerprint: recipient.fingerprint,
    };
  }));
  return PREFIX + b64url(encoder.encode(JSON.stringify({ v: 1, alg: "RSA-OAEP-256/A256GCM", iv: b64url(iv), ciphertext: b64url(ciphertext), keys })));
}

export async function decryptMessagePayload(value: string, userId: number): Promise<SecureMessagePayload | null> {
  if (!isE2EMessage(value)) return null;
  validUserId(userId);
  try {
    let envelope: Record<string, unknown>;
    try {
      envelope = JSON.parse(decoder.decode(fromB64url(value.slice(PREFIX.length)))) as Record<string, unknown>;
    } catch {
      throw new Error("Malformed encrypted message.");
    }
    if (envelope.v !== 1 || envelope.alg !== "RSA-OAEP-256/A256GCM" || typeof envelope.iv !== "string" || typeof envelope.ciphertext !== "string" || !envelope.keys || typeof envelope.keys !== "object") throw new Error("Malformed encrypted message.");
    const identity = await readIdentity(userId);
    if (!identity) throw new Error("No device identity exists for this user.");
    const entryKey = `${userId}.${identity.deviceId}`;
    const entry = (envelope.keys as Record<string, unknown>)[entryKey] as Record<string, unknown> | undefined;
    if (!entry || typeof entry.wrappedKey !== "string" || typeof entry.fingerprint !== "string") {
      throw new Error("No encrypted message key exists for this device.");
    }
    if (entry.fingerprint !== identity.fingerprint) throw new Error("Encrypted message was addressed to a different device identity.");
    const raw = await webCrypto().subtle.decrypt({ name: "RSA-OAEP" }, identity.privateKey, fromB64url(entry.wrappedKey));
    const aes = await webCrypto().subtle.importKey("raw", raw, "AES-GCM", false, ["decrypt"]);
    const plain = await webCrypto().subtle.decrypt({ name: "AES-GCM", iv: fromB64url(envelope.iv) }, aes, fromB64url(envelope.ciphertext));
    const payload: unknown = JSON.parse(decoder.decode(plain));
    if (!validPayload(payload)) throw new Error("Decrypted message has an invalid payload.");
    return payload;
  } catch (error) {
    if (error instanceof Error && (/^(Malformed|No |Encrypted message|Decrypted message|Invalid base64url)/u).test(error.message)) throw error;
    throw new Error("Unable to decrypt encrypted message.");
  }
}

function attachmentKind(mime: string): SecureAttachmentMetadata["kind"] {
  if (mime.startsWith("image/")) return "image";
  if (mime.startsWith("video/")) return "video";
  if (mime.startsWith("audio/")) return "audio";
  return "file";
}

export async function encryptAttachmentBlob(blob: Blob, name: string): Promise<{ blob: Blob; metadata: SecureAttachmentMetadata }> {
  if (!(blob instanceof Blob) || typeof name !== "string") throw new Error("A blob and attachment name are required.");
  const crypto = webCrypto(), iv = crypto.getRandomValues(new Uint8Array(12));
  const aes = await crypto.subtle.generateKey({ name: "AES-GCM", length: 256 }, true, ["encrypt", "decrypt"]);
  const ciphertext = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, aes, await blob.arrayBuffer());
  return {
    blob: new Blob([ciphertext], { type: "application/octet-stream" }),
    metadata: { key: b64url(await crypto.subtle.exportKey("raw", aes)), iv: b64url(iv), mime: blob.type, name, size: blob.size, kind: attachmentKind(blob.type) },
  };
}

export async function decryptAttachmentBlob(blob: Blob, metadata: SecureAttachmentMetadata): Promise<Blob> {
  if (!(blob instanceof Blob) || !validAttachment(metadata)) throw new Error("Invalid encrypted attachment metadata.");
  try {
    const aes = await webCrypto().subtle.importKey("raw", fromB64url(metadata.key), "AES-GCM", false, ["decrypt"]);
    const plain = await webCrypto().subtle.decrypt({ name: "AES-GCM", iv: fromB64url(metadata.iv) }, aes, await blob.arrayBuffer());
    if (plain.byteLength !== metadata.size) throw new Error("Attachment size mismatch.");
    return new Blob([plain], { type: metadata.mime });
  } catch {
    throw new Error("Unable to decrypt attachment.");
  }
}

export async function encryptCallSecret(secret: string, recipient: E2ERecipientKey): Promise<CallSecretEnvelope> {
  if (typeof secret !== "string" || !recipient || typeof recipient.fingerprint !== "string") throw new Error("A call secret and recipient are required.");
  validUserId(recipient.userId);
  if (recipient.fingerprint !== await fingerprint(recipient.publicKey)) throw new Error("Recipient fingerprint does not match its public key.");
  const wrapped = await webCrypto().subtle.encrypt({ name: "RSA-OAEP" }, await importRecipient(recipient.publicKey), encoder.encode(secret));
  return { wrappedSecret: b64url(wrapped), fingerprint: recipient.fingerprint };
}

export async function decryptCallSecret(userId: number, envelope: CallSecretEnvelope): Promise<string> {
  validUserId(userId);
  if (!envelope || typeof envelope.wrappedSecret !== "string" || typeof envelope.fingerprint !== "string") throw new Error("Malformed call secret envelope.");
  const identity = await readIdentity(userId);
  if (!identity) throw new Error("No device identity exists for this user.");
  if (identity.fingerprint !== envelope.fingerprint) throw new Error("Call secret was addressed to a different device identity.");
  try {
    return decoder.decode(await webCrypto().subtle.decrypt({ name: "RSA-OAEP" }, identity.privateKey, fromB64url(envelope.wrappedSecret)));
  } catch {
    throw new Error("Unable to decrypt call secret.");
  }
}