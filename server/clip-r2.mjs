import { randomUUID } from 'node:crypto';
import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

// Match the existing browser's single-PUT limit; never buffer media in a Function.
export const MAX_DIRECT_CLIP_BYTES = 5 * 1024 ** 3;

/** Only call after the public clip lookup has excluded frozen/missing records. */
export function publicClipUrl(reference, env = process.env) {
  if (typeof reference !== 'string' || !reference.startsWith('r2:')) return null;
  return getPublicUrl(reference.slice(3), env);
}

/** Public clip keys only; never use the private API endpoint for display. */
export function getPublicUrl(key, env = process.env) {
  const raw = env.R2_PUBLIC_URL?.trim();
  if (!raw) return null; // Private buckets retain the existing signed/proxied path.
  if (!/^clips\/(original|derived)\/[A-Za-z0-9][A-Za-z0-9/._-]*$/.test(key) || key.includes('..')) {
    throw new Error('Invalid R2 clip reference');
  }
  const base = new URL(raw);
  if (base.protocol !== 'https:' || base.username || base.password || base.search || base.hash ||
      base.hostname.endsWith('.r2.cloudflarestorage.com')) {
    throw new Error('R2_PUBLIC_URL must be a public HTTPS base URL');
  }
  return `${base.href.replace(/\/+$/, '')}/${key.split('/').map(encodeURIComponent).join('/')}`;
}

export async function signClipPut(config, input) {
  // The SDK's default CRC32 describes an empty body at signing time, not the
  // original File uploaded later. Match the existing chat direct-upload signer.
  const signer = new S3Client({
    region: 'auto', endpoint: config.endpoint,
    credentials: { accessKeyId: config.accessKeyId, secretAccessKey: config.secretAccessKey },
    requestChecksumCalculation: 'WHEN_REQUIRED',
  });
  try {
    return await getSignedUrl(signer, new PutObjectCommand(input), {
      expiresIn: 3600,
      signableHeaders: new Set(['content-type', 'content-length', 'if-none-match']),
    });
  } finally { signer.destroy(); }
}

/** Mounted after the original session/owner fence and per-citizen rate limiter. */
export function createClipPresign({ pool, r2Config, resolveClipUploadType,
  clipDownloadExtension, validateClipDisplayTitle, ClipUploadError, logger, sign = signClipPut, env = process.env }) {
  return async (req, res) => {
    res.set('Cache-Control', 'no-store');
    const userId = req.session?.userId;
    if (!Number.isSafeInteger(userId) || userId <= 0) return res.status(401).json({ error: 'يجب تسجيل الدخول' });
    if ((req.body?.ownerId != null && req.body.ownerId !== userId) ||
        (req.body?.expectedOwnerId != null && req.body.expectedOwnerId !== userId)) {
      return res.status(403).json({ error: 'تغير الحساب؛ اختر الملف مجدداً' });
    }
    try {
      const config = r2Config();
      if (!config || config.bucket !== 'gdna-arena') return res.status(503).json({ error: 'R2 storage is not configured' });
      const body = req.body ?? {};
      const rawName = body.filename ?? body.fileName;
      const filename = typeof rawName === 'string' ? rawName.trim() : '';
      const title = validateClipDisplayTitle(body.title);
      const size = body.size;
      const rawType = typeof body.contentType === 'string' ? body.contentType : '';
      const contentType = resolveClipUploadType(rawType, filename);
      const duration = body.durationSec == null ? 0 : body.durationSec;
      if (!title || !filename || filename.length > 1024 || !contentType ||
          !Number.isSafeInteger(size) || size <= 0 || size > MAX_DIRECT_CLIP_BYTES ||
          typeof duration !== 'number' || !Number.isFinite(duration) || duration < 0) {
        return res.status(400).json({ error: 'Invalid clip upload metadata' });
      }
      const id = randomUUID();
      const key = `clips/original/${userId}/${id}${clipDownloadExtension(contentType)}`;
      const url = getPublicUrl(key, env);
      if (!url) return res.status(503).json({ error: 'Public R2 clip URL is not configured' });
      // Sign the browser's exact header (including generic mobile MIME). The
      // normalized type is stored for playback; confirmation still probes bytes.
      const uploadUrl = await sign(config, {
        Bucket: config.bucket, Key: key, ContentType: rawType || 'application/octet-stream',
        ContentLength: size, IfNoneMatch: '*',
      });
      await pool.query(`INSERT INTO r2_clip_uploads
        (id,user_id,request_id,object_name,multipart_upload_id,original_name,display_title,
         content_type,size_bytes,duration_sec,expires_at)
        VALUES ($1,$2,$1,$3,'direct-put',$4,$5,$6,$7,$8,$9)`,
      [id, userId, `r2:${key}`, filename, title ?? null, contentType, size, duration,
        new Date(Date.now() + 3600_000)]);
      // Acceptance is not publication. Existing /clips/confirm verifies storage,
      // probes media and commits the clip + upload receipt transactionally.
      return res.status(201).json({ url, uploadUrl, key });
    } catch (error) {
      logger.error({ err: error }, 'Direct clip presign failed');
      return res.status(error instanceof ClipUploadError ? error.status : 503)
        .json({ error: error instanceof ClipUploadError ? error.message : 'تعذر بدء الرفع' });
    }
  };
}
