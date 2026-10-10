// The bench (tools/bench.html, or the game's page with ?bench): N rabbits running to and fro over the game's ground,
// turning round at the ends, drawn one of four ways, to see on a device how many it draws at 60 frames a second:
//   2d     the game's sprites as it draws them now (the 2D rig, into the game's canvas)
//   parts  the objects layer (turn-gl.js createLayer): each drawn live in 3D part by part on a WebGL canvas over the
//          game's, any angle every frame, nothing copied back
//   mesh   the objects layer, each a skinned mesh
//   copy   live in 3D but each copied into the game's canvas on its own (what ?turn3d does now: a wait for the GPU each)
// ?bench=25 how many; ?how=parts which way. Run all: each way with 10, 25 and 50 for a few seconds each, a table of
// them; served by the dev server, sent to it too (data/bench.jsonl), to read on the computer.
import { W, H, GROUND, FOOT, PALETTES, COLOR, animal, front, stride, strides, setScale, snap, hill } from '../art.js';
import { model } from '../turn3d.js';
import { createLayer, createSprites } from '../turn-gl.js';

const Q = new URLSearchParams(location.search);
const WAYS = ['2d', 'parts', 'mesh', 'copy'], TURN = 0.4, FPS = 60, SECS = 4, WARM = 1;
const stage = document.getElementById('stage'), back = document.getElementById('back'), bctx = back.getContext('2d');
const pal = PALETTES[Q.get('pal')] || PALETTES.day;
let n = Math.max(1, Math.min(368, +(Q.get('bench') || Q.get('n')) || 25)), how = WAYS.includes(Q.get('how')) ? Q.get('how') : 'parts';

// the ways that need WebGL, made the first time
const made = {};
const wayOf = (w) => {
  if (w in made) return made[w];
  try {
    made[w] = w === '2d' ? {} : w === 'copy' ? createSprites({ how: 'parts' }) : createLayer(document.getElementById(w), { how: w });
  } catch (e) { console.warn(e); made[w] = null; }
  return made[w];
};

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

function draw() {
  ground();
  const w = wayOf(how);
  for (const id of ['parts', 'mesh']) document.getElementById(id).style.display = id === how ? '' : 'none';
  if (!w) return;
  const layer = how === 'parts' || how === 'mesh' ? w : null;
  if (layer) layer.size(cw, ch, S, OX, OY);
  for (const r of rabbits) {
    const yaw = yawOf(r), st = stride('rabbit', r.phase), frame = r.turn >= 0 ? 0 : st.frame, x = snap(r.x), y = GROUND - FOOT - (r.turn >= 0 ? 0 : st.lift);
    if (layer) layer.add('rabbit', model('rabbit', 'run', frame, { marks: layer.marks }), x, y, { yaw, pal });
    else if (how === 'copy') w.draw(bctx, 'rabbit', 'run', frame, yaw, x, y, pal, { snap });
    else if (yaw > 60 && yaw < 120) front('rabbit').draw(bctx, x, y, pal); // (the game's turn: from the front half way)
    else if (yaw < 90) animal('rabbit', 'run', frame).draw(bctx, x, y, pal);
    else { bctx.save(); bctx.translate(2 * x + 26, 0); bctx.scale(-1, 1); animal('rabbit', 'run', frame).draw(bctx, x, y, pal); bctx.restore(); }
  }
  if (layer) layer.flush();
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
  table.innerHTML = `<tr><th>way</th><th>animals</th><th>fps</th><th>ms</th><th>max</th><th>late</th></tr>${results.map((r) => `<tr><td>${r.how}</td><td>${r.n}</td><td>${r.fps}</td><td>${r.ms}</td><td>${r.max}</td><td>${r.late}</td></tr>`).join('')}`;
}
function step(now, work, late) {
  const p = run.on;
  if (!run.t) run.t = now;
  const t = (now - run.t) / 1000;
  if (t < WARM) return;
  if (!run.started) Object.assign(run, { started: now, frames: 0, work: 0, worst: 0, late: 0 });
  run.frames++; run.work += work; run.worst = Math.max(run.worst, work); run.late += late;
  noteEl.textContent = `running ${p.i + 1} of ${p.list.length}: ${how}, ${n}`;
  if (t < WARM + SECS) return;
  results.push({ how, n, fps: Math.round((run.frames * 1000) / (now - run.started)), ms: +(run.work / run.frames).toFixed(2), max: +run.worst.toFixed(1), late: run.late });
  show();
  if (++p.i < p.list.length) return setUp(p);
  run.on = null;
  noteEl.textContent = 'done';
  setWay(p.how0, p.n0);
  const sent = { device: navigator.userAgent, screen: `${cw}x${ch} x${S} dpr ${devicePixelRatio}`, gpu: made.parts && made.parts.info, results };
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
  for (const w of WAYS) if (wayOf(w)) for (const k of [10, 25, 50]) list.push([w, k]);
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
  else if (!run.on) noteEl.textContent = { '2d': 'the game now: 2D sprites', parts: 'live 3D, part by part, on the objects layer', mesh: 'live 3D, skinned mesh, on the objects layer', copy: 'live 3D, each copied into the 2D canvas on its own' }[how];
}
for (const w of WAYS) { const b = document.createElement('button'); b.textContent = w; b.dataset.how = w; b.onclick = () => setWay(w); modes.append(b); }
for (const b of document.querySelectorAll('[data-n]')) b.onclick = () => setWay(how, Math.max(1, Math.min(368, Math.round(n * +b.dataset.n))));
document.getElementById('fold').onclick = (e) => { const p = document.getElementById('panel'); p.classList.toggle('folded'); e.target.textContent = p.classList.contains('folded') ? '+' : '–'; };
setWay(how, n);
requestAnimationFrame(frame);
