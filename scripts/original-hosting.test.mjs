import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import AdmZip from 'adm-zip';

execFileSync(process.execPath, ['scripts/prepare-original-backend.mjs']);
const runtime = readFileSync('.original-backend/audited.mjs', 'utf8');
const original = new AdmZip('api-server.zip').readAsText('api-server/dist/index.mjs');

test('original archive is unchanged and protection removes destructive startup', () => {
  assert.ok(original.includes('DROP TABLE IF EXISTS password_reset_codes'));
  for (const sql of ['DROP TABLE IF EXISTS email_verification_codes', 'DROP TABLE IF EXISTS password_reset_codes', 'ALTER TABLE users DROP COLUMN IF EXISTS email_verified']) {
    assert.ok(!runtime.includes(sql), sql);
  }
  assert.ok(!runtime.includes('function autoSeedTestUsers'));
  assert.ok(!runtime.includes('sessionStoreReady.then(() => prepareDevelopmentDatabase())'));
  assert.ok(runtime.includes('pruneSessionInterval: false'));
  assert.ok(runtime.includes('export default originalServer;'));
  assert.ok(runtime.includes('spawn2(clipFfprobe.path, ['));
  assert.ok(!runtime.includes('spawn2("ffprobe", ['));
  assert.ok(runtime.includes('LOWER(${usersTable.email}) = LOWER(${username}) OR LOWER(${usersTable.username}) = LOWER(${username})'));
  assert.ok(runtime.includes('req.body?.email'));
  assert.ok(runtime.includes('res.json({ ...finalClipReceipt(clip), url: publicClipUrl(r2Reference(key2)) });'));
  assert.ok(runtime.includes('res.json({ ...finalClipReceipt(existing.rows[0]), url: publicClipUrl(r2Reference(key2)) });'));
  assert.ok(runtime.includes('req.body?.ownerId !== void 0 && req.body.ownerId !== req.session.userId'));
  assert.ok(runtime.includes('const bucket = process.env.R2_BUCKET?.trim();'));
  assert.ok(!runtime.includes('(process.env.R2_BUCKET_NAME || process.env.R2_BUCKET)?.trim()'));
  assert.ok(runtime.includes('const existing = await db.select().from(usersTable).where(sql`LOWER(${usersTable.username}) = LOWER(${username})`).limit(1)'));
});

