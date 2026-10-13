// The inspector (see editor.js): the part picked, each of its settings in its section; a skin's colors, the far side
import { $, el, iconBtn, segmented, svg } from './dom.js';
import { faceFrames } from './face.js';
import { inspectPlay } from './handling.js';
import { SWITCHES, addDot, addPaint, addShape, bodyIndex, itemDo, layers, setSpikes, swingOff, swingOn, swingable, switchOn, switchesNow, toggle } from './layers.js';
import { listParts, reparent } from './lists.js';
import { colorPick } from './palette.js';
import { ALONG, ON_BONE, alongOf, boneChoices, boneDefaults, current, geomOf, isOwn, middleOf, onChoices, ownChain, parts, repivot, withDefaults } from './parts.js';
import { COLOR_KEYS, GEOMS, GROUP_SWING, also, base, build, builds, changed, choose, commit, editable, isGroup, isProp, kind, folderOf, newAnimal, newProp, newSkin, nice, paints, refresh, remember, sel, skin, skinsOf, status, view, setSel } from './state.js';
import { inspectMove, timeline } from './timeline.js';
import { addBone, deleteBone, reachChoices, reachTo, renameBone, reparentBone, under } from './bones.js';
import { TIPS, unitOf } from './tips.js';
import { numField } from './num.js';

