// @vitest-environment node
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import bcrypt from 'bcrypt';
import signature from 'cookie-signature';
import {createHash} from 'node:crypto';
import { readFileSync } from 'node:fs';
const { query, connect, release, verifyPhone } = vi.hoisted(() => ({ query: vi.fn(), connect: vi.fn(), release: vi.fn(), verifyPhone:vi.fn() }));
vi.mock('./phone-proof.js',()=>({recoveryPublicConfig:()=>null,verifyPhoneProof:verifyPhone}));
vi.mock('pg', () => ({ default: { Pool: vi.fn(function () { return { query, connect, on: vi.fn() }; }) } }));
// @ts-ignore Vercel JavaScript handler
import { authHandler } from './auth.js';
const secret = 'test-only-session-signing-key-not-a-production-credential';
const user = { id: 7, username: 'Spieler', password_hash: '', credential_epoch: 2, balance: 500, xp: 0, games_played: 0, wins: 0, last_daily_reward: null, is_admin: false, has_active_subscription: false, birth_date: '1990-01-01' };
const device='a'.repeat(43);
const binding=createHash('sha256').update(device+'\nTestAgent/#').digest('hex');
const oldSid = 'previous-session-abcdefghijklmnop';
function signed(sid = oldSid) { return 'connect.sid=' + encodeURIComponent('s:' + signature.sign(sid, secret)); }
function request(body: any = { username: ' Spieler ', password: 'correct-password' }, method = 'POST') {
  return { method, body, headers: { host: 'arena.example', origin: 'https://arena.example', 'content-type': 'application/json', 'x-real-ip': Math.random().toString(), 'user-agent':'TestAgent/1.2', cookie: signed()+'; gdna.device='+device } };
}
function response() { const res: any = { headers: {}, statusCode: 200 }; res.setHeader = (key: string, value: string) => { res.headers[key] = value; }; res.status = (value: number) => { res.statusCode = value; return res; }; res.json = (body: any) => { res.body = body; return res; }; return res; }
beforeEach(async () => {
  vi.clearAllMocks();
  verifyPhone.mockRejectedValue(new Error('invalid proof'));
  vi.stubEnv('DATABASE_URL', 'postgresql://test.invalid/test');
  vi.stubEnv('SESSION_SECRET', secret);
  vi.spyOn(console, 'error').mockImplementation(() => {});
  user.password_hash = await bcrypt.hash('correct-password', 4);
  connect.mockResolvedValue({ query, release });
  query.mockImplementation(async (sql: string) => {
    if (sql.includes('LOWER(username)')) return { rows: [{ ...user }] };
    if (sql.startsWith('SELECT credential_epoch')) return { rows: [{ credential_epoch: 2 }] };
    if (sql.includes("AS user_id")) return { rows: [{ user_id: '7' }] };
    if (sql.startsWith('SELECT sess FROM')) return { rows: [{ sess: { userId: 7, credentialEpoch: 2, rememberMe: true, deviceBinding:binding,cookie: {} } }] };
    if (sql.includes('FROM users WHERE id')) return { rows: [{ ...user }] };
    return { rows: [], rowCount: 1 };
  });
});
afterEach(() => { vi.unstubAllEnvs(); vi.restoreAllMocks(); });
it('adapts all auth routes before the API 404 fallback', () => {
  const routes = JSON.parse(readFileSync(new URL('../vercel.json', import.meta.url), 'utf8')).rewrites;
  for (const name of ['login', 'me', 'logout', 'session', 'verify']) {
    expect(readFileSync(new URL('../scripts/prepare-original-backend.mjs',import.meta.url),'utf8')).toContain('app.use(secureAuthRoutes)');
    expect(readFileSync(new URL('../api/auth/' + name + '.js', import.meta.url), 'utf8')).toContain('authHandler');
  }
});
it('checks a real bcrypt hash, rotates SID, stores original session shape, and strips all secrets', async () => {
  const res = response(); await authHandler('login')(request(), res);
  expect(res.statusCode).toBe(200);
  expect(res.body).toMatchObject({ id: 7, username: 'Spieler', gamesPlayed: 0, isAdult: true, isAdmin: false });
  expect(res.body).not.toHaveProperty('password_hash'); expect(res.body).not.toHaveProperty('credential_epoch');
  expect(query.mock.calls.find(([s]) => s.includes('LOWER(username)'))?.[1]).toEqual(['Spieler']);
  expect(query.mock.calls).toContainEqual(['DELETE FROM user_sessions WHERE sid = $1', [oldSid]]);
  const insertion = query.mock.calls.find(([s]) => s.startsWith('INSERT INTO user_sessions'))!;
  const sess = JSON.parse(insertion[1][1]);
  expect(sess).toMatchObject({ userId: 7, credentialEpoch: 2, rememberMe: true, cookie: { originalMaxAge: 365 * 86400000 } });
  const encoded = res.headers['Set-Cookie'][0].split(';')[0].split('=')[1];
  expect(signature.unsign(decodeURIComponent(encoded).slice(2), secret)).toBe(insertion[1][0]);
  expect(insertion[1][0]).not.toBe(oldSid);
  expect(res.headers['Set-Cookie'][0]).toContain('HttpOnly; Secure; SameSite=Lax');
  expect(res.headers['Cache-Control']).toBe('no-store'); expect(release).toHaveBeenCalled();
});
it('preserves short seven-day sessions when rememberMe is false', async () => {
  const res = response(); await authHandler('login')(request({ username: 'Spieler', password: 'correct-password', rememberMe: false }), res);
  const insertion = query.mock.calls.find(([s]) => s.startsWith('INSERT INTO user_sessions'))!;
  expect(JSON.parse(insertion[1][1]).cookie.originalMaxAge).toBe(7 * 86400000);
});
it.each(['wrong-password', '', 'x'.repeat(73)])('never creates a session with invalid password %s', async password => {
  const res = response(); await authHandler('login')(request({ username: 'Spieler', password }), res);
  expect(res.statusCode).toBeGreaterThanOrEqual(400); expect(res.headers['Set-Cookie']).toBeUndefined();
  expect(query.mock.calls.some(([s]) => s.startsWith('INSERT'))).toBe(false);
});
it.each([{ rows: [] }, { rows: [{ ...user }, { ...user, id: 8 }] }])('rejects missing/ambiguous users', async ({ rows }) => {
  query.mockResolvedValueOnce({ rows }); const res = response(); await authHandler('login')(request(), res);
  expect(res.statusCode).toBe(401); expect(connect).not.toHaveBeenCalled();
});
it('fails closed for malformed legacy password hashes', async () => {
  query.mockResolvedValueOnce({ rows: [{ ...user, password_hash: 'temp' }] }); const res = response(); await authHandler('login')(request(), res);
  expect(res.statusCode).toBe(401); expect(connect).not.toHaveBeenCalled();
});
it('rejects credentials revoked between bcrypt and session creation', async () => {
  const original = query.getMockImplementation()!;
  query.mockImplementation((sql: string, ...args: any[]) => sql.startsWith('SELECT credential_epoch') ? { rows: [{ credential_epoch: 3 }] } : original(sql, ...args));
  const res = response(); await authHandler('login')(request(), res);
  expect(res.statusCode).toBe(401); expect(query.mock.calls.some(([s]) => s.startsWith('INSERT'))).toBe(false);
});
it('does not expose DB errors or issue a cookie if the session insert fails', async () => {
  const original = query.getMockImplementation()!;
  query.mockImplementation((sql: string, ...args: any[]) => { if (sql.startsWith('INSERT')) throw new Error('private connection string'); return original(sql, ...args); });
  const res = response(); await authHandler('login')(request(), res);
  expect(res.statusCode).toBe(503); expect(JSON.stringify(res.body)).not.toContain('private'); expect(res.headers['Set-Cookie']).toBeUndefined();
  expect(query.mock.calls).toContainEqual(['ROLLBACK']); expect(release).toHaveBeenCalled();
});
it('returns 503 rather than forging sessions when configuration is missing', async () => {
  vi.stubEnv('SESSION_SECRET', ''); const res = response(); await authHandler('login')(request(), res);
  expect(res.statusCode).toBe(503); expect(query).not.toHaveBeenCalled();
});
it('refreshes a real signed session in the database without inserting or exposing hashes', async () => {
  const res = response(); await authHandler('me')(request(undefined, 'GET'), res);
  expect(res.statusCode).toBe(200); expect(res.body.id).toBe(7); expect(res.body).not.toHaveProperty('password_hash');
  expect(query.mock.calls.some(([s]) => s.startsWith('UPDATE user_sessions'))).toBe(true);
  expect(query.mock.calls.some(([s]) => s.startsWith('INSERT'))).toBe(false);
});
it.each(['', 'connect.sid=unsigned', signed() + 'tamper', 'connect.sid=%ZZ', signed() + '; ' + signed()])('rejects absent or invalid signed cookies %s', async value => {
  const req = request(undefined, 'GET'); req.headers.cookie = value;
  const res = response(); await authHandler('me')(req, res);
  expect(res.statusCode).toBe(401); expect(query).not.toHaveBeenCalled();
});
it.each([{ rows: [] }, { rows: [{ sess: { userId: 7, credentialEpoch: 1 } }] }, { rows: [{ sess: { userId: 8, credentialEpoch: 2 } }] }])('cannot revive expired, deleted, foreign or epoch-stale sessions', async ({ rows }) => {
  const original = query.getMockImplementation()!;
  query.mockImplementation((sql: string, ...args: any[]) => sql.startsWith('SELECT sess FROM') ? { rows } : original(sql, ...args));
  const res = response(); await authHandler('me')(request(undefined, 'GET'), res);
  expect(res.statusCode).toBe(401); expect(query.mock.calls.some(([s]) => s.startsWith('UPDATE'))).toBe(false);
});
it('logout deletes the durable session and clears the cookie', async () => {
  const res = response(); await authHandler('logout')(request({}), res);
  expect(res.statusCode).toBe(200); expect(query.mock.calls).toContainEqual(['DELETE FROM user_sessions WHERE sid = $1', [oldSid]]);
  expect(res.headers['Set-Cookie'][0]).toContain('Expires=Thu, 01 Jan 1970');
});
it('logout failure is not reported as success', async () => {
  query.mockRejectedValueOnce(new Error('unavailable')); const res = response(); await authHandler('logout')(request({}), res);
  expect(res.statusCode).toBe(503); expect(res.headers['Set-Cookie']).toBeUndefined();
});
it.each([['GET', undefined, 405], ['POST', 'https://foreign.example', 403]])('rejects wrong method/origin', async (method, origin, code) => {
  const req = request({}, method as string); if (origin) req.headers.origin = origin;
  const res = response(); await authHandler('login')(req, res); expect(res.statusCode).toBe(code); expect(query).not.toHaveBeenCalled();
});
it('rejects non-JSON and malformed JSON bodies', async () => {
  for (const kind of ['type', 'json']) {
    const req = request('{'); if (kind === 'type') req.headers['content-type'] = 'text/plain';
    const res = response(); await authHandler('login')(req, res); expect(res.statusCode).toBe(kind === 'type' ? 415 : 400);
  }
  expect(query).not.toHaveBeenCalled();
});
it('limits repeated failed attempts per warm instance', async () => {
  const req = request({ username: 'Spieler', password: 'wrong-password' });
  for (let i = 0; i < 20; i++) { const res = response(); await authHandler('login')(req, res); expect(res.statusCode).toBe(401); }
  const res = response(); await authHandler('login')(req, res); expect(res.statusCode).toBe(429); expect(res.headers['Retry-After']).toBe('900');
});

