import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";
import runtimeErrorOverlay from "@replit/vite-plugin-runtime-error-modal";
import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { buildSync } from "esbuild";

// PORT only needed for dev server — build doesn't use it
const port = Number(process.env.PORT || 3000);

// BASE_PATH: "/" in production (served at root), "/gdna-arena" fallback for local dev
const basePath = process.env.BASE_PATH || "/";

function isLitePath(pathname: string, base: string): boolean {
  const relative = pathname.slice(base.length) || "/";
  return relative === "/lite" ||
    relative.startsWith("/lite/") ||
    relative === "/partners/operators" ||
    relative === "/partners/operators/" ||
    relative === "/partners/dashboard" ||
    relative === "/partners/dashboard/";
}

function liteShell(): Plugin {
  return {
    name: "gdna-lite-shell",
    configureServer(server) {
      server.middlewares.use((req, _res, next) => {
        const url = new URL(req.url || "/", "http://localhost");
        const base = basePath.replace(/\/$/, "");
        if (isLitePath(url.pathname, base)) {
          req.url = `${base}/lite.html${url.search}`;
        }
        next();
      });
    },
  };
}

function messagesDotRoute(): Plugin {
  return {
    name: "gdna-messages-dot-route",
    configureServer(server) {
      server.middlewares.use((req, _res, next) => {
        const url = new URL(req.url || "/", "http://localhost");
        const base = basePath.replace(/\/$/, "");
        // Vite's history fallback skips dotted URLs; explicitly serve the SPA
        // shell for this entry while leaving asset requests untouched.
        if (url.pathname === `${base}/messages.call` || url.pathname === `${base}/messages.call/`) {
          req.url = `${base}/index.html${url.search}`;
        }
        next();
      });
    },
  };
}

