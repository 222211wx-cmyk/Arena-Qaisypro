// Install before session/body middleware so aliases use the same authentication
// and rate limits as their canonical routes. Health is liveness, not DB readiness.
export function apiAliases(req, res, next) {
  const [path, ...query] = req.url.split('?');
  if ((req.method === 'GET' || req.method === 'HEAD') && path === '/api/health') {
    return res.set('Cache-Control', 'no-store').json({ status: 'ok' });
  }
  const aliases = { '/api/login': '/api/auth/login', '/api/register': '/api/auth/register', '/api/clips': '/api/clips/feed' };
  if (Object.hasOwn(aliases, path)) req.url = aliases[path] + (query.length ? '?' + query.join('?') : '');
  next();
}

export function apiNotFound(req, res, next) {
  if (req.path !== '/api' && !req.path.startsWith('/api/')) return next();
  return res.status(404).set('Cache-Control', 'no-store').json({ error: 'API route not found' });
}

// Express forwards session-store, parser, sync and rejected async-route errors
// here. Never serialize database messages, SQL, credentials or stack traces.
export function apiError(error, req, res, next) {
  if (res.headersSent) return next(error);
  const candidate = error.statusCode ?? error.status;
  const status = Number.isInteger(candidate) && candidate >= 400 && candidate <= 599 ? candidate : 500;
  req.log?.error({ code: 'API_REQUEST_FAILED', status }, 'API request failed');
  return res.status(status).set('Cache-Control', 'no-store').json({
    error: status >= 500 ? 'API temporarily unavailable' : status === 413 ? 'Request body too large' : 'Invalid API request',
    code: status >= 500 ? 'API_UNAVAILABLE' : 'INVALID_REQUEST',
  });
}