it.each(['  PLAYER@example.test  ', "player' OR 1=1 --"])('binds email or username as one parameter: %s', async identifier => {
  const original = query.getMockImplementation()!;
  query.mockImplementation((sql: string, ...args: any[]) => {
    if (sql.includes('LOWER(username)')) {
      expect(sql).toContain('WHERE LOWER(email) = LOWER($1) OR LOWER(username) = LOWER($1)');
      expect(sql).toContain('ORDER BY id LIMIT 2');
      expect(args[0]).toEqual([identifier.trim()]);
      return { rows: [{ ...user }] };
    }
    return original(sql, ...args);
  });
  const res = response();
  await authHandler('login')(request({ username: identifier, password: 'correct-password' }), res);
  expect(res.statusCode).toBe(200);
  expect(res.body.username).toBe('Spieler');
  expect(res.body).not.toHaveProperty('email');
});
it('rejects an identifier matching one account email and another account username', async () => {
  query.mockResolvedValueOnce({ rows: [{ ...user }, { ...user, id: 8, username: 'player@example.test' }] });
  const res = response();
  await authHandler('login')(request({ username: 'player@example.test', password: 'correct-password' }), res);
  expect(res.statusCode).toBe(401);
  expect(connect).not.toHaveBeenCalled();
  expect(res.headers['Set-Cookie']).toBeUndefined();
});
it('accepts an email JSON field through the same collision-safe lookup', async () => {
  const res = response();
  await authHandler('login')(request({ email: ' citizen@example.invalid ', password: 'correct-password' }), res);
  expect(res.statusCode).toBe(200);
  expect(query.mock.calls.find(([sql]) => sql.includes('LOWER(email)'))?.[1]).toEqual(['citizen@example.invalid']);
});
it('preserves an opaque text account ID in the durable session and HTTP response',async()=>{
 const original=query.getMockImplementation()!;
 query.mockImplementation((sql:string,...args:any[])=>sql.includes('LOWER(username)')?{rows:[{...user,id:'citizen-opaque-id'}]}:original(sql,...args));
 const res=response();await authHandler('login')(request(),res);
 expect(res.statusCode).toBe(200);expect(res.body.id).toBe('citizen-opaque-id');
 const insert=query.mock.calls.find(([sql])=>sql.startsWith('INSERT INTO user_sessions'))!;
 expect(JSON.parse(insert[1][1]).userId).toBe('citizen-opaque-id');
});
it.each(['missing','changed','browser'])('revokes a server session for %s device binding',async kind=>{
 const req=request(undefined,'GET');
 if(kind==='missing')req.headers.cookie=signed();
 if(kind==='changed')req.headers.cookie=signed()+'; gdna.device='+'b'.repeat(43);
 if(kind==='browser')req.headers['user-agent']='OtherBrowser/1.2';
 const res=response();await authHandler('me')(req,res);
 expect(res.statusCode).toBe(401);
 expect(query.mock.calls).toContainEqual(['DELETE FROM user_sessions WHERE sid = $1',[oldSid]]);
 expect(query.mock.calls.some(([sql])=>sql.startsWith('UPDATE'))).toBe(false);
});
it('allows browser version updates without treating them as device identity changes',async()=>{
 const req=request(undefined,'GET');req.headers['user-agent']='TestAgent/2.3';
 const res=response();await authHandler('me')(req,res);expect(res.statusCode).toBe(200);
});
it('never accepts local user JSON or a device cookie without a signed session',async()=>{
 const req=request(undefined,'GET');req.headers.cookie='gdna.device='+device;
 const res=response();await authHandler('me')(req,res);expect(res.statusCode).toBe(401);expect(query).not.toHaveBeenCalled();
});
it('requires a verified Firebase proof before any recovery identity mutation',async()=>{
 const res=response();await authHandler('recovery/access')(request({idToken:'forged'}),res);
 expect(res.statusCode).toBe(400);expect(query.mock.calls.some(([sql])=>sql.startsWith('UPDATE users'))).toBe(false);
});
it('cannot recover an account with a phone that was never enrolled',async()=>{
 verifyPhone.mockResolvedValue({phone:'+15550001111',projectId:'test-project',authTime:Math.floor(Date.now()/1000),eventDigest:'test-event'});
 const res=response();await authHandler('recovery/access')(request({idToken:'proof'}),res);
 expect(res.statusCode).toBe(400);expect(query.mock.calls.some(([sql])=>sql.startsWith('UPDATE users'))).toBe(false);expect(res.headers['Set-Cookie']).toBeUndefined();
});
it('enrollment requires current-password proof and a device-bound authenticated session',async()=>{
 verifyPhone.mockResolvedValue({phone:'+15550001111',projectId:'test-project',authTime:Math.floor(Date.now()/1000),eventDigest:'test-event'});
 const req=request({idToken:'proof',currentPassword:'wrong'});req.headers.cookie='';
 const res=response();await authHandler('recovery/phone/bind')(req,res);
 expect(res.statusCode).toBe(400);expect(query.mock.calls.some(([sql])=>sql.includes('INSERT INTO gdna_auth_recovery_phones'))).toBe(false);
});
it('successful verified recovery rotates epoch, revokes sessions and creates a bound replacement',async()=>{
 verifyPhone.mockResolvedValue({phone:'+15550001111',projectId:'test-project',authTime:Math.floor(Date.now()/1000),eventDigest:'test-event'});
 const original=query.getMockImplementation()!;
 query.mockImplementation((sql:string,...args:any[])=>{
   if(sql.startsWith('SELECT user_id FROM gdna_auth'))return {rows:[{user_id:'opaque-user'}]};
   if(sql.startsWith('INSERT INTO gdna_auth_recovery_proofs'))return {rows:[{event_digest:'test-event'}]};
   if(sql.startsWith('UPDATE users SET credential_epoch'))return {rows:[{credential_epoch:3}]};
   return original(sql,...args);
 });
 const res=response();await authHandler('recovery/access')(request({idToken:'proof'}),res);
 expect(res.statusCode).toBe(200);expect(res.body).toEqual({success:true});
 expect(query.mock.calls).toContainEqual(["DELETE FROM user_sessions WHERE sess->>'userId'=$1",['opaque-user']]);
 const insert=query.mock.calls.find(([sql])=>sql.startsWith('INSERT INTO user_sessions'))!;
 expect(JSON.parse(insert[1][1])).toMatchObject({userId:'opaque-user',credentialEpoch:3,deviceBinding:binding});
});
it('rejects replayed recovery proofs without rotating passwords or sessions',async()=>{
 verifyPhone.mockResolvedValue({phone:'+15550001111',projectId:'test-project',authTime:Math.floor(Date.now()/1000),eventDigest:'used-event'});
 const original=query.getMockImplementation()!;
 query.mockImplementation((sql:string,...args:any[])=>sql.startsWith('SELECT user_id FROM gdna_auth')?{rows:[{user_id:'opaque-user'}]}:original(sql,...args));
 const res=response();await authHandler('recovery/access')(request({idToken:'proof'}),res);
 expect(res.statusCode).toBe(400);expect(query.mock.calls.some(([sql])=>sql.startsWith('UPDATE users'))).toBe(false);
});
