import { sql } from 'drizzle-orm';
import { database } from '../server/clients.js';
import { clipId } from '../server/validation.js';

export async function GET(req: Request) {
  const id = clipId(new URL(req.url).searchParams.get('id'));
  if (id === null) return Response.json({ error: 'Invalid id' }, { status: 400, headers: { 'Cache-Control': 'no-store' } });
  try {
    const db = database();
    const clip = await db.execute(sql`SELECT * FROM clips WHERE id = ${id} LIMIT 1`);
    if (!clip.rows[0]) return Response.json({ error: 'Clip not found' }, { status: 404, headers: { 'Cache-Control': 'no-store' } });
    const [likes, bookmarks] = await Promise.all([
      db.execute(sql`SELECT COUNT(*)::int AS count FROM clip_likes WHERE clip_id = ${id}`),
      db.execute(sql`SELECT COUNT(*)::int AS count FROM clip_bookmarks WHERE clip_id = ${id}`),
    ]);
    return Response.json({
      clip: clip.rows[0],
      likes: likes.rows[0].count,
      bookmarks: bookmarks.rows[0].count,
      streamUrl: `/api/clips/stream?id=${id}`,
    }, { headers: { 'Cache-Control': 'no-store' } });
  } catch {
    console.error('Clip metadata request failed');
    return Response.json({ error: 'Unable to load clip' }, { status: 500, headers: { 'Cache-Control': 'no-store' } });
  }
}
