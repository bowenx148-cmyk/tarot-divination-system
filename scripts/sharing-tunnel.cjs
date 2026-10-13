/* eslint-disable @typescript-eslint/no-require-imports -- standalone Node launcher */
const { spawn } = require('node:child_process');
const { readFileSync, writeFileSync } = require('node:fs');
const { join } = require('node:path');
const state = join(process.cwd(), '.local');
const token = readFileSync(join(state, 'ngrok-token.txt'), 'utf8').trim();
const config = join(state, 'ngrok-config.yml');
writeFileSync(config, 'version: "3"\nagent:\n  authtoken: ' + JSON.stringify(token) + '\n  web_addr: 127.0.0.1:4041\n', { mode: 0o600 });
const tunnel = spawn(join(state, 'ngrok-bin', 'ngrok.exe'), ['http', 'http://127.0.0.1:3002', '--config', config, '--log', 'stdout', '--log-format', 'json', '--inspect=false'], { windowsHide: true });
writeFileSync(join(state, 'tunnel-child.json'), JSON.stringify({ id: tunnel.pid, parent: process.pid }));
let buffered = '';
function receive(data) {
  buffered += data;
  const lines = buffered.split('\n'); buffered = lines.pop();
  for (const line of lines) {
    const clean = line.split(token).join('[redacted]');
    try {
      const event = JSON.parse(clean);
      const url = event.url;
      if (typeof url === 'string' && /^https:\/\/[a-zA-Z0-9.-]+\.(?:ngrok-free\.(?:app|dev)|ngrok\.(?:app|dev|io))$/.test(url)) { writeFileSync(join(state, 'public-url.txt'), url); console.log(`Share this URL: ${url}`); }
      else if (event.lvl === 'eror' || event.lvl === 'warn') console.error(clean);
    } catch { if (/ERR_NGROK/.test(clean)) console.error(clean); }
  }
}
tunnel.stdout.setEncoding('utf8'); tunnel.stderr.setEncoding('utf8');
tunnel.stdout.on('data', receive); tunnel.stderr.on('data', receive);
tunnel.on('error', error => { console.error(error.message); process.exitCode = 1; });
tunnel.on('exit', code => { console.error('Tunnel closed. Restart sharing to reconnect.'); process.exitCode = code || 0; });
