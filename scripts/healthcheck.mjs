import http from 'node:http';
const req = http.get({ hostname: '127.0.0.1', port: Number(process.env.PORT ?? 8080), path: '/healthz', timeout: 2000 }, res => {
 let body = '';
 res.on('data', chunk => body += chunk);
 res.on('end', () => { try { process.exit(res.statusCode === 200 && JSON.parse(body).status === 'ok' ? 0 : 1); } catch { process.exit(1); } });
});
req.on('timeout', () => req.destroy());
req.on('error', () => process.exit(1));
