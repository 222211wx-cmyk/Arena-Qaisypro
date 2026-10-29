// Vercel adapter for api-server.zip's PostgreSQL/bcrypt authentication.
// Retains connect.sid signatures, user_sessions JSON, and credential-epoch fencing.
import bcrypt from 'bcrypt';
import pg from 'pg';
import signature from 'cookie-signature';
import { randomBytes } from 'node:crypto';

const DAY = 86400_000;
let pool;
function configuration() {
  if (!process.env.DATABASE_URL || !process.env.SESSION_SECRET) throw new Error('Auth configuration unavailable');
  if (!pool) {
    pool = new pg.Pool({ connectionString: process.env.DATABASE_URL, max: 3, connectionTimeoutMillis: 5000, statement_timeout: 10000, idleTimeoutMillis: 10000, allowExitOnIdle: true });
    pool.on('error', () => console.error('Authentication database connection unavailable'));
  }
  return { pool, secret: process.env.SESSION_SECRET };
}

function readSid(req, secret) {
  const cookies = (req.headers.cookie || '').split(';').map(v => v.trim()).filter(v => v.startsWith('connect.sid='));
  if (cookies.length !== 1) return null;
  try {
    const value = decodeURIComponent(cookies[0].slice('connect.sid='.length));
    if (!value.startsWith('s:')) return null;
    const sid = signature.unsign(value.slice(2), secret);
    return typeof sid === 'string' && /^[\w-]{20,128}$/.test(sid) ? sid : null;
  } catch { return null; }
}

function cookie(res, sid, secret, ttl) {
  const expires = new Date(sid ? Date.now() + ttl : 0).toUTCString();
  const value = sid ? encodeURIComponent(`s:${signature.sign(sid, secret)}`) : '';
  res.setHeader('Set-Cookie', `connect.sid=${value}; Path=/; Expires=${expires}; HttpOnly; Secure; SameSite=Lax`);
}

function serializeUser(user) {
  const now = new Date();
  const birth = user.birth_date ? new Date(user.birth_date) : null;
  let age = birth ? now.getUTCFullYear() - birth.getUTCFullYear() : null;
  if (birth && (now.getUTCMonth() < birth.getUTCMonth() || (now.getUTCMonth() === birth.getUTCMonth() && now.getUTCDate() < birth.getUTCDate()))) age--;
  return {
    id: user.id, username: user.username, balance: user.balance, xp: user.xp,
    gamesPlayed: user.games_played, wins: user.wins,
    canClaimDaily: !user.last_daily_reward || new Date(user.last_daily_reward).toISOString().slice(0, 10) !== now.toISOString().slice(0, 10),
    isAdmin: user.is_admin === true, hasActiveSubscription: user.has_active_subscription === true,
    isAdult: age === null || Number.isNaN(age) ? null : age >= 18,
  };
}
const PUBLIC_COLUMNS = 'id, username, balance, xp, games_played, wins, last_daily_reward, is_admin, has_active_subscription, birth_date';

// Like Replit's express-rate-limit MemoryStore, this bounds each warm instance.
// A distributed perimeter rate limit is additionally recommended across replicas.
const attempts = new Map();
function throttled(req) {
  const now = Date.now();
  for (const [key, value] of attempts) if (value.until <= now) attempts.delete(key);
  const key = req.headers['x-real-ip'] || req.socket?.remoteAddress || 'unknown';
  const entry = attempts.get(key) || { count: 0, until: now + 15 * 60_000 };
  if (entry.count >= 20 || (!attempts.has(key) && attempts.size >= 10000)) return null;
  entry.count++;
  attempts.set(key, entry);
  return () => { entry.count = Math.max(0, entry.count - 1); };
}

async function transaction(pool, action) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await action(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});
    throw error;
  } finally { client.release(); }
}

