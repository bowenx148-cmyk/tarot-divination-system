/* eslint-disable @typescript-eslint/no-require-imports -- standalone Node launcher */
const http = require('node:http');

// Public sharing uses an allowlist so new management routes stay private by default.
function createPublicProxy({ upstreamPort = 3001 } = {}) {
  return http.createServer((req, res) => {
    let path;
    try {
      path = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
    } catch {
      res.writeHead(400).end('Invalid path'); return;
    }
    const read = req.method === 'GET' || req.method === 'HEAD';
    const page = /^\/(?:cards|history|result|draw(?:\/select)?|consult\/[a-zA-Z0-9_-]+)?\/?$/.test(path);
    const asset = /^\/_next\/(?:static\/|image$)/.test(path) || /^\/tarot-images\/[a-zA-Z0-9_\/-]+\.(?:jpg|png|webp)$/.test(path) || path === '/favicon.ico';
    const userApi = path === '/api/user-memory';
    const api = ['/api/health', '/api/trial-status', '/api/suggested-questions', '/api/developer'].includes(path) || userApi;
    const allowed = (read && (page || asset || api)) || (req.method === 'POST' && (path === '/api/deepseek-stream' || userApi));
    if (!allowed || path.includes('..') || path.includes('\\') || path.includes('%')) {
      res.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' }).end('此入口仅供使用；开发者后台只允许本机访问。'); return;
    }
    const headers = { ...req.headers, host: `127.0.0.1:${upstreamPort}`, 'x-forwarded-for': 'public-sharing' };
    for (const name of ['cookie', 'authorization', 'x-forwarded-host', 'x-forwarded-proto', 'forwarded', 'connection', 'upgrade', 'x-middleware-subrequest']) delete headers[name];
    delete headers['x-user-public'];
    if (path === '/api/deepseek-stream' || path === '/api/trial-status') {
      const userCookie = (req.headers.cookie || '').split(';').find(value => /^\s*tarot-user=[a-f0-9]{64}\s*$/.test(value));
      if (userCookie) headers.cookie = userCookie.trim();
    }
    if (userApi) {
      if (req.method === 'POST') {
        let originHost;
        try { originHost = new URL(req.headers.origin).host; } catch { /* Invalid origin is rejected below. */ }
        if (originHost !== req.headers.host) { res.writeHead(403).end('Invalid origin'); return; }
        headers.origin = `http://127.0.0.1:${upstreamPort}`;
      }
      const userCookie = (req.headers.cookie || '').split(';').find(value => /^\s*tarot-user=[a-f0-9]{64}\s*$/.test(value));
      if (userCookie) headers.cookie = userCookie.trim();
      headers['x-user-public'] = 'true';
    }
    const upstream = http.request({ hostname: '127.0.0.1', port: upstreamPort, path: req.url, method: req.method, headers }, response => {
      const responseHeaders = { ...response.headers };
      if (userApi) responseHeaders['set-cookie'] = (responseHeaders['set-cookie'] || []).filter(value => value.startsWith('tarot-user='));
      else delete responseHeaders['set-cookie'];
      if (path === '/api/developer') {
        let body = '';
        response.setEncoding('utf8'); response.on('data', chunk => { body += chunk; });
        response.on('end', () => {
          try {
            const settings = JSON.parse(body);
            const publicBody = JSON.stringify({ authenticated: false, publicAccess: true, siteTitle: settings.siteTitle, openaiConfigured: settings.openaiConfigured, deepseekConfigured: settings.deepseekConfigured });
            res.writeHead(200, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', 'Content-Length': Buffer.byteLength(publicBody) }).end(publicBody);
          } catch { res.writeHead(502).end('Unable to load settings'); }
        });
        return;
      }
      res.writeHead(response.statusCode, responseHeaders);
      response.pipe(res);
    });
    upstream.on('error', () => { if (!res.headersSent) res.writeHead(502); res.end('Sharing server unavailable'); });
    req.on('aborted', () => upstream.destroy());
    res.on('close', () => upstream.destroy());
    req.pipe(upstream);
  });
}

if (require.main === module) {
  createPublicProxy().listen(3002, '127.0.0.1', () => console.log('Public proxy ready: 127.0.0.1:3002'));
}
module.exports = { createPublicProxy };
