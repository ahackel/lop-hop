// The inspector (see editor.js): the part picked, each of its settings in its section; a skin's colors, the far side
import { $, el, iconBtn } from './dom.js';
import { faceFrames } from './face.js';
import { inspectPlay } from './handling.js';
import { SWITCHES, addPaint, addShape, bodyIndex, itemDo, layers, rename, setSpikes, switchOn, toggle } from './layers.js';
import { listParts } from './lists.js';
import { colorPick, inspectPalette } from './palette.js';
import { ALONG, alongOf, boneDefaults, current, geomOf, middleOf, parts, repivot, withDefaults } from './parts.js';
import { COLOR_KEYS, GEOMS, also, base, build, builds, changed, choose, commit, editable, isGroup, kind, newAnimal, newSkin, nice, paints, refresh, remember, sel, skin, skinsOf, status, view, setSel } from './state.js';
import { inspectMove, timeline } from './timeline.js';

export function inspect() {
  const box = $('inspector'); box.textContent = '';
  if (view.mode === 'game') { inspectPalette(box); return; }
  if (!editable()) { box.append(el('p', { className: 'note', textContent: `The ${kind} has no bones.` })); return; }
  if (view.mode === 'play') { inspectPlay(box); return; }
  if (view.move !== 'edit') { inspectMove(box); return; }
  const p = current() || parts()[0], o = p.obj, t = sel.type;
  const title = el('h2', {}, ...(p.color ? [el('span', { className: 'sw', style: `width:12px;height:12px;border-radius:3px;background:${p.color}` })] : []), el('span', { textContent: p.label }));
  box.append(title);
  if (['item', 'paint', 'dot', 'group'].includes(t)) {
    const acts = el('span', { className: 'acts' });
    for (const [ic, what, arg, tip] of [['up', 'move', -1, 'Drawn earlier ( [ )'], ['down', 'move', 1, 'Drawn later ( ] )'], ['copy', 'copy', 0, 'Copy (⌘D)'], ['trash', 'delete', 0, 'Delete (⌫)']]) acts.append(iconBtn(ic, '', { title: tip, onclick: () => itemDo(what, arg) }));
    title.append(acts);
    if (also.length) box.append(el('p', { className: 'note', textContent: `${also.length + 1} selected`, title: `Moved, copied, deleted, hidden and dragged together; below: ${p.label}, picked last` }));
    const name = el('input', { type: 'text', value: o.name || '', placeholder: p.label, onchange: () => rename(sel, o, name.value) }), head = [field('name', name, 'Its name (Enter, or double-click its row): a move uses it by it')];
    if (t === 'item') head.push(field('bone', attach(o), 'The bone it is on: a joint (in its frame; the box: none), or a bone it is drawn along (as the pose has it)'));
    if (t === 'item' || t === 'paint') head.push(field('shape', shapeKind(o), o.bone ? 'What it is drawn as along its bone' : 'What it is: fitted to where it was'));
    box.append(section(t === 'group' ? 'Group' : 'Shape', head));
  }
  if (t === 'joint') {
    box.append(field('place', nums(o, sel.name)));
    if (sel.name === 'head') { // (what it turns about)
      const pv = () => build.headPivot || [0, 0], put = (q) => { if (q[0] || q[1]) build.headPivot = q; else delete build.headPivot; };
      box.append(field('pivot', stack(pv().map((v, j) => numIn(v, (x) => { const q = pv().slice(); q[j] = x; put(q); }, { label: 'xy'[j] }))), 'What it turns about, from the joint: where the neck meets it (drag the ring by the joint)'));
    }
    return;
  }
  if (t === 'group') { groupFields(o, box); return; }
  if (t === 'item' && o.bone) { fields(withDefaults(o, boneDefaults(o)), box, ['name', 'bone', 'along']); return; } // (a shape on a bone: all it can be)
  if (t === 'item') { fields(withDefaults(o, { color: undefined, smooth: 1, ...((o.ellipse || o.box) && { angle: 0 }) }), box, ['name', 'on']); return; } // (an ellipse, a box: turned)
  const skip = t === 'rig' ? ['joints', 'headPivot', 'layers', 'dots', 'legs', 'chains', 'face', 'moves', 'handling', 'recolor'] : t === 'paint' || t === 'dot' ? ['name'] : t === 'leg' || t === 'chain' ? ['on'] : []; // (a bone's joint: dragged onto another in the list)
  fields(o, box, t === 'face' ? ['frames'] : skip);
  if (t === 'face') faceFrames(box);
  if (t === 'rig') rootMore(box);
  if (t === 'leg' || t === 'chain') farSide(box);
}
// the bone a shape is on: a joint (in its frame; the box: none) or a bone it is drawn along (what it is kept: an ellipse
// along it, from an ellipse; off one again: one where the joint is)
const ON_BONE = ['bone', 'along', 'r', 'ends', 'round', 'foot', 'end', 'marks', 'grows', 'base', 'tipColor', 'tipSize'];
const AT_JOINT = { ellipse: [0, 0, 2, 1.5], capsule: [-1.5, 0, 1.5, 0, 1], box: [-2, -1.5, 2, 1.5, 0.5], triangle: [[-1.5, 1], [0, -1.5], [1.5, 1]] };
const clone = (v) => JSON.parse(JSON.stringify(v));
function attach(o) {
  const now = o.bone ? `bone:${o.bone}` : `on:${o.on || ''}`, opt = (v, label) => el('option', { value: v, textContent: label, selected: v === now });
  const input = el('select', { onchange: () => { const [how, n] = input.value.split(':'); commit(() => reattach(o, how, n)); listParts(); inspect(); } });
  input.append(el('optgroup', { label: 'a joint' }, opt('on:', 'the box'), ...['spine', 'hip', 'chest', 'head'].map((j) => opt(`on:${j}`, j))),
    el('optgroup', { label: 'drawn along a bone' }, opt('bone:spine', 'spine'), ...[...Object.keys(build.legs || {}), ...Object.keys(build.chains || {})].map((n) => opt(`bone:${n}`, n))));
  return input;
}
function reattach(o, how, n) {
  if (how === 'on') {
    if (o.bone) { const k = alongOf(o); for (const x of ON_BONE) delete o[x]; o[k] = clone(AT_JOINT[k]); }
    if (n) o.on = n; else delete o.on;
  } else {
    if (!o.bone) {
      const g = geomOf(o) || 'ellipse', v = o[g];
      for (const x of GEOMS) delete o[x];
      delete o.on; delete o.angle;
      o.along = g;
      if (g === 'triangle') o.base = clone(ALONG.triangle.base);
      else o.r = +Math.max(0.3, g === 'ellipse' ? v[3] : g === 'capsule' ? v[4] : (v[3] - v[1]) / 2).toFixed(2);
    }
    o.bone = n;
  }
  tidy(o);
}
// what a shape is: an ellipse, a capsule, a box or a triangle (on a joint: fitted to where it was; along a bone: its
// settings kept where the kinds share them)
function shapeKind(o) {
  const now = o.bone ? alongOf(o) : geomOf(o), input = el('select', { onchange: () => { commit(() => reshape(o, input.value)); listParts(); inspect(); } });
  for (const g of GEOMS) input.append(el('option', { value: g, textContent: g, selected: g === now }));
  return input;
}
function reshape(o, to) {
  if (o.bone) {
    const was = alongOf(o);
    for (const k of [...Object.keys(ALONG[was]), 'foot', 'round']) if (!(k in ALONG[to]) || k === 'round') delete o[k];
    o.along = to;
    if (to === 'triangle') o.base ??= clone(ALONG.triangle.base);
  } else {
    const g = geomOf(o);
    if (g !== to) {
      o[to] = convert(o[g], g, to); delete o[g];
      if (o.angle && (to === 'capsule' || to === 'triangle')) { o[to] = turnedAbout(o[to], to, o.angle); delete o.angle; } // (turned: its points so)
    }
  }
  tidy(o);
}
// (its settings in the order the files have them: its name, what it is on, what it is; then the rest)
const ORDER = ['name', 'bone', 'along', 'on', ...GEOMS];
function tidy(o) {
  const all = { ...o };
  for (const k in o) delete o[k];
  for (const k of ORDER) if (k in all) o[k] = all[k];
  for (const k in all) if (!(k in o)) o[k] = all[k];
}
// a group: how it is drawn (its switches), its color; on no bone, its joint (all its shapes'), its pivot and turn; its
// shapes, paint and spikes added here, each picked in the list or on the stage
function groupFields(G, box) {
  const g = sel.g;
  box.append(section('Drawn', SWITCHES.map(([k, , yes, no, label]) => field(label, el('input', { type: 'checkbox', checked: switchOn(G, k), onchange: () => toggle(g, k) }), `${yes}. Off: ${no}`)), 'How the group is drawn: as one, in the order of the list'));
  if (G.shapes.length && !G.shapes.some((s) => s.bone)) {
    const on = el('select', { onchange: () => { commit(() => { for (const s of G.shapes) { if (on.value) s.on = on.value; else delete s.on; } }); listParts(); } });
    for (const c of ['', 'spine', 'hip', 'chest', 'head']) on.append(el('option', { value: c, textContent: c || 'the box', selected: c === (G.shapes[0]?.on || '') }));
    const at = G.at || [0, 0];
    box.append(section('Place', [field('bone', on, 'The joint all its shapes are on'),
      field('pivot', stack(at.map((v, j) => numIn(v, (x) => { const q = (G.at || [0, 0]).slice(); q[j] = x; G.at = q; }, { label: 'xy'[j] }))), 'Drag the pivot: the group moves. ⌥-drag: the pivot alone.'),
      field('angle', numIn(G.angle || 0, (x) => { if (x) G.angle = x; else delete G.angle; }, { min: -3.14, max: 3.14, step: 0.01 }), 'Its shapes turned about the pivot'),
      el('div', { className: 'keys' }, iconBtn('pivot', 'Pivot to the middle', { title: 'The pivot in the middle of its shapes; they stay where they are', onclick: () => { commit(() => repivot(G, middleOf(G))); inspect(); } }))]));
  }
  const color = el('span', { className: 'keys' }, colorPick(G.color || build.fur, (c) => { commit(() => { if (c === build.fur) delete G.color; else G.color = c; }); listParts(); inspect(); }));
  box.append(section('Look', [field('color', color, 'Its color (its shapes’ own where they have one); the fur’s if none')]));
  box.append(section('Shapes', [el('div', { className: 'keys' },
    iconBtn('plus', 'Shape', { title: 'A shape in it: a copy of its last, moved a little', onclick: () => addShape(g) }),
    iconBtn('plus', 'Paint', { title: 'A marking on it: a shape in a color, only where the group is', onclick: () => addPaint(g) }),
    G.spikes ? iconBtn('x', 'Spikes', { title: 'No spikes', onclick: () => setSpikes(g, false) }) : iconBtn('plus', 'Spikes', { title: 'Spikes where it bristles: ticks out of its outline (specks inside)', onclick: () => setSpikes(g, true) }))],
    'Its shapes, markings and spikes: each picked in the list (under it) or on the stage'));
  fields(G, box, ['name', 'color', 'shapes', 'at', 'angle', 'paint', 'spikes', ...SWITCHES.map(([k]) => k)]);
}
// a setting: its name, what sets it (what it is: the tooltip, not a note under it). A number's name drags it, as its own
// does (see numIn)
export function field(label, input, note) {
  const name = el('span', { textContent: label }), f = el('label', { className: 'field' }, name, input);
  if (note) f.title = note;
  if (input.scrub) { name.classList.add('scrub'); name.addEventListener('pointerdown', input.scrub); }
  return f;
}
// the inspector in sections, as Figma has it: each setting in the one it belongs to, in this order
const SECTIONS = ['Place', 'Shape', 'Look', 'Motion', 'More'];
const SECTION_OF = {
  bone: 'Place', base: 'Shape', round: 'Shape', outline: 'Look', on: 'Place', at: 'Place', tip: 'Place', ear: 'Place', eye: 'Place', nose: 'Place', mouth: 'Place', angle: 'Place', bend: 'Place',
  thigh: 'Shape', shin: 'Shape', length: 'Shape', links: 'Shape', curl: 'Shape', r: 'Shape', ends: 'Shape', capsule: 'Shape', foot: 'Shape', smooth: 'Shape', end: 'Shape', tipSize: 'Shape', box: 'Shape',
  color: 'Look', fur: 'Look', noseColor: 'Look', tipColor: 'Look', socks: 'Look', speck: 'Look', marks: 'Look', grows: 'Look',
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
    if (COLOR_KEYS.includes(k)) { // (a shape's own color, an ear's tip: none, as it may be)
      input = el('span', { className: 'keys' }, colorPick(v, (c) => { commit(() => { o[k] = c; }); listParts(); inspect(); }));
      if (v && sel.type === 'item' && (k === 'color' || k === 'tipColor')) input.append(iconBtn('x', '', { title: 'None', onclick: () => { commit(() => { delete o[k]; }); listParts(); inspect(); } }));
    }
    else if (k === 'r' && o.bone && alongOf(o) === 'capsule') { // (a capsule: as thick at its root and at its end, or tapering; the same: one number)
      const pair = () => (Array.isArray(o.r) ? o.r : [o.r ?? 1, o.r ?? 1]);
      input = stack(['a', 'b'].map((lbl, j) => numIn(pair()[j], (x) => { const q = pair().slice(); q[j] = x; o.r = q[0] === q[1] ? q[0] : q; }, { min: 0, label: lbl })));
      put(k, field('r', input, 'How thick: at its root (a) and at its end (b)'));
      continue;
    } else if (k === 'foot') { // (a flat foot: its size; none: a round paw)
      input = v ? el('div', { className: 'keys' }, nums(o, k, null, ['rx', 'ry']), iconBtn('x', '', { title: 'No flat foot: a round paw', onclick: () => { commit(() => { delete o.foot; }); inspect(); } }))
        : el('input', { type: 'checkbox', title: 'A flat foot', onchange: () => { commit(() => { o.foot = [1.3, 0.6]; }); inspect(); } });
    } else if (k === 'bone') {
      input = el('select', { onchange: () => { commit(() => { o.bone = input.value; }); listParts(); inspect(); } });
      for (const c of ['spine', ...Object.keys(build.legs || {}), ...Object.keys(build.chains || {})]) input.append(el('option', { value: c, textContent: c, selected: c === v }));
    } else if (k === 'on') {
      input = el('select', { onchange: () => commit(() => { if (input.value) o.on = input.value; else delete o.on; }) });
      for (const c of ['', 'spine', 'hip', 'chest', 'head']) input.append(el('option', { value: c, textContent: c || 'the box', selected: c === (v || '') }));
    } else if (GEOMS.includes(k) && Array.isArray(v)) {
      const type = el('select', { onchange: () => commit(() => { const g = type.value; delete o[k]; o[g] = convert(v, k, g); }) });
      for (const g of GEOMS) type.append(el('option', { value: g, textContent: g, selected: g === k }));
      put(k, ...(sel.type === 'item' || sel.type === 'paint' ? [] : [field('shape', type)]), k === 'triangle' ? el('div', { className: 'numsWide' }, ...v.map((_, i) => nums(v, i, null, [`x${i + 1}`, `y${i + 1}`]))) : el('div', { className: 'numsWide' }, nums(o, k, k)));
      continue;
    } else if (typeof v === 'number') input = num(o, k);
    else if (typeof v === 'boolean') input = el('input', { type: 'checkbox', checked: v, onchange: () => commit(() => { o[k] = input.checked; }) });
    else if (typeof v === 'string') input = el('input', { type: 'text', value: v, onchange: () => commit(() => { o[k] = input.value; listParts(); }) });
    else if (Array.isArray(v) && v.every((x) => typeof x === 'number')) input = nums(o, k);
    else if (Array.isArray(v) && v.every((x) => Array.isArray(x) && x.every((y) => typeof y === 'number'))) input = el('div', {}, ...v.map((_, i) => nums(v, i)));
    else if (v && typeof v === 'object' && !Array.isArray(v) && Object.values(v).every((x) => typeof x === 'number' || typeof x === 'boolean')) {
      const inner = el('div'); fields(v, inner, [], true); put(k, el('div', { className: 'group', textContent: k }), inner); continue;
    } else input = json(o, k);
    put(k, field(k === 'on' ? 'bone' : k, input));
  }
  if (!flat) for (const t of SECTIONS) if (into[t]) box.append(section(t, into[t]));
}
// a number to set, as Figma has it: a box with its name in it (drag the name, or the setting's: on by step a pixel, ⇧ ten
// times as fast, ⌥ a tenth; the arrow keys in the box: a step), live as it goes (one undo for the drag). A slider beside
// it only for a setting between a least and a most (min and max). whole: whole numbers; commit: set makes its own undo
// and redraws
export function numIn(value, set, { step = 0.1, min, max, whole = false, commit: own = false, label } = {}) {
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
export const stack = (inputs) => el('div', { className: 'nums' }, ...inputs);
// a list of numbers (a place; a shape's numbers: its radii from 0)
const RADII = { ellipse: [2, 3], capsule: [4], box: [4] };
const LABELS = { ellipse: ['x', 'y', 'rx', 'ry'], capsule: ['ax', 'ay', 'bx', 'by', 'r'], box: ['x0', 'y0', 'x1', 'y1', 'r'] };
export const numName = (labels, n, j) => labels?.[j] ?? (n === 2 ? 'xy'[j] : `${j + 1}`);
const nums = (o, k, geom, labels = LABELS[geom]) => stack(o[k].map((_, j) => numIn(o[k][j], (x) => { o[k][j] = x; }, { ...(RADII[geom]?.includes(j) && { min: 0 }), label: numName(labels, o[k].length, j) })));
const json = (o, k) => { const i = el('input', { type: 'text', value: JSON.stringify(o[k]) }); i.onchange = () => { try { const v = JSON.parse(i.value); commit(() => { o[k] = v; }); } catch { i.style.borderColor = 'red'; } }; return i; };
// a capsule's or a triangle's points turned by a about their middle
function turnedAbout(v, g, a) {
  const pts = g === 'capsule' ? [[v[0], v[1]], [v[2], v[3]]] : v, c = [pts.reduce((x, q) => x + q[0], 0) / pts.length, pts.reduce((x, q) => x + q[1], 0) / pts.length];
  const t = pts.map(([x, y]) => [+(c[0] + (x - c[0]) * Math.cos(a) - (y - c[1]) * Math.sin(a)).toFixed(2), +(c[1] + (x - c[0]) * Math.sin(a) + (y - c[1]) * Math.cos(a)).toFixed(2)]);
  return g === 'capsule' ? [...t[0], ...t[1], v[4]] : t;
}
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

// ------------------------------------------------------------------------------------------------- skins and helpers
// the root: for a skin, what it is made from and its colors swapped (its own: all a skin has); for an animal, its skins
function rootMore(box) {
  if (skin) {
    box.append(el('div', { className: 'group', title: `A skin of the ${base}: its bones, shapes, moves and handling are the ${base}’s (editing them changes both). Its own: its colors, one for another.` }, el('span', { textContent: 'Skin' })));
    recolors(box, skin);
    return;
  }
  box.append(el('div', { className: 'group', title: 'A skin: this animal with its colors swapped (the wolf: the fox in grey)' }, el('span', { textContent: 'Skins' })));
  const list = skinsOf(base);
  if (!list.length) box.append(el('p', { className: 'note', textContent: 'none' }));
  for (const k of list) box.append(el('div', { className: 'row', onclick: () => choose(k) }, el('span', { textContent: k }), el('span', { className: 'what', textContent: Object.entries(builds[k].recolor || {}).map(([a, b]) => `${nice(a)} → ${nice(b)}`).join(', ') })));
  box.append(el('div', { className: 'keys' },
    iconBtn('plus', 'New skin…', { onclick: newSkin }),
    iconBtn('plus', 'New animal from this…', { title: 'A new animal: a copy of this one, to change as it likes (in the editor only, till the game is given it)', onclick: newAnimal })));
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
const farGroups = () => layers().filter((G) => isGroup(G) && G.far);
const shapesOn = (bone) => layers().filter(isGroup).flatMap((G) => G.shapes.map((s, i) => ({ s, i, arr: G.shapes }))).filter((x) => x.s.bone === bone);
function eachPose(fn) { for (const [name, m] of Object.entries(build.moves || {})) { fn(m, name); for (const k of m.keys || []) fn(k, name); } } // (a gait's own pose, and each key of a clip)
function farSide(box) {
  if (view.move !== 'edit') return;
  if (sel.type === 'leg') {
    const n = sel.name, L = build.legs[n], behind = (m) => farGroups().some((G) => G.shapes.some((x) => x.bone === m)), f = !behind(n) && farName(n, build.legs), twin = Object.keys(build.legs).some((m) => m !== n && behind(m) && build.legs[m].on === L.on);
    if (!f || twin) return;
    box.append(el('div', { className: 'group' }, el('span', { textContent: 'Far side' })), el('button', { textContent: `+ Far leg (${f})`, title: 'A leg behind this one, as the cat has them: a pixel forward, a little thinner, in every move', onclick: () => {
      commit(() => {
        after(build.legs, n, f, { ...JSON.parse(JSON.stringify(L)), at: by(L.at, FAR_LEG) });
        const near = shapesOn(n)[0]?.s; // (its shape in the far legs' group, a little thinner; none: one made, before the body)
        if (near) {
          const far = { ...JSON.parse(JSON.stringify(near)), name: f, bone: f, r: round3(Math.max(0.3, (near.r ?? 1) - 0.1)) }, into = farGroups().find((G) => G.shapes.some((x) => build.legs[x.bone]));
          delete far.smooth;
          if (into) into.shapes.push(far); else layers().splice(Math.max(0, bodyIndex()), 0, { name: 'far legs', far: true, hits: true, shapes: [far] });
        }
        eachPose((p, move) => {
          for (const part of ['paws', 'roots']) if (p[part]?.[n]) after(p[part], n, f, by(p[part][n], FAR_LEG));
          const g = p.gait?.legs?.[n];
          if (g) after(p.gait.legs, n, f, Array.isArray(g) ? [round3((g[0] + (move === 'duck' ? 0.5 : 0.1)) % 1), g[1]] : JSON.parse(JSON.stringify(g)));
        });
        setSel({ type: 'leg', name: f });
      });
      refresh();
    } }));
  } else {
    const n = sel.name, c = build.chains[n], ears = Object.values(build.chains).filter((o) => o.ear && o.on === c.on), f = c.ear && ears.length === 1 && farName(n, build.chains);
    if (!f) return;
    box.append(el('div', { className: 'group' }, el('span', { textContent: 'Far side' })), el('button', { textContent: `+ Far ear (${f})`, title: 'The other ear, behind this one, as the squirrel has it: on along the head, a little lower, in every move', onclick: () => {
      commit(() => {
        after(build.chains, n, f, { ...JSON.parse(JSON.stringify(c)), at: by(c.at, FAR_EAR), tip: by(c.tip, FAR_EAR) });
        for (const near of shapesOn(n).reverse()) near.arr.splice(near.i + 1, 0, { ...JSON.parse(JSON.stringify(near.s)), name: f, bone: f }); // (beside each of its own)
        eachPose((p) => { const t = p.chains?.[n]; if (t) after(p.chains, n, f, { ...t, ...(t.tip && { tip: by(t.tip, FAR_EAR) }) }); });
        setSel({ type: 'chain', name: f });
      });
      refresh();
    } }));
  }
}