export function authHandler(operation) {
  return async function handler(req, res) {
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('Cache-Control', 'no-store');
    const method = operation === 'me' ? 'GET' : 'POST';
    if (req.method !== method) {
      res.setHeader('Allow', method);
      return res.status(405).json({ error: 'Method not allowed' });
    }
    if (method === 'POST') {
      if (req.headers.origin) {
        try {
          if (new URL(req.headers.origin).origin !== `https://${req.headers.host}`) return res.status(403).json({ error: 'Forbidden origin' });
        } catch { return res.status(403).json({ error: 'Forbidden origin' }); }
      }
      if ((req.headers['content-type'] || '').split(';')[0].trim().toLowerCase() !== 'application/json') return res.status(415).json({ error: 'JSON required' });
    }
    try {
      let body = req.body;
      if (method === 'POST' && typeof body === 'string') {
        try { body = JSON.parse(body); } catch { return res.status(400).json({ error: 'Invalid JSON' }); }
      }
      if (operation === 'login') {
        const username = typeof body?.username === 'string' ? body.username.trim() : '';
        const password = typeof body?.password === 'string' ? body.password : '';
        if (!username || username.length > 256 || !password || Buffer.byteLength(password) > 72) return res.status(400).json({ error: 'Valid username and password required' });
        const success = throttled(req);
        if (!success) { res.setHeader('Retry-After', '900'); return res.status(429).json({ error: 'Too many attempts; retry later' }); }
        const { pool, secret } = configuration();
        const matches = await pool.query(`SELECT ${PUBLIC_COLUMNS}, password_hash, credential_epoch FROM users WHERE LOWER(username) = LOWER($1) ORDER BY id LIMIT 2`, [username]);
        // Never choose arbitrarily among legacy case-insensitive duplicates.
        const user = matches.rows.length === 1 ? matches.rows[0] : null;
        let valid = false;
        if (user) { try { valid = await bcrypt.compare(password, user.password_hash); } catch { /* malformed hashes fail closed */ } }
        if (!valid) return res.status(401).json({ error: 'Invalid username or password' });
        const sid = randomBytes(24).toString('base64url');
        const ttl = body.rememberMe === false ? 7 * DAY : 365 * DAY;
        const expires = new Date(Date.now() + ttl);
        const sess = { cookie: { originalMaxAge: ttl, expires: expires.toISOString(), secure: true, httpOnly: true, path: '/', sameSite: 'lax' }, userId: user.id, credentialEpoch: user.credential_epoch, rememberMe: body.rememberMe !== false };
        const oldSid = readSid(req, secret);
        const issued = await transaction(pool, async client => {
          const current = await client.query('SELECT credential_epoch FROM users WHERE id = $1 FOR SHARE', [user.id]);
          if (!Number.isSafeInteger(user.credential_epoch) || user.credential_epoch < 0 || current.rows[0]?.credential_epoch !== user.credential_epoch) return false;
          if (oldSid) await client.query('DELETE FROM user_sessions WHERE sid = $1', [oldSid]);
          await client.query('INSERT INTO user_sessions (sid, sess, expire) VALUES ($1, $2, $3)', [sid, JSON.stringify(sess), expires]);
          return true;
        });
        if (!issued) return res.status(401).json({ error: 'Invalid username or password' });
        const publicUser = serializeUser(user);
        success();
        cookie(res, sid, secret, ttl);
        return res.status(200).json(publicUser);
      }
      const { pool, secret } = configuration();
      const sid = readSid(req, secret);
      if (operation === 'logout') {
        if (sid) await pool.query('DELETE FROM user_sessions WHERE sid = $1', [sid]);
        cookie(res, null, secret, 0);
        return res.status(200).json({ success: true });
      }
      if (!sid) return res.status(401).json({ error: 'Not authenticated' });
      const current = await transaction(pool, async client => {
        // Lock user BEFORE session, matching Replit's credential-rotation order.
        const lookup = await client.query("SELECT sess->>'userId' AS user_id FROM user_sessions WHERE sid = $1 AND expire > NOW()", [sid]);
        const id = Number(lookup.rows[0]?.user_id);
        if (!Number.isSafeInteger(id) || id <= 0) return null;
        const users = await client.query(`SELECT ${PUBLIC_COLUMNS}, credential_epoch FROM users WHERE id = $1 FOR SHARE`, [id]);
        if (!users.rows[0]) return null;
        const sessions = await client.query('SELECT sess FROM user_sessions WHERE sid = $1 AND expire > NOW() FOR UPDATE', [sid]);
        const sess = sessions.rows[0]?.sess;
        const user = users.rows[0];
        if (!sess || sess.userId !== id || (sess.credentialEpoch ?? 0) !== user.credential_epoch) return null;
        const oldTtl = sess.cookie?.originalMaxAge;
        const ttl = sess.rememberMe === false ? 7 * DAY : sess.rememberMe === true || oldTtl === 30 * DAY || oldTtl === 365 * DAY ? 365 * DAY : 7 * DAY;
        const expires = new Date(Date.now() + ttl);
        sess.cookie = { ...sess.cookie, originalMaxAge: ttl, expires: expires.toISOString() };
        await client.query('UPDATE user_sessions SET sess = $2, expire = $3 WHERE sid = $1', [sid, JSON.stringify(sess), expires]);
        return { user: serializeUser(user), ttl };
      });
      if (!current) { cookie(res, null, secret, 0); return res.status(401).json({ error: 'Not authenticated' }); }
      cookie(res, sid, secret, current.ttl);
      return res.status(200).json(current.user);
    } catch {
      // No connection strings, SQL errors, hashes or secrets in HTTP responses/logs.
      console.error('Authentication backend unavailable', { operation });
      return res.status(503).json({ error: 'Authentication temporarily unavailable; retry later' });
    }
  };
}
