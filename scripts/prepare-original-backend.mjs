import AdmZip from 'adm-zip';
import { build } from 'esbuild';
import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const archive = new AdmZip(resolve(root, 'api-server.zip'));
let runtime = archive.readAsText('api-server/dist/index.mjs');
if (!runtime) throw new Error('Original backend bundle missing');

// Fail closed if a future archive changes the audited startup boundaries.
function replaceOnce(before, after) {
  if (runtime.split(before).length !== 2) throw new Error(`Original startup changed: ${before.slice(0, 70)}`);
  runtime = runtime.replace(before, after);
}
function replaceBlock(start, end, replacement) {
  const a = runtime.indexOf(start);
  const b = runtime.indexOf(end, a + start.length);
  if (a < 0 || b < 0 || runtime.indexOf(start, a + 1) !== -1) throw new Error('Original startup boundary changed');
  runtime = runtime.slice(0, a) + replacement + runtime.slice(b);
}

// Restore the direct-upload endpoint used by the current Vite client. Keep the
// archive intact and mount after its existing account fence and rate limiter.
runtime = "import { createClipPresign, publicClipUrl } from './server/clip-r2.mjs';\n" + runtime;
replaceOnce('router55.post("/clips/confirm", async (req, res) => {',
  'router55.post("/clips/presign", createClipPresign({ pool, r2Config, resolveClipUploadType, clipDownloadExtension, validateClipDisplayTitle, ClipUploadError, logger }));\nrouter55.post("/clips/confirm", async (req, res) => {');
replaceOnce('if (req.body?.expectedOwnerId !== void 0 && req.body.expectedOwnerId !== req.session.userId) {',
  'if ((req.body?.ownerId !== void 0 && req.body.ownerId !== req.session.userId) || (req.body?.expectedOwnerId !== void 0 && req.body.expectedOwnerId !== req.session.userId)) {');
// Publication must probe the actual media, even on hosts without system ffprobe.
runtime = "import clipFfprobe from '@ffprobe-installer/ffprobe';\n" + runtime;
replaceOnce('spawn2("ffprobe", [', 'spawn2(clipFfprobe.path, [');
// Only the canonical bucket variable selects storage; never fall back to a stale name.
replaceOnce('(process.env.R2_BUCKET_NAME || process.env.R2_BUCKET)?.trim()',
  'process.env.R2_BUCKET?.trim()');
// Public media only: do not change the shared R2 signer used by private storage.
replaceOnce('async function signClipPlayback(filename, request = fetch) {',
  'async function signClipPlayback(filename, request = fetch) {\n  const publicUrl = publicClipUrl(filename);\n  if (publicUrl) return { url: publicUrl, urlExpiresAt: null };');
replaceOnce('        res.setHeader("Content-Type", name.endsWith(".webp") ? "image/webp" : "image/jpeg");',
  '        const publicUrl = publicClipUrl(name);\n        if (publicUrl) return res.set("Cache-Control", "no-store").redirect(307, publicUrl);\n        res.setHeader("Content-Type", name.endsWith(".webp") ? "image/webp" : "image/jpeg");');
replaceOnce('        const file2 = clipFile(clip.object_name);',
  '        const publicUrl = req.query.download !== "1" ? publicClipUrl(clip.object_name) : null;\n        if (publicUrl) return res.set("Cache-Control", "no-store").redirect(307, publicUrl);\n        const file2 = clipFile(clip.object_name);');

// Ameeq enhancement: replace its generic answer after the original
// input validation, moderation and rate limiter. All other routes stay original.
runtime = "import { createAmeeqLocal } from './api/ameeq.js';\n" + runtime;
replaceBlock('  const aiResponse = await callAiEngine(userInput, rateKey, req.log);', 'var ameeq_default = router40;',
  '  return createAmeeqLocal({ pool })(req, res);\n});\n');

// Accept both the existing hosted UI contract and the requested message/question API.
replaceOnce('  const raw = req.body?.command;', '  const raw = req.body?.message || req.body?.question || req.body?.command;');
replaceBlock('  if (!userInput) {\n    res.json({', '  const check3 = await validateContent(userInput, { allowTrivial: true });',
  '  if (!userInput) return createAmeeqLocal({ pool })(req, res);\n');

// Preserve the currently hosted backend and change ONLY the login lookup.
replaceOnce('router4.post("/auth/login", async (req, res) => {\n  try {\n    const username = typeof req.body?.username === "string" ? req.body.username.trim() : "";', 'router4.post("/auth/login", async (req, res) => {\n  try {\n    const identifier = typeof req.body?.username === "string" && req.body.username.trim() ? req.body.username : req.body?.email;\n    const username = typeof identifier === "string" ? identifier.trim() : "";');

const loginMarker = '.where(sql`LOWER(${usersTable.username}) = LOWER(${username})`).orderBy(usersTable.id).limit(2)';
// Identify by the full query, including limit(2), to leave registration untouched.
replaceOnce(loginMarker, '.where(sql`LOWER(${usersTable.email}) = LOWER(${username}) OR LOWER(${usersTable.username}) = LOWER(${username})`).orderBy(usersTable.id).limit(2)');

replaceOnce('PERSISTENT_SESSION_TTL_MS = 365 * DAY_MS;', 'PERSISTENT_SESSION_TTL_MS = 30 * DAY_MS;');

// A verified reset consumes the phone proof once, fences old sessions, then
// commits a fresh server-side session. Never turn the proof into a browser token.
replaceOnce('return { userId: userId4, sessionIds: sessions.rows.map((row) => row.sid) };',
  'return { userId: userId4, credentialEpoch: changed.rows[0].credential_epoch, sessionIds: sessions.rows.map((row) => row.sid) };');
