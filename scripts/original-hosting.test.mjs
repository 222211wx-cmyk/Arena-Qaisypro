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
  assert.ok(runtime.includes('LOWER(${usersTable.email}) = LOWER(${username}) OR LOWER(${usersTable.username}) = LOWER(${username})'));
  assert.ok(runtime.includes('req.body?.email'));
  assert.ok(runtime.includes('const existing = await db.select().from(usersTable).where(sql`LOWER(${usersTable.username}) = LOWER(${username})`).limit(1)'));
});

test('all original section route registrations remain byte-for-byte unchanged', () => {
  const routes = s => s.match(/^(?:router\d*|app|app_default|adminRouter)\.(?:get|post|put|delete|patch|use)\(.*$/gm);
  assert.deepEqual(routes(runtime).filter(line=>!['app.use(secureAuthRoutes);','app.use(enforceDeviceSession);','app.use(durableClipRoutes);'].includes(line)), routes(original));
  assert.ok(runtime.indexOf('app.use(secureAuthRoutes);') < runtime.indexOf('app.use(sessionMiddleware);'));
  assert.ok(runtime.includes('JOIN users u ON u.id::text = $2::text'));
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
    let externalAttempts = 0;
    registerHooks({ load(url, context, nextLoad) {
      const result = nextLoad(url, context);
      if (url.endsWith('/.original-backend/runtime.mjs')) {
        if (!String(result.source).includes('pool2 = new Pool3({ connectionString, ssl: { rejectUnauthorized: false }, connectionTimeoutMillis: 5e3 });')) throw new Error('SQL probe anchor missing');
        const source = String(result.source).replace('pool2 = new Pool3({ connectionString, ssl: { rejectUnauthorized: false }, connectionTimeoutMillis: 5e3 });',
          'pool2 = new Pool3({ connectionString, ssl: { rejectUnauthorized: false }, connectionTimeoutMillis: 5e3 }); pool2.query = (sql) => { if(globalThis.__allowAmeeq) return globalThis.__ameeqQuery(sql); globalThis.__queries++; throw new Error("Unexpected SQL"); }; pool2.connect = async () => { if(globalThis.__allowAmeeq) return {query:globalThis.__ameeqQuery,release(){}}; globalThis.__queries++; throw new Error("Unexpected DB connect"); };');
        return { ...result, source };
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
    if (server.listening) throw new Error('Adapter must not own the listener');
    await new Promise(r => server.listen(0, '127.0.0.1', r));
    const result = await new Promise((resolve, reject) => {
      http.get({ host: '127.0.0.1', port: server.address().port, path: '/api/healthz' }, res => {
        let text=''; res.on('data', chunk => text+=chunk); res.on('end', () => resolve({ status: res.statusCode, text }));
      }).on('error', reject);
    });
    if (result.status !== 200 || JSON.parse(result.text).status !== 'ok') throw new Error('Original health endpoint failed: '+JSON.stringify(result));
    for (const [path,method,expected] of [['/api/auth/login','POST',400],['/api/auth/me','GET',401],['/api/clips/presign','GET',405],['/api/cli/upload','GET',405]]) {
      const auth = await new Promise((resolve,reject)=>{
        const request=http.request({host:'127.0.0.1',port:server.address().port,path,method,headers:{'Content-Type':'application/json'}},res=>{
          let text='';res.on('data',chunk=>text+=chunk);res.on('end',()=>resolve({status:res.statusCode,text}));
        });request.on('error',reject);request.end(method==='POST'?'{}':undefined);
      });
      if(auth.status!==expected || typeof JSON.parse(auth.text).error!=='string') throw new Error('Secure auth route failed: '+path);
    }
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
    env: { ...process.env, NODE_ENV: 'production', DATABASE_URL: 'postgresql://test.invalid/hosting-test', SESSION_SECRET: 'local-test-only-session-secret-not-production' }
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
