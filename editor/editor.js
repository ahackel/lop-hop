// The editor (npm run dev, then /editor). It edits an animal's build, the data between the
// `// @build` and `// @end` lines of animals/<kind>.js: handles on the joints, the shapes, the legs' roots, the chains and
// the face, drawn over the animal's own pixels; a list of its parts and an inspector for the one picked; a preview in
// the game's scene. Its moves on a timeline: keyframes set by hand (handles on the joints, paws, head, tail and ears of
// a frame), a gait's settings, a loop to look at; the frames before and after faded (onion skin). After every change the
// animal is made again from its build (its make) and drawn by the game's own code; Save writes the build back into its
// file (POST /save, see serve.mjs and rig-format.js).
import { ANIMALS, PALETTES, COLOR, FOOT, GROUND, W, H, animal, setRig, rigParts, moveBody, stride, strides, idleFrame, jumpFrame, golden, cactus, hill,
  JUMP, GRAVITY, setStyle, colorOf } from '../art.js';

const { toWorld, toLocal, sdShape, NAMED } = rigParts;
const KINDS = Object.keys(ANIMALS);
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

const mods = {}, saved = {}, histories = {}, assets = new Set();
const fileOf = (k) => (assets.has(k) ? `assets/${k}.js` : `animals/${k}.js`); // (one with an asset is saved into it: see asset.js)
let kind, mod, build, made, P, G = [1, [0, 0]], sel = { type: 'rig' }, drag = null;
const view = { move: 'edit', frame: 0, play: false, t: 0 };

// ------------------------------------------------------------------------------------------------- the animal, edited
const editable = () => !!build.joints; // (the wolf is the fox, recolored)
const hist = () => (histories[kind] ||= { past: [], future: [] });
const snapshot = () => JSON.stringify(build);
const dirty = (k) => JSON.stringify(mods[k].build) !== saved[k];

// made again from its build: drawn anew, and the frames its parts are placed in (standing: the pose the build's handles
// edit; a move's frame: the one its handles edit)
function rebuild() {
  made = mod.make(build);
  setRig(kind, made);
  if (kind === 'fox') setRig('wolf', mods.wolf.make(mods.wolf.build));
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
  for (const k of Object.keys(build)) delete build[k];
  Object.assign(build, JSON.parse(json));
  changed(); refresh();
}
function undo() { const h = hist(); if (h.past.length) { h.future.push(snapshot()); restore(h.past.pop()); } }
function redo() { const h = hist(); if (h.future.length) { h.past.push(snapshot()); restore(h.future.pop()); } }

function choose(k) {
  kind = k; mod = mods[k]; build = mod.build; sel = { type: 'rig' };
  pv.body = {};
  $('kind').value = k;
  const url = new URL(location.href); url.searchParams.set('animal', k); window.history.replaceState(null, '', url);
  fillMoves(); rebuild(); refresh(); status();
}

function status() {
  const s = $('status'), others = KINDS.filter((k) => k !== kind && dirty(k));
  s.className = dirty(kind) || others.length ? 'dirty' : '';
  s.textContent = (dirty(kind) ? `unsaved changes in ${fileOf(kind)}` : fileOf(kind)) + (others.length ? ` · also unsaved: ${others.join(', ')}` : '');
  $('undo').disabled = !hist().past.length; $('redo').disabled = !hist().future.length;
  $('revert').disabled = $('save').disabled = !dirty(kind);
}

