// The editor (npm run dev, then /editor). It edits an animal's build, its file assets/<kind>.js (see asset.js): handles
// on the joints, the shapes, the legs' roots, the chains and the face, drawn over the animal's own pixels; a list of its parts and an inspector for the one picked; a preview in
// the game's scene. Its moves on a timeline: keyframes set by hand (handles on the joints, paws, head, tail and ears of
// a frame), a gait's settings, a loop to look at; the frames before and after faded (onion skin). After every change the
// animal is made again from its build (as the game makes it) and drawn by the game's own code; Save writes the build back into its
// file (POST /save, see serve.mjs and rig-format.js). Three modes: Setup (the build), Animate (its moves), Play (handled
// as on the home screen, see play.js: its handling's numbers, its chains' physics).
import { ANIMALS, PALETTES, COLOR, FOOT, GROUND, W, H, animal, setRig, rigParts, moveBody, stride, strides, idleFrame, jumpFrame, golden, cactus, hill,
  JUMP, GRAVITY, setStyle, colorOf, rigOf, HANDLING, FACE_FRAMES, FACE_INKS } from '../art.js';
import { toBuild, toAsset } from '../asset.js';
import * as sandbox from './play.js';

const GAME_ANIMALS = { ...ANIMALS }; // (the game's animals: the others are made here, see the end)

const { toWorld, toLocal, sdShape, NAMED } = rigParts;
const KINDS = []; // (every animal with a file: the game's, and any made here, not in the game yet)
const COLORS = Object.keys(NAMED);
const COLOR_KEYS = ['color', 'fur', 'tipColor', 'noseColor', 'socks'];
const GEOMS = ['ellipse', 'capsule', 'box', 'triangle'];
const LAYERS = { shapes: 'body', paint: 'paint', top: 'on top' };
const $ = (id) => document.getElementById(id);
const el = (tag, props = {}, ...kids) => { const e = Object.assign(document.createElement(tag), props); e.append(...kids); return e; };
const css = (name) => getComputedStyle(document.documentElement).getPropertyValue(name).trim();
const swatch = (name) => PALETTES.day[NAMED[name]] || 'transparent';

// the stage shows art pixels from (X0, Y0), VW × VH of them (the 26×20 box and room around it), Z screen pixels each
const X0 = -12, Y0 = -9, VW = 50, VH = 31;
let Z = 16;

const files = {}, builds = {}, saved = {}, histories = {}; // (each animal's file as loaded, its build as edited; saved: as in its file, null: no file yet)
const fileOf = (k) => `assets/${k}.js`; // (an animal's build: its file, see asset.js)
// kind: the animal shown; base: the one it is made from, if it is a skin (the wolf: the fox), else itself. build: the
// base's build (its bones, shapes, moves, handling: what Setup, Animate and Play edit, for its skins too); skin: the
// skin's own (its colors swapped), or null
let kind, base, build, skin = null, P, G = [1, [0, 0]], sel = { type: 'rig' }, drag = null;
const baseOf = (k) => files[k].of || k;
const skinsOf = (k) => KINDS.filter((o) => files[o].of === k);
const inGame = (k) => k in GAME_ANIMALS;
const view = { mode: 'setup', move: 'edit', frame: 0, play: false, t: 0 }; // (play: a move playing, in Animate)
let lastMove = 'idle'; // (the move Animate shows)

// ------------------------------------------------------------------------------------------------- the animal, edited
const editable = () => !!build.joints;
const hist = () => (histories[kind] ||= { past: [], future: [] });
const snapshot = () => JSON.stringify({ build, skin });
const dirty = (k) => JSON.stringify(builds[k]) !== saved[k];
const touched = () => [base, ...(skin ? [kind] : [])].filter(dirty); // (the files the one shown is made from, changed)

// made again from its build, as the game makes it (rigOf): drawn anew, and the frames its parts are placed in (standing:
// the pose the build's handles edit; a move's frame: the one its handles edit). One another is made from (the fox: the
// wolf's) makes that one again too
const assetOf = (k) => toAsset(k, builds[k], files[k]);
const rigFor = (k) => rigOf(assetOf(k), files[k].of && assetOf(files[k].of));
function rebuild() {
  setRig(base, rigFor(base));
  for (const k of skinsOf(base)) setRig(k, rigFor(k));
  place();
}
function place() {
  if (view.move !== 'edit') view.frame = Math.min(view.frame, frames(view.move) - 1);
  P = view.move === 'edit' ? rigParts.posed(kind, 'hurt', 0) : rigParts.posed(kind, view.move, view.frame);
  G = rigParts.growth(kind, view.move === 'edit' ? 'hurt' : view.move); // (the bigger animals: drawn grown, their handles with them)
}
function changed() { rebuild(); draw(); status(); }
function refresh() { listParts(); inspect(); timeline(); draw(); }
function commit(fn) { remember(); fn(); changed(); timeline(); }
function remember() { const h = hist(); h.past.push(snapshot()); if (h.past.length > 300) h.past.shift(); h.future = []; }
function restore(json) {
  const was = JSON.parse(json), into = (o, v) => { for (const k of Object.keys(o)) delete o[k]; Object.assign(o, v); };
  into(build, was.build);
  if (skin && was.skin) into(skin, was.skin);
  changed(); refresh();
}
function undo() { const h = hist(); if (h.past.length) { h.future.push(snapshot()); restore(h.past.pop()); } }
function redo() { const h = hist(); if (h.future.length) { h.past.push(snapshot()); restore(h.future.pop()); } }

function choose(k) {
  kind = k; base = baseOf(k); build = builds[base]; skin = k === base ? null : builds[k]; sel = { type: view.move === 'edit' ? 'rig' : 'frame' };
  pv.body = {};
  fillKinds();
  const url = new URL(location.href); url.searchParams.set('animal', k); window.history.replaceState(null, '', url);
  fillMoves(); rebuild(); sandbox.reset(k); refresh(); status();
}
// the mode: Setup (the build: what every move is made from), Animate (a move), Play (see play.js)
function setMode(m) {
  view.mode = m; document.body.className = m;
  for (const b of $('modes').children) b.classList.toggle('on', b.dataset.mode === m);
  setPlay(false);
  if (m === 'play') { view.move = 'edit'; sandbox.reset(kind); sel = { type: 'rig' }; place(); refresh(); return; }
  show(m === 'setup' ? 'edit' : animated());
}
const animated = () => (rigParts.move(kind, lastMove) ? lastMove : rigParts.moves(kind)[0]);
for (const b of $('modes').children) b.onclick = () => setMode(b.dataset.mode);

function status() {
  const s = $('status'), mine = touched(), others = KINDS.filter((k) => k !== kind && k !== base && dirty(k)), files = [base, ...(skin ? [kind] : [])].map(fileOf).join(' + ');
  s.className = mine.length || others.length ? 'dirty' : '';
  s.textContent = (mine.length ? `unsaved changes in ${mine.map(fileOf).join(', ')}` : files) + (inGame(kind) ? '' : ' · not in the game yet') + (others.length ? ` · also unsaved: ${others.join(', ')}` : '');
  $('undo').disabled = !hist().past.length; $('redo').disabled = !hist().future.length;
  $('revert').disabled = $('save').disabled = !mine.length;
}

// saved into its files: the base's, the skin's (each only if changed; a new one: its file made)
async function save() {
  let said = [];
  for (const k of touched()) {
    const res = await fetch('/save', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ kind: k, build: builds[k], of: files[k].of }) }).catch(() => null);
    if (!res?.ok) { $('status').className = 'dirty'; $('status').textContent = `not saved: ${res ? await res.text() : 'is the dev server running? (npm run dev)'}`; return; }
    saved[k] = JSON.stringify(builds[k]); said.push(await res.text());
  }
  status(); if (said.length) $('status').textContent = said.join(' · ');
}

// ------------------------------------------------------------------------------------------------------- the parts
// every part of the build: what picks it (sel), its name in the list, its color, the object the inspector edits, its
// handles (each: where, and what dragging it there does), its outline and whether a point is on it
const frameOf = (on) => (on ? P.F[on] : null);
const local = (f, p) => (f ? toLocal(f, p[0], p[1]) : p);
const world = (f, p) => toWorld(f, p);
let step = 0.1;
const round = (v) => Math.round(v / step) * step;
const roundAll = (p) => p.map((v) => +round(v).toFixed(3));
const plus = (a, b) => [a[0] + b[0], a[1] + b[1]], minus = (a, b) => [a[0] - b[0], a[1] - b[1]], times = (a, k) => [a[0] * k, a[1] * k];

function geomOf(s) { return GEOMS.find((g) => Array.isArray(s[g])); }
// handles and outline of a shape (in its joint's frame)
function shapeBits(s) {
  const f = frameOf(s.on), g = geomOf(s), v = s[g], L = (p) => local(f, p), Wd = (p) => world(f, p);
  const handles = [], lines = [];
  const point = (get, put, anchor) => handles.push({ at: Wd(get()), set: (p) => put(roundAll(L(p))), anchor });
  const mover = (pts) => { // the middle: moves all of it
    const mid = () => [pts().reduce((a, q) => a + q[0], 0) / pts().length, pts().reduce((a, q) => a + q[1], 0) / pts().length];
    handles.push({ at: Wd(mid()), anchor: true, move: true, set: (p) => { const d = minus(roundAll(L(p)), mid()); shift(d); } });
  };
  const shift = (d) => {
    if (g === 'ellipse') { v[0] = +(v[0] + d[0]).toFixed(3); v[1] = +(v[1] + d[1]).toFixed(3); }
    else if (g === 'triangle') for (const q of v) { q[0] = +(q[0] + d[0]).toFixed(3); q[1] = +(q[1] + d[1]).toFixed(3); }
    else { for (const i of [0, 2]) v[i] = +(v[i] + d[0]).toFixed(3); for (const i of [1, 3]) v[i] = +(v[i] + d[1]).toFixed(3); }
  };
  const ring = (n, at) => { const pts = []; for (let i = 0; i <= n; i++) pts.push(Wd(at((i / n) * Math.PI * 2))); return pts; };
  if (g === 'ellipse') {
    mover(() => [[v[0], v[1]]]);
    handles.push({ at: Wd([v[0] + v[2], v[1]]), size: true, set: (p) => { v[2] = Math.max(0.2, +Math.abs(round(L(p)[0] - v[0])).toFixed(3)); } });
    handles.push({ at: Wd([v[0], v[1] + v[3]]), size: true, set: (p) => { v[3] = Math.max(0.2, +Math.abs(round(L(p)[1] - v[1])).toFixed(3)); } });
    lines.push(ring(40, (t) => [v[0] + v[2] * Math.cos(t), v[1] + v[3] * Math.sin(t)]));
  } else if (g === 'capsule') {
    const a = [v[0], v[1]], b = [v[2], v[3]], len = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1, d = [(b[0] - a[0]) / len, (b[1] - a[1]) / len], n = [-d[1], d[0]], r = v[4];
    point(() => a, (q) => { v[0] = q[0]; v[1] = q[1]; });
    point(() => b, (q) => { v[2] = q[0]; v[3] = q[1]; });
    const mid = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
    handles.push({ at: Wd(plus(mid, [n[0] * r, n[1] * r])), size: true, set: (p) => { const q = L(p); v[4] = Math.max(0.2, +round(Math.hypot(q[0] - mid[0], q[1] - mid[1])).toFixed(3)); } });
    mover(() => [[v[0], v[1]], [v[2], v[3]]]);
    const arc = (c, from) => { const pts = []; for (let i = 0; i <= 16; i++) { const t = from + (i / 16) * Math.PI; pts.push(Wd([c[0] + r * (n[0] * Math.cos(t) + d[0] * Math.sin(t)), c[1] + r * (n[1] * Math.cos(t) + d[1] * Math.sin(t))])); } return pts; };
    lines.push([...arc(b, 0), ...arc(a, Math.PI), Wd(plus(b, [n[0] * r, n[1] * r]))]);
  } else if (g === 'box') {
    point(() => [v[0], v[1]], (q) => { v[0] = q[0]; v[1] = q[1]; });
    point(() => [v[2], v[3]], (q) => { v[2] = q[0]; v[3] = q[1]; });
    mover(() => [[v[0], v[1]], [v[2], v[3]]]);
    lines.push([[v[0], v[1]], [v[2], v[1]], [v[2], v[3]], [v[0], v[3]], [v[0], v[1]]].map(Wd));
  } else {
    v.forEach((q, i) => point(() => q, (p) => { v[i] = p; }));
    mover(() => v);
    lines.push([...v, v[0]].map(Wd));
  }
  return { handles, lines, hit: (p) => { const q = L(p); return sdShape(s, q[0], q[1]) <= 0; } };
}

