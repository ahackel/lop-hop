// The bench (tools/bench.html, or the game's page with ?bench): N rabbits running to and fro over the game's ground,
// turning round at the ends, drawn one of four ways, to see on a device how many it draws at 60 frames a second:
//   2d     the game's sprites as it draws them now (the 2D rig, into the game's canvas)
//   parts  the objects layer (turn-gl.js createLayer): each drawn live in 3D part by part on a WebGL canvas over the
//          game's, any angle every frame, nothing copied back
//   mesh   the objects layer, each a skinned mesh
//   cached what ?turn3d does: each picture drawn in 3D once (the skinned mesh), read back and kept as a sprite, drawn
//          into the game's canvas as the 2D ones are (turns: to 32 angles round, each angle's picture drawn as it comes)
// and to find out what costs what: empty (the objects layer with nothing on it: what the canvas over the game's costs
// by itself), parts-art and mesh-art (the objects layer at the art's resolution, the page scaling it up: a 49th of the
// pixels at 7 screen pixels an art pixel), empty-art (that, with nothing on it), gl-only (one WebGL canvas, not
// see-through, with nothing under it: the game's canvas hidden, the sky the layer's: what drawing the whole game in
// WebGL would cost to show), mesh-lo (the mesh with a quarter of the triangles), mesh-sync (waiting for the GPU after
// each pass: the passes' times are the GPU's too), mesh-nogap (no line inside a part across air: the outline pass
// without working the shape out again), mesh-gl (on one WebGL canvas, nothing under it). Each frame's CPU time is split into posing the rabbits (pose) and the
// layer's three passes (first, finish, tiles); the GPU's own shows only as frames late
// ?bench=25 how many; ?how=parts which way. Run all: each way with 10, 25 and 50 for a few seconds each, a table of
// them; served by the dev server, sent to it too (data/bench.jsonl, with what the browser's WebGL can do), to read on
// the computer. &ways=2d,mesh-sync: Run all runs only those.
import { W, H, GROUND, FOOT, PALETTES, COLOR, animal, front, stride, strides, setScale, snap, hill } from '../art.js';
import { model } from '../turn3d.js';
import { createLayer, createSprites, glInfo } from '../turn-gl.js';

const Q = new URLSearchParams(location.search);
const WAYS = ['2d', 'cached', 'parts', 'mesh', 'empty', 'parts-art', 'mesh-art', 'empty-art', 'gl-only', 'mesh-lo', 'mesh-sync', 'mesh-nogap', 'mesh-gl'], TURN = 0.4, FPS = 60, SECS = 3, WARM = 1;
const stage = document.getElementById('stage'), back = document.getElementById('back'), bctx = back.getContext('2d');
const pal = PALETTES[Q.get('pal')] || PALETTES.day;
let n = Math.max(1, Math.min(88, +(Q.get('bench') || Q.get('n')) || 25)), how = WAYS.includes(Q.get('how')) ? Q.get('how') : 'parts';

// the ways that need WebGL, made the first time (a layer: on a canvas of its own, over the game's)
const made = {}, canvases = {};
const wayOf = (w) => {
  if (w in made) return made[w];
  try {
    if (w === '2d') made[w] = {};
    else if (w === 'cached') made[w] = createSprites({ how: 'mesh', kinds: ['rabbit'] });
    else {
      const cv = (canvases[w] = document.createElement('canvas'));
      stage.append(cv);
      made[w] = createLayer(cv, { how: w.startsWith('parts') ? 'parts' : 'mesh', res: w.endsWith('-art') ? 'art' : 'screen', opaque: w === 'gl-only' || w === 'mesh-gl', bg: pal.bg, mesh: w === 'mesh-lo' ? { h: 1.2 } : {}, sync: w === 'mesh-sync' });
    }
  } catch (e) { console.warn(e); made[w] = null; }
  return made[w];
};
const layerOf = (w) => (w === '2d' || w === 'cached' ? null : made[w]);

