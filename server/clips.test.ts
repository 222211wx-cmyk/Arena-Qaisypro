// @vitest-environment node
import { beforeEach, expect, it, vi } from 'vitest';
const { execute, send } = vi.hoisted(() => ({ execute: vi.fn(), send: vi.fn() }));
vi.mock('./clients.js', () => ({ database: () => ({ execute }), storage: () => ({ client: { send }, bucket: 'test' }) }));
import { GET as metadata } from '../api/clip';
import { GET as stream } from '../api/clips/stream';
beforeEach(() => vi.resetAllMocks());
it('rejects invalid IDs before querying', async () => {
  expect((await metadata(new Request('https://example.test/api/clip?id=NaN'))).status).toBe(400);
  expect(execute).not.toHaveBeenCalled();
});
it('returns missing clips as 404', async () => {
  execute.mockResolvedValue({ rows: [] });
  expect((await metadata(new Request('https://example.test/api/clip?id=1'))).status).toBe(404);
});
it('returns numeric counts and a stream URL', async () => {
  execute.mockResolvedValueOnce({ rows: [{ id: 1 }] }).mockResolvedValueOnce({ rows: [{ count: 15 }] }).mockResolvedValueOnce({ rows: [{ count: 2 }] });
  const response = await metadata(new Request('https://example.test/api/clip?id=1'));
  expect(await response.json()).toEqual({ clip: { id: 1 }, likes: 15, bookmarks: 2, streamUrl: '/api/clips/stream?id=1' });
});
it('forwards range, falls back to original and does not count partial views', async () => {
  execute.mockResolvedValue({ rows: [{ object_r: 'r2:/clips/test', object_mobile_r: null }] });
  send.mockResolvedValue({ Body: { transformToWebStream: () => new ReadableStream({ start(c) { c.enqueue(new Uint8Array([1])); c.close(); } }) }, ContentLength: 1, ContentRange: 'bytes 0-0/10', ContentType: 'video/mp4' });
  const response = await stream(new Request('https://example.test/api/clips/stream?id=1&variant=mobile', { headers: { Range: 'bytes=0-0' } }));
  expect(response.status).toBe(206);
  expect(response.headers.get('Content-Range')).toBe('bytes 0-0/10');
  expect(send.mock.calls[0][0].input).toMatchObject({ Key: 'clips/test', Range: 'bytes=0-0' });
  expect(execute).toHaveBeenCalledTimes(1);
});
