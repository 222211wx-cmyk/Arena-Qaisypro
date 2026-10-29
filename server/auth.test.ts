// @vitest-environment node
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import bcrypt from 'bcrypt';
import signature from 'cookie-signature';
import { readFileSync } from 'node:fs';
const { query, connect, release } = vi.hoisted(() => ({ query: vi.fn(), connect: vi.fn(), release: vi.fn() }));
vi.mock('pg', () => ({ default: { Pool: vi.fn(function () { return { query, connect, on: vi.fn() }; }) } }));
// @ts-ignore Vercel JavaScript handler
import { authHandler } from './auth.js';
const secret = 'test-only-session-signing-key-not-a-production-credential';
const user = { id: 7, username: 'Spieler', password_hash: '', credential_epoch: 2, balance: 500, xp: 0, games_played: 0, wins: 0, last_daily_reward: null, is_admin: false, has_active_subscription: false, birth_date: '1990-01-01' };
const oldSid = 'previous-session-abcdefghijklmnop';
function signed(sid = oldSid) { return 'connect.sid=' + encodeURIComponent('s:' + signature.sign(sid, secret)); }
function request(body: any = { username: ' Spieler ', password: 'correct-password' }, method = 'POST') {
  return { method, body, headers: { host: 'arena.example', origin: 'https://arena.example', 'content-type': 'application/json', 'x-real-ip': Math.random().toString(), cookie: signed() } };
}
function response() { const res: any = { headers: {}, statusCode: 200 }; res.setHeader = (key: string, value: string) => { res.headers[key] = value; }; res.status = (value: number) => { res.statusCode = value; return res; }; res.json = (body: any) => { res.body = body; return res; }; return res; }
beforeEach(async () => {
  vi.clearAllMocks();
  vi.stubEnv('DATABASE_URL', 'postgresql://test.invalid/test');
  vi.stubEnv('SESSION_SECRET', secret);
  vi.spyOn(console, 'error').mockImplementation(() => {});
  user.password_hash = await bcrypt.hash('correct-password', 4);
  connect.mockResolvedValue({ query, release });
  query.mockImplementation(async (sql: string) => {
    if (sql.includes('LOWER(username)')) return { rows: [{ ...user }] };
    if (sql.startsWith('SELECT credential_epoch')) return { rows: [{ credential_epoch: 2 }] };
    if (sql.includes("AS user_id")) return { rows: [{ user_id: '7' }] };
    if (sql.startsWith('SELECT sess FROM')) return { rows: [{ sess: { userId: 7, credentialEpoch: 2, rememberMe: true, cookie: {} } }] };
    if (sql.includes('FROM users WHERE id')) return { rows: [{ ...user }] };
    return { rows: [], rowCount: 1 };
  });
});
afterEach(() => { vi.unstubAllEnvs(); vi.restoreAllMocks(); });
it('adapts all auth routes before the API 404 fallback', () => {
  const routes = JSON.parse(readFileSync(new URL('../vercel.json', import.meta.url), 'utf8')).rewrites;
  for (const name of ['login', 'me', 'logout', 'session', 'verify']) {
    expect(routes.findIndex((r: any) => r.source === '/api/auth/' + name)).toBeLessThan(routes.findIndex((r: any) => r.source === '/api/:path*'));
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
  const encoded = res.headers['Set-Cookie'].split(';')[0].split('=')[1];
  expect(signature.unsign(decodeURIComponent(encoded).slice(2), secret)).toBe(insertion[1][0]);
  expect(insertion[1][0]).not.toBe(oldSid);
  expect(res.headers['Set-Cookie']).toContain('HttpOnly; Secure; SameSite=Lax');
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
  expect(res.headers['Set-Cookie']).toContain('Expires=Thu, 01 Jan 1970');
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
