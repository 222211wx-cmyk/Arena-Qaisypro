import { GetObjectCommand, S3ServiceException } from '@aws-sdk/client-s3';
import { sql } from 'drizzle-orm';
import { database, storage } from '../../server/clients.js';
import { clipId } from '../../server/validation.js';

export async function GET(req: Request) {
  const params = new URL(req.url).searchParams;
  const id = clipId(params.get('id'));
  const variant = params.get('variant') || 'original';
  if (id === null) return new Response('Invalid id', { status: 400 });
  if (!['original', 'mobile'].includes(variant)) return new Response('Invalid variant', { status: 400 });
  const range = req.headers.get('range');
  if (range && !/^bytes=(?:\d+-\d*|-\d+)$/.test(range)) {
    return new Response('Unsupported range', { status: 416 });
  }
  try {
    const db = database();
    const result = await db.execute(sql`
      SELECT object_r, object_mobile_r FROM clip_original WHERE clip_id = ${id} LIMIT 1
    `);
    const row = result.rows[0];
    if (!row) return new Response('Clip not found', { status: 404 });
    const key = (variant === 'mobile' ? row.object_mobile_r || row.object_r : row.object_r);
    if (typeof key !== 'string' || !key) return new Response('Clip object not found', { status: 404 });
    const { client, bucket } = storage();
    const obj = await client.send(new GetObjectCommand({
      Bucket: bucket, Key: key.replace(/^r2:/, '').replace(/^\/+/, ''),
      ...(range ? { Range: range } : {}),
    }));
    if (!obj.Body) return new Response('Empty object', { status: 404 });
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
      if (error.$metadata.httpStatusCode === 416) return new Response('Range not satisfiable', { status: 416 });
      if (error.$metadata.httpStatusCode === 404) return new Response('Object not found', { status: 404 });
    }
    console.error('Clip stream request failed');
    return new Response('Unable to stream clip', { status: 500 });
  }
}
