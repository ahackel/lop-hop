// The editor (npm run dev, then /editor). It edits an animal's build, its file assets/<kind>.js (see asset.js): handles
// on the joints, the shapes, the legs' roots, the chains and the face, drawn over the animal's own pixels; a list of its parts and an inspector for the one picked; a preview in
// the game's scene. Its moves on a timeline: keyframes set by hand (handles on the joints, paws, head, tail and ears of
// a frame), a gait's settings, a loop to look at; the frames before and after faded (onion skin). After every change the
// animal is made again from its build (as the game makes it) and drawn by the game's own code; Save writes the build back into its
// file (POST /save, see serve.mjs and rig-format.js). Three modes: Setup (the build), Animate (its moves), Play (handled
// as on the home screen, see play.js: its handling's numbers, its chains' physics). And Game: the game's own, for every
// animal (its palette, assets/palette.js).
import { ANIMALS, PALETTES, COLOR, FOOT, GROUND, W, H, animal, setRig, rigParts, moveBody, stride, strides, idleFrame, jumpFrame, golden, cactus, hill,
  JUMP, GRAVITY, setStyle, colorOf, rigOf, HANDLING, FACE_FRAMES, FACE_INKS, setPalette, rgb, FOOD, rock, log, bush, sunflower, toadstool, pine, stump, boulders,
  spire, tumbleweed, snowman, ice, star, heart } from '../art.js';
import paletteFile from '../assets/palette.js';
import { toBuild, toAsset } from '../asset.js';
import * as sandbox from './play.js';

const GAME_ANIMALS = { ...ANIMALS }; // (the game's animals: the others are made here, see the end)

const { toWorld, toLocal, sdShape, NAMED, reach, restPoints } = rigParts;
const KINDS = []; // (every animal with a file: the game's, and any made here, not in the game yet)
// the game's palette (assets/palette.js) as edited: a color by its name (outline: the one role painted with)
const palette = JSON.parse(JSON.stringify(paletteFile));
let savedPalette = JSON.stringify(palette);
const paints = () => ['outline', ...Object.keys(palette.colors)];
const nice = (c) => (c ? c.replace(/[A-Z]/g, (m) => ` ${m.toLowerCase()}`) : 'none'); // (lightGrey: light grey)
const paletteDirty = () => JSON.stringify(palette) !== savedPalette;
const COLOR_KEYS = ['color', 'fur', 'tipColor', 'noseColor', 'socks'];
const GEOMS = ['ellipse', 'capsule', 'box', 'triangle'];
const LAYERS = { shapes: 'body', paint: 'paint', top: 'on top' };
const $ = (id) => document.getElementById(id);
const el = (tag, props = {}, ...kids) => { const e = Object.assign(document.createElement(tag), props); e.append(...kids); return e; };
const css = (name) => getComputedStyle(document.documentElement).getPropertyValue(name).trim();
const swatch = (name) => PALETTES.day[NAMED[name]] || 'transparent';
// the icons on the buttons (24 × 24, drawn in lines in the text's color)
const ICONS = {
  undo: '<path d="M9 14 4 9l5-5"/><path d="M4 9h10.5a5.5 5.5 0 0 1 0 11H11"/>',
  redo: '<path d="m15 14 5-5-5-5"/><path d="M20 9H9.5a5.5 5.5 0 0 0 0 11H13"/>',
  revert: '<path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/>',
  save: '<path d="M15.2 3a2 2 0 0 1 1.4.6l3.8 3.8a2 2 0 0 1 .6 1.4V19a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z"/><path d="M17 21v-7a1 1 0 0 0-1-1H8a1 1 0 0 0-1 1v7"/><path d="M7 3v4a1 1 0 0 0 1 1h7"/>',
  keyboard: '<rect x="2" y="6" width="20" height="12" rx="2"/><path d="M6 10h.01M10 10h.01M14 10h.01M18 10h.01M7 14h10"/>',
  play: '<path d="M7 4.5v15l12.5-7.5z" fill="currentColor"/>',
  pause: '<rect x="6" y="4.5" width="4" height="15" rx="1" fill="currentColor"/><rect x="14" y="4.5" width="4" height="15" rx="1" fill="currentColor"/>',
  up: '<path d="m5 12 7-7 7 7"/><path d="M12 19V5"/>',
  down: '<path d="M12 5v14"/><path d="m19 12-7 7-7-7"/>',
  copy: '<rect x="8" y="8" width="14" height="14" rx="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/>',
  paste: '<rect x="8" y="2" width="8" height="4" rx="1"/><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/>',
  trash: '<path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2"/>',
  x: '<path d="M18 6 6 18M6 6l12 12"/>',
  plus: '<path d="M5 12h14"/><path d="M12 5v14"/>',
  pivot: '<circle cx="12" cy="12" r="3"/><path d="M12 2v5M12 17v5M2 12h5M17 12h5"/>',
  key: '<path d="M12 3.5 20.5 12 12 20.5 3.5 12z" fill="currentColor"/>',
  unkey: '<path d="M12 3.5 20.5 12 12 20.5 3.5 12z"/><path d="m4 20 16-16"/>',
  eye: '<path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7-10-7-10-7z"/><circle cx="12" cy="12" r="3"/>',
  eyeOff: '<path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7-10-7-10-7z"/><path d="m4 20 16-16"/>',
};
const svg = (name) => `<svg class="i" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[name]}</svg>`;
// a button with an icon: its text beside it, or none (what it does: its title, its tooltip)
function iconBtn(name, text, props = {}) {
  const b = el('button', { ...props, innerHTML: svg(name) });
  b.classList.add(text ? 'withIcon' : 'icon');
  if (text) b.append(el('span', { textContent: text })); else b.setAttribute('aria-label', props.title || name);
  return b;
}
for (const b of document.querySelectorAll('button[data-icon]')) { // (the page's own: data-icon, their text kept beside it)
  const text = b.textContent.trim();
  b.innerHTML = svg(b.dataset.icon); b.classList.add(text ? 'withIcon' : 'icon');
  if (text) b.append(el('span', { textContent: text })); else b.setAttribute('aria-label', b.title);
}

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
const hist = () => (histories[view.mode === 'game' ? '' : kind] ||= { past: [], future: [] }); // (Game: one of its own)
const snapshot = () => JSON.stringify(view.mode === 'game' ? palette : { build, skin });
const dirty = (k) => JSON.stringify(builds[k]) !== saved[k];
const touched = () => [base, ...(skin ? [kind] : [])].filter(dirty); // (the files the one shown is made from, changed)

// made again from its build, as the game makes it (rigOf): drawn anew, and the frames its parts are placed in (standing:
// the pose the build's handles edit; a move's frame: the one its handles edit). One another is made from (the fox: the
// wolf's) makes that one again too
const assetOf = (k) => toAsset(k, builds[k], files[k]);
const rigFor = (k) => shown(rigOf(assetOf(k), files[k].of && assetOf(files[k].of)));
// what is hidden (its row's eye: the editor's only, never saved) left out of what is drawn: a shape, a marking, the torso
const hidden = new Set();
const keyOf = (s) => [s.type, s.list, s.i, s.j, s.name].filter((x) => x !== undefined).join(':');
function shown(rig) {
  if (!hidden.size) return rig;
  const r = { ...rig };
  for (const list of ['shapes', 'paint', 'dots']) if (r[list]) r[list] = r[list].filter((_, i) => !hidden.has(`item:${list}:${i}`));
  if (r.top) r.top = r.top.map((t, i) => (hidden.has(`item:top:${i}`) ? null : { ...t, shapes: t.shapes.filter((_, j) => !hidden.has(`item:top:${i}:${j}`)) })).filter((t) => t?.shapes.length); // (a group, or shapes in it)
  if (hidden.has('torso')) r.torso = { ...r.torso, r: 0 };
  if (hidden.has('spikes')) delete r.spikes;
  return r;
}
// a list's items moved about (to: where the one at i is now, -1: gone): what is hidden goes with them
function rehide(list, to) {
  const was = [...hidden].filter((k) => k.startsWith(`item:${list}:`));
  for (const k of was) hidden.delete(k);
  for (const k of was) { const [, , i, ...rest] = k.split(':'), j = to(+i); if (j >= 0) hidden.add(['item', list, j, ...rest].join(':')); }
}
function hide(s) { const k = keyOf(s); if (!hidden.delete(k)) hidden.add(k); rebuild(); listParts(); draw(); }
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
function changed() { if (view.mode === 'game') { setPalette(palette); draw(); listParts(); status(); return; } rebuild(); draw(); status(); }
function refresh() { listParts(); inspect(); timeline(); draw(); }
function commit(fn) { remember(); fn(); changed(); timeline(); }
function remember() { const h = hist(); h.past.push(snapshot()); if (h.past.length > 300) h.past.shift(); h.future = []; }
function restore(json) {
  const was = JSON.parse(json), into = (o, v) => { for (const k of Object.keys(o)) delete o[k]; Object.assign(o, v); };
  if (view.mode === 'game') { into(palette, was); setPalette(palette); refresh(); status(); return; }
  into(build, was.build);
  if (skin && was.skin) into(skin, was.skin);
  changed(); refresh();
}
function undo() { const h = hist(); if (h.past.length) { h.future.push(snapshot()); restore(h.past.pop()); } }
function redo() { const h = hist(); if (h.future.length) { h.past.push(snapshot()); restore(h.future.pop()); } }

function choose(k) {
  if (baseOf(k) !== base) hidden.clear();
  kind = k; base = baseOf(k); build = builds[base]; skin = k === base ? null : builds[k]; sel = { type: view.move === 'edit' ? 'rig' : 'frame' };
  pv.body = {};
  fillKinds();
  const url = new URL(location.href); url.searchParams.set('animal', k); window.history.replaceState(null, '', url);
  fillMoves(); rebuild(); sandbox.reset(k); refresh(); status();
}
// the mode: Setup (the build: what every move is made from), Animate (a move), Play (see play.js); Game (the game's own)
function setMode(m) {
  view.mode = m; document.body.className = m;
  for (const b of $('modes').children) b.classList.toggle('on', b.dataset.mode === m);
  $('gameMode').classList.toggle('on', m === 'game');
  setPlay(false);
  if (m === 'game') { view.move = 'edit'; cast = castOf(); place(); refresh(); status(); return; }
  if (m === 'play') { view.move = 'edit'; sandbox.reset(kind); sel = { type: 'rig' }; place(); refresh(); status(); return; }
  show(m === 'setup' ? 'edit' : animated());
  status();
}
const animated = () => (rigParts.move(kind, lastMove) ? lastMove : rigParts.moves(kind)[0]);
for (const b of $('modes').children) b.onclick = () => setMode(b.dataset.mode);

