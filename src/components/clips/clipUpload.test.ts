import { afterEach, describe, expect, it, vi } from "vitest";
import { cancelPendingUploads, uploadClip } from "./clipUpload";

afterEach(() => vi.unstubAllGlobals());

type Sent = { url: string; method: string; body: unknown; headers: Record<string, string> };

function setup({ me = 7, putStatus = 200, hold = false, confirm = { ok: true, clip: { id: 9, code: "HELX-123456", title: "Mon clip" } } } = {}) {
  const fetches: Array<{ url: string; body: Record<string, unknown> | null }> = [];
  const puts: Sent[] = [];
  let xhr: MockXHR | null = null;
  class MockXHR {
    status = 0;
    onload: (() => void) | null = null;
    onerror: (() => void) | null = null;
    onabort: (() => void) | null = null;
    upload: { onprogress: ((e: ProgressEvent) => void) | null } = { onprogress: null };
    headers: Record<string, string> = {};
    method = ""; url = "";
    constructor() { xhr = this; }
    open(method: string, url: string) { this.method = method; this.url = url; }
    setRequestHeader(name: string, value: string) { this.headers[name] = value; }
    send(body: Blob) {
      puts.push({ url: this.url, method: this.method, body, headers: this.headers });
      this.upload.onprogress?.({ lengthComputable: true, loaded: Math.floor(body.size / 2), total: body.size } as ProgressEvent);
      if (hold) return;
      this.status = putStatus;
      queueMicrotask(() => this.onload?.());
    }
    abort() { this.onabort?.(); }
  }
  vi.stubGlobal("XMLHttpRequest", MockXHR);
  vi.stubGlobal("fetch", vi.fn(async (url: string, init?: RequestInit) => {
    const body = init?.body ? JSON.parse(String(init.body)) : null;
    fetches.push({ url, body });
    const json = (data: unknown) => new Response(JSON.stringify(data), { status: 200, headers: { "Content-Type": "application/json" } });
    if (url.endsWith("api/auth/me")) return json({ id: me, username: "citizen" });
    if (url.endsWith("api/clips/presign")) return json({ url: "https://signed.example/put", key: "clips/abc" });
    if (url.endsWith("api/clips/confirm")) return json(confirm);
    if (url.endsWith("api/clips/cancel")) return json({ok:true});
    if (url.endsWith("api/clips/pending")) return json({ownerId:me,uploads:[{key:"clips/abc"}]});
    return new Response("{}", { status: 404 });
  }));
  return { fetches, puts, xhr: () => xhr };
}

const file = () => new File(["0123456789"], "voice.mp4", { type: "video/mp4" });

describe("direct clip transport", () => {
  it("presigns, PUTs the original File once with real progress, then confirms", async () => {
    const { fetches, puts } = setup();
    const original = file();
    const progress = vi.fn();
    const result = await uploadClip(original, { title: "Mon clip", durationSec: 61 }, new AbortController().signal, progress, { expectedOwner: 7 });
    expect(fetches.find(f => f.url.endsWith("presign"))!.body).toEqual({
      filename: "voice.mp4", title: "Mon clip", contentType: "video/mp4", size: 10, durationSec: 61, expectedOwnerId: 7,
    });
    expect(puts).toHaveLength(1);
    expect(puts[0]).toMatchObject({ url: "https://signed.example/put", method: "PUT" });
    expect(puts[0].body).toBe(original);
    expect(puts[0].headers).toEqual({ "Content-Type": "video/mp4", "If-None-Match": "*" });
    expect(progress).toHaveBeenCalledWith(50, 5, 10);
    expect(fetches.find(f => f.url.endsWith("confirm"))!.body).toEqual({ key: "clips/abc", expectedOwnerId: 7 });
    expect(result).toMatchObject({ code: "HELX-123456", name: "Mon clip" });
  });

  it("sends a 512 MiB original file directly without proxying bytes through API", async () => {
    const { puts, fetches } = setup();
    const original = file();
    Object.defineProperty(original, "size", { value: 512 * 1024 ** 2 });
    await uploadClip(original, { title: "Large clip", durationSec: 61 }, new AbortController().signal, () => {}, { expectedOwner: 7 });
    expect(puts).toHaveLength(1);
    expect(puts[0].body).toBe(original);
    expect(puts[0].url).toBe("https://signed.example/put");
    expect(fetches.every(call => !call.url.includes("/upload/chunk"))).toBe(true);
  });

  it("falls back to application/octet-stream when the browser gives no type", async () => {
    const { puts, fetches } = setup();
    await uploadClip(new File(["x"], "a.mkv"), { title: "t", durationSec: null }, new AbortController().signal, () => {}, { expectedOwner: 7 });
    expect(puts[0].headers["Content-Type"]).toBe("application/octet-stream");
    expect(fetches.find(f => f.url.endsWith("presign"))!.body!.contentType).toBe("application/octet-stream");
  });

  it("refuses to upload for a different authenticated account", async () => {
    const { puts } = setup({ me: 8 });
    await expect(uploadClip(file(), { title: "t", durationSec: 61 }, new AbortController().signal, () => {}, { expectedOwner: 7 })).rejects.toThrow(/compte/i);
    expect(puts).toHaveLength(0);
  });

  it("cancel aborts the XHR and never confirms", async () => {
    const { fetches, xhr } = setup({ hold: true });
    const controller = new AbortController();
    const pending = uploadClip(file(), { title: "t", durationSec: 61 }, controller.signal, () => {}, { expectedOwner: 7 });
    await vi.waitFor(() => expect(xhr()).not.toBeNull());
    controller.abort(new DOMException("Cancelled", "AbortError"));
    await expect(pending).rejects.toMatchObject({ name: "AbortError" });
    expect(fetches.some(f => f.url.endsWith("confirm"))).toBe(false);
  });

  it("fails once on PUT error without retrying", async () => {
    const { puts, fetches } = setup({ putStatus: 403 });
    await expect(uploadClip(file(), { title: "t", durationSec: 61 }, new AbortController().signal, () => {}, { expectedOwner: 7 })).rejects.toThrow("403");
    expect(puts).toHaveLength(1);
    expect(fetches.some(f => f.url.endsWith("confirm"))).toBe(false);
  });

  it("rejects an unconfirmed receipt", async () => {
    setup({ confirm: { ok: false } as never });
    await expect(uploadClip(file(), { title: "t", durationSec: 61 }, new AbortController().signal, () => {}, { expectedOwner: 7 })).rejects.toThrow();
  });

  it.each([104857601,2147483649])('does not impose an application size quota at %s bytes (simulated transport)', async size => {
    const { puts } = setup();const large=file();Object.defineProperty(large,'size',{value:size});
    await uploadClip(large,{title:'t',durationSec:61},new AbortController().signal,()=>{},{expectedOwner:7});
    expect(puts).toHaveLength(1);expect(puts[0].body).toBe(large);
  });
  it.each([0,Number.MAX_SAFE_INTEGER+1])('rejects invalid file metadata, not a quota: %s',async size=>{
    const {fetches}=setup();const invalid=file();Object.defineProperty(invalid,'size',{value:size});
    await expect(uploadClip(invalid,{title:'t',durationSec:61},new AbortController().signal,()=>{},{expectedOwner:7})).rejects.toThrow();
    expect(fetches).toHaveLength(0);
  });
});