function parts() {
  const out = [];
  if (!editable()) return out;
  if (view.move !== 'edit') return kindOf(view.move) === 'clip' ? poseParts() : out;
  const list = (name, label, color) => (build[name] || []).forEach((s, i) => {
    const bits = shapeBits(s);
    out.push({ sel: { type: 'item', list: name, i }, group: label, label: s.name || geomOf(s), color: color(s), obj: s, ...bits });
  });
  out.push({ sel: { type: 'rig' }, group: 'Animal', label: 'root', color: swatch(build.fur), obj: build, handles: [], lines: [] });
  for (const n in build.joints) {
    out.push({ sel: { type: 'joint', name: n }, group: 'Joints', label: n, obj: build.joints, key: n, lines: [],
      handles: [{ at: P.J[n], anchor: true, joint: true, set: (p) => { build.joints[n] = roundAll(p); } }] });
  }
  list('shapes', 'Body shapes', () => swatch(build.fur));
  list('paint', 'Paint', (s) => swatch(s.color));
  (build.top || []).forEach((t, i) => {
    const bits = t.shapes.map(shapeBits);
    out.push({ sel: { type: 'item', list: 'top', i }, group: 'On top', label: t.name || 'shapes', color: swatch(t.color || build.fur), obj: t,
      handles: bits.flatMap((b) => b.handles), lines: bits.flatMap((b) => b.lines), hit: (p) => bits.some((b) => b.hit(p)) });
  });
  (build.dots || []).forEach((d, i) => {
    const f = frameOf(d.on);
    out.push({ sel: { type: 'item', list: 'dots', i }, group: 'Dots', label: d.name || 'dot', color: swatch(d.color || 'OUT'), obj: d, lines: [],
      handles: [{ at: world(f, d.at), anchor: true, set: (p) => { d.at = roundAll(local(f, p)); } }] });
  });
  if (build.spikes) out.push({ sel: { type: 'spikes' }, group: 'Spikes', label: 'where the spikes are', obj: build.spikes, ...shapeBits(build.spikes), hit: null });
  for (const n in build.legs) {
    const L = build.legs[n], f = frameOf(L.on);
    out.push({ sel: { type: 'leg', name: n }, group: 'Legs', label: n, color: swatch(build.fur), obj: L, lines: [],
      handles: [{ at: world(f, L.at), anchor: true, set: (p) => { L.at = roundAll(local(f, p)); } }] });
  }
  for (const n in build.chains) {
    const c = build.chains[n], f = frameOf(c.on), handles = [], lines = [];
    if (c.ear) {
      c.ear.forEach((q, i) => handles.push({ at: world(f, q), set: (p) => { c.ear[i] = roundAll(local(f, p)); } }));
      handles.push({ at: world(f, c.tip), anchor: true, set: (p) => { c.tip = roundAll(local(f, p)); } });
      lines.push([world(f, c.ear[0]), world(f, c.tip), world(f, c.ear[1])]);
    } else {
      const root = world(f, c.at), th = f.a - c.angle, tip = plus(root, [Math.sin(th) * c.length, -Math.cos(th) * c.length]);
      handles.push({ at: root, anchor: true, set: (p) => { c.at = roundAll(local(f, p)); } });
      handles.push({ at: tip, size: true, set: (p) => {
        const d = minus(p, world(f, c.at));
        c.length = Math.max(0.3, +round(Math.hypot(d[0], d[1])).toFixed(3));
        c.angle = +(f.a - Math.atan2(d[0], -d[1])).toFixed(3);
      } });
      lines.push([root, tip]);
    }
    out.push({ sel: { type: 'chain', name: n }, group: 'Chains', label: n, color: swatch(c.color || build.fur), obj: c, handles, lines });
  }
  if (build.face) {
    const f = P.F.head, face = build.face;
    out.push({ sel: { type: 'face' }, group: 'Face', label: 'face', color: swatch(face.noseColor || 'OUT'), obj: face, lines: [],
      handles: ['eye', 'nose', 'mouth'].filter((k) => face[k]).map((k) => ({ at: world(f, face[k]), anchor: k === 'eye', set: (p) => { face[k] = roundAll(local(f, p)); } })) });
  }
  return out;
}
// a clip's parts at the frame shown: its joints (the head with its turn), each paw, each tail's angle and ear's tip;
// dragging one sets a key there (see setKey)
function poseParts() {
  const out = [], F = P.F, turnAt = world(F.head, [5, 0]), n = frames(view.move);
  out.push({ sel: { type: 'frame' }, group: 'Frame', label: `frame ${view.frame + 1} of ${n}${keysAt(view.frame).length ? ' ◆' : ''}`, obj: null, handles: [], lines: [] });
  for (const j of Object.keys(build.joints)) {
    const handles = [{ at: P.J[j], anchor: true, joint: true, set: (p) => setKey(`joints.${j}`, roundAll(p)) }];
    if (j === 'head') handles.push({ at: turnAt, size: true, set: (p) => { const d = minus(p, P.J.head); setKey('headAngle', +Math.atan2(d[1], d[0]).toFixed(2)); } });
    out.push({ sel: { type: 'joint', name: j }, group: 'Joints', label: j === 'head' ? 'head (the ring: its turn)' : j, obj: null, lines: j === 'head' ? [[P.J.head, turnAt]] : [], handles });
  }
  for (const l in build.legs) {
    out.push({ sel: { type: 'paw', name: l }, group: 'Paws', label: l, color: swatch(build.fur), obj: null, lines: [],
      handles: [{ at: P.p.paws[l], anchor: true, set: (p) => setKey(`paws.${l}`, roundAll(p)) }] });
  }
  for (const c in build.chains) {
    const r = rigParts.chainRest(kind, P, c), f = F[r.on], tip = plus(r.root, times(r.dir, r.length));
    const handles = [{ at: tip, anchor: true, set: r.ear ? (p) => setKey(`chains.${c}.tip`, roundAll(local(f, p)))
      : (p) => { const d = minus(p, r.root); setKey(`chains.${c}.angle`, +(f.a - Math.atan2(d[0], -d[1])).toFixed(3)); } }];
    out.push({ sel: { type: 'chain', name: c }, group: 'Tails and ears', label: c, color: swatch(build.chains[c].color || build.fur), obj: null, handles,
      lines: [r.ear ? [r.base[0], tip, r.base[1]] : [r.root, tip]] });
  }
  return out;
}
const same = (a, b) => a.type === b.type && a.list === b.list && a.i === b.i && a.name === b.name;
const current = () => parts().find((p) => same(p.sel, sel));

// --------------------------------------------------------------------------------------------------------- the stage
const toScreen = ([x, y]) => { const [g, [dx, dy]] = G; return [(x * g + dx - X0) * Z, (y * g + dy - Y0) * Z]; };
const toArt = (e) => { const r = $('stage').getBoundingClientRect(), k = $('stage').width / r.width, [g, [dx, dy]] = G; return [((e.clientX - r.left) * k / Z + X0 - dx) / g, ((e.clientY - r.top) * k / Z + Y0 - dy) / g]; };
const editing = () => editable() && (view.move === 'edit' || kindOf(view.move) === 'clip'); // (handles: the build's, or a clip's at the frame shown)

// (the build: standing, its face as the frames being drawn have it, else open and shut)
const setupLook = () => ({ eye: faceEdit.part === 'eye' ? faceEdit.name : 'open', mouth: faceEdit.part === 'mouth' ? faceEdit.name : 'shut' });
function sprite() { return view.move === 'edit' ? animal(kind, 'hurt', 0, { look: setupLook() }) : animal(kind, view.move, view.frame); }

function draw() {
  const c = $('stage'), ctx = c.getContext('2d');
  const box = $('stageBox'); // (as big as fits in what the window leaves it)
  if (view.mode === 'play') {
    Z = Math.max(2, Math.floor(Math.min(box.clientWidth / sandbox.PW, box.clientHeight / sandbox.PH))) || 8;
    if (c.width !== sandbox.PW * Z || c.height !== sandbox.PH * Z) { c.width = sandbox.PW * Z; c.height = sandbox.PH * Z; c.style.width = `${c.width}px`; c.style.height = `${c.height}px`; }
    sandbox.draw(c, Z);
    return;
  }
  Z = Math.max(4, Math.floor(Math.min(box.clientWidth / VW, box.clientHeight / VH))) || 16;
  if (c.width !== VW * Z || c.height !== VH * Z) { c.width = VW * Z; c.height = VH * Z; c.style.width = `${VW * Z}px`; c.style.height = `${VH * Z}px`; }
  ctx.fillStyle = PALETTES.day.bg; ctx.fillRect(0, 0, c.width, c.height); // (the game's day: its outlines show)
  ctx.fillStyle = 'rgba(128,128,128,0.08)';
  for (let x = 1; x < VW; x++) ctx.fillRect(x * Z, 0, 1, c.height);
  for (let y = 1; y < VH; y++) ctx.fillRect(0, y * Z, c.width, 1);
  const pal = PALETTES.day;
  ctx.fillStyle = pal[COLOR.FAINT]; ctx.fillRect(0, (FOOT - Y0) * Z, c.width, Z); // the ground's row
  place();
  const s = sprite(), n = view.move === 'edit' ? 1 : frames(view.move);
  const pixels = (sp, color) => {
    const px = color ? sp.px : sp.look(); // (in the look: see Style)
    for (let y = 0; y < sp.h; y++) for (let x = 0; x < sp.w; x++) {
      const k = px[y * sp.w + x];
      if (!k) continue;
      ctx.fillStyle = color || colorOf(pal, k); ctx.fillRect((x + sp.ox - X0) * Z, (y + sp.oy - Y0) * Z, Z, Z);
    }
  };
  if ($('onion').checked && n > 1 && !view.play) { // (the frames before and after: faded, under it)
    pixels(animal(kind, view.move, (view.frame + n - 1) % n), 'rgba(43,123,217,0.28)');
    if (n > 2) pixels(animal(kind, view.move, (view.frame + 1) % n), 'rgba(217,99,43,0.28)');
  }
  pixels(s);
  // the box every animal is placed by (dashed), the frame's own bounds (dotted)
  ctx.lineWidth = 1.5; ctx.setLineDash([6, 4]); ctx.strokeStyle = css('--dim');
  ctx.strokeRect(-X0 * Z, -Y0 * Z, 26 * Z, 20 * Z);
  ctx.setLineDash([2, 3]); ctx.strokeStyle = css('--accent');
  ctx.strokeRect((s.ox - X0) * Z, (s.oy - Y0) * Z, s.w * Z, s.h * Z);
  ctx.setLineDash([]);
  if (editing() && !view.play) drawHandles(ctx);
  markFrames();
}

