import http from 'node:http';

// Keep startup failures (for example missing DATABASE_URL) inside the JSON
// contract too. Cache a successful import without copying any environment data.
let backend;
const adapter = http.createServer(async (req, res) => {
  try {
    backend ??= import('../.original-backend/runtime.mjs');
    const { default: server } = await backend;
    server.emit('request', req, res);
  } catch {
    if (res.headersSent) return res.destroy();
    res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
    res.end(JSON.stringify({ error: 'API backend initialization failed', code: 'API_STARTUP_FAILED' }));
  }
});
adapter.on('upgrade', async (req, socket, head) => {
  try {
    backend ??= import('../.original-backend/runtime.mjs');
    const { default: server } = await backend;
    server.emit('upgrade', req, socket, head);
  } catch { socket.destroy(); }
});
export default adapter;
