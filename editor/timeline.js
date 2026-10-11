// The moves (see editor.js): a clip's keys on a timeline, a gait's settings, a move played
import { COLOR, FOOT, PALETTES, animal, rigParts, setStyle, strides } from '../art.js';
import { $, el, iconBtn, svg } from './dom.js';
import { frameNames } from './face.js';
import { field, inspect, numIn, numName, stack } from './inspector.js';
import { listParts } from './lists.js';
import { current, poseParts, spineShape } from './parts.js';
import { draw } from './stage.js';
import { P, animated, build, commit, editable, kind, place, refresh, sel, view, setLastMove, setSel } from './state.js';

// a move (see asset.js): a clip (keys over its frames: a handle dragged sets a key at the frame shown, what it changes
// going from one key to the next by the first's ease) or a gait (each frame worked out from its settings: to tune)
const moveOf = (name) => rigParts.move(kind, name) || rigParts.move(kind, 'run');
export const kindOf = (name) => (moveOf(name).gait ? 'gait' : 'clip');
export function frames(name) { const m = moveOf(name); return m.gait ? m.gait.frames : m.frames; }
export const ABOUT = {
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
export const leaves = (o, pre = '', out = []) => { for (const k in o) { if (!pre && (k === 'at' || k === 'ease')) continue; const v = o[k], p = pre ? `${pre}.${k}` : k; if (v && typeof v === 'object' && !Array.isArray(v)) leaves(v, p, out); else out.push(p); } return out; };
export const rowOf = (path) => { const [a, b] = path.split('.'); return a === 'eye' || a === 'mouth' ? 'face' : a === 'joints' ? b : a === 'headAngle' ? 'head' : a === 'paws' || a === 'roots' || a === 'chains' ? b : a === 'torso' ? 'torso' : ['shapes', 'paint', 'top', 'dots', 'ownShapes'].includes(a) ? 'shapes' : 'pose'; };
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
export const keysAt = (f) => clipKeys().filter((k) => k.at === f);
const empty = (k) => Object.keys(k).every((x) => x === 'at' || x === 'ease');
// set what a path is at the frame shown: in the key there that sets it, or the first key there, or a new one
export function setKey(path, v) {
  const here = keysAt(view.frame);
  let k = here.find((x) => getPath(x, path) !== undefined) || here[0];
  if (!k) { k = { at: view.frame }; clipKeys().push(k); clipKeys().sort((a, b) => a.at - b.at); }
  setPath(k, path, v);
}
// the clip's pose at the frame shown as its keys have it (the build's shapes still used by name), and the paths it sets
const rawPose = () => rigParts.clip(moveOf(view.move), view.frame);
export const pathsOf = (row) => [...new Set(clipKeys().flatMap((k) => leaves(k)))].filter((p) => !row || rowOf(p) === row);
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

export function fillMoves() {
  const s = $('move'); s.textContent = '';
  for (const m of rigParts.moves(kind)) s.append(el('option', { value: m, textContent: m }));
  view.move = view.mode === 'animate' ? animated() : 'edit'; view.frame = 0; setPlay(false);
  s.value = view.mode === 'animate' ? view.move : animated();
}
export function show(move, frame = 0) {
  view.move = move; view.frame = frame;
  if (move !== 'edit') { setLastMove(move); $('move').value = move; }
  if (!['joint', 'paw', 'chain', 'frame'].includes(sel.type) || move === 'edit') setSel({ type: move === 'edit' ? 'rig' : 'frame' });
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
const goTo = (f, s) => { setPlay(false); view.frame = f; if (s) setSel(s); place(); listParts(); inspect(); timeline(); draw(); };
export function timeline() {
  const box = $('timeline'); box.textContent = ''; strip = [];
  if (view.mode === 'play' || view.mode === 'game') return;
  if (view.move === 'edit') return; // (what the build is: the Setup button's tooltip)
  const n = frames(view.move), what = kindOf(view.move), can = editable();
  if (what === 'gait') {
    const row = el('div', { className: 'frames' });
    for (let i = 0; i < n; i++) { const b = el('button', { title: `Frame ${i + 1}`, onclick: () => goTo(i) }, el('canvas', { width: 42, height: 26 }), el('span', { textContent: i + 1 })); row.append(b); strip.push(b); }
    row.title = `${ABOUT.gait} ${GAME[view.move] || ''}`;
    box.append(row);
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
  bar.title = `${ABOUT.clip} ${GAME[view.move] || ''}`;
  box.append(bar);
}
// a gait's frames drawn (as they are now), the one shown marked
export function markFrames() {
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
export function setPlay(on) { view.play = on; view.t = 0; $('play').innerHTML = svg(on ? 'pause' : 'play'); }
$('play').onclick = () => { if (view.move === 'edit') return; setPlay(!view.play); draw(); };
function fps() {
  const m = moveOf(view.move);
  return m.gait ? m.gait.frames * strides(kind, +$('speed').value, view.move === 'duck' ? 1 : undefined) : m.fps || 4;
}
export function stepPlay(dt) {
  if (!view.play || view.move === 'edit') return;
  view.t += dt;
  const f = (view.frame + Math.floor(view.t * fps())) % frames(view.move);
  if (view.t * fps() >= 1) { view.t = 0; view.frame = f; draw(); }
}

// the inspector for a move: what a clip's pose is at the frame shown (for the bone picked: setting it sets a key there),
// or a gait's settings
export function inspectMove(box) {
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
    const sp = spineShape(), r0 = typeof sp?.r === 'number' ? sp.r : 1, e0 = sp?.ends || 0; // (the torso as the frame has it; a key: how much more than its shape's)
    one('head turn', 'headAngle', pose.headAngle || 0, { step: 0.05, span: 1.5 }, 'radians, + down');
    if (sp?.r || pose.torso) {
      box.append(mark(field('torso r', numIn(P.torso.r ?? r0, (x) => setKey('torso.thicker', +(x - r0).toFixed(3)), { min: 0, max: 12 }), 'Its torso here: a key keeps how much thicker than the torso shape (it grows with it)'), 'torso.thicker'));
      box.append(mark(field('torso ends', numIn(P.torso.ends ?? e0, (x) => setKey('torso.longer', +(x - e0).toFixed(3)), { min: 0, max: 12 }), 'Its torso here: a key keeps how much longer than the torso shape'), 'torso.longer'));
    }
    const flip = el('input', { type: 'checkbox', checked: !!pose.flip, onchange: () => commit(() => setKey('flip', flip.checked || null)) });
    box.append(field('on its back', flip));
    for (const part of ['eye', 'mouth']) { // its face's frames: a key sets which
      if (part === 'mouth' && !build.face?.mouth) continue;
      const pick = el('select', { onchange: () => { commit(() => setKey(part, pick.value)); inspect(); } }), now = pose[part] || (part === 'eye' ? 'open' : 'shut');
      for (const n of frameNames(part)) pick.append(el('option', { value: n, textContent: n, selected: n === now }));
      box.append(mark(field(part, pick, keyed(part) ? 'a key here' : 'its frame: setting it sets a key (blinking, open is blink)'), part));
    }
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