function drawHandles(ctx) {
  const all = parts(), on = current(), accent = css('--sel');
  const dot = (p, r, fill, ring) => { const [x, y] = toScreen(p); ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fillStyle = fill; ctx.fill(); ctx.lineWidth = 1.5; ctx.strokeStyle = ring; ctx.stroke(); };
  if (on) {
    ctx.strokeStyle = accent; ctx.lineWidth = 2;
    for (const line of on.lines) { ctx.beginPath(); line.forEach((p, i) => { const [x, y] = toScreen(p); i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }); ctx.stroke(); }
  }
  for (const p of all) {
    if (p === on) continue;
    for (const h of p.handles) if (h.anchor && (h.joint || $('allHandles').checked)) dot(h.at, h.joint ? 6 : 4, h.joint ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.6)', h.joint ? '#333' : 'rgba(60,60,60,0.6)');
  }
  if (on) for (const h of on.handles) dot(h.at, h.joint || h.move ? 6 : 5, h.size ? '#fff' : accent, h.size ? accent : '#fff');
}

// pick and drag: a handle of the picked part, a joint or another part's handle, or (a click) the part under the pointer
const playAt = (e) => { const r = $('stage').getBoundingClientRect(), k = $('stage').width / r.width; return [((e.clientX - r.left) * k) / Z, ((e.clientY - r.top) * k) / Z]; };
const hand = (c) => { $('stage').style.cursor = c || ''; };
$('stage').addEventListener('pointerdown', (e) => {
  if (view.mode === 'play') { $('stage').setPointerCapture(e.pointerId); hand(sandbox.down(...playAt(e))); return; }
  if (!editing()) return;
  if (view.play) setPlay(false);
  const p = toArt(e), near = (h) => Math.hypot(...minus(toScreen(h.at), toScreen(p))) < 9;
  const all = parts(), on = current();
  let hit = on?.handles.find(near), owner = on;
  if (!hit) for (const q of all) { const h = q.handles.find((x) => x.anchor && (x.joint || $('allHandles').checked) && near(x)); if (h) { hit = h; owner = q; break; } }
  if (hit) {
    if (owner !== on) { sel = owner.sel; listParts(); inspect(); }
    remember(); drag = { sel: owner.sel, index: owner.handles.indexOf(hit) };
    $('stage').setPointerCapture(e.pointerId);
    return;
  }
  const picked = [...all].reverse().find((q) => q.hit?.(p)); // (the one drawn last: on top)
  sel = picked ? picked.sel : { type: 'rig' };
  listParts(); inspect(); draw();
});
$('stage').addEventListener('pointermove', (e) => {
  if (view.mode === 'play') { const c = sandbox.move(...playAt(e)); if (c !== null) hand(c); return; }
  if (!drag) return;
  step = e.shiftKey ? 0.5 : 0.1;
  const q = parts().find((x) => same(x.sel, drag.sel));
  q?.handles[drag.index]?.set(toArt(e));
  changed();
});
for (const type of ['pointerup', 'pointercancel']) $('stage').addEventListener(type, () => { if (view.mode === 'play') { sandbox.up(); hand(''); } });
$('stage').addEventListener('pointerup', () => {
  if (!drag) return;
  drag = null; step = 0.1;
  if (view.move !== 'edit') timeline(); // (a key set)
  const h = hist();
  if (h.past[h.past.length - 1] === snapshot()) h.past.pop(); // (a click, no change)
  listParts(); inspect(); status();
});

// --------------------------------------------------------------------------------------------- the lists of parts
// two lists, as Spine has them: the bones (a tree: the root (the animal itself), hip, chest and head down the spine, each
// joint's legs and chains under it) and the shapes hung on them, by layer in the order they are drawn, each with its bone
const BONES = ['Animal', 'Frame', 'Joints', 'Legs', 'Chains', 'Paws', 'Tails and ears'];
const ADD = { 'Body shapes': 'shapes', Paint: 'paint', 'On top': 'top', Dots: 'dots' };
const DRAWN = ['Body shapes', 'Paint', 'Spikes', 'On top', 'Dots', 'Face']; // (as drawRig in art.js draws them)
function listParts() {
  const bones = $('bones'), shapes = $('shapes'), note = (box, text) => box.append(el('p', { className: 'note', style: 'padding:0 10px', textContent: text }));
  bones.textContent = shapes.textContent = '';
  const bt = $('bonesTitle'), playing = view.mode === 'play';
  bt.textContent = playing ? 'Play' : 'Bones'; bt.title = playing ? 'What to try on the stage' : 'The skeleton: what moves';
  if (view.mode === 'play') { playHelp(bones); note(shapes, 'Shapes are set in Setup.'); return; }
  if (!editable()) { note(bones, `The ${kind} has no bones.`); return; }
  if (view.move !== 'edit' && kindOf(view.move) !== 'clip') { note(bones, ABOUT[kindOf(view.move)]); return; }
  const all = parts(), row = (p, depth, what) => {
    const r = el('div', { className: `row${same(p.sel, sel) ? ' on' : ''}`, style: `padding-left:${10 + depth * 12}px` },
      el('span', { className: 'sw', style: `background:${p.color || 'transparent'}` }), el('span', { textContent: p.label }), el('span', { className: 'what', textContent: what }));
    r.onclick = () => { sel = p.sel; listParts(); inspect(); draw(); };
    return r;
  };
  // the bones
  const onOf = (p) => (p.sel.type === 'leg' || p.sel.type === 'paw' ? build.legs[p.sel.name]?.on : p.sel.type === 'chain' ? build.chains[p.sel.name]?.on : null);
  const whatOf = (p) => (p.sel.type === 'leg' ? 'leg' : p.sel.type === 'paw' ? 'paw' : p.sel.type === 'chain' ? (build.chains[p.sel.name]?.ear ? 'ear' : 'chain') : '');
  const bonesOf = all.filter((p) => BONES.includes(p.group)), shown = new Set();
  const put = (p, depth) => { bones.append(row(p, depth, whatOf(p))); shown.add(p); };
  for (const p of bonesOf) if (p.sel.type === 'rig' || p.sel.type === 'frame') put(p, 0);
  Object.keys(build.joints).forEach((j, d) => {
    const jp = bonesOf.find((p) => p.sel.type === 'joint' && p.sel.name === j);
    if (jp) put(jp, d + 1);
    for (const p of bonesOf) if (!shown.has(p) && onOf(p) === j) put(p, d + 2);
  });
  for (const p of bonesOf) if (!shown.has(p)) put(p, 1); // (on no joint)
  // the shapes
  if (view.move !== 'edit') { note(shapes, 'Shapes are set in Setup.'); return; }
  for (const label of DRAWN) { // (a layer with nothing on it yet: to add to)
    const on = all.filter((p) => p.group === label);
    if (!on.length && !ADD[label]) continue;
    const h = el('div', { className: 'group' }, el('span', { textContent: label }));
    if (ADD[label]) h.append(el('button', { textContent: '+ add', title: `Add to ${label.toLowerCase()}`, onclick: () => add(ADD[label]) }));
    shapes.append(h);
    for (const p of on) shapes.append(row(p, 0, p.obj && geomOf(p.obj) ? `${geomOf(p.obj)}${p.obj.on ? ` · ${p.obj.on}` : ''}` : p.obj?.on || ''));
  }
}

const fresh = (list) => (list === 'dots' ? { name: 'dot', on: 'head', at: [0, 0], color: 'OUT' }
  : list === 'top' ? { name: 'shape', color: build.fur, shapes: [{ on: 'head', ellipse: [0, -3, 1, 1] }] }
    : { name: list === 'paint' ? 'marking' : 'shape', ...(list === 'paint' ? { color: 'BELLY' } : {}), on: 'spine', ellipse: [2, 0, 2, 1.5] });
function add(list) { commit(() => { (build[list] ||= []).push(fresh(list)); sel = { type: 'item', list, i: build[list].length - 1 }; }); refresh(); }

// moves a list item: up or down (d), copied, gone, or to another layer (body shapes, paint, on top)
function itemDo(what, arg) {
  const { list, i } = sel, arr = build[list];
  commit(() => {
    if (what === 'move') { const j = i + arg; if (j < 0 || j >= arr.length) return; [arr[i], arr[j]] = [arr[j], arr[i]]; sel = { ...sel, i: j }; }
    else if (what === 'copy') { arr.splice(i + 1, 0, JSON.parse(JSON.stringify(arr[i]))); sel = { ...sel, i: i + 1 }; }
    else if (what === 'delete') { arr.splice(i, 1); if (!arr.length && list !== 'shapes') delete build[list]; sel = { type: 'rig' }; }
    else if (what === 'layer' && arg !== list) {
      const [s] = arr.splice(i, 1);
      if (!arr.length && list !== 'shapes') delete build[list];
      const flat = list === 'top' ? s.shapes.map((x) => ({ name: s.name, color: s.color, ...x })) : [s];
      const into = (build[arg] ||= []);
      for (const x of flat) {
        if (arg === 'top') { const g = geomOf(x); into.push({ name: x.name, color: x.color || build.fur, shapes: [{ on: x.on, [g]: x[g] }] }); }
        else { const y = { ...x }; if (arg === 'shapes') delete y.color; else y.color ||= 'BELLY'; into.push(y); }
      }
      sel = { type: 'item', list: arg, i: into.length - 1 };
    }
  });
  listParts(); inspect();
}

