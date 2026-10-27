import { GetObjectCommand, S3ServiceException } from '@aws-sdk/client-s3';
import { sql } from 'drizzle-orm';
import { database, storage } from '../../server/clients.js';
import { clipId } from '../../server/validation.js';

export async function GET(req: Request) {
  const params = new URL(req.url).searchParams;
  const id = clipId(params.get('id'));
  const variant = params.get('variant') || 'original';
  if (id === null) return Response.json({ error: 'Invalid id' }, { status: 400, headers: { 'Cache-Control': 'no-store' } });
  if (!['original', 'mobile'].includes(variant)) return Response.json({ error: 'Invalid variant' }, { status: 400, headers: { 'Cache-Control': 'no-store' } });
  const range = req.headers.get('range');
  if (range && !/^bytes=(?:\d+-\d*|-\d+)$/.test(range)) {
    return Response.json({ error: 'Unsupported range' }, { status: 416, headers: { 'Cache-Control': 'no-store' } });
  }
  try {
    const db = database();
    const result = await db.execute(sql`
      SELECT object_r, object_mobile_r FROM clip_original WHERE clip_id = ${id} LIMIT 1
    `);
    const row = result.rows[0];
    if (!row) return Response.json({ error: 'Clip not found' }, { status: 404, headers: { 'Cache-Control': 'no-store' } });
    const key = (variant === 'mobile' ? row.object_mobile_r || row.object_r : row.object_r);
    if (typeof key !== 'string' || !key) return Response.json({ error: 'Clip object not found' }, { status: 404, headers: { 'Cache-Control': 'no-store' } });
    const { client, bucket } = storage();
    const obj = await client.send(new GetObjectCommand({
      Bucket: bucket, Key: key.replace(/^r2:/, '').replace(/^\/+/, ''),
      ...(range ? { Range: range } : {}),
    }));
    if (!obj.Body) return Response.json({ error: 'Empty object' }, { status: 404, headers: { 'Cache-Control': 'no-store' } });
    // Partial requests must not increment views; analytics failure must not stop playback.
    if (!range) {
      try { await db.execute(sql`INSERT INTO clip_views (clip_id) VALUES (${id})`); }
      catch { console.error('Clip view recording failed'); }
    }
    const headers = new Headers({
      'Content-Type': obj.ContentType || 'application/octet-stream',
      'Accept-Ranges': 'bytes',
      'Cache-Control': 'private, no-store',
    });
    if (obj.ContentLength !== undefined) headers.set('Content-Length', String(obj.ContentLength));
    if (obj.ContentRange) headers.set('Content-Range', obj.ContentRange);
    return new Response(obj.Body.transformToWebStream(), { status: obj.ContentRange ? 206 : 200, headers });
  } catch (error) {
    if (error instanceof S3ServiceException) {
      if (error.$metadata.httpStatusCode === 416) return Response.json({ error: 'Range not satisfiable' }, { status: 416, headers: { 'Cache-Control': 'no-store' } });
      if (error.$metadata.httpStatusCode === 404) return Response.json({ error: 'Object not found' }, { status: 404, headers: { 'Cache-Control': 'no-store' } });
    }
    console.error('Clip stream request failed');
    return Response.json({ error: 'Unable to stream clip' }, { status: 500, headers: { 'Cache-Control': 'no-store' } });
  }
}
