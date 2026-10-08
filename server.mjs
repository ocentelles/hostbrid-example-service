import http from 'node:http';
import { readFileSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
const port = Number(process.env.PORT ?? 8080);
if (!Number.isInteger(port) || port < 0 || port > 65535) throw new Error('PORT must be an integer from 0 to 65535');
const version = '1.0.0';
const started = performance.now();
const bootId = randomUUID();
let requests = 0;
let closing = false;
const assets = new Map([
  ['/service.css', ['text/css; charset=utf-8', readFileSync(new URL('./public/service.css', import.meta.url))]],
  ['/signal.svg', ['image/svg+xml', readFileSync(new URL('./public/signal.svg', import.meta.url))]],
]);
function snapshot() { return { version, bootId, uptimeSeconds: Number(((performance.now() - started) / 1000).toFixed(3)), requests, storage: 'ephemeral-memory' }; }
function page() {
 const state = snapshot();
 return `<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="robots" content="noindex"><title>Señal · Un proceso en marcha</title><meta name="description" content="Demostración original de un servicio HTTP Node con estado efímero."><link rel="stylesheet" href="/service.css"></head><body><main><header><span class="badge">DEMO ORIGINAL · NODE HTTP</span><a href="/healthz">Salud del proceso</a></header><section><div><p class="eyebrow">Señal / 01</p><h1>Hay un proceso<br>al otro lado.</h1><p class="intro">Esta página la responde un servidor en marcha. Cada petición lee su tiempo de actividad y su versión.</p><a class="button" href="/status.json">Ver estado en JSON ↗</a></div><img src="/signal.svg" width="340" height="300" alt="Tres pulsos conectados a un nodo activo"></section><dl><div><dt>Versión</dt><dd>${state.version}</dd></div><div><dt>Actividad desde arranque</dt><dd>${state.uptimeSeconds} s</dd></div><div><dt>Peticiones en memoria</dt><dd>${state.requests}</dd></div></dl><aside><h2>La memoria dura lo que dura el proceso.</h2><p>El contador y el identificador de arranque se reinician al reiniciar. Esta demo no guarda archivos, no tiene base de datos y no demuestra persistencia.</p></aside><footer>GET /healthz · GET /status.json · rutas desconocidas → 404</footer></main></body></html>`;
}
const server = http.createServer((req, res) => {
 requests += 1;
 const headers = { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff', 'Content-Security-Policy': "default-src 'self'; img-src 'self'; style-src 'self'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'" };
 function send(status, type, body, extra = {}) { res.writeHead(status, { ...headers, 'Content-Type': type, ...extra }); res.end(req.method === 'HEAD' ? undefined : body); }
 if (closing) return send(503, 'text/plain; charset=utf-8', 'Shutting down\n');
 if (!['GET', 'HEAD'].includes(req.method)) return send(405, 'text/plain; charset=utf-8', 'Method not allowed\n', { Allow: 'GET, HEAD' });
 // Exact allowlist: no filesystem resolution and no fallback to the home page.
 if (req.url === '/') return send(200, 'text/html; charset=utf-8', page());
 if (req.url === '/healthz') return send(200, 'application/json', JSON.stringify({ status: 'ok', version }) + '\n');
 if (req.url === '/status.json') return send(200, 'application/json', JSON.stringify(snapshot()) + '\n');
 if (assets.has(req.url)) { const [type, body] = assets.get(req.url); return send(200, type, body); }
 return send(404, 'text/plain; charset=utf-8', 'Not found\n');
});
server.requestTimeout = 5000;
server.headersTimeout = 5000;
server.listen(port, '0.0.0.0', () => console.log(JSON.stringify({ event: 'listening', host: '0.0.0.0', port: server.address().port, version })));
function shutdown(signal) {
 if (closing) return;
 closing = true;
 console.log(JSON.stringify({ event: 'shutdown_started', signal }));
 const deadline = setTimeout(() => { console.log(JSON.stringify({ event: 'shutdown_deadline' })); process.exit(1); }, 5000);
 deadline.unref();
 server.close(() => { clearTimeout(deadline); console.log(JSON.stringify({ event: 'shutdown_complete' })); process.exit(0); });
}
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