it('releases a failed PUT slot with the same owner and never confirms it',async()=>{
 const {fetches}=setup({putStatus:404});
 await expect(uploadClip(file(),{title:'t',durationSec:68},new AbortController().signal,()=>{},{expectedOwner:7})).rejects.toThrow('التخزين (404)');
 expect(fetches.find(f=>f.url.endsWith('/cancel'))?.body).toEqual({key:'clips/abc',expectedOwnerId:7});
 expect(fetches.some(f=>f.url.endsWith('/confirm'))).toBe(false);
});
it('cancels aborted transfers with a separate non-aborted cleanup signal',async()=>{
 const {xhr}=setup({hold:true});const controller=new AbortController();
 const pending=uploadClip(file(),{title:'t',durationSec:68},controller.signal,()=>{},{expectedOwner:7});
 await vi.waitFor(()=>expect(xhr()).not.toBeNull());controller.abort();
 await expect(pending).rejects.toMatchObject({name:'AbortError'});
 const cancel=(fetch as ReturnType<typeof vi.fn>).mock.calls.find(([url])=>String(url).endsWith('/cancel'));
 expect(cancel?.[1].signal.aborted).toBe(false);
});
it('never auto-cancels after confirmation begins, even with a lost/invalid receipt',async()=>{
 const {fetches}=setup({confirm:{ok:false} as never});
 await expect(uploadClip(file(),{title:'t',durationSec:68},new AbortController().signal,()=>{},{expectedOwner:7})).rejects.toThrow();
 expect(fetches.some(f=>f.url.endsWith('/cancel'))).toBe(false);
});
it('explicit recovery lists and cancels only the verified owner pending uploads',async()=>{
 const {fetches}=setup();expect(await cancelPendingUploads(7,new AbortController().signal)).toBe(1);
 expect(fetches.find(f=>f.url.endsWith('/cancel'))?.body).toEqual({key:'clips/abc',expectedOwnerId:7});
});
it('does not cancel another account uploads after a cookie owner change',async()=>{
 const {fetches}=setup({me:8});await expect(cancelPendingUploads(7,new AbortController().signal)).rejects.toThrow('compte');
 expect(fetches.some(f=>f.url.endsWith('/cancel'))).toBe(false);
});
it('retries transient confirmation without repeating the storage transfer',async()=>{
 const {puts}=setup();
 const original=fetch;
 let confirmations=0;
 vi.stubGlobal('fetch',vi.fn(async(url:string,init?:RequestInit)=>{
  if(url.endsWith('api/clips/confirm') && ++confirmations===1)return new Response(JSON.stringify({error:'Temporarily unavailable'}),{status:503});
  return original(url,init);
 }));
 const clip=await uploadClip(file(),{title:'Title',durationSec:68},new AbortController().signal,vi.fn(),{expectedOwner:7});
 expect(clip.code).toBe('HELX-123456');expect(confirmations).toBe(2);expect(puts).toHaveLength(1);
});
