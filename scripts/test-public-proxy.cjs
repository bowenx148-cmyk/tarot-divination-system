/* eslint-disable @typescript-eslint/no-require-imports -- standalone Node verification */
const http = require('node:http');
const assert = require('node:assert/strict');
const { createPublicProxy } = require('./public-proxy.cjs');
const listen = server => new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const close = server => new Promise(resolve => server.close(resolve));
(async () => {
  let calls = 0;
  const origin = http.createServer((req, res) => {
    calls++;
    if (req.url === '/api/user-memory') {
      assert.equal(req.headers.cookie, 'tarot-user=' + 'a'.repeat(64));
      if (req.method === 'POST') assert.equal(req.headers.origin, `http://127.0.0.1:${origin.address().port}`);
      res.setHeader('Set-Cookie', ['tarot-user=' + 'b'.repeat(64) + '; HttpOnly; Secure', 'tarot-developer=private']);
      return res.end('{}');
    }
    assert.equal(req.headers.cookie, undefined);
    assert.equal(req.headers.authorization, undefined);
    if (req.url === '/api/developer') return res.end(JSON.stringify({ siteTitle: 'Test', authenticated: true, style: 'private', openaiConfigured: true }));
    if (req.url === '/api/deepseek-stream') {
      res.writeHead(200, { 'Content-Type': 'text/event-stream' });
      res.write('data: first\n\n'); setTimeout(() => res.end('data: second\n\n'), 150); return;
    }
    res.end('public');
  });
  await listen(origin);
  const proxy = createPublicProxy({ upstreamPort: origin.address().port }); await listen(proxy);
  const base = `http://127.0.0.1:${proxy.address().port}`;
  try {
    for (const path of ['/developer', '/api/developer', '/api/admin/quota', '/api/admin/stats', '/%64eveloper', '/api/%64eveloper', '/_next/../developer', '/api/developer/']) {
      const response = await fetch(base + path, { method: 'POST' }); assert.equal(response.status, 403, path);
    }
    assert.equal(calls, 0);
    const settings = await (await fetch(base + '/api/developer', { headers: { cookie: 'tarot-developer=forged', authorization: 'Bearer stolen' } })).json();
    assert.equal(settings.authenticated, false); assert.equal(settings.publicAccess, true); assert.equal(settings.style, undefined);
    assert.equal(await (await fetch(base + '/')).text(), 'public');
    const account = await fetch(base + '/api/user-memory', { method: 'POST', headers: { origin: base, cookie: 'tarot-developer=private; tarot-user=' + 'a'.repeat(64) } });
    assert.equal(account.status, 200); assert.match(account.headers.get('set-cookie'), /^tarot-user=/); assert.doesNotMatch(account.headers.get('set-cookie'), /developer/);
    assert.equal((await fetch(base + '/api/user-memory', { method: 'POST', headers: { origin: 'https://other.example' } })).status, 403);
    const stream = await fetch(base + '/api/deepseek-stream', { method: 'POST' }); const reader = stream.body.getReader();
    const first = await reader.read(); assert.match(Buffer.from(first.value).toString(), /first/); assert.doesNotMatch(Buffer.from(first.value).toString(), /second/);
    let rest = ''; for (;;) { const chunk = await reader.read(); if (chunk.done) break; rest += Buffer.from(chunk.value).toString(); } assert.match(rest, /second/);
    console.log('Public proxy: management blocked, credentials stripped, public settings and streaming passed');
  } finally { await close(proxy); await close(origin); }
})().catch(error => { console.error(error); process.exitCode = 1; });