function status() {
  if (view.mode === 'game') {
    const d = paletteDirty(), s = $('status');
    s.className = d ? 'dirty' : ''; s.textContent = d ? 'unsaved changes in assets/palette.js' : 'assets/palette.js';
    $('undo').disabled = !hist().past.length; $('redo').disabled = !hist().future.length; $('revert').disabled = $('save').disabled = !d;
    return;
  }
  const s = $('status'), mine = touched(), others = KINDS.filter((k) => k !== kind && k !== base && dirty(k)), files = [base, ...(skin ? [kind] : [])].map(fileOf).join(' + ');
  s.className = mine.length || others.length ? 'dirty' : '';
  if (paletteDirty()) others.push('the palette');
  s.textContent = (mine.length ? `unsaved changes in ${mine.map(fileOf).join(', ')}` : files) + (inGame(kind) ? '' : ' · not in the game yet') + (others.length ? ` · also unsaved: ${others.join(', ')}` : '');
  $('undo').disabled = !hist().past.length; $('redo').disabled = !hist().future.length;
  $('revert').disabled = !mine.length; $('save').disabled = !mine.length && !paletteDirty();
}

// saved into its files: the base's, the skin's (each only if changed; a new one: its file made); the palette, if changed
async function save() {
  let said = [];
  const post = async (url, body) => {
    const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }).catch(() => null);
    if (!res?.ok) { $('status').className = 'dirty'; $('status').textContent = `not saved: ${res ? await res.text() : 'is the dev server running? (npm run dev)'}`; return false; }
    said.push(await res.text()); return true;
  };
  for (const k of view.mode === 'game' ? [] : touched()) {
    if (!await post('/save', { kind: k, build: builds[k], of: files[k].of })) return;
    saved[k] = JSON.stringify(builds[k]);
  }
  if (paletteDirty()) { if (!await post('/palette', palette)) return; savedPalette = JSON.stringify(palette); }
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
// a group's frame for one of its shapes: its pivot (at) in the shape's joint's frame, turned by its angle (as drawRig)
function groupFrame(t, s) {
  if (!t.at && !t.angle) return frameOf(s.on);
  const b = frameOf(s.on) || { o: [0, 0], a: 0, flip: 1 };
  return { o: world(b, t.at || [0, 0]), a: b.a + (t.angle || 0) * b.flip, flip: b.flip };
}
const turnBy = (v, a) => [v[0] * Math.cos(a) - v[1] * Math.sin(a), v[0] * Math.sin(a) + v[1] * Math.cos(a)];
// a shape moved by d, in its own coordinates
function shiftShape(s, [dx, dy]) {
  const g = geomOf(s), v = s[g], r = (x) => +x.toFixed(3);
  if (g === 'triangle') for (const q of v) { q[0] = r(q[0] + dx); q[1] = r(q[1] + dy); }
  else if (g === 'ellipse') { v[0] = r(v[0] + dx); v[1] = r(v[1] + dy); }
  else { v[0] = r(v[0] + dx); v[1] = r(v[1] + dy); v[2] = r(v[2] + dx); v[3] = r(v[3] + dy); }
}
// a group's pivot put at q, its shapes staying where they are
function repivot(t, q) {
  const at = t.at || [0, 0], d = turnBy(minus(at, q), -(t.angle || 0));
  for (const s of [...t.shapes, ...(t.paint || [])]) shiftShape(s, d);
  t.at = q;
}
// the middle of a group's shapes, in their joint's frame
function middleOf(t) {
  const pts = t.shapes.flatMap((s) => { const g = geomOf(s), v = s[g]; return g === 'triangle' ? v : g === 'ellipse' ? [[v[0], v[1]]] : [[v[0], v[1]], [v[2], v[3]]]; });
  const m = [pts.reduce((a, q) => a + q[0], 0) / pts.length, pts.reduce((a, q) => a + q[1], 0) / pts.length];
  return roundAll(plus(t.at || [0, 0], turnBy(m, t.angle || 0)));
}
let alt = false; // (⌥ held, dragging: see a group's pivot)
// handles and outline of a shape (in its joint's frame)
function shapeBits(s, fr) { // (fr: its frame, if not its joint's: in a group, see groupFrame)
  const f = fr !== undefined ? fr : frameOf(s.on), g = geomOf(s), v = s[g], L = (p) => local(f, p), Wd = (p) => world(f, p);
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
  out.push({ sel: { type: 'rig' }, group: 'Animal', label: 'root', obj: build, handles: [], lines: [] });
  for (const n in build.joints) {
    out.push({ sel: { type: 'joint', name: n }, group: 'Joints', label: n, obj: build.joints, key: n, lines: [],
      handles: [{ at: P.J[n], anchor: true, joint: true, set: (p) => { build.joints[n] = roundAll(p); } }] });
  }
  if (build.torso) { // (along the spine, from the hip to the chest: as drawRig makes it)
    const t = P.torso, len = Math.hypot(P.J.chest[0] - P.J.hip[0], P.J.chest[1] - P.J.hip[1]);
    const bits = shapeBits(t.capsule ? { on: 'spine', capsule: [-t.ends, 0, len + t.ends, 0, Math.max(t.r, 0.01)] } : { on: 'spine', ellipse: [len / 2, 0, len / 2 + t.ends, Math.max(t.r, 0.01)] });
    out.push({ sel: { type: 'torso' }, group: 'Body shapes', label: 'torso', color: swatch(build.fur), obj: build.torso, lines: bits.lines, handles: [], hit: t.r > 0 ? bits.hit : null });
  }
  list('shapes', 'Body shapes', () => swatch(build.fur));
  list('paint', 'Paint', (s) => swatch(s.color));
  // a group on top: its pivot (dragged: all of it moves; with ⌥: the pivot alone) and its turn (the handle on the line
  // out of the pivot), then its shapes, each a part of its own
  (build.top || []).forEach((t, i) => {
    const b = frameOf(t.shapes[0]?.on), kids = t.shapes.map((s) => shapeBits(s, groupFrame(t, s))), at = t.at || [0, 0], a = t.angle || 0;
    const pivot = world(b, at), turnAt = world(b, plus(at, [Math.cos(a) * 3, Math.sin(a) * 3]));
    out.push({ sel: { type: 'item', list: 'top', i }, group: 'On top', label: t.name || 'group', color: swatch(t.color || build.fur), obj: t,
      handles: [{ at: pivot, anchor: true, move: true, set: (p) => { const q = roundAll(local(b, p)); if (alt) repivot(t, q); else t.at = q; } },
        { at: turnAt, size: true, set: (p) => { const q = minus(local(b, p), at); t.angle = +Math.atan2(q[1], q[0]).toFixed(3); } }],
      lines: [...kids.flatMap((k) => k.lines), [pivot, turnAt]], hit: (p) => kids.some((k) => k.hit(p)) });
    t.shapes.forEach((s, j) => out.push({ sel: { type: 'item', list: 'top', i, j }, group: 'On top', label: s.name || geomOf(s), color: swatch(t.color || build.fur), obj: s, depth: 1, ...kids[j] }));
  });
  (build.dots || []).forEach((d, i) => {
    const f = frameOf(d.on);
    out.push({ sel: { type: 'item', list: 'dots', i }, group: 'Dots', label: d.name || 'dot', color: swatch(d.color || 'outline'), obj: d, lines: [],
      handles: [{ at: world(f, d.at), anchor: true, set: (p) => { d.at = roundAll(local(f, p)); } }] });
  });
  if (build.spikes) out.push({ sel: { type: 'spikes' }, group: 'Spikes', label: 'where the spikes are', obj: build.spikes, ...shapeBits(build.spikes), hit: null });
  for (const n in build.legs) {
    const L = build.legs[n], f = frameOf(L.on);
    out.push({ sel: { type: 'leg', name: n }, group: 'Legs', label: n, obj: L, lines: [],
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
    out.push({ sel: { type: 'chain', name: n }, group: 'Chains', label: n, obj: c, handles, lines });
  }
  if (build.face) {
    const f = P.F.head, face = build.face;
    out.push({ sel: { type: 'face' }, group: 'Face', label: 'face', color: swatch(face.noseColor || 'outline'), obj: face, lines: [],
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
    out.push({ sel: { type: 'paw', name: l }, group: 'Paws', label: l, obj: null, lines: [],
      handles: [{ at: P.p.paws[l], anchor: true, set: (p) => setKey(`paws.${l}`, roundAll(p)) }] });
  }
  for (const c in build.chains) {
    const r = rigParts.chainRest(kind, P, c), f = F[r.on], tip = plus(r.root, times(r.dir, r.length));
    const handles = [{ at: tip, anchor: true, set: r.ear ? (p) => setKey(`chains.${c}.tip`, roundAll(local(f, p)))
      : (p) => { const d = minus(p, r.root); setKey(`chains.${c}.angle`, +(f.a - Math.atan2(d[0], -d[1])).toFixed(3)); } }];
    out.push({ sel: { type: 'chain', name: c }, group: 'Tails and ears', label: c, obj: null, handles,
      lines: [r.ear ? [r.base[0], tip, r.base[1]] : [r.root, tip]] });
  }
  return out;
}
const same = (a, b) => a.type === b.type && a.list === b.list && a.i === b.i && a.j === b.j && a.name === b.name; // (j: a shape in a group)
const current = () => parts().find((p) => same(p.sel, sel));

// --------------------------------------------------------------------------------------------------------- the stage
const toScreen = ([x, y]) => { const [g, [dx, dy]] = G; return [(x * g + dx - X0) * Z, (y * g + dy - Y0) * Z]; };
const toArt = (e) => { const r = $('stage').getBoundingClientRect(), k = $('stage').width / r.width, [g, [dx, dy]] = G; return [((e.clientX - r.left) * k / Z + X0 - dx) / g, ((e.clientY - r.top) * k / Z + Y0 - dy) / g]; };
const editing = () => editable() && (view.move === 'edit' || kindOf(view.move) === 'clip'); // (handles: the build's, or a clip's at the frame shown)

// (the build: standing, its face as the frames being drawn have it, else open and shut)
const setupLook = () => ({ eye: faceEdit.part === 'eye' ? faceEdit.name : 'open', mouth: faceEdit.part === 'mouth' ? faceEdit.name : 'shut' });
// (screen pixels: the build drawn Z times finer, a screen pixel a pixel, by the game's own code (as the giant dino is
// drawn bigger); half as fine while a handle is dragged, to keep up)
const fine = () => view.mode === 'setup' && view.move === 'edit' && $('fine').checked;
const fineness = () => (fine() ? (drag ? Math.max(2, Math.round(Z / 2)) : Z) : 1);
function sprite(S = 1) { return view.move === 'edit' ? animal(kind, 'hurt', 0, { look: setupLook(), scale: S }) : animal(kind, view.move, view.frame); }

function draw() {
  const c = $('stage'), ctx = c.getContext('2d');
  const box = $('stageBox'); // (as big as fits in what the window leaves it)
  if (view.mode === 'game') { drawCast(c); return; }
  if (view.mode === 'play') {
    Z = Math.max(2, Math.floor(Math.min(box.clientWidth / sandbox.PW, box.clientHeight / sandbox.PH))) || 8;
    if (c.width !== sandbox.PW * Z || c.height !== sandbox.PH * Z) { c.width = sandbox.PW * Z; c.height = sandbox.PH * Z; c.style.width = `${c.width}px`; c.style.height = `${c.height}px`; }
    sandbox.draw(c, Z);
    return;
  }
  Z = Math.max(4, Math.floor(Math.min(box.clientWidth / VW, box.clientHeight / VH))) || 16;
  if (c.width !== VW * Z || c.height !== VH * Z) { c.width = VW * Z; c.height = VH * Z; c.style.width = `${VW * Z}px`; c.style.height = `${VH * Z}px`; }
  ctx.fillStyle = PALETTES.day.bg; ctx.fillRect(0, 0, c.width, c.height); // (the game's day: its outlines show)
  const grid = (alpha) => {
    ctx.fillStyle = `rgba(128,128,128,${alpha})`;
    for (let x = 1; x < VW; x++) ctx.fillRect(x * Z, 0, 1, c.height);
    for (let y = 1; y < VH; y++) ctx.fillRect(0, y * Z, c.width, 1);
  };
  grid(0.08);
  const pal = PALETTES.day;
  ctx.fillStyle = pal[COLOR.FAINT]; ctx.fillRect(0, (FOOT - Y0) * Z, c.width, Z); // the ground's row
  place();
  const S = fineness(), s = sprite(S), n = view.move === 'edit' ? 1 : frames(view.move);
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
  if (S > 1) { // (an image of it, a pixel a screen pixel; the grid over it: the game's pixels)
    const px = s.look(), img = ctx.createImageData(s.w, s.h), d = img.data, cols = {};
    for (let i = 0; i < px.length; i++) {
      const k = px[i];
      if (!k) continue;
      const q = cols[k] || (cols[k] = rgb(colorOf(pal, k)));
      d[i * 4] = q[0]; d[i * 4 + 1] = q[1]; d[i * 4 + 2] = q[2]; d[i * 4 + 3] = 255;
    }
    const off = el('canvas', { width: s.w, height: s.h });
    off.getContext('2d').putImageData(img, 0, 0);
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(off, (s.ox / S - X0) * Z, (s.oy / S - Y0) * Z, (s.w / S) * Z, (s.h / S) * Z);
    grid(0.16);
  } else pixels(s);
  // the box every animal is placed by (dashed), the frame's own bounds (dotted)
  ctx.lineWidth = 1.5; ctx.setLineDash([6, 4]); ctx.strokeStyle = css('--dim');
  ctx.strokeRect(-X0 * Z, -Y0 * Z, 26 * Z, 20 * Z);
  ctx.setLineDash([2, 3]); ctx.strokeStyle = css('--accent');
  ctx.strokeRect((s.ox / S - X0) * Z, (s.oy / S - Y0) * Z, (s.w / S) * Z, (s.h / S) * Z);
  ctx.setLineDash([]);
  if ($('showBones').checked && editable() && view.mode !== 'play') drawBones(ctx);
  if (editing() && !view.play) drawHandles(ctx);
  markFrames();
}

// the bones as lines, as the pose has them: down the spine (the hip to the chest, the chest to the head, the head's turn),
// each leg (its root to its knee to its paw) and each chain (a tail's links at rest; an ear: its base to its tip), each
// as a long thin diamond from where it starts to where it ends; dashed: from the joint a leg or a chain hangs from to
// its root
function drawBones(ctx) {
  const J = P.J, F = P.F, legs = build.legs || {}, chains = build.chains || {};
  const bone = (a, b) => {
    const [ax, ay] = toScreen(a), [bx, by] = toScreen(b), len = Math.hypot(bx - ax, by - ay);
    if (len < 1) return;
    const ux = (bx - ax) / len, uy = (by - ay) / len, w = Math.min(5, len * 0.12), mx = ax + ux * len * 0.18, my = ay + uy * len * 0.18;
    ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(mx - uy * w, my + ux * w); ctx.lineTo(bx, by); ctx.lineTo(mx + uy * w, my - ux * w); ctx.closePath();
    ctx.fill(); ctx.stroke();
  };
  const hang = (a, b) => { const [ax, ay] = toScreen(a), [bx, by] = toScreen(b); ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(bx, by); ctx.stroke(); };
  ctx.save();
  ctx.lineWidth = 1; ctx.lineJoin = 'round'; ctx.fillStyle = 'rgba(255,255,255,0.55)'; ctx.strokeStyle = 'rgba(40,40,56,0.75)';
  if (J.hip && J.chest) bone(J.hip, J.chest);
  if (J.chest && J.head) bone(J.chest, J.head);
  if (F.head) bone(J.head, toWorld(F.head, [3, 0]));
  const hangs = [];
  for (const n in legs) {
    const L = legs[n], f = F[L.on], root = P.p.roots?.[n] || toWorld(f, L.at), paw = P.p.paws?.[n];
    if (!paw) continue;
    const [knee, end] = reach(root, paw, L.thigh, L.shin, L.bend);
    bone(root, knee); bone(knee, end);
    if (f) hangs.push([f.o, root]);
  }
  for (const n in chains) {
    const r = rigParts.chainRest(kind, P, n), f = F[r.on];
    if (r.ear) bone(r.root, plus(r.root, times(r.dir, r.length)));
    else { const pts = restPoints(r); for (let i = 1; i < pts.length; i++) bone(pts[i - 1], pts[i]); }
    if (f) hangs.push([f.o, r.root]);
  }
  ctx.setLineDash([3, 3]); ctx.strokeStyle = 'rgba(40,40,56,0.45)';
  for (const [a, b] of hangs) hang(a, b);
  ctx.restore();
}

function drawHandles(ctx) {
  const all = parts(), on = current(), accent = css('--sel');
  const dot = (p, r, fill, ring) => { const [x, y] = toScreen(p); ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fillStyle = fill; ctx.fill(); ctx.lineWidth = 1.5; ctx.strokeStyle = ring; ctx.stroke(); };
  if (on) {
    ctx.strokeStyle = accent; ctx.lineWidth = 2;
    for (const line of on.lines) { ctx.beginPath(); line.forEach((p, i) => { const [x, y] = toScreen(p); i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }); ctx.stroke(); }
  }
  for (const p of all) {
    if (p === on || hidden.has(keyOf(p.sel))) continue;
    for (const h of p.handles) if (h.anchor && (h.joint || $('allHandles').checked)) dot(h.at, h.joint ? 6 : 4, h.joint ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.6)', h.joint ? '#333' : 'rgba(60,60,60,0.6)');
  }
  if (on) for (const h of on.handles) dot(h.at, h.joint || h.move ? 6 : 5, h.size ? '#fff' : accent, h.size ? accent : '#fff');
}

// pick and drag: a handle of the picked part, a joint or another part's handle, or (a click) the part under the pointer
const playAt = (e) => { const r = $('stage').getBoundingClientRect(), k = $('stage').width / r.width; return [((e.clientX - r.left) * k) / Z, ((e.clientY - r.top) * k) / Z]; };
const hand = (c) => { $('stage').style.cursor = c || ''; };
$('stage').addEventListener('pointerdown', (e) => {
  if (view.mode === 'game') { const h = castHit(e); if (h) { hue = h.color; listParts(); inspect(); draw(); } return; }
  if (view.mode === 'play') { $('stage').setPointerCapture(e.pointerId); hand(sandbox.down(...playAt(e))); return; }
  if (!editing()) return;
  if (view.play) setPlay(false);
  const p = toArt(e), near = (h) => Math.hypot(...minus(toScreen(h.at), toScreen(p))) < 9;
  const all = parts(), on = current();
  let hit = on?.handles.find(near), owner = on;
  if (!hit) for (const q of all) { if (hidden.has(keyOf(q.sel))) continue; const h = q.handles.find((x) => x.anchor && (x.joint || $('allHandles').checked) && near(x)); if (h) { hit = h; owner = q; break; } }
  if (hit) {
    if (owner !== on) { sel = owner.sel; listParts(); inspect(); }
    remember(); drag = { sel: owner.sel, index: owner.handles.indexOf(hit) };
    $('stage').setPointerCapture(e.pointerId);
    return;
  }
  const picked = [...all].reverse().find((q) => !hidden.has(keyOf(q.sel)) && q.hit?.(p)); // (the one drawn last: on top; not one hidden)
  sel = picked ? picked.sel : { type: 'rig' };
  listParts(); inspect(); draw();
});
$('stage').addEventListener('pointermove', (e) => {
  if (view.mode === 'game') { const h = castHit(e); $('stage').title = h ? `${nice(h.color)} · ${h.thing}` : ''; return; }
  if (view.mode === 'play') { const c = sandbox.move(...playAt(e)); if (c !== null) hand(c); return; }
  if (!drag) return;
  step = e.shiftKey ? 0.5 : 0.1; alt = e.altKey;
  const q = parts().find((x) => same(x.sel, drag.sel));
  q?.handles[drag.index]?.set(toArt(e));
  changed();
});
for (const type of ['pointerup', 'pointercancel']) $('stage').addEventListener(type, () => { if (view.mode === 'play') { sandbox.up(); hand(''); } });
$('stage').addEventListener('pointerup', () => {
  if (!drag) return;
  drag = null; step = 0.1;
  if (fine()) draw(); // (drawn finer, let go: see draw)
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
  if (view.mode === 'game') { bt.textContent = 'Palette'; bt.title = 'The game’s colors: everything is drawn in them'; listPalette(bones); return; }
  bt.textContent = playing ? 'Play' : 'Bones'; bt.title = playing ? 'What to try on the stage' : 'The skeleton: what moves';
  if (view.mode === 'play') { playHelp(bones); note(shapes, 'Shapes are set in Setup.'); return; }
  if (!editable()) { note(bones, `The ${kind} has no bones.`); return; }
  if (view.move !== 'edit' && kindOf(view.move) !== 'clip') { note(bones, ABOUT[kindOf(view.move)]); return; }
  const all = parts(), row = (p, depth, what, eye = false) => {
    const off = hidden.has(keyOf(p.sel));
    const r = el('div', { className: `row${same(p.sel, sel) ? ' on' : ''}${off ? ' hidden' : ''}`, style: `padding-left:${10 + depth * 12}px` },
      ...(p.color ? [el('span', { className: 'sw', style: `background:${p.color}` })] : []), el('span', { textContent: p.label }), el('span', { className: 'what', textContent: what })); // (a bone: no color)
    if (eye) {
      const b = el('button', { className: `eye${off ? ' off' : ''}`, title: off ? 'Hidden: show it (H)' : 'Hide it, here only: not saved (H)', innerHTML: svg(off ? 'eyeOff' : 'eye') });
      b.onclick = (e) => { e.stopPropagation(); hide(p.sel); };
      r.append(b);
    }
    r.onclick = () => { if (same(p.sel, sel)) return; sel = p.sel; listParts(); inspect(); draw(); };
    r.sel = p.sel; // (Tab goes down the rows: see the keys)
    if (p.sel.type === 'item' && view.move === 'edit') draggable(r, p.sel);
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
    if (ADD[label]) h.append(iconBtn('plus', '', { title: `Add to ${label.toLowerCase()}`, onclick: () => add(ADD[label]) }));
    shapes.append(h);
    for (const p of on) {
      if (p.sel.list === 'top' && p.sel.j === undefined) { shapes.append(row(p, 0, `group · ${p.obj.shapes[0]?.on || 'box'}`, true)); continue; }
      if (p.depth) { shapes.append(row(p, p.depth, geomOf(p.obj), true)); continue; }
      const what = p.sel.type === 'torso' ? `${p.obj.capsule ? 'capsule' : 'ellipse'} · spine` : p.obj && geomOf(p.obj) ? `${geomOf(p.obj)}${p.obj.on ? ` · ${p.obj.on}` : ''}` : p.obj?.on || '';
      shapes.append(row(p, 0, what, p.sel.type !== 'face'));
    }
  }
}

// a shape dragged to another place in its list (the order they are drawn in: the list's, back to front), or in its group
let dragged = null;
const together = (a, b) => a.list === b.list && (a.j === undefined) === (b.j === undefined) && (a.j === undefined || a.i === b.i);
function draggable(r, s) {
  r.draggable = true;
  const clear = () => { for (const x of $('shapes').querySelectorAll('.dropBefore, .dropAfter, .dragging')) x.classList.remove('dropBefore', 'dropAfter', 'dragging'); };
  r.ondragstart = (e) => { dragged = s; r.classList.add('dragging'); e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', s.list); };
  r.ondragend = () => { dragged = null; clear(); };
  r.ondragover = (e) => {
    if (!dragged || !together(dragged, s)) return;
    e.preventDefault(); e.dataTransfer.dropEffect = 'move';
    const box = r.getBoundingClientRect(), after = e.clientY > box.top + box.height / 2;
    for (const x of $('shapes').querySelectorAll('.dropBefore, .dropAfter')) if (x !== r) x.classList.remove('dropBefore', 'dropAfter');
    r.classList.toggle('dropAfter', after); r.classList.toggle('dropBefore', !after);
  };
  r.ondragleave = () => r.classList.remove('dropBefore', 'dropAfter');
  r.ondrop = (e) => {
    e.preventDefault();
    const from = dragged, after = r.classList.contains('dropAfter');
    clear(); dragged = null;
    if (from && together(from, s)) reorder(from, s, after);
  };
}
function reorder(from, to, after) {
  const child = from.j !== undefined, arr = child ? build.top[from.i].shapes : build[from.list], a = child ? from.j : from.i;
  let b = (child ? to.j : to.i) + (after ? 1 : 0);
  if (b > a) b--;
  if (a === b) return;
  const order = arr.map((_, k) => k);
  order.splice(b, 0, order.splice(a, 1)[0]);
  if (child) { // (what is hidden goes with them)
    const pre = `item:top:${from.i}:`, was = [...hidden].filter((k) => k.startsWith(pre));
    for (const k of was) hidden.delete(k);
    for (const k of was) hidden.add(pre + order.indexOf(+k.slice(pre.length)));
  } else rehide(from.list, (x) => order.indexOf(x));
  commit(() => { arr.splice(b, 0, arr.splice(a, 1)[0]); sel = child ? { ...from, j: b } : { ...from, i: b }; });
  listParts(); inspect();
}
// a shape renamed (its row double-clicked, or Enter): in place, in its row; a pose that uses it by name (use) still does
function renaming(r, p) {
  const label = r.children[p.color ? 1 : 0], input = el('input', { type: 'text', value: p.obj.name || '', placeholder: p.label, className: 'rename' });
  let done = false;
  const end = (keep) => { if (done) return; done = true; if (keep) rename(p.sel, p.obj, input.value); else listParts(); };
  input.onkeydown = (e) => { e.stopPropagation(); if (e.key === 'Enter') end(true); if (e.key === 'Escape') end(false); };
  input.onblur = () => end(true);
  input.onclick = (e) => e.stopPropagation();
  label.replaceWith(input); input.focus(); input.select();
}
// (on the list, not the row: the click before it draws the list anew; the shape picked by then is the one renamed)
$('shapes').addEventListener('dblclick', (e) => { const r = $('shapes').querySelector('.row.on'), p = current(); if (r && p && sel.type === 'item' && !e.target.closest('.eye, input')) renaming(r, p); });
function rename(s, o, name) {
  const to = name.trim(), was = o.name, list = s.j === undefined ? s.list : null; // (a shape in a group: used by no pose)
  if (to === (was || '')) { listParts(); return; }
  const uses = (m, f) => { if (!m || typeof m !== 'object') return; if (Array.isArray(m[list])) for (const x of m[list]) if (x?.use === was) f(x); for (const v of Object.values(m)) uses(v, f); };
  let used = false;
  if (was && list) uses(build.moves, () => { used = true; });
  if (!to && used) { listParts(); return; } // (a name a pose uses: kept)
  commit(() => { if (to) o.name = to; else delete o.name; if (used) uses(build.moves, (x) => { x.use = to; }); });
  listParts(); inspect();
}
const fresh = (list) => (list === 'dots' ? { name: 'dot', on: 'head', at: [0, 0], color: 'outline' }
  : list === 'top' ? { name: 'group', color: build.fur, shapes: [{ on: 'head', ellipse: [0, -3, 1, 1] }] }
    : { name: list === 'paint' ? 'marking' : 'shape', ...(list === 'paint' ? { color: 'white' } : {}), on: 'spine', ellipse: [2, 0, 2, 1.5] });
function add(list) { commit(() => { (build[list] ||= []).push(fresh(list)); sel = { type: 'item', list, i: build[list].length - 1 }; }); refresh(); }

// moves a list item: up or down (d), copied, gone, or to another layer (body shapes, paint, on top)
function itemDo(what, arg) {
  if (sel.j !== undefined) { childDo(what, arg); return; }
  const { list, i } = sel, arr = build[list];
  commit(() => {
    if (what === 'move') { const j = i + arg; if (j < 0 || j >= arr.length) return; [arr[i], arr[j]] = [arr[j], arr[i]]; sel = { ...sel, i: j }; rehide(list, (x) => (x === i ? j : x === j ? i : x)); }
    else if (what === 'copy') { arr.splice(i + 1, 0, JSON.parse(JSON.stringify(arr[i]))); sel = { ...sel, i: i + 1 }; rehide(list, (x) => (x > i ? x + 1 : x)); }
    else if (what === 'delete') { arr.splice(i, 1); if (!arr.length && list !== 'shapes') delete build[list]; sel = { type: 'rig' }; rehide(list, (x) => (x === i ? -1 : x > i ? x - 1 : x)); }
    else if (what === 'layer' && arg !== list) {
      rehide(list, (x) => (x === i ? -1 : x > i ? x - 1 : x));
      const [s] = arr.splice(i, 1);
      if (!arr.length && list !== 'shapes') delete build[list];
      const flat = list === 'top' ? s.shapes.map((x) => ({ name: s.name, color: s.color, ...x })) : [s];
      const into = (build[arg] ||= []);
      for (const x of flat) {
        if (arg === 'top') { const g = geomOf(x); into.push({ name: x.name, color: x.color || build.fur, shapes: [{ on: x.on, [g]: x[g] }] }); }
        else { const y = { ...x }; if (arg === 'shapes') delete y.color; else y.color ||= 'white'; into.push(y); }
      }
      sel = { type: 'item', list: arg, i: into.length - 1 };
    }
  });
  listParts(); inspect();
}

// the same for a shape in a group (the last one gone: the group); and one added to a group (a copy of its last, moved)
function childDo(what, arg) {
  const { i, j } = sel, t = build.top[i], arr = t.shapes;
  const clear = () => { for (const k of [...hidden]) if (k.startsWith(`item:top:${i}:`)) hidden.delete(k); };
  if (what === 'delete' && arr.length === 1) { sel = { type: 'item', list: 'top', i }; itemDo('delete'); return; }
  commit(() => {
    if (what === 'move') { const k = j + arg; if (k < 0 || k >= arr.length) return; [arr[j], arr[k]] = [arr[k], arr[j]]; sel = { ...sel, j: k }; }
    else if (what === 'copy') { arr.splice(j + 1, 0, JSON.parse(JSON.stringify(arr[j]))); sel = { ...sel, j: j + 1 }; }
    else if (what === 'delete') { arr.splice(j, 1); sel = { type: 'item', list: 'top', i }; }
    clear();
  });
  listParts(); inspect();
}
function addChild(i) {
  const t = build.top[i], s = JSON.parse(JSON.stringify(t.shapes[t.shapes.length - 1]));
  delete s.name; shiftShape(s, [1, 0]);
  commit(() => { t.shapes.push(s); sel = { type: 'item', list: 'top', i, j: t.shapes.length - 1 }; });
  listParts(); inspect();
}

// --------------------------------------------------------------------------------------------------- the inspector
function inspect() {
  const box = $('inspector'); box.textContent = '';
  if (view.mode === 'game') { inspectPalette(box); return; }
  if (!editable()) { box.append(el('p', { className: 'note', textContent: `The ${kind} has no bones.` })); return; }
  if (view.mode === 'play') { inspectPlay(box); return; }
  if (view.move !== 'edit') { inspectMove(box); return; }
  const p = current() || parts()[0], o = p.obj;
  const title = el('h2', {}, ...(p.color ? [el('span', { className: 'sw', style: `width:12px;height:12px;border-radius:3px;background:${p.color}` })] : []), el('span', { textContent: p.label }));
  box.append(title);
  if (sel.type === 'item') {
    const acts = el('span', { className: 'acts' });
    for (const [ic, what, arg, tip] of [['up', 'move', -1, 'Drawn earlier ( [ )'], ['down', 'move', 1, 'Drawn later ( ] )'], ['copy', 'copy', 0, 'Copy (⌘D)'], ['trash', 'delete', 0, 'Delete (⌫)']]) acts.append(iconBtn(ic, '', { title: tip, onclick: () => itemDo(what, arg) }));
    title.append(acts);
    const name = el('input', { type: 'text', value: o.name || '', placeholder: p.label, onchange: () => rename(sel, o, name.value) }), head = [field('name', name, 'Its name (Enter, or double-click its row): a move uses it by it')];
    if (sel.list !== 'dots' && sel.j === undefined) {
      const layer = el('select', { onchange: () => itemDo('layer', layer.value) });
      for (const [k, t] of Object.entries(LAYERS)) layer.append(el('option', { value: k, textContent: t, selected: k === sel.list }));
      head.push(field('layer', layer, sel.list === 'shapes' ? 'Body: outlined, counts for hits' : sel.list === 'paint' ? 'Paint: colors the body' : 'On top: outlined, over the body, no hits'));
    }
    box.append(section('Layer', head));
  }
  if (sel.type === 'joint') { box.append(field('place', nums(o, sel.name))); return; }
  if (sel.type === 'item' && sel.list === 'top' && sel.j === undefined) { groupFields(o, box); return; }
  const skip = sel.type === 'rig' ? ['joints', 'torso', 'shapes', 'paint', 'top', 'dots', 'legs', 'chains', 'face', 'spikes', 'moves', 'handling', 'recolor']
    : sel.type === 'item' ? ['name', ...(sel.j !== undefined ? ['on'] : [])] : []; // (a shape in a group: on its group's joint)
  fields(o, box, sel.type === 'face' ? ['frames'] : skip);
  if (sel.type === 'face') faceFrames(box);
  if (sel.type === 'rig') rootMore(box);
  if (sel.type === 'leg' || sel.type === 'chain') farSide(box);
}
// a group: its color, its joint (all its shapes'), its pivot and turn, the rest; its shapes: added here, each picked in
// the list or on the stage
function groupFields(t, box) {
  const on = el('select', { onchange: () => commit(() => { for (const s of t.shapes) { if (on.value) s.on = on.value; else delete s.on; } listParts(); }) });
  for (const c of ['', 'spine', 'hip', 'chest', 'head']) on.append(el('option', { value: c, textContent: c || 'the box', selected: c === (t.shapes[0]?.on || '') }));
  const at = t.at || [0, 0];
  box.append(section('Place', [field('on', on, 'The joint all its shapes are on'),
    field('pivot', stack(at.map((v, j) => numIn(v, (x) => { const q = (t.at || [0, 0]).slice(); q[j] = x; t.at = q; }, { label: 'xy'[j] }))), 'Drag the pivot: the group moves. ⌥-drag: the pivot alone.'),
    field('angle', numIn(t.angle || 0, (x) => { if (x) t.angle = x; else delete t.angle; }, { min: -3.14, max: 3.14, step: 0.01 }), 'Its shapes turned about the pivot'),
    el('div', { className: 'keys' }, iconBtn('pivot', 'Pivot to the middle', { title: 'The pivot in the middle of its shapes; they stay where they are', onclick: () => { commit(() => repivot(t, middleOf(t))); inspect(); } }))]));
  box.append(section('Look', [field('color', colorPick(t.color, (c) => { commit(() => { t.color = c; }); listParts(); inspect(); }))]));
  box.append(section('Shapes', [el('div', { className: 'keys' }, iconBtn('plus', 'Add a shape', { title: 'A copy of its last shape, moved a little', onclick: () => addChild(sel.i) }))],
    'Its shapes: each picked in the list (under it) or on the stage'));
  fields(t, box, ['name', 'color', 'shapes', 'at', 'angle']);
}
// a setting: its name, what sets it (what it is: the tooltip, not a note under it). A number's name drags it, as its own
// does (see numIn)
function field(label, input, note) {
  const name = el('span', { textContent: label }), f = el('label', { className: 'field' }, name, input);
  if (note) f.title = note;
  if (input.scrub) { name.classList.add('scrub'); name.addEventListener('pointerdown', input.scrub); }
  return f;
}
// the inspector in sections, as Figma has it: each setting in the one it belongs to, in this order
const SECTIONS = ['Place', 'Shape', 'Look', 'Motion', 'More'];
const SECTION_OF = {
  on: 'Place', at: 'Place', tip: 'Place', ear: 'Place', eye: 'Place', eyes: 'Place', nose: 'Place', mouth: 'Place', angle: 'Place', bend: 'Place',
  thigh: 'Shape', shin: 'Shape', length: 'Shape', links: 'Shape', curl: 'Shape', r: 'Shape', ends: 'Shape', capsule: 'Shape', foot: 'Shape', smooth: 'Shape', end: 'Shape', tipSize: 'Shape', box: 'Shape',
  color: 'Look', fur: 'Look', noseColor: 'Look', tipColor: 'Look', socks: 'Look', speck: 'Look', far: 'Look', front: 'Look', joined: 'Look', overEye: 'Look', line: 'Look', marks: 'Look',
  stiffness: 'Motion', damping: 'Motion', weight: 'Motion',
};
const sectionOf = (k) => (GEOMS.includes(k) ? 'Shape' : SECTION_OF[k] || 'More');
function section(title, els, tip) {
  const s = el('div', { className: 'section' }, el('div', { className: 'sectionTitle', textContent: title, ...(tip && { title: tip }) }));
  s.append(...els);
  return s;
}
// an editor for each of an object's settings, by what it holds, in sections (flat: all in the box, as they come)
function fields(o, box, skip, flat = false) {
  const into = {}, put = (k, ...els) => { if (flat) box.append(...els); else (into[sectionOf(k)] ||= []).push(...els); };
  for (const k of Object.keys(o)) {
    if (skip.includes(k)) continue;
    const v = o[k];
    let input;
    if (COLOR_KEYS.includes(k)) input = colorPick(v, (c) => { commit(() => { o[k] = c; }); listParts(); inspect(); });
    else if (k === 'on') {
      input = el('select', { onchange: () => commit(() => { if (input.value) o.on = input.value; else delete o.on; }) });
      for (const c of ['', 'spine', 'hip', 'chest', 'head']) input.append(el('option', { value: c, textContent: c || 'the box', selected: c === (v || '') }));
    } else if (GEOMS.includes(k) && Array.isArray(v)) {
      const type = el('select', { onchange: () => commit(() => { const g = type.value; delete o[k]; o[g] = convert(v, k, g); }) });
      for (const g of GEOMS) type.append(el('option', { value: g, textContent: g, selected: g === k }));
      put(k, field('type', type), k === 'triangle' ? el('div', { className: 'numsWide' }, ...v.map((_, i) => nums(v, i, null, [`x${i + 1}`, `y${i + 1}`]))) : el('div', { className: 'numsWide' }, nums(o, k, k)));
      continue;
    } else if (typeof v === 'number') input = num(o, k);
    else if (typeof v === 'boolean') input = el('input', { type: 'checkbox', checked: v, onchange: () => commit(() => { o[k] = input.checked; }) });
    else if (typeof v === 'string') input = el('input', { type: 'text', value: v, onchange: () => commit(() => { o[k] = input.value; listParts(); }) });
    else if (Array.isArray(v) && v.every((x) => typeof x === 'number')) input = nums(o, k);
    else if (Array.isArray(v) && v.every((x) => Array.isArray(x) && x.every((y) => typeof y === 'number'))) input = el('div', {}, ...v.map((_, i) => nums(v, i)));
    else if (v && typeof v === 'object' && !Array.isArray(v) && Object.values(v).every((x) => typeof x === 'number' || typeof x === 'boolean')) {
      const inner = el('div'); fields(v, inner, [], true); put(k, el('div', { className: 'group', textContent: k }), inner); continue;
    } else input = json(o, k);
    put(k, field(k, input));
  }
  if (!flat) for (const t of SECTIONS) if (into[t]) box.append(section(t, into[t]));
}
// a number to set, as Figma has it: a box with its name in it (drag the name, or the setting's: on by step a pixel, ⇧ ten
// times as fast, ⌥ a tenth; the arrow keys in the box: a step), live as it goes (one undo for the drag). A slider beside
// it only for a setting between a least and a most (min and max). whole: whole numbers; commit: set makes its own undo
// and redraws
function numIn(value, set, { step = 0.1, min, max, whole = false, commit: own = false, label } = {}) {
  let v = +(+value || 0).toFixed(3);
  const put = (x) => { x = whole ? Math.round(x) : +x.toFixed(3); if (min !== undefined) x = Math.max(min, x); if (max !== undefined) x = Math.min(max, x); return x; };
  const box = el('input', { type: 'number', step: whole ? 1 : step, value: v, ...(min !== undefined && { min }), ...(max !== undefined && { max }) });
  const bounded = min !== undefined && max !== undefined;
  const range = bounded ? el('input', { type: 'range', min: Math.min(min, v), max: Math.max(max, v), step: whole ? 1 : step / 2, value: v }) : null;
  let live = false;
  const going = (x) => { v = x; box.value = x; if (range) range.value = x; if (own) return; if (!live) { remember(); live = true; } set(x); changed(); };
  const gone = () => { if (own) set(v); else if (live) { live = false; timeline(); listParts(); status(); } };
  if (range) { range.oninput = () => going(put(+range.value)); range.onchange = gone; }
  box.onchange = () => { const x = put(+box.value); v = x; box.value = x; if (range) range.value = x; if (own) set(x); else commit(() => set(x)); };
  const scrub = (e) => { // (dragging a name)
    if (e.button) return;
    e.preventDefault();
    const t = e.currentTarget, x0 = e.clientX, from = v;
    t.setPointerCapture(e.pointerId); document.body.classList.add('scrubbing');
    const move = (m) => going(put(from + (m.clientX - x0) * (whole ? 0.25 : step) * (m.shiftKey ? 10 : m.altKey ? 0.1 : 1)));
    const up = () => { t.removeEventListener('pointermove', move); t.removeEventListener('pointerup', up); t.removeEventListener('pointercancel', up); document.body.classList.remove('scrubbing'); gone(); };
    t.addEventListener('pointermove', move); t.addEventListener('pointerup', up); t.addEventListener('pointercancel', up);
  };
  const lbl = label !== undefined ? el('span', { className: 'lbl scrub', textContent: label }) : null;
  if (lbl) lbl.addEventListener('pointerdown', scrub);
  const wrap = el('span', { className: `num${range ? ' ranged' : ''}` }, el('span', { className: 'box' }, ...(lbl ? [lbl] : []), box), ...(range ? [range] : []));
  if (!lbl) wrap.scrub = scrub; // (the setting's name drags it: see field)
  return wrap;
}
// how a setting's slider goes, by its name (sizes from 0; counts in whole numbers)
const SIZES = ['r', 'ends', 'thigh', 'shin', 'length', 'end', 'smooth', 'stiffness', 'damping', 'weight', 'tipSize'], WHOLE = ['links'];
const optsFor = (k) => (WHOLE.includes(k) ? { step: 1, min: 1, max: 12, whole: true } : SIZES.includes(k) ? { min: 0 } : {});
const num = (o, k) => numIn(o[k], (x) => { o[k] = x; }, optsFor(k));
// numbers in pairs (x and y side by side, as Figma has them), each with its name in its box (see numIn)
const stack = (inputs) => el('div', { className: 'nums' }, ...inputs);
// a list of numbers (a place; a shape's numbers: its radii from 0)
const RADII = { ellipse: [2, 3], capsule: [4], box: [4] };
const LABELS = { ellipse: ['x', 'y', 'rx', 'ry'], capsule: ['ax', 'ay', 'bx', 'by', 'r'], box: ['x0', 'y0', 'x1', 'y1', 'r'] };
const numName = (labels, n, j) => labels?.[j] ?? (n === 2 ? 'xy'[j] : `${j + 1}`);
const nums = (o, k, geom, labels = LABELS[geom]) => stack(o[k].map((_, j) => numIn(o[k][j], (x) => { o[k][j] = x; }, { ...(RADII[geom]?.includes(j) && { min: 0 }), label: numName(labels, o[k].length, j) })));
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
$('showBones').onchange = draw;
$('fine').onchange = draw;
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
  if (view.mode === 'play' || view.mode === 'game') return;
  if (view.move === 'edit') return; // (what the build is: the Setup button's tooltip)
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
  const bar = el('div', { className: 'keys' }), act = (ic, t, tip, fn, off) => bar.append(iconBtn(ic, t, { title: tip, disabled: !!off || !can, onclick: fn }));
  const row = rowOfSel(), here = keysAt(view.frame).filter((k) => leaves(k).some((p) => !row || rowOf(p) === row));
  bar.append(el('span', { className: 'frameNo', textContent: `frame ${view.frame + 1} / ${n} · ${row || 'every row'}` }));
  act('key', 'Key', 'A key here for what is shown (the row picked, or every row)', () => keyDo('key'));
  act('unkey', 'Key', 'No key here (the row picked, or every row)', () => keyDo('delete'), !here.length);
  const ease = el('select', { title: 'How what this key sets goes on to the next key', disabled: !here.length || !can, onchange: () => keyDo('ease', ease.value) });
  for (const e of EASES) ease.append(el('option', { value: e, textContent: e, selected: (here[0]?.ease || 'linear') === e }));
  bar.append(ease);
  act('copy', 'Copy pose', 'The pose here, to paste at another frame or into another move', () => { copied = JSON.parse(JSON.stringify(rawPose())); timeline(); });
  act('paste', 'Paste pose', 'Keys here for all of the pose copied', () => keyDo('paste'), !copied);
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
function setPlay(on) { view.play = on; view.t = 0; $('play').innerHTML = svg(on ? 'pause' : 'play'); }
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
  const vec = (label, path, now, opts) => box.append(mark(field(label, stack(now.map((v, j) => numIn(v, (x) => { const q = now.slice(); q[j] = x; now = q; setKey(path, q); }, { ...opts, label: numName(null, now.length, j) }))), keyed(path) ? 'a key here' : 'between keys: setting it sets one'), path));
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
    const names = Array.isArray(L) ? ['when', 'where'] : ['down', 'up', 'at ↓', 'at ↑', 'air x', 'air y'];
    const ins = (Array.isArray(L) ? [L] : ['down', 'at', 'air'].map((k) => L[k])).flatMap((arr, a) => arr.map((v, j) => numIn(v, (x) => put(arr, j, x), { step: 0.05, label: names[a * 2 + j] })));
    box.append(field(n, stack(ins)));
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
  for (const k of list) box.append(el('div', { className: 'row', onclick: () => choose(k) }, el('span', { textContent: k }), el('span', { className: 'what', textContent: Object.entries(builds[k].recolor || {}).map(([a, b]) => `${nice(a)} → ${nice(b)}`).join(', ') })));
  box.append(el('div', { className: 'keys' },
    iconBtn('plus', 'New skin…', { onclick: () => { $('skin').value = '+'; $('skin').onchange(); } }),
    iconBtn('plus', 'New animal from this…', { title: 'A new animal: a copy of this one, to change as it likes (in the editor only, till the game is given it)', onclick: () => { $('kind').value = '+'; $('kind').onchange(); } })));
  if (build.recolor) { box.append(el('div', { className: 'group' }, el('span', { textContent: 'Colors swapped' }))); recolors(box, build); }
}
// colors swapped, one for another, everywhere (o.recolor): those the animal has first
function recolors(box, o) {
  const has = [...new Set((JSON.stringify(build).match(/"[a-zA-Z]+"/g) || []).map((x) => x.slice(1, -1)).filter((c) => paints().includes(c)))];
  const pick = colorPick;
  const map = o.recolor || {}, put = (fn) => { commit(() => { const m = { ...o.recolor }; fn(m); if (Object.keys(m).length) o.recolor = m; else delete o.recolor; }); inspect(); };
  for (const [from, to] of Object.entries(map)) {
    const rename = (f) => put((m) => { const out = {}; for (const [a, b] of Object.entries(m)) out[a === from ? f : a] = b; for (const k of Object.keys(m)) delete m[k]; Object.assign(m, out); });
    box.append(field('', el('span', { className: 'nums' }, pick(from, rename), el('span', { textContent: '→' }), pick(to, (t) => put((m) => { m[from] = t; })), iconBtn('x', '', { title: 'Not swapped', onclick: () => put((m) => { delete m[from]; }) }))));
  }
  const free = has.find((c) => !(c in map));
  box.append(iconBtn('plus', 'Swap a color', { disabled: !free, onclick: () => put((m) => { m[free] = free; }) }));
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
      iconBtn('plus', 'Add a mouth', { onclick: () => { commit(() => { const n = face.nose || face.eye; face.mouth = [+(n[0] - 0.5).toFixed(3), +(n[1] + 2).toFixed(3)]; }); redo(); } }));
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
  acts.append(iconBtn('revert', 'usual', { title: 'The usual frame, as every animal has it', disabled: !usual || !ownFrame(part, name), onclick: () => { commit(() => setFrame(part, name, FACE_FRAMES[part][name])); redo(); } }));
  acts.append(iconBtn('plus', 'New', { title: 'A new frame, a copy of this one (a key can show it)', onclick: () => {
    const n = prompt('A name for the new frame', `${name}2`)?.trim();
    if (!n || frameNames(part).includes(n) || !/^[\w-]+$/.test(n)) return;
    commit(() => setFrame(part, n, JSON.parse(JSON.stringify(frameNow())))); faceEdit.name = n; redo();
  } }));
  acts.append(iconBtn('trash', '', { title: 'Delete this frame (only one of its own, not a usual one)', disabled: usual, onclick: () => { commit(() => setFrame(part, name, null)); faceEdit.name = part === 'eye' ? 'open' : 'shut'; redo(); } }));
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
    if (build.handling?.[g]) head.append(iconBtn('revert', 'usual', { title: `${title}: as every animal is (as art.js has it)`, onclick: () => { commit(() => { delete build.handling[g]; if (!Object.keys(build.handling).length) delete build.handling; }); inspect(); } }));
    box.append(head);
    for (const [k, spec] of Object.entries(specs)) {
      let input, note = spec[2], f = null;
      const set = (x) => { setHandling(g, k, x); f?.classList.toggle('own', own(g, k)); }; // (marked as set in its file, or not, as it changes)
      if (k === 'at') {
        const now = () => handled(g, k).slice();
        input = stack(handled(g, k).map((v, j) => numIn(v, (x) => { const q = now(); q[j] = x; set(q); }, { label: 'xy'[j] })));
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

// ------------------------------------------------------------------------------------------- the game: its palette
// Game: the game's own, for every animal (as yet its palette). The list: its colors (and how they go by night); the
// stage: everything the game draws, by day above, by night below, the color picked standing out (a click on a pixel:
// its color); the inspector: the color picked
let hue = 'white'; // (the color picked, by name; 'night': how the colors go by night)
const ROLE_ABOUT = {
  outline: 'Small marks (eyes, a nose) and, without shading, every outline. A dot can be it.', ink: 'The eyes; the words.',
  background: 'The sky, and what is drawn in it (a cloud, a rock’s light side).', faint: 'The far hills, the ground, a star not won yet.',
  dim: 'What is not yet: an animal still to unlock, words said quietly.',
};
const TONE_NAMES = ['color', 'underside', 'outline', 'far leg']; // (its tones: see TONES in art.js)
const MOST = 63; // (colors a palette can have: see art.js)
const isRole = (c) => c in palette.roles;
const nameAt = (i) => Object.keys(NAMED).find((k) => NAMED[k] === i);
// everything the game draws, each with its name: every animal standing, the scenery, the food
let cast = null;
function castOf() {
  let seed = 7; const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  const out = KINDS.map((k) => ({ name: k, s: animal(k, 'hurt', 0) }));
  const things = [['cactus', () => cactus(rnd, false)], ['big cactus', () => cactus(rnd, true)], ...['grey', 'sand', 'red', 'snowy'].map((l) => [`${l} rock`, () => rock(rnd, l)]),
    ['log', () => log(rnd)], ['snowy log', () => log(rnd, true)], ['bush', () => bush(rnd)], ['sunflower', () => sunflower(rnd)], ['toadstool', () => toadstool(rnd)],
    ['pine', () => pine(rnd)], ['snowy pine', () => pine(rnd, true)], ['stump', () => stump(rnd)], ['boulders', () => boulders(rnd)], ['spire', () => spire(rnd)],
    ['tumbleweed', () => tumbleweed(rnd)], ['snowman', () => snowman(rnd)], ['ice', () => ice(rnd)]];
  for (const [name, make] of things) { const t = make(); out.push({ name, s: t.sprite || t }); }
  for (const k in FOOD) out.push({ name: k, s: FOOD[k] });
  out.push({ name: 'star', s: star }, { name: 'heart', s: heart });
  return out;
}
let castAt = null; // (what is drawn at each art pixel: its color's index, its thing)
const fade = (hex, bg) => { const a = rgb(hex), b = rgb(bg); return `rgb(${a.map((v, i) => Math.round(v + (b[i] - v) * 0.78)).join(',')})`; };
// everything in rows (each so wide), day and night one above the other, or side by side: as big as the stage fits
function castLayout(width, side, bw, bh) {
  const rows = [[]]; let x = 0;
  for (const it of cast) { const w = it.s.w + 3; if (x + w > width && rows[rows.length - 1].length) { rows.push([]); x = 0; } rows[rows.length - 1].push({ ...it, x }); x += w; }
  const tall = rows.map((r) => Math.max(...r.map((it) => it.s.h)) + 3), half = tall.reduce((a, b) => a + b, 0) + 2;
  const AW = (width + 4) * (side ? 2 : 1), AH = half * (side ? 1 : 2), z = Math.min(bw / AW, bh / AH);
  return { rows, tall, half, side, AW, AH, z };
}
function drawCast(c) {
  cast ||= castOf();
  const box = $('stageBox'), bw = box.clientWidth || 600, bh = box.clientHeight || 300;
  let L = null;
  for (let width = 90; width <= 480; width += 10) for (const side of [false, true]) { const l = castLayout(width, side, bw, bh); if (!L || l.z > L.z) L = l; }
  const { rows, tall, half, side, AW, AH } = L;
  Z = 1; // (drawn an art pixel a pixel, shown as big as fits: pixelated)
  if (c.width !== AW || c.height !== AH) { c.width = AW; c.height = AH; }
  c.style.width = `${Math.floor(AW * L.z)}px`; c.style.height = `${Math.floor(AH * L.z)}px`;
  const ctx = c.getContext('2d'), pick = hue === 'night' ? 0 : NAMED[hue];
  castAt = { w: AW, h: AH, px: new Uint8Array(AW * AH), who: [] };
  ['day', 'night'].forEach((time, n) => {
    const pal = PALETTES[time], ox = side ? n * AW / 2 : 0, oy = side ? 0 : n * half;
    ctx.fillStyle = pal.bg; ctx.fillRect(ox * Z, oy * Z, (side ? AW / 2 : AW) * Z, half * Z);
    let y = oy + 1;
    rows.forEach((row, r) => {
      for (const it of row) {
        const sp = it.s, L = sp.look(), top = y + tall[r] - 1 - sp.h; // (each on the row's floor)
        for (let j = 0; j < sp.h; j++) for (let i = 0; i < sp.w; i++) {
          const k = L[j * sp.w + i];
          if (!k) continue;
          const X = ox + it.x + 2 + i, Y = top + j, own = k % 64, col = colorOf(pal, k);
          ctx.fillStyle = pick && own !== pick ? fade(col, pal.bg) : col; ctx.fillRect(X * Z, Y * Z, Z, Z);
          castAt.px[Y * AW + X] = own; castAt.who[Y * AW + X] = it.name;
        }
      }
      y += tall[r];
    });
  });
}
const castHit = (e) => { const [x, y] = playAt(e).map(Math.floor), i = castAt && x >= 0 && y >= 0 && x < castAt.w && y < castAt.h ? y * castAt.w + x : -1; return i >= 0 && castAt.px[i] ? { color: nameAt(castAt.px[i]), thing: castAt.who[i] } : null; };
function listPalette(box) {
  const row = (name, label, what = '') => {
    const r = el('div', { className: `row${hue === name ? ' on' : ''}` }, ...['day', 'night'].map((t) => el('span', { className: 'sw', style: `background:${name === 'night' ? PALETTES[t].bg : PALETTES[t][NAMED[name]]}` })),
      el('span', { textContent: label }), el('span', { className: 'what', textContent: what }));
    r.onclick = () => { hue = name; listParts(); inspect(); draw(); };
    return r;
  };
  box.append(row('night', 'night', 'the colors by night'), el('div', { className: 'group' }, el('span', { textContent: 'Roles' })));
  for (const r in palette.roles) box.append(row(r, nice(r)));
  box.append(el('div', { className: 'group' }, el('span', { textContent: `Colors · ${Object.keys(palette.colors).length}` }),
    iconBtn('plus', '', { title: 'A new color', onclick: () => {
      const n = prompt('A name for the new color, by how it looks (lightBlue, darkRed)')?.trim(), bad = n && badName(n);
      if (!n) return; if (bad) { alert(bad); return; }
      commit(() => { palette.colors[n] = PALETTES.day[NAMED[hue]] || '#8a8a8a'; hue = n; }); refresh();
    } })));
  for (const c in palette.colors) box.append(row(c, nice(c)));
}
// a new color's name: by how it looks, letters, a small one first (lightBlue); not taken; room for it
function badName(n) {
  if (!/^[a-z][a-zA-Z]*$/.test(n)) return 'Letters only, a small one first: lightBlue.';
  if (n in NAMED) return `There is a ${nice(n)} already.`;
  if (Object.keys(NAMED).length >= MOST) return `The palette is full (${MOST} colors).`;
  return null;
}
function inspectPalette(box) {
  if (hue === 'night') {
    box.append(el('h2', { textContent: 'Night' }), el('p', { className: 'note', textContent: 'By night each color is worked out from its day color, each channel: day × contrast + lift. The dark ones lighter, the light ones darker, so they show against the night sky. The roles have their own.' }));
    box.append(field('contrast', numIn(palette.night.contrast, (x) => { palette.night.contrast = x; }, { min: 0.5, max: 1.2, step: 0.01 }), 'less: all nearer the middle'));
    box.append(field('lift', numIn(palette.night.lift, (x) => { palette.night.lift = x; }, { min: -40, max: 80, step: 1, whole: true }), 'more: all lighter'));
    return;
  }
  const role = isRole(hue), i = NAMED[hue];
  box.append(el('h2', {}, el('span', { className: 'sw', style: `width:12px;height:12px;border-radius:3px;background:${PALETTES.day[i]}` }), el('span', { textContent: nice(hue) }), ...(role ? [el('span', { className: 'note', textContent: 'a role' })] : [])));
  if (role) box.append(el('p', { className: 'note', textContent: ROLE_ABOUT[hue] || '' }));
  // a color to set: picked (live while picking: one undo), or written
  const hexIn = (get, put) => {
    const pick = el('input', { type: 'color', value: get() }), text = el('input', { type: 'text', value: get(), size: 8 });
    let live = false;
    const set = (v) => { if (!live) { remember(); live = true; } put(v); changed(); };
    pick.oninput = () => { text.value = pick.value; set(pick.value); };
    pick.onchange = () => { live = false; inspect(); };
    text.onchange = () => { const v = text.value.trim().toLowerCase(); if (!/^#[0-9a-f]{6}$/.test(v)) { text.style.borderColor = 'red'; return; } set(v); live = false; inspect(); };
    return el('span', { className: 'nums' }, pick, text);
  };
  if (role) for (const t of ['day', 'night']) box.append(field(t, hexIn(() => palette.roles[hue][t], (v) => { palette.roles[hue][t] = v; })));
  else {
    box.append(field('day', hexIn(() => palette.colors[hue], (v) => { palette.colors[hue] = v; })));
    box.append(field('night', el('span', { className: 'nums' }, el('span', { className: 'sw big', style: `background:${PALETTES.night[i]}` }), el('span', { className: 'note', textContent: PALETTES.night[i] })), 'worked out: see night'));
  }
  // its tones, as the shaded look works them out
  const tones = el('div', { className: 'tones' }, el('span'), ...TONE_NAMES.map((t) => el('span', { className: 'note', textContent: t })));
  for (const t of ['day', 'night']) tones.append(el('span', { className: 'note', textContent: t }), ...TONE_NAMES.map((_, k) => el('span', { className: 'sw big', title: colorOf(PALETTES[t], i + 64 * k), style: `background:${colorOf(PALETTES[t], i + 64 * k)}` })));
  box.append(el('div', { className: 'group' }, el('span', { textContent: 'Tones' })), tones, el('p', { className: 'note', textContent: 'Worked out by the shaded look: the color times a cool tint, so always darker than it.' }));
  // where it is
  const named = KINDS.filter((k) => JSON.stringify(builds[k]).includes(`"${hue}"`)), drawn = (cast ||= castOf()).filter((it) => it.s.look().some((k) => k && k % 64 === i)).map((it) => it.name);
  box.append(el('div', { className: 'group' }, el('span', { textContent: 'Where' })),
    field('in files', el('span', { className: 'note', textContent: named.join(', ') || 'none' })), field('drawn in', el('span', { className: 'note', textContent: drawn.join(', ') || 'nothing on the stage' })));
}
// a color to set: a button, its swatch and name; clicked, the palette by it to pick from, and a new color to add (into
// the palette: saved with it, assets/palette.js)
function colorPick(value, on) {
  const b = el('button', { type: 'button', className: 'colorPick', title: 'Pick from the palette' }, el('span', { className: 'sw', style: `background:${swatch(value)}` }), el('span', { textContent: nice(value) }));
  b.onclick = (e) => { e.preventDefault(); if (popup?.anchor === b) unpop(); else popPalette(b, value, on); };
  return b;
}
let popup = null;
function unpop() { popup?.remove(); popup = null; }
function popPalette(anchor, value, on) {
  unpop();
  const name = el('div', { className: 'popName', textContent: nice(value) }), grid = el('div', { className: 'popGrid' });
  for (const c of paints()) {
    const sw = el('button', { type: 'button', className: `popSw${c === value ? ' on' : ''}`, title: nice(c), style: `background:${swatch(c)}` });
    sw.onmouseenter = () => { name.textContent = nice(c); }; sw.onmouseleave = () => { name.textContent = nice(value); };
    sw.onclick = () => { unpop(); on(c); };
    grid.append(sw);
  }
  const hex = el('input', { type: 'color', value: /^#/.test(swatch(value)) ? swatch(value) : '#8a8a8a' }), text = el('input', { type: 'text', placeholder: 'its name: lightBlue' }), err = el('div', { className: 'note' });
  const addIt = () => { const n = text.value.trim(), bad = badName(n); if (bad) { err.textContent = bad; return; } palette.colors[n] = hex.value; setPalette(palette); unpop(); on(n); status(); };
  text.onkeydown = (e) => { if (e.key === 'Enter') addIt(); };
  popup = el('div', { className: 'pop' }, grid, name, el('div', { className: 'popNew' }, hex, text, iconBtn('plus', 'Add', { type: 'button', title: 'A new color in the palette', onclick: addIt })), err);
  popup.anchor = anchor;
  document.body.append(popup);
  const r = anchor.getBoundingClientRect(), w = popup.offsetWidth, h = popup.offsetHeight;
  popup.style.left = `${Math.max(8, Math.min(innerWidth - w - 8, r.left))}px`;
  popup.style.top = `${r.bottom + 4 + h > innerHeight - 8 ? Math.max(8, r.top - h - 4) : r.bottom + 4}px`;
}
document.addEventListener('pointerdown', (e) => { if (popup && !popup.contains(e.target) && !popup.anchor.contains(e.target)) unpop(); });

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
  // (twice as big as it was: K screen pixels an art pixel, as much of the scene's width as the card has room for)
  const c = $('preview'), K = Math.max(2, Math.round((2 * Math.min(innerHeight * 0.15, 170)) / H)), shown = Math.min(W, Math.floor((c.parentElement.clientWidth - 16) / K) || W), ctx = c.getContext('2d');
  if (c.width !== shown * K || c.height !== H * K) { c.width = shown * K; c.height = H * K; c.style.width = `${shown * K}px`; c.style.height = `${H * K}px`; }
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
$('gameMode').onclick = () => setMode(view.mode === 'game' ? 'setup' : 'game');
$('revert').onclick = () => { remember(); if (view.mode === 'game') { restore(savedPalette); return; } restore(JSON.stringify({ build: saved[base] ? JSON.parse(saved[base]) : build, skin: skin && saved[kind] ? JSON.parse(saved[kind]) : skin })); };
// the keyboard: what each key does (shown with ?), by when it works
const KEYS = [
  ['Everywhere', [['⌘Z', 'Undo'], ['⇧⌘Z', 'Redo'], ['⌘S', 'Save'], ['1 2 3', 'Setup, Animate, Play'], ['4', 'Game'], ['?', 'These shortcuts'], ['Esc', 'Pick nothing (close a popup)']]],
  ['Parts', [['Tab  ⇧Tab', 'The next part in the lists, the one before'], ['← → ↑ ↓', 'Move the part picked a tenth of a pixel (in a move: its key at the frame)'], ['⇧ + arrows', 'A whole pixel'],
    ['⌘D', 'Copy the shape picked'], ['⌫', 'Delete the shape picked'], ['[  ]', 'Drawn earlier, later'], ['H', 'Hide or show the part picked'], ['Enter', 'Rename the shape picked (or double-click it)'], ['⌥H', 'Show everything hidden']]],
  ['Animate', [['Space', 'Play the move, stop'], [',  .', 'A frame back, on'], ['← →', 'A frame back, on (nothing picked)'], ['Home  End', 'The first frame, the last']]],
  ['The stage', [['B', 'Bones'], ['A', 'All handles'], ['O', 'Onion skin'], ['P', 'Screen pixels (Setup)'], ['S', 'Shading']]],
];
{
  const box = el('div');
  for (const [title, rows] of KEYS) box.append(el('h3', { textContent: title }), el('table', {}, ...rows.map(([k, what]) => el('tr', {}, el('td', {}, ...k.split(/\s{2}/).flatMap((x, i) => [i ? ' ' : '', el('kbd', { textContent: x })])), el('td', { textContent: what })))));
  $('keys').append(box);
  $('keys').onclick = (e) => { if (e.target === $('keys')) $('keys').hidden = true; };
  $('keysButton').onclick = () => { $('keys').hidden = !$('keys').hidden; };
}
const flip = (id) => { const b = $(id); b.checked = !b.checked; b.dispatchEvent(new Event('change')); };
// the part picked moved by d (in the world: as the screen shows it): its middle (a shape), else its handle (a joint, a
// leg's root, a dot; in a move: a key at the frame). Keys held down: one undo for the lot
let nudged = 0;
function nudge(d) {
  const p = current();
  if (!p || !editing() || hidden.has(keyOf(p.sel))) return false;
  const movers = p.handles.filter((h) => h.move), hs = movers.length ? movers : p.handles.filter((h) => h.anchor).slice(0, 1);
  if (!hs.length) return false;
  const now = performance.now();
  if (now - nudged > 700) remember();
  nudged = now;
  for (const h of hs) h.set(plus(h.at, d));
  changed(); inspect();
  if (view.move !== 'edit') timeline();
  return true;
}
function frameBy(f) { setPlay(false); const n = frames(view.move); view.frame = ((f % n) + n) % n; place(); listParts(); inspect(); timeline(); draw(); }
function nextPart(by) {
  const rows = [...document.querySelectorAll('#bones .row, #shapes .row')].filter((r) => r.sel);
  if (!rows.length) return;
  const i = rows.findIndex((r) => r.classList.contains('on')), r = rows[(i + by + rows.length) % rows.length];
  sel = r.sel; listParts(); inspect(); draw();
  document.querySelector('#bones .row.on, #shapes .row.on')?.scrollIntoView({ block: 'nearest' });
}
document.addEventListener('keydown', (e) => {
  const typing = /INPUT|SELECT|TEXTAREA/.test(document.activeElement?.tagName) && !['checkbox', 'range', 'button'].includes(document.activeElement.type);
  const cmd = e.metaKey || e.ctrlKey, k = e.key, low = k.length === 1 ? k.toLowerCase() : k;
  const take = () => { e.preventDefault(); return true; };
  if (k === 'Escape' && popup) { unpop(); return; }
  if (k === 'Escape' && !$('keys').hidden) { $('keys').hidden = true; return; }
  if (cmd && low === 'z' && !typing) { take(); e.shiftKey ? redo() : undo(); return; }
  if (cmd && low === 's') { take(); save(); return; }
  if (typing || e.altKey && low !== 'h' && k !== 'Dead' && e.code !== 'KeyH') return;
  if (cmd) {
    if (low === 'd' && sel.type === 'item' && view.move === 'edit' && view.mode === 'setup') { take(); itemDo('copy'); }
    return;
  }
  if (k === '?') { take(); $('keysButton').click(); return; }
  if (['1', '2', '3'].includes(k)) { take(); setMode(['setup', 'animate', 'play'][k - 1]); return; }
  if (k === '4') { take(); setMode('game'); return; }
  if (low === 's') { take(); flip('shading'); return; }
  if (view.mode === 'play' || view.mode === 'game') return;
  if (low === 'b') { take(); flip('showBones'); return; }
  if (low === 'a') { take(); flip('allHandles'); return; }
  if (low === 'o' && view.mode === 'animate') { take(); flip('onion'); return; }
  if (low === 'p' && view.mode === 'setup') { take(); flip('fine'); return; }
  if (e.code === 'KeyH' && e.altKey) { take(); hidden.clear(); rebuild(); listParts(); draw(); return; }
  if (low === 'h' && ['item', 'torso', 'spikes'].includes(sel.type) && view.move === 'edit') { take(); hide(sel); return; }
  if (k === 'Tab') { take(); nextPart(e.shiftKey ? -1 : 1); return; }
  if (k === 'Enter' && sel.type === 'item' && view.move === 'edit') { const r = [...document.querySelectorAll('#shapes .row.on')][0], p = current(); if (r && p) { take(); renaming(r, p); } return; }
  if ((k === 'Delete' || k === 'Backspace') && sel.type === 'item') { take(); itemDo('delete'); return; }
  if ((k === '[' || k === ']') && sel.type === 'item') { take(); itemDo('move', k === '[' ? -1 : 1); return; }
  if (k === 'Escape') { sel = { type: view.move === 'edit' ? 'rig' : 'frame' }; listParts(); inspect(); draw(); return; }
  if (view.mode === 'animate') {
    if (k === ' ') { take(); $('play').click(); return; }
    if (k === ',' || k === '.') { take(); frameBy(view.frame + (k === ',' ? -1 : 1)); return; }
    if (k === 'Home' || k === 'End') { take(); frameBy(k === 'Home' ? 0 : frames(view.move) - 1); return; }
  }
  const arrow = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] }[k];
  if (arrow) {
    take();
    if (nudge(times(arrow, e.shiftKey ? 1 : 0.1))) return;
    if (arrow[0] && view.move !== 'edit') frameBy(view.frame + arrow[0]); // (nothing to move: a frame back or on)
  }
});
window.addEventListener('beforeunload', (e) => { if (KINDS.some((k) => builds[k] && dirty(k)) || paletteDirty()) e.preventDefault(); });
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
setMode(['setup', 'animate', 'play', 'game'].includes(new URLSearchParams(location.search).get('mode')) ? new URLSearchParams(location.search).get('mode') : 'setup');
requestAnimationFrame(tick);