// --------------------------------------------------------------------------------------------------- the inspector
function inspect() {
  const box = $('inspector'); box.textContent = '';
  if (!editable()) { box.append(el('p', { className: 'note', textContent: `The ${kind} has no bones.` })); return; }
  if (view.mode === 'play') { inspectPlay(box); return; }
  if (view.move !== 'edit') { inspectMove(box); return; }
  const p = current() || parts()[0], o = p.obj;
  const title = el('h2', {}, el('span', { className: 'sw', style: `width:12px;height:12px;border-radius:3px;background:${p.color || 'transparent'}` }), el('span', { textContent: p.label }));
  box.append(title);
  if (sel.type === 'item') {
    const acts = el('span', { className: 'acts' });
    for (const [t, what, arg, tip] of [['↑', 'move', -1, 'Drawn earlier'], ['↓', 'move', 1, 'Drawn later'], ['⧉', 'copy', 0, 'Copy'], ['✕', 'delete', 0, 'Delete']]) acts.append(el('button', { textContent: t, title: tip, onclick: () => itemDo(what, arg) }));
    title.append(acts);
    if (sel.list !== 'dots') {
      const layer = el('select', { onchange: () => itemDo('layer', layer.value) });
      for (const [k, t] of Object.entries(LAYERS)) layer.append(el('option', { value: k, textContent: t, selected: k === sel.list }));
      box.append(field('layer', layer, sel.list === 'shapes' ? 'outlined, counts for hits' : sel.list === 'paint' ? 'colors the body' : 'outlined, over the body, no hits'));
    }
  }
  if (sel.type === 'joint') { box.append(field('place', nums(o, sel.name))); return; }
  if (sel.type === 'rig') { box.append(el('p', { className: 'note', textContent: 'Pick a part in the list or on the stage. The root: the animal itself.' })); }
  const skip = sel.type === 'rig' ? ['joints', 'shapes', 'paint', 'top', 'dots', 'legs', 'chains', 'face', 'spikes', 'moves', 'handling', 'recolor'] : sel.list === 'top' ? ['shapes'] : [];
  fields(o, box, sel.type === 'face' ? ['frames'] : skip);
  if (sel.type === 'face') faceFrames(box);
  if (sel.type === 'rig') rootMore(box);
  if (sel.type === 'leg' || sel.type === 'chain') farSide(box);
  if (sel.type === 'item' && sel.list === 'top') o.shapes.forEach((s, i) => { box.append(el('div', { className: 'group', textContent: `shape ${i + 1}` })); fields(s, box, []); });
}
function field(label, input, note) {
  const f = el('label', { className: 'field' }, el('span', { textContent: label }), input);
  if (note) f.append(el('span'), el('span', { className: 'note', textContent: note }));
  return f;
}
// an editor for each of an object's settings, by what it holds
function fields(o, box, skip) {
  for (const k of Object.keys(o)) {
    if (skip.includes(k)) continue;
    const v = o[k];
    let input;
    if (COLOR_KEYS.includes(k)) {
      input = el('select', { onchange: () => commit(() => { o[k] = input.value; }) });
      for (const c of COLORS) input.append(el('option', { value: c, textContent: c.toLowerCase().replace(/_/g, ' '), selected: c === v }));
      input.style.borderLeft = `14px solid ${swatch(v)}`;
    } else if (k === 'on') {
      input = el('select', { onchange: () => commit(() => { if (input.value) o.on = input.value; else delete o.on; }) });
      for (const c of ['', 'spine', 'hip', 'chest', 'head']) input.append(el('option', { value: c, textContent: c || 'the box', selected: c === (v || '') }));
    } else if (GEOMS.includes(k) && Array.isArray(v)) {
      const type = el('select', { onchange: () => commit(() => { const g = type.value; delete o[k]; o[g] = convert(v, k, g); }) });
      for (const g of GEOMS) type.append(el('option', { value: g, textContent: g, selected: g === k }));
      box.append(field('shape', type));
      input = k === 'triangle' ? el('div', {}, ...v.map((_, i) => nums(v, i))) : nums(o, k, k);
      box.append(field(k === 'triangle' ? 'points' : { ellipse: 'x y rx ry', capsule: 'ax ay bx by r', box: 'x0 y0 x1 y1 r' }[k], input));
      continue;
    } else if (typeof v === 'number') input = num(o, k);
    else if (typeof v === 'boolean') input = el('input', { type: 'checkbox', checked: v, onchange: () => commit(() => { o[k] = input.checked; }) });
    else if (typeof v === 'string') input = el('input', { type: 'text', value: v, onchange: () => commit(() => { o[k] = input.value; listParts(); }) });
    else if (Array.isArray(v) && v.every((x) => typeof x === 'number')) input = nums(o, k);
    else if (Array.isArray(v) && v.every((x) => Array.isArray(x) && x.every((y) => typeof y === 'number'))) input = el('div', {}, ...v.map((_, i) => nums(v, i)));
    else if (v && typeof v === 'object' && !Array.isArray(v) && Object.values(v).every((x) => typeof x === 'number' || typeof x === 'boolean')) {
      box.append(el('div', { className: 'group', textContent: k })); fields(v, box, []); continue;
    } else input = json(o, k);
    box.append(field(k, input));
  }
}
// a number to set: its box, and a slider (from min to max, or span either side of the value: at least 2), live while it
// is dragged (one undo for the drag); whole: whole numbers; commit: set makes its own undo and redraws
function numIn(value, set, { step = 0.1, min, max, span, whole = false, commit: own = false } = {}) {
  const v = +(+value || 0).toFixed(3), s = span ?? Math.max(2, Math.abs(v)), put = (x) => (whole ? Math.round(x) : +x.toFixed(3));
  const box = el('input', { type: 'number', step, value: v, ...(min !== undefined && { min }), ...(max !== undefined && { max }) });
  const range = el('input', { type: 'range', min: Math.min(min ?? Math.floor(v - s), v), max: Math.max(max ?? Math.ceil(v + s), v), step: whole ? 1 : step / 2, value: v });
  let live = false;
  range.oninput = () => { const x = put(+range.value); box.value = x; if (own) return; if (!live) { remember(); live = true; } set(x); changed(); };
  range.onchange = () => { const x = put(+range.value); if (own) set(x); else { live = false; timeline(); listParts(); status(); } };
  box.onchange = () => { const x = put(+box.value); range.value = x; if (own) set(x); else commit(() => set(x)); };
  return el('span', { className: 'num' }, box, range);
}
// how a setting's slider goes, by its name (sizes from 0; counts in whole numbers)
const SIZES = ['r', 'ends', 'thigh', 'shin', 'length', 'end', 'smooth', 'stiffness', 'damping', 'weight', 'tipSize'], WHOLE = ['links'];
const optsFor = (k) => (WHOLE.includes(k) ? { step: 1, min: 1, max: 12, whole: true } : SIZES.includes(k) ? { min: 0 } : {});
const num = (o, k) => numIn(o[k], (x) => { o[k] = x; }, optsFor(k));
// a list of numbers (a place; a shape's numbers: its radii from 0)
const RADII = { ellipse: [2, 3], capsule: [4], box: [4] };
const nums = (o, k, geom) => el('span', { className: 'nums' }, ...o[k].map((_, j) => numIn(o[k][j], (x) => { o[k][j] = x; }, RADII[geom]?.includes(j) ? { min: 0 } : { span: 3 })));
const json = (o, k) => { const i = el('input', { type: 'text', value: JSON.stringify(o[k]) }); i.onchange = () => { try { const v = JSON.parse(i.value); commit(() => { o[k] = v; }); } catch { i.style.borderColor = 'red'; } }; return i; };
// a shape's numbers, as another kind of shape about the same place
function convert(v, from, to) {
  const box = from === 'ellipse' ? [v[0] - v[2], v[1] - v[3], v[0] + v[2], v[1] + v[3]] : from === 'triangle' ? [Math.min(...v.map((q) => q[0])), Math.min(...v.map((q) => q[1])), Math.max(...v.map((q) => q[0])), Math.max(...v.map((q) => q[1]))] : v.slice(0, 4);
  const [x0, y0, x1, y1] = [Math.min(box[0], box[2]), Math.min(box[1], box[3]), Math.max(box[0], box[2]), Math.max(box[1], box[3])], cx = (x0 + x1) / 2, cy = (y0 + y1) / 2;
  const r = (n) => +n.toFixed(2);
  if (to === 'ellipse') return [r(cx), r(cy), r(Math.max(0.5, (x1 - x0) / 2)), r(Math.max(0.5, (y1 - y0) / 2))];
  if (to === 'capsule') return [r(x0), r(cy), r(x1), r(cy), r(Math.max(0.5, (y1 - y0) / 2))];
  if (to === 'box') return [r(x0), r(y0), r(x1), r(y1), 0.5];
  return [[r(x0), r(y1)], [r(cx), r(y0)], [r(x1), r(y1)]];
}

// ------------------------------------------------------------------------------------------- the moves: a timeline
// a move (see asset.js): a clip (keys over its frames: a handle dragged sets a key at the frame shown, what it changes
// going from one key to the next by the first's ease) or a gait (each frame worked out from its settings: to tune)
const moveOf = (name) => rigParts.move(kind, name) || rigParts.move(kind, 'run');
const kindOf = (name) => (moveOf(name).gait ? 'gait' : 'clip');
function frames(name) { const m = moveOf(name); return m.gait ? m.gait.frames : m.frames; }
const ABOUT = {
  clip: 'Keys over its frames: drag a joint, a paw, the head, a tail or an ear to set a key at the frame shown.',
  gait: 'A gait: each frame worked out from where it is in the stride, by the settings in the inspector.',
};
// in the game: which of a move's frames show when
const GAME = {
  run: 'In the game: frame after frame as it runs.', duck: 'In the game: frame after frame as it crawls.',
  jump: 'In the game: spread over the jump, the first as it takes off, the last as it falls fastest.',
  idle: 'In the game: on the title, sitting, a frame a tenth of a second.', hurt: 'In the game: the first, as it is hit.', ko: 'In the game: the first, knocked out.',
  drum: 'In the game: its super power, drumming its chest.', spray: 'In the game: its super power, spraying water.',
};
// a gait's settings, what each does
const GAIT = {
  frames: 'poses in a stride', rate: 'strides, of the usual', stance: 'of a stride, a paw on the ground', reach: 'how far a paw sweeps',
  lift: 'how high a paw swings', bob: 'how much the body bobs', beat: 'bobs in a stride', head: 'how much the head follows the chest',
  ground: 'the paws’ row', land: 'of a leap, on the ground', height: 'how high a leap goes', stretch: 'the hip back, in the air',
  gather: 'the hip forward, on the ground', crouch: 'how low it crouches', pitch: 'the nose up rising, down falling',
};
const EASES = ['linear', 'smooth', 'sine', 'step'];

// a clip's keys by what they set (a path: 'joints.chest', 'chains.tail.angle'), and the bone each is on: a row of the
// timeline (the head's turn on the head, a leg's paw and root on the leg, the shapes on a row of their own)
const leaves = (o, pre = '', out = []) => { for (const k in o) { if (!pre && (k === 'at' || k === 'ease')) continue; const v = o[k], p = pre ? `${pre}.${k}` : k; if (v && typeof v === 'object' && !Array.isArray(v)) leaves(v, p, out); else out.push(p); } return out; };
const rowOf = (path) => { const [a, b] = path.split('.'); return a === 'eye' || a === 'mouth' ? 'face' : a === 'joints' ? b : a === 'headAngle' ? 'head' : a === 'paws' || a === 'roots' || a === 'chains' ? b : a === 'torso' ? 'torso' : ['shapes', 'paint', 'top', 'dots', 'ownShapes'].includes(a) ? 'shapes' : 'pose'; };
const rowOfSel = () => (sel.type === 'joint' || sel.type === 'paw' || sel.type === 'chain' ? sel.name : null); // (null: every row)
const getPath = (o, path) => path.split('.').reduce((x, k) => x?.[k], o);
const setPath = (o, path, v) => { const ks = path.split('.'); let x = o; for (let i = 0; i < ks.length - 1; i++) x = x[ks[i]] ||= {}; x[ks[ks.length - 1]] = v; };
function delPath(o, path) {
  const ks = path.split('.'), up = [o];
  for (let i = 0; i < ks.length - 1; i++) { const x = up[i][ks[i]]; if (!x || typeof x !== 'object') return; up.push(x); }
  delete up[ks.length - 1][ks[ks.length - 1]];
  for (let i = ks.length - 2; i >= 0; i--) if (!Object.keys(up[i + 1]).length) delete up[i][ks[i]];
}
const clipKeys = () => moveOf(view.move).keys;
const keysAt = (f) => clipKeys().filter((k) => k.at === f);
const empty = (k) => Object.keys(k).every((x) => x === 'at' || x === 'ease');
// set what a path is at the frame shown: in the key there that sets it, or the first key there, or a new one
function setKey(path, v) {
  const here = keysAt(view.frame);
  let k = here.find((x) => getPath(x, path) !== undefined) || here[0];
  if (!k) { k = { at: view.frame }; clipKeys().push(k); clipKeys().sort((a, b) => a.at - b.at); }
  setPath(k, path, v);
}
// the clip's pose at the frame shown as its keys have it (the build's shapes still used by name), and the paths it sets
const rawPose = () => rigParts.clip(moveOf(view.move), view.frame);
const pathsOf = (row) => [...new Set(clipKeys().flatMap((k) => leaves(k)))].filter((p) => !row || rowOf(p) === row);
// keys at the frame shown, for a row (or every row): set to what they are there; gone; their ease
function keyDo(what, arg) {
  const row = rowOfSel(), f = view.frame;
  commit(() => {
    if (what === 'key') { const pose = rawPose(); for (const p of pathsOf(row)) { const v = getPath(pose, p); if (v !== undefined) setKey(p, v); } }
    else if (what === 'delete' || what === 'ease') {
      const moved = {};
      for (const k of keysAt(f)) for (const p of leaves(k)) if (!row || rowOf(p) === row) { if (what === 'ease') setPath(moved, p, getPath(k, p)); delPath(k, p); }
      const m = moveOf(view.move);
      m.keys = m.keys.filter((k) => !empty(k) || k.at !== f);
      if (what === 'ease' && Object.keys(moved).length) {
        const same = keysAt(f).find((k) => (k.ease || 'linear') === arg);
        if (same) for (const p of leaves(moved)) setPath(same, p, getPath(moved, p));
        else { m.keys.push({ at: f, ...(arg !== 'linear' && { ease: arg }), ...moved }); m.keys.sort((a, b) => a.at - b.at); }
      }
    } else if (what === 'paste' && copied) for (const p of leaves(copied)) setKey(p, getPath(copied, p));
    else if (what === 'frames') { const m = moveOf(view.move); m.frames = arg; m.keys = m.keys.filter((k) => k.at < arg); view.frame = Math.min(view.frame, arg - 1); }
  });
  refresh();
}
let copied = null; // (a pose copied: Copy pose, to paste at another frame or into another move)

