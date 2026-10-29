import http from 'node:http';
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

// Minimal local-only, read-only API. No third-party dependencies.
// Values are loaded from backend/.env if present, then process environment.
const envPath = resolve(process.cwd(), '.env');
if (existsSync(envPath)) {
  for (const line of readFileSync(envPath, 'utf8').split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const idx = trimmed.indexOf('=');
    if (idx < 1) continue;
    const key = trimmed.slice(0, idx).trim();
    let value = trimmed.slice(idx + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) value = value.slice(1, -1);
    if (!(key in process.env)) process.env[key] = value;
  }
}

const host = process.env.API_HOST || '127.0.0.1';
const port = Number(process.env.API_PORT || 3001);
const rpcHost = process.env.RPC_HOST || '127.0.0.1';
const rpcPort = Number(process.env.RPC_PORT || 18332);
const rpcUser = process.env.RPC_USER;
const rpcPassword = process.env.RPC_PASSWORD;

if (host !== '127.0.0.1' || rpcHost !== '127.0.0.1') {
  throw new Error('This prototype only supports localhost binding. Do not expose the API or RPC publicly.');
}
if (!rpcUser || !rpcPassword || rpcUser === 'replace_me' || rpcPassword === 'replace_me') {
  throw new Error('Configure RPC_USER and RPC_PASSWORD in backend/.env (never commit it).');
}
if (![port, rpcPort].every(n => Number.isInteger(n) && n > 0 && n <= 65535)) {
  throw new Error('Invalid API_PORT or RPC_PORT');
}

function rpc(method, params = []) {
  return new Promise((resolveResult, reject) => {
    const payload = JSON.stringify({ jsonrpc: '1.0', id: 'floofy-local', method, params });
    const request = http.request({
      hostname: rpcHost, port: rpcPort, path: '/', method: 'POST',
      auth: rpcUser + ':' + rpcPassword,
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(payload) },
      timeout: 8000,
    }, response => {
      let body = '';
      response.setEncoding('utf8');
      response.on('data', chunk => {
        body += chunk;
        if (body.length > 1024 * 1024) response.destroy(new Error('RPC response too large'));
      });
      response.on('end', () => {
        if (response.statusCode !== 200) return reject(new Error('RPC HTTP status ' + response.statusCode));
        try {
          const parsed = JSON.parse(body);
          if (parsed.error) return reject(new Error('RPC error code ' + parsed.error.code));
          resolveResult(parsed.result);
        } catch { reject(new Error('Invalid RPC JSON response')); }
      });
    });
    request.on('timeout', () => request.destroy(new Error('RPC timeout')));
    request.on('error', reject);
    request.end(payload);
  });
}

const server = http.createServer(async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  const origin = req.headers.origin;
  if (origin && !['http://127.0.0.1:5173', 'http://localhost:5173'].includes(origin)) {
    res.writeHead(403); res.end(JSON.stringify({ error: 'Origin not allowed' })); return;
  }
  if (origin) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
  }
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.writeHead(204); res.end(); return;
  }
  if (req.method !== 'GET' || !['/api/health', '/api/wallet/summary', '/api/wallet/transactions'].includes(req.url)) {
    res.writeHead(404); res.end(JSON.stringify({ error: 'Not found' })); return;
  }
  try {
    if (req.url === '/api/health') {
      const chain = await rpc('getblockchaininfo');
      res.writeHead(200);
      res.end(JSON.stringify({ ok: true, chain: chain.chain, blocks: chain.blocks, initialblockdownload: chain.initialblockdownload }));
      return;
    }
    if (req.url === '/api/wallet/transactions') {
      const raw = await rpc('listtransactions', ['*', 10, 0]);
      const transactions = raw.map(tx => ({
        txid: typeof tx.txid === 'string' ? tx.txid : '',
        category: tx.category === 'send' ? 'send' : tx.category === 'receive' ? 'receive' : 'other',
        amount: typeof tx.amount === 'number' ? tx.amount : 0,
        confirmations: typeof tx.confirmations === 'number' ? tx.confirmations : 0,
        time: typeof tx.time === 'number' ? tx.time : null,
        address: typeof tx.address === 'string' ? tx.address : null,
      }));
      res.writeHead(200);
      res.end(JSON.stringify({ source: 'local-node-wallet', transactions }));
      return;
    }
    // This is the connected Core node's *local wallet* balance, not an arbitrary address balance.
    const [balance, unconfirmed, chain] = await Promise.all([
      rpc('getbalance'), rpc('getunconfirmedbalance'), rpc('getblockchaininfo'),
    ]);
    res.writeHead(200);
    res.end(JSON.stringify({ source: 'local-node-wallet', balance, unconfirmed, blocks: chain.blocks, chain: chain.chain, updatedAt: new Date().toISOString() }));
  } catch (err) {
    console.error('RPC request failed:', err.message);
    res.writeHead(502); res.end(JSON.stringify({ error: 'Local FloofyChain RPC unavailable or authentication failed' }));
  }
});
server.listen(port, host, () => console.log('Floofy read-only API listening on http://' + host + ':' + port));