// the screen, as the game fits it: whole screen pixels an art pixel, the world in the middle
let cw = 0, ch = 0, S = 1, OX = 0, OY = 0, viewL = 0, viewR = W;
function fit() {
  const dpr = devicePixelRatio || 1, r = stage.getBoundingClientRect();
  cw = Math.round(r.width * dpr); ch = Math.round(r.height * dpr);
  S = Math.max(1, Math.min(Math.round(cw / W), Math.floor(ch / H)));
  OX = Math.round((cw - W * S) / 2); OY = Math.round((ch - H * S) / 2);
  viewL = -OX / S; viewR = (cw - OX) / S;
  back.width = cw; back.height = ch;
  setScale(S);
}
addEventListener('resize', fit);
new ResizeObserver(fit).observe(stage); // (shown later than loaded: its size only then)
fit();

// the rabbits: running at their own speeds, each turning round (standing, 0.4 s) at an end
let rabbits = [];
const seed = (i) => ((Math.sin(i * 12.9898) * 43758.5453) % 1 + 1) % 1;
function herd() {
  const was = rabbits;
  rabbits = Array.from({ length: n }, (_, i) => was[i] || { x: viewL + seed(i) * (viewR - viewL - 30), dir: seed(i + 7) < 0.5 ? 1 : -1, speed: 50 + seed(i + 3) * 90, phase: seed(i + 5), turn: -1 });
}
herd();
function update(dt) {
  for (const r of rabbits) {
    if (r.turn >= 0) { r.turn += dt / TURN; if (r.turn >= 1) { r.turn = -1; r.dir = -r.dir; } continue; }
    r.x += r.dir * r.speed * dt;
    r.phase = (r.phase + strides('rabbit', r.speed) * dt) % 1;
    if ((r.dir > 0 && r.x > viewR - 34) || (r.dir < 0 && r.x < viewL + 4)) r.turn = 0;
  }
}
// facing right: 0°; left: 180°; turning: on the way (eased)
const yawOf = (r) => {
  if (r.turn < 0) return r.dir > 0 ? 0 : 180;
  const e = r.turn * r.turn * (3 - 2 * r.turn);
  return r.dir > 0 ? 180 * e : 180 * (1 - e);
};

// the ground, as the game draws it each frame: the sky, far hills sliding by, the ground's line
let scroll = 0;
function ground() {
  bctx.setTransform(1, 0, 0, 1, 0, 0);
  bctx.fillStyle = pal.bg;
  bctx.fillRect(0, 0, cw, ch);
  bctx.setTransform(S, 0, 0, S, OX, OY);
  bctx.imageSmoothingEnabled = false;
  bctx.fillStyle = pal[COLOR.FAINT];
  bctx.beginPath();
  const hills = snap(scroll), from = Math.floor(hills);
  for (let x = Math.floor(viewL); x <= Math.ceil(viewR); x++) { const h = hill(x + from); bctx.rect(x - (hills - from), Math.round(GROUND - h), 1, Math.round(h)); }
  bctx.fill();
  bctx.fillStyle = pal[COLOR.INK];
  bctx.fillRect(Math.floor(viewL), GROUND, Math.ceil(viewR - viewL) + 1, 1);
}

