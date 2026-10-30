import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createClipPresign, publicClipUrl, getPublicUrl, signClipPut, MAX_DIRECT_CLIP_BYTES } from '../server/clip-r2.mjs';

class ClipUploadError extends Error { constructor(status, message) { super(message); this.status = status; } }
function setup(overrides = {}) {
  const queries = [], signed = [], errors = [];
  const deps = {
    env: { R2_PUBLIC_URL: 'https://media.example.test' },
    pool: { async query(sql, params) { queries.push({ sql, params }); return { rows: [] }; } },
    r2Config: () => ({ bucket: 'gdna-arena' }),
    resolveClipUploadType: (type, name) => type.startsWith('video/') ? type : type === 'application/octet-stream' && name.endsWith('.mp4') ? 'video/mp4' : null,
    clipDownloadExtension: () => '.mp4',
    validateClipDisplayTitle(title) {
      if (title === undefined) return undefined;
      if (typeof title !== 'string' || !title.trim() || [...title.trim()].length > 120) throw new ClipUploadError(400, 'Invalid title');
      return title.trim();
    },
    ClipUploadError, logger: { error: (...args) => errors.push(args) },
    async sign(client, input) { signed.push(input); return 'https://upload.example.test/signed'; },
    ...overrides,
  };
  const handle = createClipPresign(deps);
  const request = { session: { userId: 7 }, body: {
    filename: 'source.mp4', title: ' Citizen clip ', contentType: 'video/mp4', size: 42, durationSec: null, ownerId: 7,
  } };
  const res = { statusCode: 200, headers: {}, set(k, v) { this.headers[k] = v; return this; }, status(code) { this.statusCode = code; return this; }, json(body) { this.body = body; return this; } };
  return { handle, request, res, queries, signed, errors };
}

test('public playback uses only the public base and preserves the exact R2 key', () => {
  const env = { R2_PUBLIC_URL: 'https://media.example.test/assets///' };
  assert.equal(publicClipUrl('r2:clips/original/7/file.mp4', env), 'https://media.example.test/assets/clips/original/7/file.mp4');
  assert.equal(publicClipUrl('r2:clips/derived/poster.webp', env), 'https://media.example.test/assets/clips/derived/poster.webp');
  assert.equal(publicClipUrl('r2:clips/original/7/file.mp4', {}), null);
  assert.equal(publicClipUrl('legacy.mp4', env), null);
  assert.equal(getPublicUrl('clips/derived/poster.webp', env), 'https://media.example.test/assets/clips/derived/poster.webp');
  for (const base of ['http://media.example.test', 'https://user:pass@media.example.test', 'https://media.example.test?a=b', 'https://media.example.test#x', 'https://account.r2.cloudflarestorage.com']) {
    assert.throws(() => publicClipUrl('r2:clips/original/7/file.mp4', { R2_PUBLIC_URL: base }));
  }
  for (const key of ['../secret', 'chat/private.mp4', 'clips/original/../secret', 'clips/original/a?x=y', 'clips/original/a\\b']) {
    assert.throws(() => publicClipUrl(`r2:${key}`, env));
  }
});

test('accepts an account-scoped original PUT without publishing a clip', async () => {
  const f = setup(); await f.handle(f.request, f.res);
  assert.equal(f.res.statusCode, 201);
  assert.equal(f.res.headers['Cache-Control'], 'no-store');
  assert.match(f.res.body.key, /^clips\/original\/7\/[a-f0-9-]+\.mp4$/);
  assert.equal(f.res.body.uploadUrl, 'https://upload.example.test/signed');
  assert.equal(f.res.body.url, `https://media.example.test/${f.res.body.key}`);
  assert.notEqual(f.res.body.url, f.res.body.uploadUrl);
  assert.deepEqual(f.signed[0], { Bucket: 'gdna-arena', Key: f.res.body.key, ContentType: 'video/mp4', ContentLength: 42, IfNoneMatch: '*' });
  assert.equal(f.queries.length, 1);
  assert.match(f.queries[0].sql, /INSERT INTO r2_clip_uploads/);
  assert.match(f.queries[0].sql, /'direct-put'/);
  assert.ok(!/INSERT INTO clips\b/.test(f.queries[0].sql));
  const p = f.queries[0].params;
  assert.equal(p[1], 7); assert.equal(p[2], `r2:${f.res.body.key}`);
  assert.equal(p[4], 'Citizen clip'); assert.equal(p[5], 'video/mp4');
  assert.equal(p[6], 42); assert.equal(p[7], 0);
  assert.ok(p[8] > new Date() && p[8].getTime() <= Date.now() + 3600_000);
});

