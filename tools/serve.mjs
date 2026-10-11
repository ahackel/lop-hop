// Minimal static dev server. Sends no-store so the browser never runs stale engine code
// (AudioWorklet module imports are cached aggressively and survive normal reloads). The editor (editor/) saves through it:
// POST /save {kind, build} writes an animal's build into animals/<kind>.js (see tools/rig-format.js), or into its asset
// (assets/<kind>.js, see asset.js) when it has one. The game sends its
// runs to it: POST /runs [run, …] adds those not there yet to data/runs.jsonl (a run a line; see the runs in game.js),
// which the balance page reads (tools/balance.html). The bench (tools/bench.html, ?bench) sends what it measured: POST
// /bench {…} adds it to data/bench.jsonl (a device's results a line).
import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { spliceBuild, formatAsset } from './rig-format.js';
import { fromRig, toDepth } from '../asset.js';

const root = path.resolve(process.argv[2] || '.');
const port = +(process.env.PORT || 8323);
const TYPES = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8', '.svg': 'image/svg+xml',
  '.png': 'image/png', '.webmanifest': 'application/manifest+json', '.mp3': 'audio/mpeg', '.wav': 'audio/wav', '.ico': 'image/x-icon', '.md': 'text/plain; charset=utf-8',
};

async function save(req, res) {
  let body = '';
  for await (const chunk of req) body += chunk;
  const { kind, build } = JSON.parse(body);
  if (!/^[a-z]+$/.test(kind) || kind === 'kit' || !build || typeof build !== 'object') throw new Error('which animal?');
  const assetFile = path.join(root, 'assets', `${kind}.js`);
  if (await fs.stat(assetFile).then(() => true, () => false)) { // (its build is its asset's: the asset written, its depth kept)
    const { default: was } = await import(`${pathToFileURL(assetFile).href}?at=${Date.now()}`);
    await fs.writeFile(assetFile, formatAsset(fromRig(kind, build, toDepth(was))));
    res.writeHead(200, { 'Content-Type': 'text/plain' }).end(`saved assets/${kind}.js`);
    return;
  }
  const file = path.join(root, 'animals', `${kind}.js`);
  await fs.writeFile(file, spliceBuild(await fs.readFile(file, 'utf8'), build));
  res.writeHead(200, { 'Content-Type': 'text/plain' }).end(`saved animals/${kind}.js`);
}

async function runs(req, res) {
  let body = '';
  for await (const chunk of req) body += chunk;
  const sent = JSON.parse(body), file = path.join(root, 'data', 'runs.jsonl');
  if (!Array.isArray(sent) || sent.some((r) => !r || typeof r.id !== 'string' || typeof r.kind !== 'string')) throw new Error('runs?');
  await fs.mkdir(path.dirname(file), { recursive: true });
  const had = new Set((await fs.readFile(file, 'utf8').catch(() => '')).split('\n').filter(Boolean).map((l) => JSON.parse(l).id));
  const fresh = sent.filter((r) => !had.has(r.id));
  if (fresh.length) await fs.appendFile(file, fresh.map((r) => `${JSON.stringify(r)}\n`).join(''));
  res.writeHead(200, { 'Content-Type': 'text/plain' }).end(`${fresh.length} new`);
}

async function bench(req, res) {
  let body = '';
  for await (const chunk of req) body += chunk;
  const sent = JSON.parse(body), file = path.join(root, 'data', 'bench.jsonl');
  if (!sent || typeof sent !== 'object' || !Array.isArray(sent.results) || body.length > 100000) throw new Error('results?');
  await fs.mkdir(path.dirname(file), { recursive: true });
  await fs.appendFile(file, `${JSON.stringify({ at: new Date().toISOString(), ...sent })}\n`);
  res.writeHead(200, { 'Content-Type': 'text/plain' }).end('kept');
}

http.createServer(async (req, res) => {
  const act = req.method === 'POST' && { '/save': save, '/runs': runs, '/bench': bench }[req.url];
  if (act) {
    try { await act(req, res); } catch (e) { res.writeHead(400, { 'Content-Type': 'text/plain' }).end(String(e.message || e)); }
    return;
  }
  try {
    let p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
    let file = path.join(root, p);
    if (!file.startsWith(root)) { res.writeHead(403).end(); return; }
    if ((await fs.stat(file)).isDirectory()) {
      if (!p.endsWith('/')) { res.writeHead(301, { Location: `${p}/${new URL(req.url, 'http://x').search}` }).end(); return; } // (its own files are found from the directory)
      file = path.join(file, 'index.html');
    }
    const body = await fs.readFile(file);
    res.writeHead(200, { 'Content-Type': TYPES[path.extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-store' });
    res.end(body);
  } catch {
    res.writeHead(404, { 'Content-Type': 'text/plain' }).end('not found');
  }
}).listen(port, () => console.log(`Lop Hop dev server → http://localhost:${port}`));