const spent = { pose: 0, first: 0, finish: 0, tiles: 0 };
const empty = (w) => w === 'empty' || w === 'empty-art' || w === 'gl-only';
function draw() {
  const alone = how === 'gl-only' || how === 'mesh-gl';
  back.style.visibility = alone ? 'hidden' : '';
  if (!alone) ground();
  const w = wayOf(how);
  for (const k in canvases) canvases[k].style.display = k === how ? '' : 'none';
  if (!w) return;
  const layer = layerOf(how), dpr = devicePixelRatio || 1;
  if (layer) {
    const at = layer.size(cw, ch, S, OX, OY), st = canvases[how].style;
    st.left = `${at.left / dpr}px`; st.top = `${at.top / dpr}px`; st.width = `${at.width / dpr}px`; st.height = `${at.height / dpr}px`;
  }
  const t0 = performance.now();
  if (!empty(how)) for (const r of rabbits) {
    const yaw = yawOf(r), st = stride('rabbit', r.phase), frame = r.turn >= 0 ? 0 : st.frame, x = snap(r.x), y = GROUND - FOOT - (r.turn >= 0 ? 0 : st.lift);
    if (layer) layer.add('rabbit', model('rabbit', 'run', frame, { marks: layer.marks }), x, y, { yaw, pal, gap: how === 'mesh-nogap' ? -1 : 0.25 });
    else if (how === 'cached') w.turned('rabbit', 'run', frame, yaw).draw(bctx, x, y, pal);
    else if (yaw > 60 && yaw < 120) front('rabbit').draw(bctx, x, y, pal); // (the game's turn: from the front half way)
    else if (yaw < 90) animal('rabbit', 'run', frame).draw(bctx, x, y, pal);
    else { bctx.save(); bctx.translate(2 * x + 26, 0); bctx.scale(-1, 1); animal('rabbit', 'run', frame).draw(bctx, x, y, pal); bctx.restore(); }
  }
  spent.pose = performance.now() - t0;
  if (layer) { layer.flush(); Object.assign(spent, layer.stats); }
}

// at most 60 frames a second (a 120 Hz screen: every other one), as the game; each second: frames drawn, the work of a
// frame (the CPU's: the GPU's own shows as frames missed), frames that came a frame or more late
const rate = { since: 0, frames: 0, work: 0, worst: 0, late: 0 }, run = { on: null, frames: 0, work: 0, worst: 0, late: 0, t: 0 };
let drawnAt = 0;
const statsEl = document.getElementById('stats'), noteEl = document.getElementById('note');
function frame(now) {
  requestAnimationFrame(frame);
  if (drawnAt && now - drawnAt < 1000 / FPS - 3) return;
  const gap = drawnAt ? now - drawnAt : 1000 / FPS, dt = Math.min(0.1, gap / 1000);
  drawnAt = now;
  const t0 = performance.now();
  update(dt);
  scroll += 60 * dt;
  draw();
  const work = performance.now() - t0, late = gap > 1.5 * (1000 / FPS);
  rate.frames++; rate.work += work; rate.worst = Math.max(rate.worst, work); rate.late += late;
  if (run.on) step(now, work, late);
  if (now - rate.since >= 1000) {
    const fps = Math.round((rate.frames * 1000) / (now - rate.since));
    statsEl.textContent = `${n} ${how}: ${fps} FPS · ${(rate.work / rate.frames).toFixed(1)} ms (max ${rate.worst.toFixed(1)}) · ${rate.late} late · ${cw}×${ch} ×${S}`;
    Object.assign(rate, { since: now, frames: 0, work: 0, worst: 0, late: 0 });
  }
}