test('generic mobile MIME signs the exact client header but stores normalized playback type', async () => {
  const f = setup(); f.request.body.contentType = 'application/octet-stream';
  await f.handle(f.request, f.res);
  assert.equal(f.res.statusCode, 201);
  assert.equal(f.signed[0].ContentType, 'application/octet-stream');
  assert.equal(f.queries[0].params[5], 'video/mp4');
});

test('rejects anonymous uploads and account switches before any storage or DB work', async () => {
  for (const [session, owner, code] of [[undefined, 7, 401], [{ userId: 7 }, 8, 403]]) {
    const f = setup(); f.request.session = session; f.request.body.ownerId = owner;
    await f.handle(f.request, f.res); assert.equal(f.res.statusCode, code);
    assert.equal(f.signed.length + f.queries.length, 0);
  }
});

test('validates metadata, type, title and the server-side size limit', async () => {
  for (const patch of [{ filename: '' }, { filename: 'x'.repeat(1025) }, { contentType: 'text/html' }, { size: 0 }, { size: '42' }, { size: 1.5 }, { size: MAX_DIRECT_CLIP_BYTES + 1 }, { durationSec: -1 }, { durationSec: '60' }, { title: '' }, { title: 'x'.repeat(121) }, { title: undefined }]) {
    const f = setup(); Object.assign(f.request.body, patch);
    await f.handle(f.request, f.res); assert.equal(f.res.statusCode, 400, JSON.stringify(patch));
    assert.equal(f.signed.length + f.queries.length, 0);
  }
  const f = setup(); f.request.body.size = MAX_DIRECT_CLIP_BYTES;
  await f.handle(f.request, f.res); assert.equal(f.res.statusCode, 201);
});

test('configuration, signing and database failures never return a success URL or internal error', async () => {
  for (const overrides of [{ env: {} }, { env: { R2_PUBLIC_URL: 'http://invalid.test' } }, { r2Config: () => null }, { r2Config: () => ({ bucket: 'helixly-clips' }) }, { sign: async () => { throw new Error('internal-signing-details'); } }, { pool: { query: async () => { throw new Error('internal-database-details'); } } }]) {
    const f = setup(overrides); await f.handle(f.request, f.res);
    assert.equal(f.res.statusCode, 503);
    assert.equal(f.res.body.url, undefined);
    assert.ok(!JSON.stringify(f.res.body).includes('internal-'));
  }
});

test('real SDK signs the size, content type and create-only precondition without a network request', async () => {
  const config = { endpoint: 'https://example.test', accessKeyId: 'test-only', secretAccessKey: 'test-only' };
  {
    const url = new URL(await signClipPut(config, { Bucket: 'gdna-arena', Key: 'clips/original/7/test.mp4', ContentType: 'video/mp4', ContentLength: 42, IfNoneMatch: '*' }));
    const headers = url.searchParams.get('X-Amz-SignedHeaders').split(';');
    for (const header of ['content-type', 'content-length', 'if-none-match']) assert.ok(headers.includes(header), headers.join(';'));
    assert.equal(url.searchParams.get('X-Amz-Expires'), '3600');
    assert.equal(url.searchParams.has('x-amz-checksum-crc32'), false);
    assert.equal(url.searchParams.has('x-amz-sdk-checksum-algorithm'), false);
  }
});

test('supports the fileName alias and optional browser duration hint, with session-owned legacy compatibility', async () => {
  const f = setup(); f.request.body.fileName = f.request.body.filename;
  delete f.request.body.filename; delete f.request.body.durationSec;
  f.request.body.expectedOwnerId = f.request.body.ownerId; delete f.request.body.ownerId;
  await f.handle(f.request, f.res); assert.equal(f.res.statusCode, 201);
  assert.equal(f.queries[0].params[7], 0);
});
test('never lets conflicting owner aliases override the authenticated session', async () => {
  const f = setup(); f.request.body.expectedOwnerId = 8;
  await f.handle(f.request, f.res); assert.equal(f.res.statusCode, 403);
  assert.equal(f.signed.length + f.queries.length, 0);
});

test('nullable or omitted browser owner still uses a verified server session', async () => {
  for (const ownerId of [undefined, null]) {
    const f = setup(); f.request.body.ownerId = ownerId;
    await f.handle(f.request, f.res);
    assert.equal(f.res.statusCode, 201);
    assert.equal(f.queries[0].params[1], 7);
    const anonymous = setup(); anonymous.request.session = undefined; anonymous.request.body.ownerId = ownerId;
    await anonymous.handle(anonymous.request, anonymous.res);
    assert.equal(anonymous.res.statusCode, 401);
  }
});
