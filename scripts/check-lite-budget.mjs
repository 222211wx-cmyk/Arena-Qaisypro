import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { gzipSync } from "node:zlib";

// Manifest closure deliberately follows static imports only: React/app and E2EE
// lazy chunks must not be requested on a cold Lite navigation.
const root = resolve(dirname(fileURLToPath(import.meta.url)), "../dist/public");
const manifest = JSON.parse(readFileSync(resolve(root, ".vite/manifest.json"), "utf8"));
const files = new Set(["lite.html"]);
const seen = new Set();
function visit(key) {
  if (seen.has(key)) return;
  seen.add(key);
  const entry = manifest[key];
  if (!entry) throw new Error(`Missing manifest entry: ${key}`);
  files.add(entry.file);
  for (const file of [...(entry.css || []), ...(entry.assets || [])]) files.add(file);
  for (const key of entry.imports || []) visit(key);
}
visit("lite.html");
// Do not follow manifest dynamicImports here: operator/dashboard page modules
// are interaction/route-loaded and must not enter the first-load/precache budget.
let coreRaw = 0, coreGzip = 0;
for (const file of files) {
  if (!file.endsWith(".js")) continue;
  const data = readFileSync(resolve(root, file));
  coreRaw += data.length;
  coreGzip += gzipSync(data).length;
}
// Count the complete first installation, including SW, fallback shell, manifests,
// icons and all precache dependencies. Raw sum is a conservative transfer bound
// even on hosts without compression; image files are not credited gzip savings.
for (const file of JSON.parse(readFileSync(resolve(root, "lite-precache.json"), "utf8"))) files.add(file);
files.add("sw.js");
let raw = 0, gzip = 0;
for (const file of files) {
  const data = readFileSync(resolve(root, file));
  const compressed = gzipSync(data).length;
  raw += data.length;
  gzip += compressed;
  console.log(`${file}: raw ${data.length} B; gzip ${compressed} B`);
}
console.log(`Lite core JS raw: ${coreRaw} B / 51200 B; gzip: ${coreGzip} B`);
console.log(`Whole cold shell raw: ${raw} B / 153600 B; gzip equivalent: ${gzip} B`);
if (coreRaw > 50 * 1024 || raw > 150 * 1024) process.exitCode = 1;
console.log("This is a build closure check, not an HTTP measurement. Verify cold /lite and exact /partners routes with cache and service workers cleared; include HTML, scripts, CSS, fonts, images and runtime requests.");