export function inspect() {
  const box = $('inspector'); box.textContent = '';
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
    const head = []; // (its name: renamed in its row, see lists.js)
    if (t === 'item' && !isProp()) head.push(field('bone', attach(o), 'The bone it is on: a joint (in its frame; the box: none), or a bone it is drawn along (as the pose has it)'));
    if (t === 'item' || t === 'paint') head.push(field('shape', shapeKind(o), o.bone ? 'What it is drawn as along its bone' : 'What it is: fitted to where it was'));
    if (head.length) box.append(section('', head)); // (what it is and where: no title, as Figma has its top row)
  }
  if (t === 'bone') { boneFields(sel.name, o, box, title); return; }
  if (t === 'joint') {
    box.append(field('place', nums(o, sel.name)));
    box.append(el('div', { className: 'keys' }, iconBtn('plus', 'Bone', { title: `A new bone on the ${sel.name}: what is on it goes with it, and it turns in a move`, onclick: () => addBone(sel.name) })));
    if (sel.name === 'head') { // (what it turns about)
      const pv = () => build.headPivot || [0, 0], put = (q) => { if (q[0] || q[1]) build.headPivot = q; else delete build.headPivot; };
      box.append(field('pivot', stack(pv().map((v, j) => numIn(v, (x) => { const q = pv().slice(); q[j] = x; put(q); }, { label: 'XY'[j], unit: 'px' }))), 'What it turns about, from the joint: where the neck meets it (drag the ring by the joint)'));
    }
    return;
  }
  if (t === 'group') { groupFields(o, box); return; }
  if (t === 'item' && o.bone) { // (a shape on a bone: all it can be; a bone of its own: that too)
    fields(withDefaults(o, boneDefaults(o)), box, ['name', 'bone', 'along']);
    const own = ownChain(o);
    if (own) box.append(section('Swing', chainFields(o.name, own), SWING_TIP, [swingBtn(o, true)]));
    return;
  }
  if (t === 'item') { // (an ellipse, a box: turned)
    fields(withDefaults(o, { color: undefined, ...(!isProp() && { smooth: 1 }), ...((o.ellipse || o.box) && { angle: 0 }) }), box, ['name', 'on']);
    if (!isProp()) box.append(section('Swing', [], SWING_TIP, [swingBtn(o, false)]));
    return;
  }
  const skip = t === 'rig' ? ['joints', 'headPivot', 'layers', 'dots', 'legs', 'chains', 'face', 'moves', 'handling', 'recolor'] : t === 'paint' || t === 'dot' ? ['name'] : t === 'leg' || t === 'chain' ? ['on'] : []; // (a bone's joint: dragged onto another in the list)
  fields(o, box, t === 'face' ? ['frames'] : skip);
  if (t === 'face') faceFrames(box);
  if (t === 'rig' && isProp()) box.append(el('div', { className: 'keys' }, iconBtn('plus', `New ${folderOf() === 'food' ? 'food' : 'obstacle'} from this…`, { title: `A new ${folderOf() === 'food' ? 'food' : 'obstacle (a variant: the same name, a number after it)'}: a copy of this one, to change as it likes`, onclick: () => newProp(folderOf()) })));
  else if (t === 'rig') rootMore(box);
  if (t === 'leg' || t === 'chain') farSide(box);
}
// the bone a shape is on: a joint (in its frame; the box: none) or a bone it is drawn along (what it is kept: an ellipse
// along it, from an ellipse; off one again: one where the joint is)
const AT_JOINT = { ellipse: [0, 0, 2, 1.5], capsule: [-1.5, 0, 1.5, 0, 1], box: [-2, -1.5, 2, 1.5, 0.5], triangle: [[-1.5, 1], [0, -1.5], [1.5, 1]] };
const clone = (v) => JSON.parse(JSON.stringify(v));
function attach(o) {
  const now = o.bone ? `bone:${o.bone}` : `on:${o.on || ''}`, opt = (v, label) => el('option', { value: v, textContent: label, selected: v === now });
  const input = el('select', { onchange: () => { const [how, n] = input.value.split(':'); commit(() => reattach(o, how, n)); listParts(); inspect(); } });
  input.append(el('optgroup', { label: 'a joint, a leg’s part' }, opt('on:', 'the box'), ...onChoices().slice(1).map((j) => opt(`on:${j}`, j.replace('.', ' ')))),
    el('optgroup', { label: 'drawn along a bone' }, ...boneChoices().filter((n) => !isOwn(n) || n === o.bone).map((n) => opt(`bone:${n}`, n === o.bone && isOwn(n) ? `${n} (its swing)` : n))));
  return input;
}
// a swing: a shape's own bone (see ownChain): the joint it hangs from (moved onto another: where it is, see reparent), its role,
// its settings
const ROLES = [['', 'none', 'Only swung'], ['tail', 'tail', 'Wagged when petted'], ['ear', 'ear', 'Laid back when petted (a pointed one); a lop ear hangs as the head turns up'], ['trunk', 'trunk', 'Reaches for a treat; eats from its tip']];
const GROUP_ROLES = ROLES.filter(([v]) => v === '' || v === 'ear');
function roleSelect(o, roles) {
  const input = el('select', { onchange: () => { commit(() => { if (input.value) o.role = input.value; else delete o.role; }); inspect(); } });
  for (const [v, label, tip] of roles) input.append(el('option', { value: v, textContent: label, title: tip, selected: v === (o.role || '') }));
  return field('role', input, roles.map(([, l, tip]) => `${l}: ${tip}`).join('\n'));
}
const SWING_TIP = 'Swung as the body moves, on a bone of its own made from it: a capsule bends from its first point to its second (a tail, a strand of hair), a triangle swings from its base (an ear), an ellipse or a box swings from below its middle. Off: the shape it is at rest';
function swingBtn(o, on) {
  const no = !on && swingable(o);
  return iconBtn(on ? 'minus' : 'plus', '', { disabled: !!no, title: no || (on ? 'Not swung: the shape it is at rest' : `Swung: ${SWING_TIP}`), onclick: () => { commit(() => (on ? swingOff(o) : swingOn(o))); listParts(); inspect(); } });
}
// how floppy a swing is, one number for its three (0: stiff and quick as an ear, 1: loose and heavy); its three
// themselves behind ⚙
const STIFF = { stiffness: 1600, damping: 30, weight: 20 }, FLOPPY = { stiffness: 60, damping: 6, weight: 140 };
const floppyOf = (c) => Math.max(0, Math.min(1, Math.log(STIFF.stiffness / (c.stiffness || 1)) / Math.log(STIFF.stiffness / FLOPPY.stiffness)));
function physics(c, defaults, key) {
  const now = () => ({ ...defaults, ...c }), out = [];
  const floppy = numIn(floppyOf(now()), (f) => {
    c.stiffness = Math.round(STIFF.stiffness * (FLOPPY.stiffness / STIFF.stiffness) ** f);
    c.damping = +(STIFF.damping + (FLOPPY.damping - STIFF.damping) * f).toFixed(1);
    c.weight = Math.round(STIFF.weight + (FLOPPY.weight - STIFF.weight) * f);
  }, { min: 0, max: 1, step: 0.02, ...unitOf('floppy') });
  out.push(el('div', { className: 'withGear' }, field('floppy', floppy), gearBtn(key)));
  if (raw.has(key)) for (const k of ['stiffness', 'damping', 'weight']) out.push(field(k, numIn(now()[k], (x) => { c[k] = x; }, { min: 0, max: Math.max(k === 'stiffness' ? 3000 : k === 'damping' ? 80 : 300, now()[k] * 2), step: k === 'stiffness' ? 10 : 1 })));
  return out;
}
// ⚙: the numbers a setting is made from, shown or not (kept while the editor is open)
export function gearBtn(key, tip = 'the numbers this is made from') {
  return iconBtn('gear', '', { className: `rawBtn${raw.has(key) ? ' on' : ''}`, title: `${raw.has(key) ? 'Hide' : 'Show'} ${tip}`, onclick: () => { if (!raw.delete(key)) raw.add(key); inspect(); } });
}
// a bone: its name, what it is on (a joint, a bone, a leg's part; the box), where (its root there), its turn, how long it
// is (a shape drawn along it: so long); a bone on it, or none
function boneFields(n, B, box, title) {
  title.append(el('span', { className: 'acts' }, iconBtn('trash', '', { title: 'Delete (⌫): what is on it stays where it is, on what it was on', onclick: () => deleteBone(n) })));
  const name = el('input', { type: 'text', value: n, onchange: () => renameBone(n, name.value) });
  const on = el('select', { onchange: () => reparentBone(n, on.value) }), no = under(n);
  for (const c of onChoices().filter((x) => !no.has(x))) on.append(el('option', { value: c, textContent: c.replace('.', ' ') || 'the box', selected: c === (B.on || '') }));
  const reaches = el('select', { onchange: () => { commit(() => reachTo(n, reaches.value)); inspect(); } });
  for (const c of ['', ...reachChoices(n)]) reaches.append(el('option', { value: c, textContent: c || 'nothing', selected: c === (B.to || '') }));
  const xy = (k) => stack((B[k] || [0, 0]).map((v, j) => numIn(v, (x) => { const q = (B[k] || [0, 0]).slice(); q[j] = x; B[k] = q; }, { label: 'XY'[j], unit: 'px' })));
  const bend = segmented([[1, 'bendUp', 'Bowed up / back'], [0, 'straight', 'Straight'], [-1, 'bendDown', 'Bowed down / forward']], B.bend || 0, (v) => { commit(() => { if (v) B.bend = v; else delete B.bend; }); inspect(); });
  box.append(section('Bone', [field('name', name, 'Its name: what is on it, and its keys in the moves, go by it'), field('on', on, 'What it is on: it goes with it (where it is, kept)'),
    field('at', xy('at'), 'Where it is on what it is on (in its frame)'),
    field('reaches', reaches, 'A joint or a bone it reaches: from where it is to its end there, wherever a pose puts it, bowed to keep its length (a neck reaching the head)'),
    ...(B.to ? [field('end', xy('end'), 'Where it ends on what it reaches (in its frame)'),
      field('bend', bend, 'Which way it bows when what it reaches comes nearer (as it goes from its root to its end)'),
      field('links', numIn(B.links || 2, (x) => { if (x === 2) delete B.links; else B.links = x; }, { step: 1, min: 1, max: 12, whole: true }), 'How smooth its bow: so many straight parts')]
      : [field('angle', numIn(B.angle || 0, (x) => { B.angle = x; }, { min: -3.14, max: 3.14, step: 0.01, ...unitOf('angle') }), 'Its turn on what it is on, + clockwise; a move turns it from there')]),
    field('length', numIn(B.length || 0, (x) => { B.length = x; }, { min: 0, unit: 'px' }), B.to ? 'How long it is along its bow: further apart than that, it stretches straight' : 'How long it is: a shape drawn along it is so long (none: a joint, only turned)'),
    el('div', { className: 'keys' }, iconBtn('plus', 'Bone', { title: 'A new bone on this one, at its end', onclick: () => addBone(n) }))], 'A bone of its own: shapes, swings, legs and bones go on it'));
}
// a group that swings: all of it, about its pivot, as the body moves (see swungGroup in art.js); on, its pivot at the top
// of its shapes if it had none (where things hang from: drag it), its settings
const GROUP_SWING_TIP = 'All of it swung about its pivot as the body moves (drag the pivot to where it hangs from)';
function groupSwing(G) {
  const on = !!G.swing, btn = iconBtn(on ? 'minus' : 'plus', '', { title: on ? 'Not swung' : `Swung: ${GROUP_SWING_TIP}`, onclick: () => {
    commit(() => {
      if (on) { delete G.swing; return; }
      G.swing = {};
      if (!G.at) { const m = middleOf(G), top = Math.min(...G.shapes.flatMap((x) => { const g = geomOf(x), v = x[g]; return g === 'triangle' ? v.map((q) => q[1]) : g === 'ellipse' ? [v[1] - v[3]] : [v[1], v[3]].map((y) => y - (g === 'capsule' ? v[4] : 0)); })); repivot(G, [m[0], +top.toFixed(3)]); }
    });
    listParts(); inspect();
  } });
  return [btn, on ? [roleSelect(G.swing, GROUP_ROLES), ...physics(G.swing, GROUP_SWING, `groupSwing:${sel.g}`)] : []];
}
function chainFields(n, c) {
  const on = el('select', { onchange: () => reparent({ type: 'chain', name: n }, on.value) });
  for (const j of [...Object.keys(build.joints), ...Object.keys(build.bones || {})]) on.append(el('option', { value: j, textContent: j, selected: j === c.on }));
  const inner = el('div');
  fields(c.ear ? c : withDefaults(c, { links: 1, curl: 0 }), inner, ['on', 'role', 'ear', 'stiffness', 'damping', 'weight'], true);
  return [field('joint', on, 'The joint it hangs from'), roleSelect(c, ROLES), ...physics(c, {}, `swing:${n}`), ...inner.childNodes];
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
const KIND_TIPS = { ellipse: 'An ellipse', capsule: 'A capsule: a line with round ends', box: 'A box, its corners as round as it likes', triangle: 'A triangle' };
function shapeKind(o) {
  const now = o.bone ? alongOf(o) : geomOf(o);
  return segmented(GEOMS.map((g) => [g, g, `${KIND_TIPS[g]}${g === now ? '' : ': it becomes one, about where it is'}`]), now, (g) => { commit(() => reshape(o, g)); listParts(); inspect(); });
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
  box.append(section('Drawn', [el('div', { className: 'toggles' }, ...switchesNow().map(([k, ic, yes, no, label]) => { const on = switchOn(G, k); return el('button', { type: 'button', className: `tog${on ? ' on' : ''}`, title: `${on ? yes : no}. Click: ${on ? no.toLowerCase() : yes.toLowerCase()}`, innerHTML: svg(ic), onclick: () => toggle(g, k) }, el('span', { textContent: label })); }))], 'How the group is drawn: as one, in the order of the list'));
  if (G.shapes.length && !G.shapes.some((s) => s.bone) && !isProp()) {
    const on = el('select', { onchange: () => { commit(() => { for (const s of G.shapes) { if (on.value) s.on = on.value; else delete s.on; } }); listParts(); } });
    for (const c of onChoices()) on.append(el('option', { value: c, textContent: c.replace('.', ' ') || 'the box', selected: c === (G.shapes[0]?.on || '') }));
    const at = G.at || [0, 0];
    box.append(section('Place', [field('bone', on, 'The joint all its shapes are on'),
      field('pivot', stack(at.map((v, j) => numIn(v, (x) => { const q = (G.at || [0, 0]).slice(); q[j] = x; G.at = q; }, { label: 'XY'[j], unit: 'px' }))), 'Drag the pivot: the group moves. ⌥-drag: the pivot alone.'),
      field('angle', numIn(G.angle || 0, (x) => { if (x) G.angle = x; else delete G.angle; }, { min: -3.14, max: 3.14, step: 0.01, ...unitOf('angle') }), 'Its shapes turned about the pivot'),
      el('div', { className: 'keys' }, iconBtn('pivot', 'Pivot to the middle', { title: 'The pivot in the middle of its shapes; they stay where they are', onclick: () => { commit(() => repivot(G, middleOf(G))); inspect(); } }))]));
    const [btn, els] = groupSwing(G);
    box.append(section('Swing', els, GROUP_SWING_TIP, [btn]));
  }
  const color = el('span', { className: 'keys' }, colorPick(G.color || build.fur, (c) => { commit(() => { if (c === build.fur) delete G.color; else G.color = c; }); listParts(); inspect(); }));
  const outline = isProp() && G.outline !== false && el('span', { className: 'keys' }, colorPick(G.outline || 'outline', (c) => { commit(() => { if (c === 'outline') delete G.outline; else G.outline = c; }); inspect(); }));
  box.append(section('Look', [field('color', color, 'Its color (its shapes’ own where they have one); the fur’s if none'), ...(outline ? [field('outline', outline, 'The color it is outlined in')] : [])]));
  box.append(section('Shapes', [el('div', { className: 'keys' },
    iconBtn('plus', 'Shape', { title: 'A shape in it: a copy of its last, moved a little', onclick: () => addShape(g) }),
    iconBtn('plus', 'Paint', { title: 'A marking on it: a shape in a color, only where the group is', onclick: () => addPaint(g) }),
    isProp() ? iconBtn('plus', 'Dot', { title: 'A single pixel, drawn after its shapes and paint', onclick: () => addDot(g) }) : G.spikes ? iconBtn('x', 'Spikes', { title: 'No spikes', onclick: () => setSpikes(g, false) }) : iconBtn('plus', 'Spikes', { title: 'Spikes where it bristles: ticks out of its outline (specks inside)', onclick: () => setSpikes(g, true) }))],
    'Its shapes, markings and spikes: each picked in the list (under it) or on the stage'));
  fields(G, box, ['name', 'color', 'shapes', 'at', 'angle', 'paint', 'spikes', 'swing', 'dots', ...SWITCHES.map(([k]) => k)]);
}
// a setting: its name, what sets it (what it is: the tooltip, not a note under it). A number's name drags it, as its own
// does (see numIn)
export function field(label, input, note = TIPS[label]) {
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
const sectionOf = (k) => (GEOMS.includes(k) ? 'Place' : SECTION_OF[k] || 'More');
function section(title, els, tip, acts = []) {
  const s = el('div', { className: 'section' }, ...(title || acts.length ? [el('div', { className: 'sectionTitle', ...(tip && { title: tip }) }, el('span', { textContent: title }), ...(acts.length ? [el('span', { className: 'acts' }, ...acts)] : []))] : []));
  s.append(...els);
  return s;
}
// an editor for each of an object's settings, by what it holds, in sections (flat: all in the box, as they come)
function fields(o, box, skip, flat = false) {
  const into = {}, put = (k, ...els) => { if (flat) box.append(...els); else (into[sectionOf(k)] ||= []).push(...els); };
  const shaped = GEOMS.some((g) => Array.isArray(o[g]));
  for (const k of Object.keys(o)) {
    if (skip.includes(k) || (k === 'angle' && shaped)) continue; // (a shape's turn: with its place)
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
      for (const c of boneChoices()) input.append(el('option', { value: c, textContent: c, selected: c === v }));
    } else if (k === 'on') {
      input = el('select', { onchange: () => commit(() => { if (input.value) o.on = input.value; else delete o.on; }) });
      for (const c of onChoices()) input.append(el('option', { value: c, textContent: c.replace('.', ' ') || 'the box', selected: c === (v || '') }));
    } else if (GEOMS.includes(k) && Array.isArray(v)) {
      put(k, ...(sel.type === 'item' || sel.type === 'paint' ? [] : [field('shape', shapeKind(o))]), ...placeBlock(o, k));
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
// a number to set (see num.js): live as it goes (one undo for the drag); commit: set makes its own undo and redraws
export function numIn(value, set, { commit: own = false, ...o } = {}) {
  let live = false;
  return numField(value, { ...o,
    live: (x) => { if (own) return; if (!live) { remember(); live = true; } set(x); changed(); },
    done: (x) => { if (own) set(x); else if (live) { live = false; timeline(); listParts(); status(); } },
    set: (x) => { if (own) set(x); else commit(() => set(x)); },
  });
}
// how a setting's slider goes, by its name (sizes from 0; counts in whole numbers)
const SIZES = ['r', 'ends', 'thigh', 'shin', 'length', 'end', 'smooth', 'stiffness', 'damping', 'weight', 'tipSize'], WHOLE = ['links'];
const optsFor = (k) => ({ ...(WHOLE.includes(k) ? { step: 1, min: 1, max: 12, whole: true } : SIZES.includes(k) ? { min: 0 } : {}), ...unitOf(k) });
const num = (o, k) => numIn(o[k], (x) => { o[k] = x; }, optsFor(k));
// numbers in pairs (x and y side by side, as Figma has them), each with its name in its box (see numIn)
export const stack = (inputs) => el('div', { className: 'nums' }, ...inputs);
// a list of numbers (a place; a shape's numbers: its radii from 0)
const RADII = { ellipse: [2, 3], capsule: [4], box: [4] };
const LABELS = { ellipse: ['x', 'y', 'rx', 'ry'], capsule: ['ax', 'ay', 'bx', 'by', 'r'], box: ['x0', 'y0', 'x1', 'y1', 'r'] };
export const numName = (labels, n, j) => labels?.[j] ?? (n === 2 ? 'xy'[j] : `${j + 1}`);
const nums = (o, k, geom, labels = LABELS[geom]) => stack(o[k].map((_, j) => numIn(o[k][j], (x) => { o[k][j] = x; }, { ...(RADII[geom]?.includes(j) && { min: 0 }), label: numName(labels, o[k].length, j), unit: 'px' })));
const json = (o, k) => { const i = el('input', { type: 'text', value: JSON.stringify(o[k]) }); i.onchange = () => { try { const v = JSON.parse(i.value); commit(() => { o[k] = v; }); } catch { i.style.borderColor = 'red'; } }; return i; };
// a shape's place as Figma has it, whatever it is: its middle (X, Y), its size (W, H), its turn (↻: an ellipse's, a box's
// angle; a capsule's from a to b) and a box's corners (◜); set, the shape made so. ⋯: its own numbers too
const R3 = (n) => +n.toFixed(3);
export const raw = new Set(); // (the ⚙s open: their numbers shown)
function frameOf(o, g) {
  const v = o[g];
  if (g === 'ellipse') return { x: v[0], y: v[1], w: 2 * v[2], h: 2 * v[3], rotation: o.angle || 0 };
  if (g === 'box') return { x: (v[0] + v[2]) / 2, y: (v[1] + v[3]) / 2, w: Math.abs(v[2] - v[0]), h: Math.abs(v[3] - v[1]), rotation: o.angle || 0, radius: v[4] ?? 0 };
  if (g === 'capsule') return { x: (v[0] + v[2]) / 2, y: (v[1] + v[3]) / 2, w: Math.hypot(v[2] - v[0], v[3] - v[1]) + 2 * v[4], h: 2 * v[4], rotation: Math.atan2(v[3] - v[1], v[2] - v[0]) };
  const xs = v.map((q) => q[0]), ys = v.map((q) => q[1]), [x0, x1, y0, y1] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)];
  return { x: (x0 + x1) / 2, y: (y0 + y1) / 2, w: x1 - x0, h: y1 - y0 };
}
function setFrame(o, g, f) {
  const into = (k, v) => o[k].splice(0, o[k].length, ...v), turn = () => { if (Math.abs(f.rotation) < 1e-4) delete o.angle; else o.angle = R3(f.rotation); };
  if (g === 'ellipse') { into('ellipse', [R3(f.x), R3(f.y), R3(Math.max(0.1, f.w / 2)), R3(Math.max(0.1, f.h / 2))]); turn(); }
  else if (g === 'box') { const [a, b] = [o.box[0] <= o.box[2] ? -1 : 1, o.box[1] <= o.box[3] ? -1 : 1]; into('box', [R3(f.x + (a * f.w) / 2), R3(f.y + (b * f.h) / 2), R3(f.x - (a * f.w) / 2), R3(f.y - (b * f.h) / 2), R3(Math.max(0, f.radius))]); turn(); }
  else if (g === 'capsule') {
    const r = Math.max(0.1, f.h / 2), half = Math.max(0, f.w - 2 * r) / 2, d = [Math.cos(f.rotation) * half, Math.sin(f.rotation) * half];
    into('capsule', [R3(f.x - d[0]), R3(f.y - d[1]), R3(f.x + d[0]), R3(f.y + d[1]), R3(r)]);
  } else {
    const was = frameOf(o, g), k = [was.w ? f.w / was.w : 1, was.h ? f.h / was.h : 1];
    for (const q of o.triangle) q.splice(0, 2, R3(f.x + (q[0] - was.x) * k[0]), R3(f.y + (q[1] - was.y) * k[1]));
  }
}
function placeBlock(o, g) {
  const now = () => frameOf(o, g), n = (key, label, opts = {}) => numIn(now()[key], (x) => setFrame(o, g, { ...now(), [key]: x }), { label, tip: TIPS[key], ...unitOf(key), ...opts });
  const more = gearBtn('geom', `its own numbers (${TIPS[g].toLowerCase()})`);
  const third = [...('rotation' in now() ? [n('rotation', '↻', { step: 0.01 })] : []), ...(g === 'box' ? [n('radius', '◜', { min: 0 })] : [])];
  const out = [stack([n('x', 'X'), n('y', 'Y')]), stack([n('w', 'W', { min: 0 }), n('h', 'H', { min: 0 })]), el('div', { className: 'nums withMore' }, ...third, ...(third.length < 2 ? [el('span')] : []), more)];
  if (raw.has('geom')) out.push(el('div', { className: 'raw' }, ...(g === 'triangle' ? o.triangle.map((_, i) => nums(o.triangle, i, null, [`x${i + 1}`, `y${i + 1}`])) : [nums(o, g, g)])));
  return out;
}
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
    box.append(field('', el('span', { className: 'nums', title: `${nice(from)} swapped for ${nice(to)}, everywhere: click either to pick another` }, pick(from, rename), el('span', { textContent: '→' }), pick(to, (t) => put((m) => { m[from] = t; })), iconBtn('x', '', { title: 'Not swapped', onclick: () => put((m) => { delete m[from]; }) }))));
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