function pwaServiceWorker() {
  const liteSyncSource = buildSync({
    entryPoints: [path.resolve(import.meta.dirname, "src/lib/lite-sync-worker.ts")],
    bundle: true, write: false, format: "iife", globalName: "GDNA_LITE_SYNC",
    platform: "browser", target: "es2022", minify: true,
  }).outputFiles[0].text;
  const pushWorkerSource = liteSyncSource + "\n" + readFileSync(path.resolve(import.meta.dirname, "src/service-worker.js"), "utf8");
  return {
    name: "gdna-safe-pwa-service-worker",
    configureServer(server: { middlewares: { use: (route: string, handler: (_req: unknown, res: { setHeader: (name: string, value: string) => void; end: (body: string) => void }) => void) => void } }) {
      const workerPath = `${basePath.endsWith("/") ? basePath : `${basePath}/`}sw.js`;
      server.middlewares.use(workerPath, (_req, res) => {
        res.setHeader("Content-Type", "text/javascript");
        res.setHeader("Service-Worker-Allowed", basePath);
        res.setHeader("Cache-Control", "no-store");
        // Development uses the same push/call worker, but deliberately omits
        // production caching so Vite/HMR requests can never become stale.
        res.end(`self.addEventListener("install", event => event.waitUntil(self.skipWaiting()));
self.addEventListener("activate", event => event.waitUntil(self.clients.claim()));
${pushWorkerSource}`);
      });
    },
    writeBundle() {
      const normalizedBase = basePath.endsWith("/") ? basePath : `${basePath}/`;
      const output = path.resolve(import.meta.dirname, "dist/public");
      type ManifestEntry = { file: string; imports?: string[]; dynamicImports?: string[]; css?: string[]; assets?: string[] };
      const manifest = JSON.parse(readFileSync(path.join(output, ".vite/manifest.json"), "utf8")) as Record<string, ManifestEntry>;
      const liteFiles = new Set<string>(["index.html", "lite.html", "manifest.json", "favicon.svg", "lite-icon-192.png", "lite-icon-512.png"]);
      const visited = new Set<string>();
      const visit = (key: string) => {
        if (visited.has(key)) return;
        visited.add(key);
        const entry = manifest[key];
        if (!entry) throw new Error(`Missing Lite manifest entry: ${key}`);
        liteFiles.add(entry.file);
        for (const asset of [...(entry.css || []), ...(entry.assets || [])]) liteFiles.add(asset);
        // Only the static first-load closure belongs in the shell. In particular,
        // operator/dashboard page modules remain on-demand and must not make the
        // complete partner graph part of install-time precaching.
        for (const dependency of entry.imports || []) visit(dependency);
      };
      visit("index.html");
      visit("lite.html");
      const liteKey = Object.keys(manifest).find(key => key === "src/lite-entry.ts");
      if (liteKey) visit(liteKey);
      // Real static paths work without production rewrite changes. Unknown
      // /lite/:username routes use the host's existing index.html SPA fallback,
      // whose tiny bootstrap selects Lite before importing any React code.
      const liteHtml = readFileSync(path.join(output, "lite.html"), "utf8");
      for (const route of [
        "lite",
        "lite/in",
        "lite/africa",
        "lite/brasil",
        "partners/operators",
        "partners/dashboard",
      ]) {
        mkdirSync(path.join(output, route), { recursive: true });
        writeFileSync(path.join(output, route, "index.html"), liteHtml);
      }
      // Section install start URLs must resolve even on static hosts without an
      // SPA rewrite rule. They retain index.html's early per-route metadata.
      const appHtml = readFileSync(path.join(output, "index.html"), "utf8");
      for (const route of ["clips", "clip", "messages.call", "message-calle", "messages", "messagerie", "message calle"]) {
        mkdirSync(path.join(output, route), { recursive: true });
        writeFileSync(path.join(output, route, "index.html"), appHtml);
      }
      const precache = [...liteFiles].map(file => `${normalizedBase}${file}`);
      writeFileSync(path.join(output, "lite-precache.json"), JSON.stringify([...liteFiles], null, 2));
      const versionInputs = [...liteFiles].sort().map(file => readFileSync(path.join(output, file)));
      const version = createHash("sha256").update(versionInputs.join("|")).digest("hex").slice(0, 12);
      const source = `/* Generated at build time. Private API, AMIS, and key material are never cached. */
const VERSION = ${JSON.stringify(version)};
const SHELL_CACHE = "gdna-arena-shell-" + VERSION;
const PUBLIC_CACHE = "gdna-arena-public-" + VERSION;
const PRECACHE = ${JSON.stringify(precache)};
const BASE = ${JSON.stringify(normalizedBase)};
const OFFLINE_CLIENTS = new Set();
const isSameOrigin = url => url.origin === self.location.origin;
const isLiteNavigation = pathname => {
  const relative = pathname.slice(BASE.length - 1) || "/";
  return relative === "/lite" || relative.startsWith("/lite/") ||
    relative === "/partners/operators" || relative === "/partners/operators/" ||
    relative === "/partners/dashboard" || relative === "/partners/dashboard/";
};
const isStaticAsset = request => {
  const pathname = new URL(request.url).pathname;
  return pathname.startsWith(BASE + "assets/") || PRECACHE.includes(pathname);
};
self.addEventListener("install", event => event.waitUntil(caches.open(SHELL_CACHE).then(cache => cache.addAll(PRECACHE)).then(() => self.skipWaiting())));
self.addEventListener("activate", event => event.waitUntil(
  caches.keys()
    .then(keys => Promise.all(keys
      .filter(key => (key.startsWith("gdna-arena-shell-") || key.startsWith("gdna-arena-public-")) &&
        key !== SHELL_CACHE && key !== PUBLIC_CACHE)
      .map(key => caches.delete(key))))
    .then(() => self.clients.claim())
));
self.addEventListener("message", event => {
  if (event.data?.type !== "GDNA_CONNECTIVITY" || !event.source?.id) return;
  if (event.data.online === false) OFFLINE_CLIENTS.add(event.source.id);
  else OFFLINE_CLIENTS.delete(event.source.id);
});
self.addEventListener("fetch", event => {
  const request = event.request;
  if (!isSameOrigin(new URL(request.url))) return;
  if (request.method !== "GET" && request.method !== "HEAD") {
    if (OFFLINE_CLIENTS.has(event.clientId)) {
      event.respondWith(Promise.resolve(new Response(
        JSON.stringify({ error: "This action needs an internet connection." }),
        { status: 503, headers: { "Content-Type": "application/json" } }
      )));
    }
    return;
  }
  const url = new URL(request.url);
   // No API response enters shared CacheStorage, including authenticated variants
   // of otherwise public endpoints. Account snapshots belong in UI IndexedDB.
  if (url.pathname === BASE + "api" || url.pathname.startsWith(BASE + "api/")) {
    return;
  }
  if (request.mode === "navigate") {
    event.respondWith(fetch(request).then(response => response).catch(async () =>
       (await caches.match(BASE + (isLiteNavigation(url.pathname) ? "lite.html" : "index.html"))) || Response.error()));
    return;
  }
  if (!isStaticAsset(request)) return;
  event.respondWith(caches.match(request).then(cached => cached || fetch(request).then(response => {
    if (response.ok && response.type === "basic") {
      const copy = response.clone();
      void caches.open(SHELL_CACHE).then(cache => cache.put(request, copy));
    }
    return response;
  })));
});

${pushWorkerSource}`;
      writeFileSync(path.join(output, "sw.js"), source);
    },
  };
}

export default defineConfig({
  base: basePath,
  plugins: [
    react(),
    tailwindcss(),
    runtimeErrorOverlay(),
    liteShell(),
    messagesDotRoute(),
    pwaServiceWorker(),
    ...(process.env.NODE_ENV !== "production" &&
    process.env.REPL_ID !== undefined
      ? [
          await import("@replit/vite-plugin-cartographer").then((m) =>
            m.cartographer({ root: path.resolve(import.meta.dirname, "..") }),
          ),
          await import("@replit/vite-plugin-dev-banner").then((m) =>
            m.devBanner(),
          ),
        ]
      : []),
  ],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "src"),
      "@assets": path.resolve(import.meta.dirname, "..", "..", "attached_assets"),
    },
    dedupe: ["react", "react-dom"],
  },
  root: path.resolve(import.meta.dirname),
  build: {
    manifest: true,
    rollupOptions: {
      input: {
        app: path.resolve(import.meta.dirname, "index.html"),
        lite: path.resolve(import.meta.dirname, "lite.html"),
      },
    },
    outDir: path.resolve(import.meta.dirname, "dist/public"),
    emptyOutDir: true,
  },
  define: {
    "process.env.DATABASE_URL": '""',
  },
  server: {
    port,
    strictPort: true,
    host: "0.0.0.0",
    allowedHosts: true,
    fs: { strict: true },
    proxy: {
      "/api/ws": {
        target: "ws://localhost:8080",
        ws: true,
        changeOrigin: true,
      },
    },
  },
  preview: {
    port,
    host: "0.0.0.0",
    allowedHosts: true,
  },
});