function fillMoves() {
  const s = $('move'); s.textContent = '';
  for (const m of rigParts.moves(kind)) s.append(el('option', { value: m, textContent: m }));
  view.move = view.mode === 'animate' ? animated() : 'edit'; view.frame = 0; setPlay(false);
  s.value = view.mode === 'animate' ? view.move : animated();
}
function show(move, frame = 0) {
  view.move = move; view.frame = frame;
  if (move !== 'edit') { lastMove = move; $('move').value = move; }
  if (!['joint', 'paw', 'chain', 'frame'].includes(sel.type) || move === 'edit') sel = { type: move === 'edit' ? 'rig' : 'frame' };
  place(); refresh();
}
$('move').onchange = () => show($('move').value);
$('allHandles').onchange = draw;
$('onion').onchange = draw;
// shading: the look the game draws in (see setStyle in art.js); off: the sprites' own colors, outlined in black.
// ?style=outlined to start with it off
$('shading').checked = new URLSearchParams(location.search).get('style') !== 'outlined';
$('shading').onchange = () => { setStyle($('shading').checked ? 'between' : 'outlined'); draw(); };
setStyle($('shading').checked ? 'between' : 'outlined');

// the timeline: a gait's frames, or a clip's dopesheet (a row for each bone its keys move, a column for each frame: a
// key where a key sets something on it), what can be done at the frame shown, what the move is
let strip = [];
const goTo = (f, s) => { setPlay(false); view.frame = f; if (s) sel = s; place(); listParts(); inspect(); timeline(); draw(); };
function timeline() {
  const box = $('timeline'); box.textContent = ''; strip = [];
  if (view.mode === 'play') return;
  if (view.move === 'edit') { box.append(el('span', { className: 'note', textContent: 'The build: what every move is made from. Its moves are in Animate.' })); return; }
  const n = frames(view.move), what = kindOf(view.move), can = editable();
  if (what === 'gait') {
    const row = el('div', { className: 'frames' });
    for (let i = 0; i < n; i++) { const b = el('button', { title: `Frame ${i + 1}`, onclick: () => goTo(i) }, el('canvas', { width: 42, height: 26 }), el('span', { textContent: i + 1 })); row.append(b); strip.push(b); }
    box.append(row, el('span', { className: 'note', textContent: `${ABOUT.gait} ${GAME[view.move] || ''}` }));
    markFrames();
    return;
  }
  // the rows: the spine's joints, the legs, the chains, then the torso, the shapes, the rest of the pose
  const rows = new Map(), order = [...Object.keys(build.joints || {}), ...Object.keys(build.legs || {}), ...Object.keys(build.chains || {}), 'face', 'torso', 'shapes', 'pose'];
  for (const k of clipKeys()) for (const p of leaves(k)) { const r = rowOf(p); if (!rows.has(r)) rows.set(r, new Map()); if (!rows.get(r).has(k.at)) rows.get(r).set(k.at, k.ease || 'linear'); }
  const selOf = (r) => (r in (build.joints || {}) ? { type: 'joint', name: r } : r in (build.legs || {}) ? { type: 'paw', name: r } : r in (build.chains || {}) ? { type: 'chain', name: r } : { type: 'frame' });
  const dope = el('div', { className: 'dope', style: `grid-template-columns: 76px repeat(${n}, minmax(4px, 1fr))` });
  dope.append(el('span'));
  for (let i = 0; i < n; i++) dope.append(el('span', { className: `fno${i === view.frame ? ' now' : ''}`, textContent: n <= 24 || i % 10 === 0 ? i + 1 : '', onclick: () => goTo(i) }));
  for (const r of [...rows.keys()].sort((a, b) => order.indexOf(a) - order.indexOf(b))) {
    const on = rowOfSel() === r || (!rowOfSel() && sel.type === 'frame');
    dope.append(el('span', { className: `name${on ? ' on' : ''}`, textContent: r, onclick: () => goTo(view.frame, selOf(r)) }));
    for (let i = 0; i < n; i++) {
      const e = rows.get(r).get(i);
      dope.append(el('span', { className: `cell${i === view.frame ? ' now' : ''}${e ? ` key ${e}` : ''}`, title: e ? `${r}: a key at ${i + 1} (${e})` : '', onclick: () => goTo(i, selOf(r)) }));
    }
  }
  box.append(dope);
  const bar = el('div', { className: 'keys' }), act = (t, tip, fn, off) => bar.append(el('button', { textContent: t, title: tip, disabled: !!off || !can, onclick: fn }));
  const row = rowOfSel(), here = keysAt(view.frame).filter((k) => leaves(k).some((p) => !row || rowOf(p) === row));
  bar.append(el('span', { className: 'frameNo', textContent: `frame ${view.frame + 1} / ${n} · ${row || 'every row'}` }));
  act('◆ Key', 'A key here for what is shown (the row picked, or every row)', () => keyDo('key'));
  act('✕ Key', 'No key here (the row picked, or every row)', () => keyDo('delete'), !here.length);
  const ease = el('select', { title: 'How what this key sets goes on to the next key', disabled: !here.length || !can, onchange: () => keyDo('ease', ease.value) });
  for (const e of EASES) ease.append(el('option', { value: e, textContent: e, selected: (here[0]?.ease || 'linear') === e }));
  bar.append(ease);
  act('Copy pose', 'The pose here, to paste at another frame or into another move', () => { copied = JSON.parse(JSON.stringify(rawPose())); timeline(); });
  act('Paste pose', 'Keys here for all of the pose copied', () => keyDo('paste'), !copied);
  bar.append(el('label', { title: 'How many frames the move has' }, 'frames ', numIn(n, (v) => keyDo('frames', v), { step: 1, min: 1, max: Math.max(80, n), whole: true, commit: true })));
  box.append(bar, el('span', { className: 'note', textContent: `${ABOUT.clip} ${GAME[view.move] || ''}` }));
}
// a gait's frames drawn (as they are now), the one shown marked
function markFrames() {
  if (view.move === 'edit') return;
  if (kindOf(view.move) !== 'gait') { $('timeline').querySelectorAll('.dope .now').forEach((x) => x.classList.remove('now')); $('timeline').querySelectorAll(`.dope > :nth-child(${frames(view.move) + 1}n + ${view.frame + 2})`).forEach((x) => x.classList.add('now')); return; }
  strip.forEach((b, i) => {
    b.className = i === view.frame ? 'on' : '';
    const c = b.firstChild, ctx = c.getContext('2d');
    ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.fillStyle = PALETTES.day.bg; ctx.fillRect(0, 0, c.width, c.height);
    ctx.fillStyle = PALETTES.day[COLOR.FAINT]; ctx.fillRect(0, 6 + FOOT, c.width, 1);
    animal(kind, view.move, i).draw(ctx, 8, 6, PALETTES.day);
  });
}

// playing the move, as fast as the game would (a gait: at the preview's speed)
function setPlay(on) { view.play = on; view.t = 0; $('play').textContent = on ? '❚❚' : '▶'; }
$('play').onclick = () => { if (view.move === 'edit') return; setPlay(!view.play); draw(); };
function fps() {
  const m = moveOf(view.move);
  return m.gait ? m.gait.frames * strides(kind, +$('speed').value, view.move === 'duck' ? 1 : undefined) : m.fps || 4;
}
function stepPlay(dt) {
  if (!view.play || view.move === 'edit') return;
  view.t += dt;
  const f = (view.frame + Math.floor(view.t * fps())) % frames(view.move);
  if (view.t * fps() >= 1) { view.t = 0; view.frame = f; draw(); }
}

// the inspector for a move: what a clip's pose is at the frame shown (for the bone picked: setting it sets a key there),
// or a gait's settings
function inspectMove(box) {
  if (kindOf(view.move) === 'gait') { inspectGait(box); return; }
  const p = current() || poseParts()[0], pose = P.p, row = rowOfSel();
  box.append(el('h2', {}, el('span', { textContent: p.label })));
  const keyed = (path) => keysAt(view.frame).some((k) => getPath(k, path) !== undefined);
  const mark = (f, path) => { if (keyed(path)) f.classList.add('own'); return f; };
  const vec = (label, path, now, opts) => box.append(mark(field(label, el('span', { className: 'nums' }, ...now.map((v, j) => numIn(v, (x) => { const q = now.slice(); q[j] = x; now = q; setKey(path, q); }, opts))), keyed(path) ? 'a key here' : 'between keys: setting it sets one'), path));
  const one = (label, path, now, opts, note) => box.append(mark(field(label, numIn(now, (x) => setKey(path, x), opts), note), path));
  if (sel.type === 'joint') {
    vec('place', `joints.${row}`, P.J[row], { span: 3 });
    if (row === 'head') one('turn', 'headAngle', pose.headAngle || 0, { step: 0.05, span: 1.5 }, 'radians, + down');
  } else if (sel.type === 'paw') {
    vec('paw', `paws.${row}`, pose.paws[row], { span: 4 });
    if (pose.roots?.[row]) vec('root', `roots.${row}`, pose.roots[row], { span: 3 });
  } else if (sel.type === 'chain') {
    const c = { ...build.chains[row], ...pose.chains?.[row] };
    if (c.ear) vec('tip', `chains.${row}.tip`, c.tip, { span: 3 });
    else {
      one('angle', `chains.${row}.angle`, c.angle, { step: 0.05, span: 1.5 }, 'radians from straight up, + back');
      one('curl', `chains.${row}.curl`, c.curl || 0, { step: 0.05, span: 1 });
    }
  } else {
    const t = { ...build.torso, ...pose.torso };
    one('head turn', 'headAngle', pose.headAngle || 0, { step: 0.05, span: 1.5 }, 'radians, + down');
    if (build.torso?.r || pose.torso) { one('torso r', 'torso.r', t.r, { min: 0, max: 8 }); one('torso ends', 'torso.ends', t.ends ?? 0, { min: 0, max: 8 }); }
    const flip = el('input', { type: 'checkbox', checked: !!pose.flip, onchange: () => commit(() => setKey('flip', flip.checked || null)) });
    box.append(field('on its back', flip));
    for (const part of ['eye', 'mouth']) { // its face's frames: a key sets which
      if (part === 'mouth' && !build.face?.mouth) continue;
      const pick = el('select', { onchange: () => { commit(() => setKey(part, pick.value)); inspect(); } }), now = pose[part] || (part === 'eye' ? 'open' : 'shut');
      for (const n of frameNames(part)) pick.append(el('option', { value: n, textContent: n, selected: n === now }));
      box.append(mark(field(part, pick, keyed(part) ? 'a key here' : 'its frame: setting it sets a key (blinking, open is blink)'), part));
    }
    box.append(el('p', { className: 'note', textContent: 'Pick a joint, a paw, a tail or an ear on the stage, in the list or on the timeline.' }));
  }
}
// a gait's settings
function inspectGait(box) {
  const g = moveOf(view.move).gait, can = editable();
  box.append(el('h2', { textContent: `${view.move}: ${g.leap ? 'a leap' : 'a gait'}` }));
  if (!can) return;
  for (const k of Object.keys(g)) {
    if (typeof g[k] !== 'number') continue;
    const whole = k === 'frames';
    box.append(field(k, numIn(g[k], (v) => { g[k] = v; }, whole ? { step: 1, min: 2, max: 24, whole: true } : { step: 0.05, min: 0, max: Math.max(1, g[k] * 2, k === 'ground' ? 20 : 0) }), GAIT[k]));
  }
  box.append(el('div', { className: 'group', textContent: g.leap ? 'legs: down [touches, leaves] · at [touches, leaves] · air [x, y]' : 'legs: [when in the stride, where its sweep is]' }));
  for (const n in g.legs) {
    const L = g.legs[n], put = (arr, j, v) => { arr[j] = v; };
    const ins = (Array.isArray(L) ? [L] : ['down', 'at', 'air'].map((k) => L[k])).flatMap((arr) => arr.map((v, j) => numIn(v, (x) => put(arr, j, x), { step: 0.05, span: 2 })));
    box.append(field(n, el('span', { className: 'nums' }, ...ins)));
  }
}

