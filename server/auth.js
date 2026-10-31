// Vercel adapter for api-server.zip's PostgreSQL/bcrypt authentication.
// Retains connect.sid signatures, user_sessions JSON, and credential-epoch fencing.
import bcrypt from 'bcrypt';
import { recoveryPublicConfig, verifyPhoneProof } from './phone-proof.js';
import pg from 'pg';
import signature from 'cookie-signature';
import { randomBytes, randomUUID, createHash } from 'node:crypto';

const DAY = 86400_000;
let pool;
let usernameAllowed = async () => false;
export function configureAuthModeration(check) { usernameAllowed = check; }
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

function cookie(res, sid, secret, ttl, device) {
  const expires = new Date(sid ? Date.now() + ttl : 0).toUTCString();
  const value = sid ? encodeURIComponent(`s:${signature.sign(sid, secret)}`) : '';
  const cookies = [`connect.sid=${value}; Path=/; Expires=${expires}; HttpOnly; Secure; SameSite=Lax`];
  if (device) cookies.push(`gdna.device=${device}; Path=/; Expires=${expires}; HttpOnly; Secure; SameSite=Lax`);
  res.setHeader('Set-Cookie', cookies);
}

// Device binding supplements the signed server session; it never authenticates alone.
function deviceToken(req) {
  const values = (req.headers.cookie || '').split(';').map(v => v.trim()).filter(v => v.startsWith('gdna.device='));
  const token = values.length === 1 ? values[0].slice('gdna.device='.length) : '';
  return /^[A-Za-z0-9_-]{43}$/.test(token) ? token : null;
}
function deviceBinding(req, token) {
  const agent = String(req.headers['user-agent'] || '').replace(/\d+(?:[._]\d+)*/g, '#').slice(0, 1024);
  return createHash('sha256').update(token + '\n' + agent).digest('hex');
}
function validId(id) {
  return typeof id === 'string' ? id.length > 0 && id.length <= 256 : Number.isSafeInteger(id) && id > 0;
}
export function sessionDeviceMatches(req, sess) {
  const token = deviceToken(req);
  return !!token && typeof sess.deviceBinding === 'string' && sess.deviceBinding === deviceBinding(req, token);
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
    const method = ['me','recovery/config','recovery/phone'].includes(operation) ? 'GET' : 'POST';
    if (req.method !== method) {
      res.setHeader('Allow', method);
      return res.status(405).json({ error: 'Method not allowed' });
    }
    if (method === 'POST') {
      if (req.headers['sec-fetch-site'] === 'cross-site') return res.status(403).json({error:'Forbidden origin'});
      if (req.headers.origin) {
        try {
          if (new URL(req.headers.origin).origin !== `https://${req.headers.host}`) return res.status(403).json({ error: 'Forbidden origin' });
        } catch { return res.status(403).json({ error: 'Forbidden origin' }); }
      }
      if ((req.headers['content-type'] || '').split(';')[0].trim().toLowerCase() !== 'application/json') return res.status(415).json({ error: 'JSON required' });
    }
    try {
      if (operation === 'recovery/config') { const firebaseConfig=recoveryPublicConfig(); return res.status(200).json({configured:!!firebaseConfig,firebaseConfig}); }
      let body = req.body;
      if (method === 'POST' && typeof body === 'string') {
        try { body = JSON.parse(body); } catch { return res.status(400).json({ error: 'Invalid JSON' }); }
      }
      if (['recovery/phone/bind','recovery/phone/remove','recovery/access','recovery/reset-password'].includes(operation)) {
        const {pool,secret}=configuration();
        const limited = await pool.query(`INSERT INTO gdna_auth_recovery_limits (scope,window_start,attempts)
          VALUES ($1,to_timestamp(floor(extract(epoch FROM clock_timestamp())/900)*900),1)
          ON CONFLICT(scope,window_start) DO UPDATE SET attempts=LEAST(gdna_auth_recovery_limits.attempts+1,21) RETURNING attempts`,
          [createHash('sha256').update(String(req.headers['x-real-ip'] || req.socket?.remoteAddress || 'unknown')).digest('hex')]);
        if(limited.rows[0]?.attempts>20) return res.status(429).json({error:'Too many recovery attempts'});
        let proof;
        try { proof=await verifyPhoneProof(body?.idToken); }
        catch { return res.status(400).json({error:'Recovery could not be completed. Verify your phone again and retry.'}); }
        const sid=readSid(req,secret);
        const device=deviceToken(req) || randomBytes(32).toString('base64url');
        const recoveredSid=randomBytes(24).toString('base64url');
        const ttl=365*DAY;
        const result=await transaction(pool,async client=>{
          // Serializes phone ownership changes and consumed-proof transactions.
          await client.query('SELECT pg_advisory_xact_lock(782341903)');
          let id;
          const enrollment=operation==='recovery/phone/bind'||operation==='recovery/phone/remove';
          if(enrollment) {
            if(!sid) return null;
            const lookup=await client.query("SELECT sess FROM user_sessions WHERE sid=$1 AND expire>NOW()",[sid]);
            const sess=lookup.rows[0]?.sess;
            if(!sess || !sessionDeviceMatches(req,sess)) return null;
            id=sess.userId;
            const users=await client.query('SELECT password_hash,credential_epoch FROM users WHERE id=$1 FOR UPDATE',[id]);
            const user=users.rows[0];
            const locked=await client.query('SELECT sess FROM user_sessions WHERE sid=$1 AND expire>NOW() FOR UPDATE',[sid]);
            if(!locked.rows[0]?.sess || locked.rows[0].sess.credentialEpoch!==sess.credentialEpoch || !user || user.credential_epoch!==sess.credentialEpoch || !await bcrypt.compare(typeof body.currentPassword==='string'?body.currentPassword:'',user.password_hash)) return null;
          } else {
            const mapping=await client.query('SELECT user_id FROM gdna_auth_recovery_phones WHERE phone_e164=$1 AND firebase_project_id=$2',[proof.phone,proof.projectId]);
            id=mapping.rows[0]?.user_id;
            if(!validId(id))return null;
            const users=await client.query("SELECT id FROM users WHERE id=$1 AND password_hash <> 'DELETED' FOR UPDATE",[id]);
            if(!users.rows.length)return null;
          }
          if(Math.floor(Date.now()/1000)-proof.authTime>300) return null;
          const consumed=await client.query('INSERT INTO gdna_auth_recovery_proofs (event_digest) VALUES ($1) ON CONFLICT DO NOTHING RETURNING event_digest',[proof.eventDigest]);
          if(!consumed.rows.length)return null;
          if(operation==='recovery/phone/bind') {
            await client.query(`INSERT INTO gdna_auth_recovery_phones (user_id,phone_e164,firebase_project_id) VALUES ($1,$2,$3)
              ON CONFLICT(user_id) DO UPDATE SET phone_e164=EXCLUDED.phone_e164,firebase_project_id=EXCLUDED.firebase_project_id`,[String(id),proof.phone,proof.projectId]);
            return {hasVerifiedPhone:true,maskedPhone:proof.phone.slice(0,3)+'••••'+proof.phone.slice(-2)};
          }
          if(operation==='recovery/phone/remove') {
            const removed=await client.query('DELETE FROM gdna_auth_recovery_phones WHERE user_id=$1 AND phone_e164=$2 AND firebase_project_id=$3 RETURNING user_id',[String(id),proof.phone,proof.projectId]);
            return removed.rows.length?{hasVerifiedPhone:false,maskedPhone:null}:null;
          }
          let changed;
          if(operation==='recovery/reset-password') {
            const password=typeof body.newPassword==='string'?body.newPassword:'';
            if(password.length<8 || Buffer.byteLength(password)>72) return null;
            const hash=await bcrypt.hash(password,12);
            changed=await client.query('UPDATE users SET password_hash=$2,credential_epoch=credential_epoch+1 WHERE id=$1 RETURNING credential_epoch',[id,hash]);
          } else changed=await client.query('UPDATE users SET credential_epoch=credential_epoch+1 WHERE id=$1 RETURNING credential_epoch',[id]);
          await client.query("DELETE FROM user_sessions WHERE sess->>'userId'=$1",[String(id)]);
          const expires=new Date(Date.now()+ttl);
          const sess={userId:id,credentialEpoch:changed.rows[0].credential_epoch,deviceBinding:deviceBinding(req,device),rememberMe:true,cookie:{originalMaxAge:ttl,expires:expires.toISOString(),secure:true,httpOnly:true,path:'/',sameSite:'lax'}};
          await client.query('INSERT INTO user_sessions (sid,sess,expire) VALUES ($1,$2,$3)',[recoveredSid,JSON.stringify(sess),expires]);
          return {success:true};
        });
        if(!result)return res.status(400).json({error:'Recovery could not be completed. Verify your phone again and retry.'});
        if(result.success)cookie(res,recoveredSid,secret,ttl,device);
        return res.status(200).json(result);
      }
      if (operation === 'login' || operation === 'register') {
        const identifier = typeof body?.username === 'string' && body.username.trim() ? body.username : body?.email;
        const username = typeof identifier === 'string' ? identifier.trim() : '';
        const password = typeof body?.password === 'string' ? body.password : '';
        if (!username || username.length > 256 || !password || Buffer.byteLength(password) > 72) return res.status(400).json({ error: 'Valid username and password required' });
        const success = throttled(req);
        if (!success) { res.setHeader('Retry-After', '900'); return res.status(429).json({ error: 'Too many attempts; retry later' }); }
        const { pool, secret } = configuration();
        let registered;
        if (operation === 'register') {
          const birthDate = typeof body.birthDate === 'string' ? body.birthDate : '';
          const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : `citizen-${randomUUID()}@gdna.internal`;
          if (!/^[\p{L}\p{N}_ .-]{3,40}$/u.test(username) || password.length < 8 || !/^\d{4}-\d{2}-\d{2}$/.test(birthDate) || !Number.isFinite(Date.parse(birthDate)) || new Date(birthDate).toISOString().slice(0,10) !== birthDate || Date.parse(birthDate) > Date.now() || email.length > 256 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return res.status(400).json({error:'Valid registration fields required'});
          if (!await usernameAllowed(username)) return res.status(400).json({error:'Account name rejected'});
          const hash = await bcrypt.hash(password, 12);
          registered = await transaction(pool, async client => {
            await client.query('SELECT pg_advisory_xact_lock(782341902)');
            const existing = await client.query('SELECT id FROM users WHERE LOWER(username) = LOWER($1) OR LOWER(email) = LOWER($1) OR LOWER(username) = LOWER($2) OR LOWER(email) = LOWER($2) LIMIT 1', [username,email]);
            if (existing.rows.length) return null;
            const created = await client.query(`INSERT INTO users (id,email,username,password_hash,birth_date) VALUES ($1,$2,$3,$4,$5) RETURNING ${PUBLIC_COLUMNS}, credential_epoch`, [randomUUID(),email,username,hash,birthDate]);
            return created.rows[0];
          });
          if (!registered) return res.status(409).json({error:'Account identifier unavailable'});
        }
        const matches = registered ? {rows:[registered]} : await pool.query(`SELECT ${PUBLIC_COLUMNS}, password_hash, credential_epoch FROM users WHERE LOWER(email) = LOWER($1) OR LOWER(username) = LOWER($1) ORDER BY id LIMIT 2`, [username]);
        // Fail closed for duplicates or an email/username collision across accounts.
        const user = matches.rows.length === 1 ? matches.rows[0] : null;
        let valid = false;
        if (user && validId(user.id)) { try { valid = !!registered || await bcrypt.compare(password, user.password_hash); } catch { /* malformed hashes fail closed */ } }
        if (!valid) return res.status(401).json({ error: 'Invalid username or password' });
        const sid = randomBytes(24).toString('base64url');
        const ttl = body.rememberMe === false ? 7 * DAY : 365 * DAY;
        const expires = new Date(Date.now() + ttl);
        const device = deviceToken(req) || randomBytes(32).toString('base64url');
        const sess = { deviceBinding:deviceBinding(req,device), cookie: { originalMaxAge: ttl, expires: expires.toISOString(), secure: true, httpOnly: true, path: '/', sameSite: 'lax' }, userId: user.id, credentialEpoch: user.credential_epoch, rememberMe: body.rememberMe !== false };
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
        cookie(res, sid, secret, ttl, device);
        return res.status(operation === 'register' ? 201 : 200).json(publicUser);
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
        const id = lookup.rows[0]?.user_id;
        if (!validId(id)) return null;
        const users = await client.query(`SELECT ${PUBLIC_COLUMNS}, credential_epoch FROM users WHERE id = $1 FOR UPDATE`, [id]);
        if (!users.rows[0]) return null;
        const sessions = await client.query('SELECT sess FROM user_sessions WHERE sid = $1 AND expire > NOW() FOR UPDATE', [sid]);
        const sess = sessions.rows[0]?.sess;
        const user = users.rows[0];
        if (!sess || String(sess.userId) !== String(id) || (sess.credentialEpoch ?? 0) !== user.credential_epoch || !sessionDeviceMatches(req,sess)) {
          await client.query('DELETE FROM user_sessions WHERE sid = $1', [sid]);
          return null;
        }
        if (operation === 'change-password') {
          const oldPassword = typeof body?.currentPassword === 'string' ? body.currentPassword : '';
          const nextPassword = typeof body?.newPassword === 'string' ? body.newPassword : '';
          if (nextPassword.length < 8 || Buffer.byteLength(nextPassword) > 72) return {invalidChange:true};
          const proof = await client.query('SELECT password_hash FROM users WHERE id = $1', [id]);
          if (!await bcrypt.compare(oldPassword, proof.rows[0]?.password_hash || '')) return {invalidChange:true};
          const hash = await bcrypt.hash(nextPassword, 12);
          await client.query('UPDATE users SET password_hash = $2, credential_epoch = credential_epoch + 1 WHERE id = $1', [id,hash]);
          await client.query("DELETE FROM user_sessions WHERE sess->>'userId' = $1", [String(id)]);
          return {changed:true};
        }
        if(operation === 'recovery/phone') {
          const phones=await client.query('SELECT phone_e164 FROM gdna_auth_recovery_phones WHERE user_id=$1',[String(id)]);
          const phone=phones.rows[0]?.phone_e164;
          return {phone:{hasVerifiedPhone:!!phone,maskedPhone:phone?phone.slice(0,3)+'••••'+phone.slice(-2):null}};
        }
        const oldTtl = sess.cookie?.originalMaxAge;
        const ttl = sess.rememberMe === false ? 7 * DAY : sess.rememberMe === true || oldTtl === 30 * DAY || oldTtl === 365 * DAY ? 365 * DAY : 7 * DAY;
        const expires = new Date(Date.now() + ttl);
        sess.cookie = { ...sess.cookie, originalMaxAge: ttl, expires: expires.toISOString() };
        await client.query('UPDATE user_sessions SET sess = $2, expire = $3 WHERE sid = $1', [sid, JSON.stringify(sess), expires]);
        return { user: serializeUser(user), ttl };
      });
      if(current?.phone)return res.status(200).json(current.phone);
      if (current?.invalidChange) return res.status(400).json({error:'Password change rejected'});
      if (current?.changed) { cookie(res,null,secret,0); return res.status(200).json({message:'Password changed. Sign in again.'}); }
      if (!current) { cookie(res, null, secret, 0); return res.status(401).json({ error: 'Not authenticated' }); }
      cookie(res, sid, secret, current.ttl, deviceToken(req));
      return res.status(200).json(current.user);
    } catch {
      // No connection strings, SQL errors, hashes or secrets in HTTP responses/logs.
      console.error('Authentication backend unavailable', { operation });
      return res.status(503).json({ error: 'Authentication temporarily unavailable; retry later' });
    }
  };
}

