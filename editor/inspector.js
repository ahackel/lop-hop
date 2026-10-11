// The inspector (see editor.js): the part picked, each of its settings in its section; a skin's colors, the far side
import { $, el, iconBtn } from './dom.js';
import { faceFrames } from './face.js';
import { inspectPlay } from './handling.js';
import { addChild, addShapeOn, itemDo, listParts, rename } from './lists.js';
import { colorPick, inspectPalette } from './palette.js';
import { BONE_LAYERS, boneDefaults, boneKind, current, middleOf, parts, repivot, shapeOn, withDefaults } from './parts.js';
import { draw } from './stage.js';
import { COLOR_KEYS, GEOMS, LAYERS, base, build, builds, changed, choose, commit, editable, kind, nice, paints, refresh, remember, sel, skin, skinsOf, status, view, setSel } from './state.js';
import { inspectMove, timeline } from './timeline.js';

export function inspect() {
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
      const layer = el('select', { onchange: () => itemDo('layer', layer.value) }), may = o.bone ? BONE_LAYERS[boneKind(o)] || [sel.list] : Object.keys(LAYERS).filter((k) => k !== 'back');
      for (const [k, t] of Object.entries(LAYERS)) if (may.includes(k)) layer.append(el('option', { value: k, textContent: t, selected: k === sel.list }));
      head.push(field('layer', layer, { back: 'Behind: behind the body, outlined on its own (a far leg: in the far tone, counts for hits)', shapes: 'Body: joined into it, outlined, counts for hits', paint: 'Paint: colors the body', top: 'On top: outlined, over the body, no hits' }[sel.list]));
    }
    box.append(section('Layer', head));
  }
  if (sel.type === 'joint') { box.append(field('place', nums(o, sel.name))); return; }
  if (sel.type === 'item' && o.bone) { fields(withDefaults(o, boneDefaults(o, sel.list)), box, ['name']); return; } // (a shape on a bone: all it can be)
  if (sel.type === 'item' && sel.list === 'top' && sel.j === undefined) { groupFields(o, box); return; }
  const skip = sel.type === 'rig' ? ['joints', 'back', 'shapes', 'paint', 'top', 'dots', 'legs', 'chains', 'face', 'spikes', 'moves', 'handling', 'recolor']
    : sel.type === 'item' ? ['name', ...(sel.j !== undefined ? ['on'] : [])] : []; // (a shape in a group: on its group's joint)
  fields(o, box, sel.type === 'face' ? ['frames'] : skip);
  if (sel.type === 'face') faceFrames(box);
  if (sel.type === 'rig') rootMore(box);
  if (sel.type === 'leg' || sel.type === 'chain') { itsShape(box); farSide(box); }
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
export function field(label, input, note) {
  const name = el('span', { textContent: label }), f = el('label', { className: 'field' }, name, input);
  if (note) f.title = note;
  if (input.scrub) { name.classList.add('scrub'); name.addEventListener('pointerdown', input.scrub); }
  return f;
}
// the inspector in sections, as Figma has it: each setting in the one it belongs to, in this order
const SECTIONS = ['Place', 'Shape', 'Look', 'Motion', 'More'];
const SECTION_OF = {
  bone: 'Place', base: 'Shape', round: 'Shape', outline: 'Look', on: 'Place', at: 'Place', tip: 'Place', ear: 'Place', eye: 'Place', eyes: 'Place', nose: 'Place', mouth: 'Place', angle: 'Place', bend: 'Place',
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
    else if (k === 'foot') { // (a flat foot: its size; none: a round paw)
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
// a bone's shape (what is drawn on it): picked from the bone; none, one made (as the others are)
function itsShape(box) {
  if (view.move !== 'edit') return;
  const n = sel.name, on = shapeOn(n);
  if (on) { box.append(section('Shape', [el('div', { className: 'keys' }, el('button', { textContent: `${on.s.name || n} (${LAYERS[on.list]})`, title: 'The shape on this bone: what is drawn of it', onclick: () => { setSel({ type: 'item', list: on.list, i: on.i }); listParts(); inspect(); draw(); } }))])); return; }
  box.append(section('Shape', [el('div', { className: 'keys' }, iconBtn('plus', 'Its shape', { title: 'Nothing is drawn on this bone: a shape on it', onclick: () => addShapeOn(n) }))], 'Nothing is drawn on this bone'));
}
function farSide(box) {
  if (view.move !== 'edit') return;
  if (sel.type === 'leg') {
    const n = sel.name, L = build.legs[n], behind = (m) => (build.back || []).some((x) => x.bone === m), f = !behind(n) && farName(n, build.legs), twin = Object.keys(build.legs).some((m) => m !== n && behind(m) && build.legs[m].on === L.on);
    if (!f || twin) return;
    box.append(el('div', { className: 'group' }, el('span', { textContent: 'Far side' })), el('button', { textContent: `+ Far leg (${f})`, title: 'A leg behind this one, as the cat has them: a pixel forward, a little thinner, in every move', onclick: () => {
      commit(() => {
        after(build.legs, n, f, { ...JSON.parse(JSON.stringify(L)), at: by(L.at, FAR_LEG) });
        const near = shapeOn(n)?.s; // (its shape behind the body, a little thinner)
        if (near) { const far = { ...JSON.parse(JSON.stringify(near)), name: f, bone: f, r: round3(Math.max(0.3, (near.r ?? 1) - 0.1)) }; delete far.smooth; (build.back ||= []).push(far); }
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
        const near = shapeOn(n);
        if (near) build[near.list].splice(near.i + 1, 0, { ...JSON.parse(JSON.stringify(near.s)), name: f, bone: f });
        eachPose((p) => { const t = p.chains?.[n]; if (t) after(p.chains, n, f, { ...t, ...(t.tip && { tip: by(t.tip, FAR_EAR) }) }); });
        setSel({ type: 'chain', name: f });
      });
      refresh();
    } }));
  }
}