// ------------------------------------------------------------------------------------------------- skins and helpers
// the root: for a skin, what it is made from and its colors swapped (its own: all a skin has); for an animal, its skins
function rootMore(box) {
  if (skin) {
    box.append(el('div', { className: 'group' }, el('span', { textContent: 'Skin' })),
      el('p', { className: 'note', textContent: `A skin of the ${base}: its bones, shapes, moves and handling are the ${base}’s (editing them changes both). Its own: its colors, one for another.` }));
    recolors(box, skin);
    return;
  }
  box.append(el('div', { className: 'group' }, el('span', { textContent: 'Skins' })));
  const list = skinsOf(base);
  if (!list.length) box.append(el('p', { className: 'note', textContent: 'None yet: a skin is this animal with its colors swapped (the wolf: the fox in grey).' }));
  for (const k of list) box.append(el('div', { className: 'row', onclick: () => choose(k) }, el('span', { textContent: k }), el('span', { className: 'what', textContent: Object.entries(builds[k].recolor || {}).map(([a, b]) => `${a.toLowerCase()} → ${b.toLowerCase()}`).join(', ') })));
  box.append(el('div', { className: 'keys' },
    el('button', { textContent: '+ New skin…', onclick: () => { $('skin').value = '+'; $('skin').onchange(); } }),
    el('button', { textContent: '+ New animal from this…', title: 'A new animal: a copy of this one, to change as it likes (in the editor only, till the game is given it)', onclick: () => { $('kind').value = '+'; $('kind').onchange(); } })));
  if (build.recolor) { box.append(el('div', { className: 'group' }, el('span', { textContent: 'Colors swapped' }))); recolors(box, build); }
}
// colors swapped, one for another, everywhere (o.recolor): those the animal has first
function recolors(box, o) {
  const has = [...new Set((JSON.stringify(build).match(/"[A-Z_]+"/g) || []).map((x) => x.slice(1, -1)).filter((c) => COLORS.includes(c)))];
  const order = [...has, ...COLORS.filter((c) => !has.includes(c))];
  const pick = (value, on) => { const p = el('select', { onchange: () => on(p.value) }); p.style.borderLeft = `14px solid ${swatch(value)}`; for (const c of order) p.append(el('option', { value: c, textContent: c.toLowerCase().replace(/_/g, ' '), selected: c === value })); return p; };
  const map = o.recolor || {}, put = (fn) => { commit(() => { const m = { ...o.recolor }; fn(m); if (Object.keys(m).length) o.recolor = m; else delete o.recolor; }); inspect(); };
  for (const [from, to] of Object.entries(map)) {
    const rename = (f) => put((m) => { const out = {}; for (const [a, b] of Object.entries(m)) out[a === from ? f : a] = b; for (const k of Object.keys(m)) delete m[k]; Object.assign(m, out); });
    box.append(field('', el('span', { className: 'nums' }, pick(from, rename), el('span', { textContent: '→' }), pick(to, (t) => put((m) => { m[from] = t; })), el('button', { textContent: '✕', title: 'Not swapped', onclick: () => put((m) => { delete m[from]; }) }))));
  }
  const free = has.find((c) => !(c in map));
  box.append(el('button', { textContent: '+ Swap a color', disabled: !free, onclick: () => put((m) => { m[free] = free; }) }));
}
// the far side, as the cat has it: a far leg (a pixel forward, a little thinner, a tenth later in its stride, half a
// stride in the crawl: posed in every move as its near one is, to tune from there), a far ear where an ear stands up (on along the head, a little lower)
const FAR_EAR = [2.5, 0.6], FAR_LEG = [1, 0];
const round3 = (v) => +v.toFixed(3);
const by = (q, d) => [round3(q[0] + d[0]), round3(q[1] + d[1])];
const farName = (n, list) => { const f = /Near/.test(n) ? n.replace('Near', 'Far') : `${n}Far`; return list[f] ? null : f; };
function after(o, at, name, v) { const out = {}; for (const k in o) { out[k] = o[k]; if (k === at) out[name] = v; } for (const k of Object.keys(o)) delete o[k]; Object.assign(o, out); }
function eachPose(fn) { for (const [name, m] of Object.entries(build.moves || {})) { fn(m, name); for (const k of m.keys || []) fn(k, name); } } // (a gait's own pose, and each key of a clip)
function farSide(box) {
  if (view.move !== 'edit') return;
  if (sel.type === 'leg') {
    const n = sel.name, L = build.legs[n], f = !L.far && farName(n, build.legs), twin = Object.values(build.legs).some((o) => o !== L && o.far && o.on === L.on);
    if (!f || twin) return;
    box.append(el('div', { className: 'group' }, el('span', { textContent: 'Far side' })), el('button', { textContent: `+ Far leg (${f})`, title: 'A leg behind this one, as the cat has them: a pixel forward, a little thinner, in every move', onclick: () => {
      commit(() => {
        after(build.legs, n, f, { ...JSON.parse(JSON.stringify(L)), at: by(L.at, FAR_LEG), r: round3(Math.max(0.3, L.r - 0.1)), far: true });
        eachPose((p, move) => {
          for (const part of ['paws', 'roots']) if (p[part]?.[n]) after(p[part], n, f, by(p[part][n], FAR_LEG));
          const g = p.gait?.legs?.[n];
          if (g) after(p.gait.legs, n, f, Array.isArray(g) ? [round3((g[0] + (move === 'duck' ? 0.5 : 0.1)) % 1), g[1]] : JSON.parse(JSON.stringify(g)));
        });
        sel = { type: 'leg', name: f };
      });
      refresh();
    } }));
  } else {
    const n = sel.name, c = build.chains[n], ears = Object.values(build.chains).filter((o) => o.ear && o.on === c.on), f = c.ear && ears.length === 1 && farName(n, build.chains);
    if (!f) return;
    box.append(el('div', { className: 'group' }, el('span', { textContent: 'Far side' })), el('button', { textContent: `+ Far ear (${f})`, title: 'The other ear, behind this one, as the squirrel has it: on along the head, a little lower, in every move', onclick: () => {
      commit(() => {
        after(build.chains, n, f, { ...JSON.parse(JSON.stringify(c)), ear: c.ear.map((q) => by(q, FAR_EAR)), tip: by(c.tip, FAR_EAR) });
        eachPose((p) => { const t = p.chains?.[n]; if (t) after(p.chains, n, f, { ...t, ...(t.tip && { tip: by(t.tip, FAR_EAR) }) }); });
        sel = { type: 'chain', name: f };
      });
      refresh();
    } }));
  }
}