test('original routes remain unchanged apart from restoring direct clip presign', () => {
  const routes = s => s.match(/^(?:router\d*|app|app_default|adminRouter)\.(?:get|post|put|delete|patch|use)\(.*$/gm);
  const added = 'router55.post("/clips/presign", createClipPresign({ pool, r2Config, resolveClipUploadType, clipDownloadExtension, validateClipDisplayTitle, ClipUploadError, logger }));';
  assert.ok(routes(runtime).includes(added));
  const sessionAlias = 'router4.get(["/auth/me", "/auth/session"], async (req, res) => {';
  assert.ok(routes(runtime).includes(sessionAlias));
  assert.deepEqual(routes(runtime).filter(route => route !== added).map(route => route === sessionAlias ? 'router4.get("/auth/me", async (req, res) => {' : route), routes(original));
  const config = JSON.parse(readFileSync('vercel.json'));
  assert.deepEqual(config.rewrites[0], { source: '/api/:path*', destination: '/api/original' });
});

test('production cold start and public HTTP route perform no DB queries or external calls', () => {
  const isolated = mkdtempSync(join(tmpdir(), 'original-hosting-'));
  cpSync('.original-backend', join(isolated, '.original-backend'), { recursive: true });
  mkdirSync(join(isolated, 'api'));
  writeFileSync(join(isolated, 'package.json'), JSON.stringify({ type: 'module' }));
  writeFileSync(join(isolated, 'api/original.js'), readFileSync('api/original.js'));
  const probe = spawnSync(process.execPath, ['--no-experimental-require-module', '--input-type=module', '-e', `
    import { registerHooks, syncBuiltinESMExports } from 'node:module';
    import net from 'node:net';
    import tls from 'node:tls';
    import http from 'node:http';
    import https from 'node:https';
    import fs from 'node:fs';
    import { Readable } from 'node:stream';
    let externalAttempts = 0;
    registerHooks({ load(url, context, nextLoad) {
      const result = nextLoad(url, context);
      if (url.endsWith('/.original-backend/runtime.mjs')) {
        if (!String(result.source).includes('pool = new Pool3({ connectionString, ssl: { rejectUnauthorized: false }, connectionTimeoutMillis: 5e3 });')) throw new Error('SQL probe anchor missing');
        const source = String(result.source).replace('pool = new Pool3({ connectionString, ssl: { rejectUnauthorized: false }, connectionTimeoutMillis: 5e3 });',
          'pool = new Pool3({ connectionString, ssl: { rejectUnauthorized: false }, connectionTimeoutMillis: 5e3 }); pool.query = (sql) => { if(globalThis.__allowAmeeq) return globalThis.__ameeqQuery(sql); globalThis.__queries++; throw new Error("Unexpected SQL"); }; pool.connect = async () => { if(globalThis.__allowAmeeq) return {query:globalThis.__ameeqQuery,release(){}}; globalThis.__queries++; throw new Error("Unexpected DB connect"); };');
        return { ...result, source: source + '; globalThis.__clipPlayback = signClipPlayback; globalThis.__verifiedDuration = verifiedDuration; globalThis.__clipDurationSeconds = clipDurationSeconds; globalThis.__clipUploadFence = router55.stack[0].handle;' };
      }
      return result;
    }});
    globalThis.__queries = 0;
    const originalConnect = net.Socket.prototype.connect;
    net.Socket.prototype.connect = function(...args) {
      const options = Array.isArray(args[0]) ? args[0][0] : args[0];
      if (options && typeof options === 'object' && options.host === '127.0.0.1') return originalConnect.apply(this, args);
      externalAttempts++;
      throw new Error('Unexpected network connection');
    };
    tls.connect = function() { externalAttempts++; throw new Error('Unexpected TLS connection'); };
    globalThis.fetch = async () => { externalAttempts++; throw new Error('Unexpected fetch'); };
    for (const method of ['mkdirSync', 'writeFileSync', 'unlinkSync', 'rmSync']) {
      fs[method] = () => { throw new Error('Unexpected application filesystem write: '+method); };
    }
    syncBuiltinESMExports();
    const { default: server } = await import('./api/original.js');
    const playback = await globalThis.__clipPlayback('r2:clips/original/7/probe.mp4');
    if (playback.url !== 'https://media.example.test/clips/original/7/probe.mp4' || playback.urlExpiresAt !== null) throw new Error('Public R2 playback not wired');
    for (const [session, body, status] of [
      [undefined, { ownerId: 7 }, 401],
      [{ userId: 7 }, { ownerId: 8 }, 403],
      [{ userId: 7 }, { ownerId: 7, expectedOwnerId: 8 }, 403],
    ]) {
      let actualStatus;
      const response = { status(code) { actualStatus = code; return this; }, json() {} };
      globalThis.__clipUploadFence({ session, body }, response, () => { throw new Error('Owner fence bypassed'); });
      if (actualStatus !== status) throw new Error('Confirmation owner fence failed');
    }
    let ownerAllowed = false;
    globalThis.__clipUploadFence({ session: { userId: 7 }, body: { ownerId: 7 } }, { set() {} }, () => { ownerAllowed = true; });
    if (!ownerAllowed) throw new Error('Authenticated citizen blocked');
    // Real server publication policy: inclusive minute minimum, no duration ceiling.
    for (const seconds of [60, 61, 26 * 3600, 365 * 24 * 3600]) {
      if (globalThis.__clipDurationSeconds(seconds, 'video/mp4') !== seconds) throw new Error('Unexpected duration ceiling');
    }
    let rejectedShort = false;
    try { globalThis.__clipDurationSeconds(59.99, 'video/mp4'); } catch { rejectedShort = true; }
    if (!rejectedShort) throw new Error('Minimum duration was bypassed');
    // A real 61-second PCM container proves the packaged verifier can execute
    // and seek through the production range bridge without any system ffprobe.
    const dataBytes = 61 * 8000 * 2;
    const wav = Buffer.alloc(44 + dataBytes);
    wav.write('RIFF'); wav.writeUInt32LE(36 + dataBytes, 4); wav.write('WAVEfmt ', 8);
    wav.writeUInt32LE(16, 16); wav.writeUInt16LE(1, 20); wav.writeUInt16LE(1, 22);
    wav.writeUInt32LE(8000, 24); wav.writeUInt32LE(16000, 28);
    wav.writeUInt16LE(2, 32); wav.writeUInt16LE(16, 34);
    wav.write('data', 36); wav.writeUInt32LE(dataBytes, 40);
    const duration = await globalThis.__verifiedDuration({
      async getMetadata() { return [{ size: wav.length }]; },
      createReadStream(range) { return Readable.from([wav.subarray(range.start, range.end + 1)]); },
    }, 'media');
    if (duration !== 61) throw new Error('Packaged media probe failed: ' + duration);
    if (server.listening) throw new Error('Adapter must not own the listener');
    await new Promise(r => server.listen(0, '127.0.0.1', r));
    const result = await new Promise((resolve, reject) => {
      http.get({ host: '127.0.0.1', port: server.address().port, path: '/api/healthz' }, res => {
        let text=''; res.on('data', chunk => text+=chunk); res.on('end', () => resolve({ status: res.statusCode, text }));
      }).on('error', reject);
    });
    const sessionResult = await new Promise((resolve, reject) => {
      http.get({ host:'127.0.0.1', port:server.address().port, path:'/api/auth/session' }, res => {
        res.resume(); res.on('end', () => resolve(res.statusCode));
      }).on('error', reject);
    });
    if (sessionResult !== 401) throw new Error('Session endpoint must reject anonymous requests: ' + sessionResult);
    if (result.status !== 200 || JSON.parse(result.text).status !== 'ok') throw new Error('Original health endpoint failed: '+JSON.stringify(result));
    await new Promise(r => setTimeout(r, 300));
    if (globalThis.__queries || externalAttempts) throw new Error('Unexpected startup activity: '+JSON.stringify({ queries: globalThis.__queries, externalAttempts }));
    // Exercise the actual archived rate limiter/moderation/route wiring with
    // a read-only fake DB. This is not a claim about production record counts.
    globalThis.__allowAmeeq = true;
    globalThis.__ameeqQuery = async (sql) => {
      const text = typeof sql === 'string' ? sql : sql.text;
      if (!/^(BEGIN TRANSACTION.*READ ONLY|SET LOCAL|SELECT|COMMIT|ROLLBACK)/.test(text)) throw new Error('Unsafe Ameeq SQL');
      return { rows: text.startsWith('SELECT (SELECT') ? [{ citizens: 41, clips: 13 }] : [] };
    };
    for (const field of ['command','message','question']) {
      const answer = await new Promise((resolve, reject) => {
        const body = JSON.stringify({[field]:'شكون نتا'});
        const request = http.request({ host:'127.0.0.1', port:server.address().port, path:'/api/ameeq', method:'POST', headers:{'Content-Type':'application/json','Content-Length':Buffer.byteLength(body)} }, res => {
          let text=''; res.on('data', chunk=>text+=chunk); res.on('end',()=>resolve({status:res.statusCode,text}));
        });request.on('error',reject);request.end(body);
      });
      const payload = JSON.parse(answer.text);
      if (answer.status !== 200 || !payload.response.includes('EMP-001') || !payload.response.includes('41 مواطن و 13 كليب') || payload.response.includes('غير متاح')) throw new Error('Original Ameeq route failed: '+JSON.stringify(answer));
    }
    await new Promise(r => server.close(r));
    console.log('COLD_START_SAFE');
    process.exit(0);
  `], {
    cwd: isolated, encoding: 'utf8', timeout: 20000,
    env: { ...process.env, NODE_ENV: 'production', R2_PUBLIC_URL: 'https://media.example.test/', DATABASE_URL: 'postgresql://test.invalid/hosting-test', SESSION_SECRET: 'local-test-only-session-secret-not-production' }
  });
  rmSync(isolated, { recursive: true, force: true });
  assert.equal(probe.status, 0, probe.stdout + probe.stderr);
  assert.ok(probe.stdout.includes('COLD_START_SAFE'));
});
test('persistent sessions use 30 day sliding expiry and verified reset commits a fenced session',()=>{
 assert.ok(runtime.includes('PERSISTENT_SESSION_TTL_MS = 30 * DAY_MS'));
 assert.ok(runtime.includes('httpOnly: true'));
 assert.ok(runtime.includes('rolling: true'));
 assert.ok(runtime.includes('credentialEpoch: changed.rows[0].credential_epoch'));
 assert.ok(runtime.includes('authorizeNewSession(req.session, revoked.credentialEpoch)'));
 assert.ok(!runtime.includes('DROP TABLE IF EXISTS email_verification_codes'));
});
test('hosted pool uses only production DATABASE_URL and explicit TLS, no guessed public schema or seeds',()=>{
 assert.ok(runtime.includes('connectionString = process.env.DATABASE_URL'));
 assert.ok(runtime.includes('ssl: { rejectUnauthorized: false }'));
 assert.ok(runtime.includes('DATABASE_URL_MISSING'));
 assert.ok(!runtime.includes('WHERE c.is_public = true'));
 assert.ok(!runtime.includes('function autoSeedTestUsers'));
});