async function save() {
  const res = await fetch('/save', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ kind, build }) }).catch(() => null);
  if (res?.ok) { saved[kind] = snapshot(); status(); $('status').textContent = await res.text(); }
  else { $('status').className = 'dirty'; $('status').textContent = `not saved: ${res ? await res.text() : 'is the dev server running? (npm run dev)'}`; }
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
  if (view.move !== 'edit') return kindOf(view.move) === 'keys' ? poseParts() : out;
  const list = (name, label, color) => (build[name] || []).forEach((s, i) => {
    const bits = shapeBits(s);
    out.push({ sel: { type: 'item', list: name, i }, group: label, label: s.name || geomOf(s), color: color(s), obj: s, ...bits });
  });
  out.push({ sel: { type: 'rig' }, group: 'Animal', label: 'the animal', color: swatch(build.fur), obj: build, handles: [], lines: [] });
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
    out.push({ sel: { type: 'face' }, group: 'Face', label: 'eye and nose', color: swatch(face.noseColor || 'OUT'), obj: face, lines: [],
      handles: ['eye', 'nose'].filter((k) => face[k]).map((k) => ({ at: world(f, face[k]), anchor: k === 'eye', set: (p) => { face[k] = roundAll(local(f, p)); } })) });
  }
  return out;
}
// a keyframe's parts: its joints (the head with its turn), each paw, each tail's angle and ear's tip. Each writes into the
// frame only what it changes; the rest is the build's
function poseParts() {
  const K = frameKey(), out = [], F = P.F, turnAt = world(F.head, [5, 0]);
  out.push({ sel: { type: 'frame' }, group: 'Frame', label: `frame ${view.frame + 1} of ${keys().length}`, obj: K, handles: [], lines: [] });
  for (const n of ['hip', 'chest', 'head']) {
    const handles = [{ at: P.J[n], anchor: true, joint: true, set: (p) => { (K.joints ||= {})[n] = roundAll(p); } }];
    if (n === 'head') handles.push({ at: turnAt, size: true, set: (p) => { const d = minus(p, P.J.head), a = +Math.atan2(d[1], d[0]).toFixed(2); if (a) K.headAngle = a; else delete K.headAngle; } });
    out.push({ sel: { type: 'joint', name: n }, group: 'Joints', label: n === 'head' ? 'head (the ring: its turn)' : n, obj: K, lines: n === 'head' ? [[P.J.head, turnAt]] : [], handles });
  }
  for (const n in build.legs) {
    out.push({ sel: { type: 'paw', name: n }, group: 'Paws', label: n, color: swatch(build.fur), obj: K, lines: [],
      handles: [{ at: P.p.paws[n], anchor: true, set: (p) => { (K.paws ||= {})[n] = roundAll(p); } }] });
  }
  for (const n in build.chains) {
    const c = rigParts.chainRest(kind, P, n), f = F[c.on], tip = plus(c.root, times(c.dir, c.length)), own = () => ((K.chains ||= {})[n] ||= {});
    const handles = [{ at: tip, anchor: true, set: c.ear ? (p) => { own().tip = roundAll(local(f, p)); }
      : (p) => { const d = minus(p, c.root); own().angle = +(f.a - Math.atan2(d[0], -d[1])).toFixed(3); } }];
    out.push({ sel: { type: 'chain', name: n }, group: 'Tails and ears', label: n, color: swatch(build.chains[n].color || build.fur), obj: K, handles,
      lines: [c.ear ? [c.base[0], tip, c.base[1]] : [c.root, tip]] });
  }
  return out;
}
const same = (a, b) => a.type === b.type && a.list === b.list && a.i === b.i && a.name === b.name;
const current = () => parts().find((p) => same(p.sel, sel));

// --------------------------------------------------------------------------------------------------------- the stage
const toScreen = ([x, y]) => { const [g, [dx, dy]] = G; return [(x * g + dx - X0) * Z, (y * g + dy - Y0) * Z]; };
const toArt = (e) => { const r = $('stage').getBoundingClientRect(), k = $('stage').width / r.width, [g, [dx, dy]] = G; return [((e.clientX - r.left) * k / Z + X0 - dx) / g, ((e.clientY - r.top) * k / Z + Y0 - dy) / g]; };
const editing = () => editable() && (view.move === 'edit' || kindOf(view.move) === 'keys'); // (handles: the build's, or a keyframe's)

function sprite() { return view.move === 'edit' ? animal(kind, 'hurt', 0) : animal(kind, view.move, view.frame); }