// ---------------------------------------------------------------------------------------------- the face's frames
// its eye's and its mouth's pictures, drawn pixel by pixel (see FACE_FRAMES in art.js): a frame picked, drawn on a grid
// over the animal's own pixels around it (faded), its anchor (the face's point) in the middle; what is drawn goes into
// its file (as the usual one again: gone from it). The stage shows the frame on the animal as it is drawn
const faceEdit = { part: 'eye', name: 'open', ink: 'x' };
const CELLS = 9, MID = 4, CELL = 22;
const frameNames = (part) => [...new Set([...Object.keys(FACE_FRAMES[part]), ...Object.keys(build.face?.frames?.[part] || {})])];
const frameNow = (part = faceEdit.part, name = faceEdit.name) => build.face?.frames?.[part]?.[name] || FACE_FRAMES[part][name] || { at: [0, 0], rows: ['.'] };
const ownFrame = (part, name) => !!build.face?.frames?.[part]?.[name];
// a frame on the grid (CELLS × CELLS of ink characters, its anchor on the middle), and back (trimmed to what is drawn)
function toCells(f) {
  const cells = Array.from({ length: CELLS }, () => Array(CELLS).fill('.'));
  f.rows.forEach((row, r) => [...row].forEach((ch, c) => { const x = MID - f.at[0] + c, y = MID - f.at[1] + r; if (x >= 0 && y >= 0 && x < CELLS && y < CELLS) cells[y][x] = ch; }));
  return cells;
}
function fromCells(cells) {
  let x0 = CELLS, y0 = CELLS, x1 = -1, y1 = -1;
  cells.forEach((row, y) => row.forEach((ch, x) => { if (ch !== '.') { x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); } }));
  if (x1 < 0) return { at: [0, 0], rows: ['.'] }; // (nothing: none drawn)
  return { at: [MID - x0, MID - y0], rows: cells.slice(y0, y1 + 1).map((row) => row.slice(x0, x1 + 1).join('')) };
}
function setFrame(part, name, f) { // (f: null, gone)
  const face = build.face, usual = FACE_FRAMES[part][name];
  if (!f || (usual && JSON.stringify(f) === JSON.stringify(usual))) delete face.frames?.[part]?.[name];
  else ((face.frames ||= {})[part] ||= {})[name] = f;
  if (face.frames?.[part] && !Object.keys(face.frames[part]).length) delete face.frames[part];
  if (face.frames && !Object.keys(face.frames).length) delete face.frames;
}
const inkColor = (ch) => PALETTES.day[NAMED[FACE_INKS[ch]]];
function faceFrames(box) {
  const face = build.face, { part } = faceEdit;
  if (!frameNames(part).includes(faceEdit.name)) faceEdit.name = part === 'eye' ? 'open' : 'shut';
  const redo = () => { inspect(); draw(); };
  box.append(el('div', { className: 'group' }, el('span', { textContent: 'Frames' })));
  const parts = el('span', { className: 'modes' });
  for (const p of ['eye', 'mouth']) parts.append(el('button', { textContent: p, className: p === part ? 'on' : '', onclick: () => { faceEdit.part = p; faceEdit.name = p === 'eye' ? 'open' : 'shut'; redo(); } }));
  box.append(field('part', parts));
  if (part === 'mouth' && !face.mouth) {
    box.append(el('p', { className: 'note', textContent: 'It has no mouth: none is drawn.' }),
      el('button', { textContent: '+ Add a mouth', onclick: () => { commit(() => { const n = face.nose || face.eye; face.mouth = [+(n[0] - 0.5).toFixed(3), +(n[1] + 2).toFixed(3)]; }); redo(); } }));
    return;
  }
  // the frames, each small; the one picked
  const strip = el('div', { className: 'faceStrip' });
  for (const n of frameNames(part)) {
    const c = el('canvas', { width: 28, height: 28 }), ctx = c.getContext('2d'), f = frameNow(part, n);
    ctx.fillStyle = PALETTES.day.bg; ctx.fillRect(0, 0, 28, 28);
    f.rows.forEach((row, r) => [...row].forEach((ch, x) => { if (ch !== '.') { ctx.fillStyle = inkColor(ch); ctx.fillRect((MID - f.at[0] + x - 1) * 4, (MID - f.at[1] + r - 1) * 4, 4, 4); } }));
    strip.append(el('button', { className: `${n === faceEdit.name ? 'on' : ''}${ownFrame(part, n) ? ' own' : ''}`, title: ownFrame(part, n) ? `${n}: its own` : `${n}: the usual`, onclick: () => { faceEdit.name = n; redo(); } }, c, el('span', { textContent: n })));
  }
  box.append(strip);
  // the grid: the animal's pixels around it (faded), the frame, its anchor
  const grid = el('canvas', { className: 'faceGrid', width: CELLS * CELL, height: CELLS * CELL, title: 'Draw with the ink picked; right-click: erase' });
  const paint = () => {
    const ctx = grid.getContext('2d'), sp = animal(kind, 'hurt', 0, { look: { eye: '-', mouth: '-' } }), at = sp.faceAt?.[part], px = sp.look(), cells = toCells(frameNow());
    ctx.fillStyle = PALETTES.day.bg; ctx.fillRect(0, 0, grid.width, grid.height);
    for (let y = 0; y < CELLS; y++) for (let x = 0; x < CELLS; x++) {
      const X = at ? at[0] + x - MID : -1, Y = at ? at[1] + y - MID : -1, k = X >= 0 && Y >= 0 && X < sp.w && Y < sp.h ? px[Y * sp.w + X] : 0;
      if (k) { ctx.globalAlpha = 0.45; ctx.fillStyle = colorOf(PALETTES.day, k); ctx.fillRect(x * CELL, y * CELL, CELL, CELL); ctx.globalAlpha = 1; }
      if (cells[y][x] !== '.') { ctx.fillStyle = inkColor(cells[y][x]); ctx.fillRect(x * CELL, y * CELL, CELL, CELL); }
    }
    ctx.fillStyle = 'rgba(128,128,128,0.25)';
    for (let i = 1; i < CELLS; i++) { ctx.fillRect(i * CELL, 0, 1, grid.height); ctx.fillRect(0, i * CELL, grid.width, 1); }
    ctx.strokeStyle = css('--sel'); ctx.lineWidth = 2; ctx.strokeRect(MID * CELL + 1, MID * CELL + 1, CELL - 2, CELL - 2); // (the anchor: on the face's point)
  };
  let drawing = null;
  const cellAt = (e) => { const r = grid.getBoundingClientRect(); return [Math.floor(((e.clientX - r.left) / r.width) * CELLS), Math.floor(((e.clientY - r.top) / r.height) * CELLS)]; };
  const put = (e) => {
    const [x, y] = cellAt(e);
    if (x < 0 || y < 0 || x >= CELLS || y >= CELLS || drawing.cells[y][x] === drawing.ink) return;
    drawing.cells[y][x] = drawing.ink;
    setFrame(part, faceEdit.name, fromCells(drawing.cells)); changed(); paint();
  };
  grid.oncontextmenu = (e) => e.preventDefault();
  grid.onpointerdown = (e) => { remember(); drawing = { cells: toCells(frameNow()), ink: e.button === 2 ? '.' : faceEdit.ink }; put(e); try { grid.setPointerCapture(e.pointerId); } catch { /* (no such pointer) */ } };
  grid.onpointermove = (e) => { if (drawing) put(e); };
  grid.onpointerup = () => { if (!drawing) return; drawing = null; const h = hist(); if (h.past[h.past.length - 1] === snapshot()) h.past.pop(); redo(); status(); };
  paint();
  box.append(grid);
  // the inks, and what can be done with the frame
  const inks = el('div', { className: 'keys' });
  for (const ch of [...Object.keys(FACE_INKS), '.']) inks.append(el('button', { className: `ink${ch === faceEdit.ink ? ' on' : ''}`, title: ch === '.' ? 'erase' : FACE_INKS[ch].toLowerCase(), style: ch === '.' ? '' : `background:${inkColor(ch)}`, textContent: ch === '.' ? '⌫' : '', onclick: () => { faceEdit.ink = ch; redo(); } }));
  box.append(inks);
  const acts = el('div', { className: 'keys' }), name = faceEdit.name, usual = !!FACE_FRAMES[part][name];
  acts.append(el('button', { textContent: '↺ usual', title: 'The usual frame, as every animal has it', disabled: !usual || !ownFrame(part, name), onclick: () => { commit(() => setFrame(part, name, FACE_FRAMES[part][name])); redo(); } }));
  acts.append(el('button', { textContent: '+ New', title: 'A new frame, a copy of this one (a key can show it)', onclick: () => {
    const n = prompt('A name for the new frame', `${name}2`)?.trim();
    if (!n || frameNames(part).includes(n) || !/^[\w-]+$/.test(n)) return;
    commit(() => setFrame(part, n, JSON.parse(JSON.stringify(frameNow())))); faceEdit.name = n; redo();
  } }));
  acts.append(el('button', { textContent: '✕', title: 'Delete this frame (only one of its own, not a usual one)', disabled: usual, onclick: () => { commit(() => setFrame(part, name, null)); faceEdit.name = part === 'eye' ? 'open' : 'shut'; redo(); } }));
  if (part === 'mouth') acts.append(el('button', { textContent: 'No mouth', title: 'No mouth drawn (its frames stay)', onclick: () => { commit(() => { delete face.mouth; }); redo(); } }));
  box.append(acts, el('p', { className: 'note', textContent: `${usual ? (ownFrame(part, name) ? 'Its own, in its file.' : 'The usual one, as every animal has it: drawing makes it its own.') : 'One of its own.'} In Animate a key picks which frame shows.` }));
}

// ------------------------------------------------------------------------------------------------------------ Play
// how it is handled (see HANDLING in art.js, play.js): each number, from to, what it does; what its file doesn't set is
// as HANDLING has it (a number set back to that: gone from the file)
const HANDLED = {
  held: ['Carried', { at: 'where the hand holds it, from the middle of its back', sag: [0, 3, 'how much its hips and head droop'], tip: [0, 4, 'how much moving it tips it'],
    hang: [2, 40, 'how far under the hand it seems to hang: longer, slower swings'], settle: [0, 12, 'how fast its swinging dies down'], most: [0.1, 1.5, 'the most it tips, radians'] }],
  squirm: ['Squirming', { fits: [0, 6, 'how quick its fits come'], strength: [0, 4, 'how hard it squirms'], paddle: [0, 4, 'how much its legs paddle'], nod: [0, 0.5, 'how much its head nods'] }],
  dropped: ['Dropped', { righting: [50, 2000, 'how hard it rights itself as it falls'], damping: [0, 120, 'how little that wobbles'], squash: [0, 0.8, 'how flat it lands'],
    squashFor: [0.05, 0.6, 'for how long, seconds'] }],
  petted: ['Petted', { lean: [0, 0.3, 'how far it leans with the hand, radians'], duck: [0, 3, 'how far its head ducks into the hand'], nuzzle: [0, 0.6, 'how far its head turns down'],
    ears: [0, 3, 'how far its ears lie back'], wag: [0, 1.5, 'how far its tail wags, radians'], wagRate: [2, 40, 'how fast'], happy: [0, 1, 'how much it must like it to shut its eyes happily'] }],
  fed: ['Fed', { stretch: [0, 6, 'how far its head stretches for a treat'], upright: [0, 1.6, 'how far up it turns for one held high, radians'],
    rears: [0, 1, 'how far up on its hind legs it gets for one'], chews: [1, 8, 'nods as it eats', true], nod: [0, 10, 'how big'], chewFor: [0.2, 3, 'for how long, seconds'] }],
};
const CHAIN = { stiffness: [0, 3000, 'how hard it springs back'], damping: [0, 80, 'how little it rings'], weight: [0, 300, 'how much it hangs down'] };
const stepOf = (min, max) => 10 ** Math.floor(Math.log10((max - min) / 100));
const handled = (g, k) => build.handling?.[g]?.[k] ?? HANDLING[g][k];
function setHandling(g, k, v) {
  const h = (build.handling ||= {}), o = (h[g] ||= {});
  if (JSON.stringify(v) === JSON.stringify(HANDLING[g][k])) delete o[k]; else o[k] = v;
  if (!Object.keys(o).length) delete h[g];
  if (!Object.keys(h).length) delete build.handling;
}
function inspectPlay(box) {
  box.append(el('h2', { textContent: `Handling the ${ANIMALS[kind].name.toLowerCase()}` }));
  if (skin) box.append(el('p', { className: 'note', textContent: `A skin of the ${base}: handled as the ${base} is (changing it changes both).` }));
  const own = (g, k) => build.handling?.[g]?.[k] !== undefined;
  for (const [g, [title, specs]] of Object.entries(HANDLED)) {
    const head = el('div', { className: `group${build.handling?.[g] ? ' own' : ''}` }, el('span', { textContent: title }));
    if (build.handling?.[g]) head.append(el('button', { textContent: '↺ usual', title: `${title}: as every animal is (as art.js has it)`, onclick: () => { commit(() => { delete build.handling[g]; if (!Object.keys(build.handling).length) delete build.handling; }); inspect(); } }));
    box.append(head);
    for (const [k, spec] of Object.entries(specs)) {
      let input, note = spec[2], f = null;
      const set = (x) => { setHandling(g, k, x); f?.classList.toggle('own', own(g, k)); }; // (marked as set in its file, or not, as it changes)
      if (k === 'at') {
        const now = () => handled(g, k).slice();
        input = el('span', { className: 'nums' }, ...handled(g, k).map((v, j) => numIn(v, (x) => { const q = now(); q[j] = x; set(q); }, { span: 3 })));
        note = spec;
      } else if (k === 'rears') {
        const auto = handled(g, k) === null, legs = el('input', { type: 'checkbox', checked: auto, onchange: () => { commit(() => setHandling(g, k, legs.checked ? null : 0.5)); inspect(); } });
        input = el('span', { className: 'num' }, el('label', {}, legs, ' by its legs'), ...(auto ? [] : [numIn(handled(g, k), set, { min: 0, max: 1, step: 0.01 })]));
      } else {
        const [min, max, , whole] = spec;
        input = numIn(handled(g, k), set, whole ? { step: 1, min, max, whole: true } : { min, max, step: stepOf(min, max) });
      }
      f = field(k, input, note);
      if (own(g, k)) f.classList.add('own');
      box.append(f);
    }
  }
  if (!build.chains || !Object.keys(build.chains).length) return;
  box.append(el('div', { className: 'group' }, el('span', { textContent: 'Ears and tails' })));
  for (const [n, c] of Object.entries(build.chains)) {
    box.append(el('div', { className: 'note', style: 'margin-top:6px', textContent: `${n}${c.ear ? ' (an ear)' : ''}` }));
    for (const [k, [min, max, note]] of Object.entries(CHAIN)) box.append(field(k, numIn(c[k] ?? 0, (x) => { c[k] = x; }, { min, max: Math.max(max, (c[k] || 0) * 2), step: stepOf(min, max) }), note));
  }
  box.append(el('p', { className: 'note', textContent: 'Orange: set in its file; the rest as every animal is. They are tried on the stage at once, and in the preview below.' }));
}
// what can be done on the stage, in Play
function playHelp(box) {
  const tips = [['Pick it up', 'press on it and pull up; carry it about'], ['Drop it', 'let go, high or low'], ['Pet it', 'press and rub sideways along its back'],
    ['Make it duck', 'press it down'], ['Feed it', 'take the treat over it and hold it out; let go at its mouth (or drop it)'], ['A hop', 'double-click it']];
  for (const [t, d] of tips) box.append(el('div', { className: 'row', style: 'cursor:default;display:block' }, el('b', { textContent: t }), el('div', { className: 'note', textContent: d })));
  box.append(el('p', { className: 'note', style: 'padding:6px 10px', textContent: 'As the home screen does it, by the game’s own code; the row of animals and the treats it has are left out.' }));
}
$('slow').onchange = () => { sandbox.play.slow = $('slow').checked; };
$('replay').onclick = () => sandbox.reset(kind);