replaceOnce(`    if (req.session?.userId === revoked.userId) {
      await new Promise((resolve) => req.session.destroy(() => resolve()));
      res.clearCookie("connect.sid", {
        path: "/",
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production"
      });
    }
    res.json(ResetRecoveryPasswordResponse.parse({ success: true }));`,
`    await new Promise((resolve, reject) => req.session.regenerate(error => error ? reject(error) : resolve()));
    req.session.userId = revoked.userId;
    authorizeNewSession(req.session, revoked.credentialEpoch);
    configureSessionLifetime(req.session, true);
    await new Promise((resolve, reject) => req.session.save(error => error ? reject(error) : resolve()));
    res.json(ResetRecoveryPasswordResponse.parse({ success: true }));`);

// Keep the existing DATABASE_URL only; TLS is explicit for hosted PostgreSQL.
replaceOnce('pool = new Pool3({ connectionString });', 'pool = new Pool3({ connectionString, ssl: { rejectUnauthorized: false }, connectionTimeoutMillis: 5000 });');
replaceOnce('error: "Clips feed is temporarily unavailable"', 'code: process.env.DATABASE_URL ? "CLIPS_DATA_UNAVAILABLE" : "DATABASE_URL_MISSING", error: process.env.DATABASE_URL ? "Clips data temporarily unavailable; retry later" : "DATABASE_URL is not configured for this deployment"');

// Hosting must not create/drop/alter tables, bootstrap administrators or seed users.
replaceOnce('if (!fs2.existsSync(uploadsDir)) fs2.mkdirSync(uploadsDir, { recursive: true });', '// Application filesystem is read-only on Vercel; do not create local uploads at startup.');
replaceOnce('ensureLegalTable().catch(console.error);', '// Existing legal schema is preserved without startup DDL.');
replaceBlock('var sessionStoreReady = pool.query(`', 'var sessionSecret =',
  'var sessionStoreReady = Promise.resolve(); // Existing production schema only.\n');
replaceOnce('new PgStore({ pool, tableName: "user_sessions", createTableIfMissing: false })',
  'new PgStore({ pool, tableName: "user_sessions", createTableIfMissing: false, pruneSessionInterval: false })');
replaceOnce('startFirebaseCallExpirationSweep();\nstartOfflineRecoveryRevocationSweep();',
  '// No autonomous cleanup sweeps in this hosting adapter.');
replaceBlock('var rawPort = process.env["PORT"];', 'logger.info(getAgoraConfigStatus()',
  '// Vercel owns the HTTP listener.\n');
// Signaling upgrades remain available; its autonomous cleanup is not started.
replaceOnce('  cleanup();\n  const cleanupInterval = setInterval(cleanup, 3e4);\n  cleanupInterval.unref();\n  httpServer.once("close", () => clearInterval(cleanupInterval));',
  '  // Autonomous call cleanup disabled to preserve production data.');
// Remove the entire seed function and startup job chain, not just its first call.
replaceBlock('async function autoSeedTestUsers() {', '/*! Bundled license information:',
  'const originalServer = http.createServer(app_default);\nattachSignalingServer(originalServer, sessionMiddleware);\nexport default originalServer;\n');
runtime = runtime.replace('//# sourceMappingURL=index.mjs.map', '');
const output = resolve(root, '.original-backend');
mkdirSync(output, { recursive: true });
// Preserve this readable audited input for safety tests. The production entry
// bundles Firebase's ESM dependencies to avoid require(ESM) in Vercel's loader.
writeFileSync(resolve(output, 'audited.mjs'), runtime);
await build({
  stdin: { contents: runtime, resolveDir: root, sourcefile: 'original-runtime.mjs' },
  outfile: resolve(output, 'runtime.mjs'),
  bundle: true, platform: 'node', format: 'esm', target: 'node22',
  banner: { js: "import { createRequire as hostingCreateRequire } from 'node:module'; globalThis.require = hostingCreateRequire(import.meta.url);" },
  external: ['@ffprobe-installer/*', '@aws-sdk/*', '@google-cloud/*', 'bcrypt', 'drizzle-orm', 'drizzle-orm/*', 'pg', 'undici', 'google-auth-library'],
});
// Keep the archived logging workers beside the generated bundle.
for (const entry of archive.getEntries()) {
  if (/^api-server\/dist\/[^/]+\.mjs$/.test(entry.entryName) && !/\/(index|media-worker)\.mjs$/.test(entry.entryName)) {
    writeFileSync(resolve(output, entry.entryName.split('/').at(-1)), entry.getData());
  }
}
// The archive uses generated require helpers which dependency tracing cannot
// fully follow. Explicitly package the lockfile's installed production modules,
// preserving nested versions and native binaries rather than guessing files.
const lock = JSON.parse(readFileSync(resolve(root, 'package-lock.json'), 'utf8'));
const dependencyRoot = resolve(output, 'node_modules');
rmSync(dependencyRoot, { recursive: true, force: true });
let packaged = 0;
for (const [name, metadata] of Object.entries(lock.packages)) {
  if (!name.startsWith('node_modules/') || metadata.dev || name.slice(13).includes('/node_modules/')) continue;
  const source = resolve(root, name);
  if (!existsSync(source)) { if (metadata.optional) continue; throw new Error(`Missing runtime package ${name}`); }
  const destination = resolve(output, name);
  mkdirSync(dirname(destination), { recursive: true });
  cpSync(source, destination, { recursive: true, dereference: true });
  packaged++;
}
console.log(`Packaged ${packaged} production dependency trees explicitly.`);
console.log('Prepared original backend: startup DDL, seeding, admin bootstrap and autonomous jobs disabled.');
