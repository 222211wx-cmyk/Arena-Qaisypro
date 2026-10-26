import { afterEach, describe, expect, it, vi } from "vitest";
import { directAttachmentUpload } from "./directAttachmentUpload";

afterEach(() => vi.unstubAllGlobals());
function setup(status = 200, hold = false) {
  const requests: any[] = [];
  let xhr: FakeXHR;
  class FakeXHR {
    upload = { onprogress: null as any };
    onload: any; onerror: any; onabort: any;
    status = status;
    headers: Record<string, string> = {};
    method = ""; url = ""; body?: Blob;
    constructor() { xhr = this; }
    open(method: string, url: string) { this.method = method; this.url = url; }
    setRequestHeader(key: string, value: string) { this.headers[key] = value; }
    send(body: Blob) {
      this.body = body;
      this.upload.onprogress?.({ lengthComputable: true, loaded: body.size, total: body.size });
      if (!hold) queueMicrotask(() => this.onload());
    }
    abort() { this.onabort(); }
  }
  vi.stubGlobal("XMLHttpRequest", FakeXHR);
  vi.stubGlobal("fetch", vi.fn(async (_url, options) => {
    const body = JSON.parse(options.body); requests.push(body);
    return new Response(JSON.stringify(body.action === "start"
      ? { url: "https://storage.invalid/private", ticket: "opaque" }
      : { url: "/api/messages/files/r2chat-test.enc" }));
  }));
  return { requests, xhr: () => xhr! };
}
describe("private direct attachment upload", () => {
  it("transfers the exact encrypted blob once and confirms after PUT", async () => {
    const mock = setup(); const progress = vi.fn();
    const ciphertext = new Blob(["encrypted bytes"], { type: "application/octet-stream" });
    const result = await directAttachmentUpload("/api/messages/upload/direct", ciphertext, new AbortController().signal, progress);
    expect(mock.xhr().body).toBe(ciphertext);
    expect(mock.xhr().method).toBe("PUT");
    expect(mock.xhr().headers).toEqual({ "Content-Type": "application/octet-stream", "If-None-Match": "*" });
    expect(mock.requests).toEqual([{ action: "start", size: ciphertext.size }, { action: "complete", ticket: "opaque" }]);
    expect(progress).toHaveBeenCalledWith(100);
    expect(result.url).toContain("/api/messages/files/");
  });
  it("does not confirm or retry a rejected PUT", async () => {
    const mock = setup(403);
    await expect(directAttachmentUpload("/endpoint", new Blob(["ciphertext"]), new AbortController().signal, vi.fn())).rejects.toThrow();
    expect(mock.requests).toHaveLength(1);
  });
  it("aborts the transfer without a confirmation", async () => {
    const mock = setup(200, true); const controller = new AbortController();
    const pending = directAttachmentUpload("/endpoint", new Blob(["ciphertext"]), controller.signal, vi.fn());
    const rejected = expect(pending).rejects.toMatchObject({ name: "AbortError" });
    await vi.waitFor(() => expect(mock.xhr()?.body).toBeDefined());
    controller.abort();
    await rejected;
    expect(mock.requests).toHaveLength(1);
  });
});