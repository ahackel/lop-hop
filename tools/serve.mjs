// Minimal static dev server. Sends no-store so the browser never runs stale engine code
// (AudioWorklet module imports are cached aggressively and survive normal reloads). The editor (editor/) saves through it:
// POST /save {kind, build, of} writes an animal's build into its file, assets/<kind>.js (see asset.js and
// tools/rig-format.js; a new one: made from of, if it is a skin; a prop, kind food/<name> or obstacles/<name>: its file
// there, and its folder's index.js, every one in it), GET /assets.json lists the files there (a prop's as its kind); POST /palette writes the palette, assets/palette.js. The game sends its runs to it: POST /runs [run, …] adds those not there yet to data/runs.jsonl
// (a run a line; see the runs in game.js), which the balance page reads (balance/).
import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { formatAsset, formatIndex } from './rig-format.js';
import { toAsset } from '../asset.js';

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
  const { kind, build, of } = JSON.parse(body);
  const prop = PROP.exec(kind); // (a prop: its file as the build is, see asset.js; its folder's index, every one in it)
  if (prop && build && Array.isArray(build.size) && Array.isArray(build.layers)) {
    const [, folder, name] = prop, dir = path.join(root, 'assets', folder);
    await fs.writeFile(path.join(dir, `${name}.js`), formatAsset({ format: 1, name, size: build.size, ...(build.up && { up: +build.up }), layers: build.layers }));
    await fs.writeFile(path.join(dir, 'index.js'), formatIndex(folder, await propsIn(folder)));
    res.writeHead(200, { 'Content-Type': 'text/plain' }).end(`saved assets/${kind}.js`);
    return;
  }
  if (!/^[a-z]+$/.test(kind) || GLOBAL.includes(kind) || !build || typeof build !== 'object' || (of !== undefined && !/^[a-z]+$/.test(of))) throw new Error('which animal?');
  const file = path.join(root, 'assets', `${kind}.js`); // (of: kept, see toAsset; a new one's: as sent)
  const was = (await import(`${pathToFileURL(file).href}?at=${Date.now()}`).catch(() => null))?.default || (of ? { of } : {});
  await fs.writeFile(file, formatAsset(toAsset(kind, build, was)));
  res.writeHead(200, { 'Content-Type': 'text/plain' }).end(`saved assets/${kind}.js`);
}

// the palette (assets/palette.js): as sent, if it is one (every color a #rrggbb)
async function savePalette(req, res) {
  let body = '';
  for await (const chunk of req) body += chunk;
  const { roles, colors, night } = JSON.parse(body), hex = (v) => /^#[0-9a-f]{6}$/i.test(v);
  if (!roles || !colors || !night || !Object.values(colors).every(hex) || !Object.values(roles).every((r) => hex(r.day) && hex(r.night)) || Object.keys(colors).some((k) => !/^[a-z][a-zA-Z]*$/.test(k))) throw new Error('a palette?');
  await fs.writeFile(path.join(root, 'assets', 'palette.js'), formatAsset({ format: 1, name: 'palette', roles, colors, night: { contrast: +night.contrast, lift: +night.lift } }));
  res.writeHead(200, { 'Content-Type': 'text/plain' }).end('saved assets/palette.js');
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

// the props' folders (see asset.js: a prop), one's kind (folder/name), the props in one (by name: not its index)
const FOLDERS = ['food', 'obstacles'], PROP = /^(food|obstacles)\/([a-z]+\d*)$/;
const propsIn = async (folder) => (await fs.readdir(path.join(root, 'assets', folder)).catch(() => [])).filter((f) => /^[a-z]+\d*\.js$/.test(f) && f !== 'index.js').map((f) => f.slice(0, -3)).sort();

// the assets there (for the editor: the animals not in the game yet too; not the game's own: GLOBAL)
const GLOBAL = ['palette'];
async function assets(req, res) {
  const names = (await fs.readdir(path.join(root, 'assets'))).filter((f) => /^[a-z]+\.js$/.test(f)).map((f) => f.slice(0, -3)).filter((n) => !GLOBAL.includes(n));
  const props = (await Promise.all(FOLDERS.map(async (f) => (await propsIn(f)).map((n) => `${f}/${n}`)))).flat();
  res.writeHead(200, { 'Content-Type': TYPES['.json'], 'Cache-Control': 'no-store' }).end(JSON.stringify([...names, ...props]));
}

http.createServer(async (req, res) => {
  const act = req.method === 'POST' ? { '/save': save, '/palette': savePalette, '/runs': runs }[req.url] : req.method === 'GET' && { '/assets.json': assets }[req.url];
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
