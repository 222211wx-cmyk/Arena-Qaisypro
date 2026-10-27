import { neon } from '@neondatabase/serverless';

export default async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }
  let body;
  try { body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body; }
  catch { return res.status(400).json({ error: 'Invalid JSON' }); }
  const { clipId, type = 'selfie' } = body || {};
  if (!Number.isSafeInteger(clipId) || clipId <= 0 || type !== 'selfie') {
    return res.status(400).json({ error: 'A positive clipId and type selfie are required' });
  }
  if (!req.headers.cookie) return res.status(401).json({ error: 'Authentication required' });
  // Never trust a caller-supplied user id or cookie contents as proof of identity.
  let backend;
  try {
    backend = new URL(process.env.VITE_API_URL || '');
    if (backend.protocol !== 'https:' || backend.pathname !== '/' || backend.search || backend.hash || backend.username || backend.password) throw new Error();
  } catch {
    return res.status(503).json({ error: 'Authenticated backend is not configured', code: 'AUTH_BACKEND_UNAVAILABLE' });
  }
  try {
    // Same-site cookie requests only; do not enable cross-origin publication.
    const host = req.headers['x-forwarded-host'] || req.headers.host;
    if (!req.headers.origin || new URL(req.headers.origin).host !== host) {
      return res.status(403).json({ error: 'Invalid request origin' });
    }
    const me = await fetch(new URL('/api/auth/me', backend), {
      headers: { Cookie: req.headers.cookie }, redirect: 'error', signal: AbortSignal.timeout(8000),
    });
    if (me.status === 401) return res.status(401).json({ error: 'Authentication required' });
    if (!me.ok) return res.status(503).json({ error: 'Unable to verify identity' });
    const account = await me.json();
    if (!Number.isSafeInteger(account?.id) || account.id <= 0) return res.status(503).json({ error: 'Invalid identity response' });
    if (!process.env.DATABASE_URL) return res.status(503).json({ error: 'Database is not configured' });
    const sql = neon(process.env.DATABASE_URL);
    // Only enable features on an already-published, owned clip. This endpoint
    // cannot bypass the original upload confirmation or media validation flow.
    const rows = await sql`
      UPDATE clips SET type = ${type}, features_enabled = true, tools_enabled = true
      WHERE id = ${clipId} AND user_id = ${account.id} AND status = 'published'
      RETURNING id
    `;
    if (!rows.length) return res.status(409).json({ error: 'Owned, verified publication required' });
    return res.status(200).json({ success: true, published: true, id: rows[0].id, features_enabled: true, tools_enabled: true });
  } catch {
    return res.status(503).json({ error: 'Publication unavailable; backend/schema verification required' });
  }
}