function draw() {
  const c = $('stage'), ctx = c.getContext('2d');
  const box = $('stageBox'); // (as big as fits in what the window leaves it)
  Z = Math.max(4, Math.floor(Math.min(box.clientWidth / VW, box.clientHeight / VH))) || 16;
  if (c.width !== VW * Z) { c.width = VW * Z; c.height = VH * Z; c.style.width = `${VW * Z}px`; c.style.height = `${VH * Z}px`; }
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
  drawSprites(s);
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

// the frame as the game shows it (1×), magnified (3×), and giant (drawn 2×)
function drawSprites(s) {
  const box = $('sprites'), pal = PALETTES.day;
  if (!box.children.length) for (const t of ['1×', '3×', 'giant']) box.append(el('div', {}, el('canvas'), el('div', { className: 'note', textContent: t })));
  const big = view.move === 'edit' ? animal(kind, 'hurt', 0, { scale: 2 }) : animal(kind, view.move, view.frame, { scale: 2 });
  [[s, 1], [s, 3], [big, 1]].forEach(([sp, k], i) => {
    const c = box.children[i].firstChild;
    c.width = sp.w; c.height = sp.h; c.style.width = `${sp.w * k}px`; c.style.height = `${sp.h * k}px`;
    const ctx = c.getContext('2d'); ctx.clearRect(0, 0, c.width, c.height); sp.draw(ctx, -(sp.ox || 0), -(sp.oy || 0), pal);
  });
}

// pick and drag: a handle of the picked part, a joint or another part's handle, or (a click) the part under the pointer
$('stage').addEventListener('pointerdown', (e) => {
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
  if (!drag) return;
  step = e.shiftKey ? 0.5 : 0.1;
  const q = parts().find((x) => same(x.sel, drag.sel));
  q?.handles[drag.index]?.set(toArt(e));
  changed();
});
$('stage').addEventListener('pointerup', () => {
  if (!drag) return;
  drag = null; step = 0.1;
  const h = hist();
  if (h.past[h.past.length - 1] === snapshot()) h.past.pop(); // (a click, no change)
  listParts(); inspect(); status();
});

// --------------------------------------------------------------------------------------------- the lists of parts
// two lists, as Spine has them: the bones (a tree: the animal at its root, hip, chest and head down the spine, each
// joint's legs and chains under it) and the shapes hung on them, by layer in the order they are drawn, each with its bone
const BONES = ['Animal', 'Frame', 'Joints', 'Legs', 'Chains', 'Paws', 'Tails and ears'];
const ADD = { 'Body shapes': 'shapes', Paint: 'paint', 'On top': 'top', Dots: 'dots' };
const DRAWN = ['Body shapes', 'Paint', 'Spikes', 'On top', 'Dots', 'Face']; // (as drawRig in art.js draws them)
function listParts() {
  const bones = $('bones'), shapes = $('shapes'), note = (box, text) => box.append(el('p', { className: 'note', style: 'padding:0 10px', textContent: text }));
  bones.textContent = shapes.textContent = '';
  if (!editable()) { note(bones, `The ${kind} is the fox, recolored.`); return; }
  if (view.move !== 'edit' && kindOf(view.move) !== 'keys') { note(bones, ABOUT[kindOf(view.move)]); return; }
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
  if (view.move !== 'edit') { note(shapes, 'Shapes are set in the build: pick “standing (the build)”.'); return; }
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
  if (!editable()) { box.append(el('p', { className: 'note', textContent: 'The wolf is made from the fox: its shapes are the fox’s, its colors swapped. Edit the fox.' })); return; }
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
  if (sel.type === 'rig') { box.append(el('p', { className: 'note', textContent: 'Pick a part in the list or on the stage. The animal itself:' })); }
  const skip = sel.type === 'rig' ? ['joints', 'shapes', 'paint', 'top', 'dots', 'legs', 'chains', 'face', 'spikes', 'moves'] : sel.list === 'top' ? ['shapes'] : [];
  fields(o, box, skip);
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
      input = k === 'triangle' ? el('div', {}, ...v.map((_, i) => nums(v, i))) : nums(o, k);
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
const num = (o, k) => { const i = el('input', { type: 'number', step: 0.1, value: o[k] }); i.onchange = () => commit(() => { o[k] = +i.value; }); return i; };
const nums = (o, k) => el('span', { className: 'nums' }, ...o[k].map((_, j) => num(o[k], j)));
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
// what a move is: keyframes set by hand (in the build's moves: their handles edit them), keyframes the animal's make
// works out (to set by hand), a gait (worked out from its settings: to tune), a loop (worked out in code: to look at)
const MOVES = ['run', 'jump', 'duck', 'idle', 'hurt', 'ko'];
const moveOf = (name) => rigParts.move(kind, name) || rigParts.move(kind, 'run');
const kindOf = (name) => (Array.isArray(build.moves?.[name]) ? 'keys' : Array.isArray(moveOf(name)) ? 'worked' : moveOf(name).gait ? 'gait' : 'loop');
const keys = () => build.moves[view.move];
const frameKey = () => keys()[view.frame];
function frames(name) { const m = moveOf(name); return Array.isArray(m) ? m.length : m.gait ? m.gait.frames : m.frames; }
const ABOUT = {
  keys: 'Keyframes set by hand: drag the joints, paws, head, tail and ears of the frame.',
  worked: 'Keyframes worked out from the build: they follow its edits. Set them by hand to drag them.',
  gait: 'A gait: each frame worked out from where it is in the stride, by the settings in the inspector.',
  loop: 'A loop worked out in code (its make, in the animal’s file): to look at.',
};
// in the game: which of a move's frames show when
const GAME = {
  run: 'In the game: frame after frame as it runs.', duck: 'In the game: frame after frame as it crawls.',
  jump: 'In the game: spread over the jump, the first as it takes off, the last as it falls fastest.',
  idle: 'In the game: on the title, sitting.', hurt: 'In the game: the first, as it is hit.', ko: 'In the game: the first, knocked out.',
};
// a gait's settings, what each does
const GAIT = {
  frames: 'poses in a stride', rate: 'strides, of the usual', stance: 'of a stride, a paw on the ground', reach: 'how far a paw sweeps',
  lift: 'how high a paw swings', bob: 'how much the body bobs', beat: 'bobs in a stride', head: 'how much the head follows the chest',
  ground: 'the paws’ row', land: 'of a leap, on the ground', height: 'how high a leap goes', stretch: 'the hip back, in the air',
  gather: 'the hip forward, on the ground', crouch: 'how low it crouches', pitch: 'the nose up rising, down falling',
};

function fillMoves() {
  const s = $('move'); s.textContent = '';
  s.append(el('option', { value: 'edit', textContent: editable() ? 'standing (the build)' : 'standing' }));
  for (const m of MOVES) s.append(el('option', { value: m, textContent: m }));
  s.value = view.move = 'edit'; view.frame = 0; setPlay(false);
}
function show(move, frame = 0) {
  view.move = move; view.frame = frame; $('move').value = move;
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

// the strip of frames (a long loop: a slider), what can be done with them, what the move is
let strip = [];
function timeline() {
  const box = $('timeline'); box.textContent = ''; strip = [];
  if (view.move === 'edit') { box.append(el('span', { className: 'note', textContent: 'The build: what every move is made from. Pick a move to see its frames.' })); return; }
  const n = frames(view.move), what = kindOf(view.move), can = editable();
  if (n > 16) {
    const r = el('input', { type: 'range', min: 0, max: n - 1, value: view.frame });
    r.oninput = () => { setPlay(false); view.frame = +r.value; draw(); };
    box.append(r, el('span', { className: 'frameNo' }));
    strip = [r];
  } else {
    const row = el('div', { className: 'frames' });
    for (let i = 0; i < n; i++) {
      const b = el('button', { title: `Frame ${i + 1}`, onclick: () => { setPlay(false); view.frame = i; place(); if (what === 'keys') { listParts(); inspect(); } draw(); } }, el('canvas', { width: 42, height: 26 }), el('span', { textContent: i + 1 }));
      row.append(b); strip.push(b);
    }
    box.append(row);
  }
  const act = (t, tip, fn, off) => box.append(el('button', { textContent: t, title: tip, disabled: !!off, onclick: fn }));
  if (can && what === 'keys') {
    act('← Earlier', 'This frame earlier in the move', () => keyDo('move', -1), view.frame === 0);
    act('Later →', 'This frame later in the move', () => keyDo('move', 1), view.frame === n - 1);
    act('⧉ Copy frame', 'A copy of this frame after it', () => keyDo('copy'));
    act('✕ Frame', 'Delete this frame', () => keyDo('delete'), n < 2);
    act('Back to worked out', 'Forget the frames set by hand: the move as the animal’s make works it out', () => commit(() => dropMove()));
  }
  if (can && what === 'worked') act('Set by hand', 'Copy the worked-out frames into the build, to drag their handles', byHand);
  if (can && what === 'gait' && build.moves?.[view.move]) act('Back to worked out', 'Forget the settings changed here', () => commit(() => dropMove()));
  box.append(el('span', { className: 'note', textContent: `${ABOUT[what]} ${GAME[view.move] || ''}` }));
  markFrames();
}
// the frames in the strip drawn (as they are now), the one shown marked
function markFrames() {
  if (view.move === 'edit' || !strip.length) return;
  if (strip[0].type === 'range') { strip[0].value = view.frame; strip[0].nextSibling.textContent = `${view.frame + 1} / ${frames(view.move)}`; return; }
  strip.forEach((b, i) => {
    b.className = i === view.frame ? 'on' : '';
    const c = b.firstChild, ctx = c.getContext('2d');
    ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.fillStyle = PALETTES.day.bg; ctx.fillRect(0, 0, c.width, c.height);
    ctx.fillStyle = PALETTES.day[COLOR.FAINT]; ctx.fillRect(0, 6 + FOOT, c.width, 1);
    animal(kind, view.move, i).draw(ctx, 8, 6, PALETTES.day);
  });
}

// playing the move, as fast as the game would (a gait: at the preview's speed)
function setPlay(on) { view.play = on; view.t = 0; $('play').textContent = on ? '❚❚ Stop' : '▶ Play'; }
$('play').onclick = () => { if (view.move === 'edit') show('run'); setPlay(!view.play); draw(); };
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

// keyframes: one earlier or later, copied, gone; all of them set by hand (from the worked-out ones) or forgotten
function keyDo(what, d) {
  commit(() => {
    const k = keys(), i = view.frame;
    if (what === 'move') { [k[i], k[i + d]] = [k[i + d], k[i]]; view.frame = i + d; }
    else if (what === 'copy') { k.splice(i + 1, 0, JSON.parse(JSON.stringify(k[i]))); view.frame = i + 1; }
    else if (what === 'delete') { k.splice(i, 1); view.frame = Math.max(0, i - 1); }
  });
  refresh();
}
const tidy = (v) => JSON.parse(JSON.stringify(v, (k, x) => (typeof x === 'number' ? +x.toFixed(3) : x)));
function byHand() {
  const n = frames(view.move);
  commit(() => { (build.moves ||= {})[view.move] = [...Array(n).keys()].map((i) => tidy(rigParts.pose(kind, view.move, i))); });
  sel = { type: 'frame' }; refresh();
}
function dropMove() {
  delete build.moves[view.move];
  if (!Object.keys(build.moves).length) delete build.moves;
  sel = { type: 'frame' }; view.frame = 0; setTimeout(refresh);
}

// the inspector for a move: a keyframe's part (or the frame), a gait's settings, or what the move is
function inspectMove(box) {
  const what = kindOf(view.move);
  if (what === 'gait') { inspectGait(box); return; }
  if (what !== 'keys') { box.append(el('h2', { textContent: view.move }), el('p', { className: 'note', textContent: ABOUT[what] })); return; }
  const K = frameKey(), p = current() || poseParts()[0];
  box.append(el('h2', {}, el('span', { textContent: p.label })));
  const vec = (label, now, put, note) => {
    const ins = now.map((v, j) => { const i = el('input', { type: 'number', step: 0.1, value: +v.toFixed(3) }); i.onchange = () => commit(() => { const q = now.slice(); q[j] = +i.value; put(q); }); return i; });
    box.append(field(label, el('span', { className: 'nums' }, ...ins), note));
  };
  const one = (label, now, put, step = 0.1, note) => { const i = el('input', { type: 'number', step, value: +(+now).toFixed(3) }); i.onchange = () => commit(() => put(+i.value)); box.append(field(label, i, note)); };
  const own = (has, label) => (has ? `${label}: this frame’s own` : 'the build’s');
  if (sel.type === 'joint') {
    const n = sel.name;
    vec('place', P.J[n], (q) => { (K.joints ||= {})[n] = q; }, own(K.joints?.[n], 'set'));
    if (n === 'head') one('turn', K.headAngle || 0, (v) => { if (v) K.headAngle = v; else delete K.headAngle; }, 0.05, 'radians, + down');
  } else if (sel.type === 'paw') vec('place', P.p.paws[sel.name], (q) => { (K.paws ||= {})[sel.name] = q; });
  else if (sel.type === 'chain') {
    const n = sel.name, c = { ...build.chains[n], ...K.chains?.[n] };
    if (c.ear) vec('tip', c.tip, (q) => { ((K.chains ||= {})[n] ||= {}).tip = q; }, own(K.chains?.[n]?.tip, 'set'));
    else {
      one('angle', c.angle, (v) => { ((K.chains ||= {})[n] ||= {}).angle = v; }, 0.05, own(K.chains?.[n]?.angle !== undefined, 'set'));
      one('curl', c.curl || 0, (v) => { ((K.chains ||= {})[n] ||= {}).curl = v; }, 0.05);
    }
    if (K.chains?.[n]) box.append(el('button', { textContent: 'As the build has it', onclick: () => commit(() => { delete K.chains[n]; if (!Object.keys(K.chains).length) delete K.chains; }) }));
  } else {
    const t = { ...build.torso, ...K.torso };
    one('head turn', K.headAngle || 0, (v) => { if (v) K.headAngle = v; else delete K.headAngle; }, 0.05, 'radians, + down');
    if (build.torso.r || K.torso) {
      one('torso r', t.r, (v) => { K.torso = { ...K.torso, r: v }; });
      one('torso ends', t.ends, (v) => { K.torso = { ...K.torso, ends: v }; });
    }
    const flip = el('input', { type: 'checkbox', checked: !!K.flip, onchange: () => commit(() => { if (flip.checked) K.flip = true; else delete K.flip; }) });
    box.append(field('on its back', flip));
    fields(K, box, ['joints', 'paws', 'chains', 'headAngle', 'torso', 'flip']);
    box.append(el('p', { className: 'note', textContent: 'Pick a joint, a paw, a tail or an ear on the stage or in the list.' }));
  }
}
// a gait's settings: each one changed here goes into the build's moves (marked), over what the animal's make works out
function inspectGait(box) {
  const g = moveOf(view.move).gait, mine = () => (((build.moves ||= {})[view.move] ||= {}).gait ||= {}), own = build.moves?.[view.move]?.gait || {};
  box.append(el('h2', { textContent: `${view.move}: ${g.leap ? 'a leap' : 'a gait'}` }));
  for (const k of Object.keys(g)) {
    if (typeof g[k] !== 'number') continue;
    const i = el('input', { type: 'number', step: k === 'frames' ? 1 : 0.05, min: k === 'frames' ? 2 : undefined, value: +g[k].toFixed(3) });
    i.onchange = () => { commit(() => { mine()[k] = k === 'frames' ? Math.max(2, Math.round(+i.value)) : +i.value; }); inspect(); };
    const f = field(k, i, GAIT[k]); if (k in own) f.classList.add('own');
    box.append(f);
  }
  box.append(el('div', { className: 'group', textContent: g.leap ? 'legs: down [touches, leaves] · at [touches, leaves] · air [x, y]' : 'legs: [when in the stride, where its sweep is]' }));
  for (const n in g.legs) {
    const L = g.legs[n], set = (v) => { commit(() => { (mine().legs ||= {})[n] = v; }); inspect(); };
    const mk = (arr, put) => arr.map((v, j) => { const i = el('input', { type: 'number', step: 0.05, value: +v.toFixed(3) }); i.onchange = () => { const q = arr.slice(); q[j] = +i.value; put(q); }; return i; });
    const ins = Array.isArray(L) ? mk(L, set) : ['down', 'at', 'air'].flatMap((k) => mk(L[k], (q) => set({ ...L, [k]: q })));
    const f = field(n, el('span', { className: 'nums' }, ...ins)); if (own.legs?.[n]) f.classList.add('own');
    box.append(f);
  }
  box.append(el('p', { className: 'note', textContent: 'Settings changed here (marked) are kept in the build; the rest are worked out by the animal’s make.' }));
}

// ----------------------------------------------------------------------------------------- the preview: the game's scene
const pv = { phase: 0, alt: 0, vAlt: 0, body: {}, t: 0, scroll: 0, wait: 0.6, cacti: [] };
{ let seed = 7; const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647); for (let i = 0; i < 3; i++) pv.cacti.push({ x: 140 + i * 110, s: cactus(rnd, i === 1) }); }
let last = 0;
function tick(now) {
  const dt = Math.min(0.05, (now - last) / 1000 || 0.016); last = now;
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
$('kind').onchange = () => choose($('kind').value);
$('undo').onclick = undo; $('redo').onclick = redo; $('save').onclick = save;
$('revert').onclick = () => { remember(); restore(saved[kind]); };
document.addEventListener('keydown', (e) => {
  const typing = /INPUT|SELECT|TEXTAREA/.test(document.activeElement?.tagName);
  const cmd = e.metaKey || e.ctrlKey;
  if (cmd && e.key.toLowerCase() === 'z' && !typing) { e.preventDefault(); e.shiftKey ? redo() : undo(); }
  else if (cmd && e.key.toLowerCase() === 's') { e.preventDefault(); save(); }
  else if (!typing && (e.key === 'Delete' || e.key === 'Backspace') && sel.type === 'item') { e.preventDefault(); itemDo('delete'); }
  else if (!typing && e.key === 'Escape') { sel = { type: view.move === 'edit' ? 'rig' : 'frame' }; listParts(); inspect(); draw(); }
  else if (!typing && e.key === ' ') { e.preventDefault(); $('play').click(); }
  else if (!typing && (e.key === 'ArrowLeft' || e.key === 'ArrowRight') && view.move !== 'edit') { // a frame back or on
    e.preventDefault(); setPlay(false);
    const n = frames(view.move); view.frame = (view.frame + (e.key === 'ArrowLeft' ? n - 1 : 1)) % n; place(); listParts(); inspect(); draw();
  }
});
window.addEventListener('beforeunload', (e) => { if (KINDS.some((k) => mods[k] && dirty(k))) e.preventDefault(); });
new ResizeObserver(() => kind && draw()).observe($('stageBox')); // (the window, or the timeline under it, changing)

for (const k of KINDS) {
  mods[k] = await import(`../animals/${k}.js`);
  saved[k] = JSON.stringify(mods[k].build);
  if (mods[k].asset) assets.add(k); // (its build from its asset)
  $('kind').append(el('option', { value: k, textContent: ANIMALS[k].name.toLowerCase() }));
}
const asked = new URLSearchParams(location.search).get('animal');
await choose(KINDS.includes(asked) ? asked : 'cat');
requestAnimationFrame(tick);