// Fence publication against logout/password rotation while media is inspected.
export async function lockPublicationSession(req, client, expectedUserId) {
  const sid = readSid(req, process.env.SESSION_SECRET);
  if (!sid) return false;
  const users = await client.query('SELECT credential_epoch FROM users WHERE id=$1 FOR UPDATE', [expectedUserId]);
  const sessions = await client.query('SELECT sess FROM user_sessions WHERE sid=$1 AND expire>NOW() FOR SHARE', [sid]);
  const session = sessions.rows[0]?.sess;
  return !!session && session.userId === expectedUserId && users.rows.length === 1 &&
    session.credentialEpoch === users.rows[0].credential_epoch && sessionDeviceMatches(req, session);
}

const coreRoutes = new Map([
  ['/api/auth/login','login'], ['/api/login','login'],
  ['/api/auth/register','register'], ['/api/register','register'],
  ['/api/auth/me','me'], ['/api/auth/session','me'], ['/api/auth/verify','me'],
  ['/api/auth/logout','logout'], ['/api/auth/change-password','change-password'],
]);
export function secureAuthRoutes(req, res, next) {
  const recoveryPaths=['config','phone','phone/bind','phone/remove','access','reset','reset-password'];
  const recovery=req.path.startsWith('/api/auth/recovery/')?req.path.slice('/api/auth/recovery/'.length):null;
  const operation = coreRoutes.get(req.path) || (recoveryPaths.includes(recovery)?'recovery/'+(recovery==='reset'?'reset-password':recovery):null);
  if (!operation) return next();
  return authHandler(operation)(req,res);
}
export function enforceDeviceSession(req,res,next) {
  if (!req.path.startsWith('/api/') || !req.session?.userId) return next();
  if (sessionDeviceMatches(req,req.session)) return next();
  // Old unbound sessions must reauthenticate instead of acquiring a binding
  // from whoever happens to present the cookie first.
  req.session.destroy(error => {
    if (error) return res.status(503).json({error:'Session revocation unavailable'});
    res.clearCookie('connect.sid',{path:'/',httpOnly:true,secure:true,sameSite:'lax'});
    return res.status(401).json({error:'Sign in again on this device'});
  });
}