// Run all: each way, each count, WARM seconds to settle then SECS measured
const results = [], table = document.getElementById('results');
function show() {
  table.innerHTML = `<tr><th>way</th><th>animals</th><th>fps</th><th>ms</th><th>max</th><th>late</th><th>pose</th><th>first</th><th>finish</th><th>tiles</th></tr>${results.map((r) => `<tr><td>${r.how}</td><td>${r.n}</td><td>${r.fps}</td><td>${r.ms}</td><td>${r.max}</td><td>${r.late}</td><td>${r.pose}</td><td>${r.first}</td><td>${r.finish}</td><td>${r.tiles}</td></tr>`).join('')}`;
}
function step(now, work, late) {
  const p = run.on;
  if (!run.t) run.t = now;
  const t = (now - run.t) / 1000;
  if (t < WARM) return;
  if (!run.started) Object.assign(run, { started: now, frames: 0, work: 0, worst: 0, late: 0, pose: 0, first: 0, finish: 0, tiles: 0 });
  run.frames++; run.work += work; run.worst = Math.max(run.worst, work); run.late += late;
  for (const k in spent) run[k] = (run[k] || 0) + spent[k];
  noteEl.textContent = `running ${p.i + 1} of ${p.list.length}: ${how}, ${n}`;
  if (t < WARM + SECS) return;
  const avg = (k) => +(run[k] / run.frames).toFixed(2);
  results.push({ how, n, fps: Math.round((run.frames * 1000) / (now - run.started)), ms: avg('work'), max: +run.worst.toFixed(1), late: run.late, pose: avg('pose'), first: avg('first'), finish: avg('finish'), tiles: avg('tiles') });
  show();
  if (++p.i < p.list.length) return setUp(p);
  run.on = null;
  noteEl.textContent = 'done';
  setWay(p.how0, p.n0);
  const sent = { device: navigator.userAgent, screen: `${cw}x${ch} x${S} dpr ${devicePixelRatio}`, gl: glInfo(), results };
  fetch('/bench', { method: 'POST', body: JSON.stringify(sent) }).then((r) => { if (r.ok) noteEl.textContent = 'done; sent to the dev server (data/bench.jsonl)'; }).catch(() => {});
}
function setUp(p) {
  const [w, k] = p.list[p.i];
  setWay(w, k);
  Object.assign(run, { t: 0, started: 0 });
}
document.getElementById('all').onclick = () => {
  if (run.on) return;
  results.length = 0; show();
  const list = [];
  const only = Q.get('ways') ? Q.get('ways').split(',') : WAYS;
  for (const w of WAYS) if (only.includes(w) && wayOf(w)) for (const k of empty(w) ? [10] : [10, 25, 50]) list.push([w, k]);
  run.on = { list, i: 0, how0: how, n0: n };
  setUp(run.on);
};

// the controls
const modes = document.getElementById('modes'), nEl = document.getElementById('n');
function setWay(w, k = n) {
  how = w; n = k; herd();
  nEl.textContent = n;
  for (const b of modes.children) b.classList.toggle('on', b.dataset.how === how);
  const q = new URLSearchParams(location.search);
  q.set('bench', n); q.set('how', how);
  history.replaceState(null, '', `${location.pathname}?${q}`);
  if (!wayOf(how)) noteEl.textContent = `${how}: this browser can't (no WebGL, or not enough of it)`;
  else if (!run.on) noteEl.textContent = { '2d': 'the game now: 2D sprites', parts: 'live 3D, part by part, on the objects layer', mesh: 'live 3D, skinned mesh, on the objects layer', cached: '3D drawn once a picture, kept as sprites (the game with ?turn3d)', empty: 'the objects layer with nothing on it', 'empty-art': 'the objects layer at the art\'s resolution, nothing on it', 'gl-only': 'one WebGL canvas, nothing under it, nothing on it', 'mesh-lo': 'skinned mesh with a quarter of the triangles', 'mesh-sync': 'skinned mesh, waiting for the GPU after each pass', 'mesh-nogap': 'skinned mesh, no outline across air inside a part', 'mesh-gl': 'skinned mesh on one WebGL canvas, nothing under it', 'parts-art': 'part by part, the layer at the art\'s resolution', 'mesh-art': 'skinned mesh, the layer at the art\'s resolution' }[how];
}
for (const w of WAYS) { const b = document.createElement('button'); b.textContent = w; b.dataset.how = w; b.onclick = () => setWay(w); modes.append(b); }
for (const b of document.querySelectorAll('[data-n]')) b.onclick = () => setWay(how, Math.max(1, Math.min(88, Math.round(n * +b.dataset.n))));
document.getElementById('fold').onclick = (e) => { const p = document.getElementById('panel'); p.classList.toggle('folded'); e.target.textContent = p.classList.contains('folded') ? '+' : '–'; };
setWay(how, n);
requestAnimationFrame(frame);