// ----------------------------------------------------------------------------------------- the preview: the game's scene
const pv = { phase: 0, alt: 0, vAlt: 0, body: {}, t: 0, scroll: 0, wait: 0.6, cacti: [] };
{ let seed = 7; const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647); for (let i = 0; i < 3; i++) pv.cacti.push({ x: 140 + i * 110, s: cactus(rnd, i === 1) }); }
let last = 0;
function tick(now) {
  const dt = Math.min(0.05, (now - last) / 1000 || 0.016); last = now;
  if (kind && view.mode === 'play') { sandbox.step(dt); draw(); }
  if (kind) { stepPlay(dt); stepPreview(dt); drawPreview(); }
  requestAnimationFrame(tick);
}
function stepPreview(dt) {
  const act = $('act').value, t = ANIMALS[kind], moving = ['run', 'jump', 'duck'].includes(act), speed = moving ? +$('speed').value : 0;
  pv.t += dt; pv.scroll += speed * dt;
  pv.phase = (pv.phase + dt * strides(kind, speed, act === 'duck' ? 1 : undefined)) % 1;
  if (act === 'jump') {
    if (pv.alt > 0 || pv.vAlt > 0) { pv.vAlt -= GRAVITY * t.gravity * dt; pv.alt = Math.max(0, pv.alt + pv.vAlt * dt); if (!pv.alt) { pv.vAlt = 0; pv.wait = 0.5; } }
    else if ((pv.wait -= dt) < 0) pv.vAlt = JUMP * t.jump;
  } else { pv.alt = 0; pv.vAlt = 0; }
  const [pose, frame, lift] = pvPose(act);
  moveBody(pv.body, kind, pose, frame, 30, GROUND - FOOT - pv.alt - lift, speed, dt);
}
function pvPose(act) {
  if (act === 'jump' && pv.alt > 0) return ['jump', jumpFrame(kind, pv.vAlt / (JUMP * ANIMALS[kind].jump)), 0];
  if (act === 'run' || act === 'jump') { const s = stride(kind, pv.phase); return ['run', s.frame, s.lift]; }
  if (act === 'duck') return ['duck', stride(kind, pv.phase, 'duck').frame, 0];
  if (act === 'idle') return ['idle', idleFrame(kind, pv.t), 0];
  return [act, 0, 0];
}
function drawPreview() {
  const c = $('preview'), K = 3, ctx = c.getContext('2d');
  if (c.width !== W * K) { c.width = W * K; c.height = H * K; }
  ctx.setTransform(K, 0, 0, K, 0, 0); ctx.imageSmoothingEnabled = false;
  const light = $('light').value, base = PALETTES[light === 'night' ? 'night' : 'day'], pal = light === 'golden' ? golden(base) : base;
  ctx.fillStyle = base.bg; ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = base[COLOR.FAINT];
  const from = Math.floor(pv.scroll * 0.08);
  for (let x = 0; x <= W; x++) { const h = hill(x + from); ctx.fillRect(x, Math.round(GROUND - h), 1, Math.round(h)); }
  ctx.fillStyle = base[COLOR.INK]; ctx.fillRect(0, GROUND, W, 1);
  for (const k of pv.cacti) { const x = ((k.x - pv.scroll) % 330 + 330) % 330 - 30; k.s.draw(ctx, Math.round(x), GROUND - k.s.h + 1, base); }
  const act = $('act').value, [pose, frame, lift] = pvPose(act), s = $('giant').checked ? 2 : 1;
  const sp = animal(kind, pose, frame, { blink: pv.t % 3.2 < 0.12, body: pv.body, scale: s }), y = GROUND - FOOT - pv.alt - lift;
  sp.draw(ctx, 30 - 4 * (s - 1), Math.round(y + FOOT * (1 - s)), pal);
}

// --------------------------------------------------------------------------------------------------------- start
// the panels, folded away or not (as they were left: kept in this browser); the inspector folds sideways
const FOLDED = 'lophop.editor.folded';
let folded = []; try { folded = JSON.parse(localStorage.getItem(FOLDED)) || []; } catch { /* (none kept) */ }
const sideways = () => document.querySelector('main').classList.toggle('rightFolded', $('inspectorCard').classList.contains('collapsed'));
for (const t of document.querySelectorAll('.card > .title')) {
  const card = t.parentElement;
  card.classList.toggle('collapsed', folded.includes(card.id));
  t.onclick = () => {
    card.classList.toggle('collapsed'); sideways();
    folded = [...document.querySelectorAll('.card.collapsed')].map((c) => c.id);
    try { localStorage.setItem(FOLDED, JSON.stringify(folded)); } catch { /* (not kept) */ }
  };
}
sideways();
// the animal (one made from no other) and its skin (default: itself; or one made from it, its colors swapped); each
// list's last: a new one (an animal: a copy of the one shown, skin and all; a skin: of it, colors as they are)
function fillKinds() {
  const a = $('kind'), sk = $('skin');
  a.textContent = sk.textContent = '';
  for (const k of KINDS.filter((o) => !files[o].of)) a.append(el('option', { value: k, textContent: `${ANIMALS[k].name.toLowerCase()}${inGame(k) ? '' : ' (not in the game)'}` }));
  a.append(el('option', { value: '+', textContent: '+ new animal from this…' }));
  sk.append(el('option', { value: base, textContent: 'default' }));
  for (const k of skinsOf(base)) sk.append(el('option', { value: k, textContent: `${k}${inGame(k) ? '' : ' (not in the game)'}` }));
  sk.append(el('option', { value: '+', textContent: '+ new skin…' }));
  a.value = base; sk.value = kind;
}
const named = (what) => { // (a name for a new one: lower case letters, not taken)
  const n = prompt(`A name for the new ${what} (lower case letters)`)?.trim().toLowerCase();
  if (!n) return null;
  if (!/^[a-z]+$/.test(n) || files[n]) { alert(files[n] ? `There is a ${n} already.` : 'Only the letters a to z.'); return null; }
  return n;
};
function create(k, b, of) {
  files[k] = { format: 2, name: k, ...(of && { of }) }; builds[k] = b; saved[k] = null; KINDS.push(k);
  ANIMALS[k] = { ...ANIMALS[of || base], name: k.toUpperCase() };
  setRig(k, rigFor(k));
  choose(k); status();
}
$('kind').onchange = () => {
  if ($('kind').value !== '+') { choose($('kind').value); return; }
  const n = named('animal');
  if (!n) { fillKinds(); return; }
  const b = JSON.parse(JSON.stringify(build));
  if (skin?.recolor) b.recolor = { ...b.recolor, ...skin.recolor }; // (the skin shown: its colors its own)
  create(n, b);
};
$('skin').onchange = () => {
  if ($('skin').value !== '+') { choose($('skin').value); return; }
  const n = named('skin');
  if (n) create(n, { recolor: {} }, base); else fillKinds();
};
$('undo').onclick = undo; $('redo').onclick = redo; $('save').onclick = save;
$('revert').onclick = () => { remember(); restore(JSON.stringify({ build: saved[base] ? JSON.parse(saved[base]) : build, skin: skin && saved[kind] ? JSON.parse(saved[kind]) : skin })); };
document.addEventListener('keydown', (e) => {
  const typing = /INPUT|SELECT|TEXTAREA/.test(document.activeElement?.tagName);
  const cmd = e.metaKey || e.ctrlKey;
  if (cmd && e.key.toLowerCase() === 'z' && !typing) { e.preventDefault(); e.shiftKey ? redo() : undo(); }
  else if (cmd && e.key.toLowerCase() === 's') { e.preventDefault(); save(); }
  else if (!typing && (e.key === 'Delete' || e.key === 'Backspace') && sel.type === 'item') { e.preventDefault(); itemDo('delete'); }
  else if (view.mode === 'play') return;
  else if (!typing && e.key === 'Escape') { sel = { type: view.move === 'edit' ? 'rig' : 'frame' }; listParts(); inspect(); draw(); }
  else if (!typing && e.key === ' ' && view.mode === 'animate') { e.preventDefault(); $('play').click(); }
  else if (!typing && (e.key === 'ArrowLeft' || e.key === 'ArrowRight') && view.move !== 'edit') { // a frame back or on
    e.preventDefault(); setPlay(false);
    const n = frames(view.move); view.frame = (view.frame + (e.key === 'ArrowLeft' ? n - 1 : 1)) % n; place(); listParts(); inspect(); draw();
  }
});
window.addEventListener('beforeunload', (e) => { if (KINDS.some((k) => builds[k] && dirty(k))) e.preventDefault(); });
new ResizeObserver(() => kind && draw()).observe($('stageBox')); // (the window, or the timeline under it, changing)

// every file in assets/ (as the dev server lists them; without it, the game's), the game's first; one not in the game
// yet is given what the game knows of the one it is made from
const listed = await fetch('/assets.json').then((r) => r.json()).catch(() => Object.keys(GAME_ANIMALS));
for (const k of [...Object.keys(GAME_ANIMALS), ...listed.filter((k) => !(k in GAME_ANIMALS)).sort()]) {
  files[k] = (await import(`../assets/${k}.js`)).default;
  builds[k] = JSON.parse(JSON.stringify(toBuild(files[k]))); // (its own copy: the game's stays as loaded till it is made again)
  saved[k] = JSON.stringify(builds[k]);
  KINDS.push(k);
}
for (const k of KINDS) if (!ANIMALS[k]) { ANIMALS[k] = { ...ANIMALS[baseOf(k)] || ANIMALS.cat, name: k.toUpperCase() }; setRig(k, rigFor(k)); }
const asked = new URLSearchParams(location.search).get('animal');
await choose(KINDS.includes(asked) ? asked : 'cat');
setMode(['setup', 'animate', 'play'].includes(new URLSearchParams(location.search).get('mode')) ? new URLSearchParams(location.search).get('mode') : 'setup');
requestAnimationFrame(tick);
