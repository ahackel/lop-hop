// The lists of parts (see editor.js): the bones and the shapes, as tables
import { $, el, icon } from './dom.js';
import { playHelp } from './handling.js';
import { inspect } from './inspector.js';
import { html, nothing, render } from './lit/lit-html.js';
import { listPalette } from './palette.js';
import { BONE_LAYERS, boneKind, geomOf, parts, same, shapeOn, shiftShape } from './parts.js';
import { draw, editing } from './stage.js';
import { LAYERS, build, commit, editable, hidden, hide, keyOf, kind, refresh, rehide, sel, view, setSel } from './state.js';
import { ABOUT, keysAt, kindOf, leaves, pathsOf, rowOf } from './timeline.js';

// two tables, as Spine has them: the bones (a tree: the root (the animal itself), hip, chest and head down the spine, each
// joint's legs and chains under it), each with what kind it is and the shape on it (a clip: its keys); and the shapes,
// by layer in the order they are drawn, each with what it is on and what it is. A layer's head says what it does with
// its shapes (its rules, as drawRig in art.js has them); a shape that does otherwise says so in its row. Pointed at, a
// row's outline shows on the stage (a layer's head: all of its shapes'). Templates: lit-html (editor/lit)
const BONES = ['Animal', 'Frame', 'Joints', 'Legs', 'Chains', 'Paws', 'Tails and ears'];
const ADD = { 'Body shapes': 'shapes', Paint: 'paint', 'On top': 'top', Dots: 'dots' };
const DRAWN = ['Behind', 'Body shapes', 'Paint', 'Spikes', 'On top', 'Dots', 'Face']; // (as drawRig in art.js draws them)
const RULES = { // (a rule: what it means, what it means not to)
  joined: ['Joined: its shapes melt into one silhouette', 'Not joined: each shape on its own'],
  outlined: ['Outlined', 'Not outlined'],
  hits: ['Collisions test it', 'Collisions don’t test it'],
  clipped: ['Drawn only where the body is', 'Drawn where it is, on the body or not'],
};
const LAYER = { // (each layer's rules, and what it is)
  Behind: [['outlined'], 'Behind the body: the tails, each outlined on its own; then the far legs, as one, in the far side’s tone (collisions test them)'],
  'Body shapes': [['joined', 'outlined', 'hits'], 'The body: the torso, its shapes, ears and near legs, joined into one silhouette, outlined round it'],
  Paint: [['clipped'], 'Markings in a color, on the body only'],
  Spikes: [[], 'Where the body bristles: ticks out of its outline (specks inside)'],
  'On top': [['outlined'], 'Over the body, each outlined: the groups, then the shapes on bones'],
  Dots: [[], 'Single pixels'],
  Face: [[], 'The eye, nose and mouth, over the rest'],
};
const TYPE_OF_BONE = { spine: 'torso', leg: 'leg', ear: 'ear', tail: 'chain' };
const FLAGS = [ // (a shape on a bone doing otherwise than its layer: its setting, its icon, what it means)
  ['far', 'far', 'In the far side’s tone'],
  ['outline', 'line', 'A thin line, not outlined', (v) => v === false],
  ['joined', 'joined', 'Grown out of the body: not outlined where it starts'],
  ['overEye', 'overEye', 'Over the eyes too: drawn after the face'],
];
let renamingSel = null; // (the shape being renamed, in its row)
export let hover = null; // (what is pointed at in the lists: { sels } or { layer }; its outline on the stage, see drawHandles)
export function listParts() {
  const bones = $('bones'), shapes = $('shapes'), bt = $('bonesTitle'), playing = view.mode === 'play';
  const note = (text) => html`<p class="note" style="padding:4px 10px">${text}</p>`;
  const filled = (fill) => { const d = el('div'); fill(d); return d; }; // (made by el: put in as it is)
  const show = (b, s = nothing) => { render(b, bones); render(s, shapes); };
  if (view.mode === 'game') { bt.textContent = 'Palette'; bt.title = 'The game’s colors: everything is drawn in them'; show(html`${filled(listPalette)}`); return; }
  bt.textContent = playing ? 'Play' : 'Bones'; bt.title = playing ? 'What to try on the stage' : 'The skeleton: what moves';
  if (playing) { show(html`${filled(playHelp)}`, note('Shapes are set in Setup.')); return; }
  if (!editable()) { show(note(`The ${kind} has no bones.`)); return; }
  if (view.move !== 'edit' && kindOf(view.move) !== 'clip') { show(note(ABOUT[kindOf(view.move)])); return; }
  const all = parts();
  show(bonesTable(all), view.move === 'edit' ? shapesTable(all) : note('Shapes are set in Setup.'));
  const input = renamingSel && shapes.querySelector('input.rename');
  if (input && document.activeElement !== input) { input.focus(); input.select(); }
}
const pick = (s) => { if (same(s, sel)) return; setSel(s); listParts(); inspect(); draw(); };
const point = (h) => { hover = h; if (editing()) draw(); };
const rowClass = (p) => `row${same(p.sel, sel) ? ' on' : ''}${hidden.has(keyOf(p.sel)) ? ' hidden' : ''}`;
const stop = (fn) => (e) => { e.stopPropagation(); fn(e); };

// the bones: name (down the tree), kind, and the shape on it (a link to it; none: + to make one); a clip's: its keys
// (◆ here, ◇ at another frame)
const BONE_TYPES = { rig: 'animal', frame: '', joint: 'joint', leg: 'leg', paw: 'paw' };
const boneType = (p) => (p.sel.type === 'chain' ? (build.chains[p.sel.name]?.ear ? 'ear' : 'chain') : BONE_TYPES[p.sel.type] ?? '');
function bonesTable(all) {
  const bonesOf = all.filter((p) => BONES.includes(p.group)), rows = [], put = (p, depth) => rows.push([p, depth]);
  const onOf = (p) => (p.sel.type === 'leg' || p.sel.type === 'paw' ? build.legs[p.sel.name]?.on : p.sel.type === 'chain' ? build.chains[p.sel.name]?.on : null);
  for (const p of bonesOf) if (p.sel.type === 'rig' || p.sel.type === 'frame') put(p, 0);
  Object.keys(build.joints).forEach((j, d) => {
    const jp = bonesOf.find((p) => p.sel.type === 'joint' && p.sel.name === j);
    if (jp) put(jp, d + 1);
    for (const p of bonesOf) if (!rows.some(([q]) => q === p) && onOf(p) === j) put(p, d + 2);
  });
  for (const p of bonesOf) if (!rows.some(([q]) => q === p)) put(p, 1); // (on no joint)
  const clip = view.move !== 'edit';
  const keyed = clip && new Set(pathsOf().map(rowOf)), here = clip && keysAt(view.frame).flatMap((k) => leaves(k)).map(rowOf);
  const third = (p) => {
    const n = p.sel.name;
    if (clip) {
      const at = p.sel.type === 'frame' ? here.length > 0 : here.includes(n);
      return at ? html`<span class="key" title="A key at this frame">${icon('key')}</span>`
        : keyed.has(n) ? html`<span class="key off" title="Keys at other frames">${icon('keyed')}</span>` : nothing;
    }
    if (p.sel.type !== 'leg' && p.sel.type !== 'chain') return nothing;
    const on = shapeOn(n);
    return on ? html`<a class="link" title=${`Its shape: what is drawn of it (${LAYERS[on.list]})`} @click=${stop(() => pick({ type: 'item', list: on.list, i: on.i }))}>${on.s.name || n}</a>`
      : html`<button class="add" title="Nothing is drawn on it: a shape on it" @click=${stop(() => addShapeOn(n))}>${icon('plus')}</button>`;
  };
  const its = (p) => { const on = !clip && (p.sel.type === 'leg' || p.sel.type === 'chain') && shapeOn(p.sel.name); return on ? [p.sel, { type: 'item', list: on.list, i: on.i }] : [p.sel]; };
  return html`<table class="list bonesList" @mouseleave=${() => point(null)}>
    <colgroup><col><col class="cKind"><col class=${clip ? 'cKey' : 'cShape'}></colgroup>
    <thead><tr><th>Name</th><th>Kind</th><th>${clip ? 'Key' : 'Shape'}</th></tr></thead>
    <tbody>${rows.map(([p, depth]) => html`<tr class=${rowClass(p)} .sel=${p.sel} @click=${() => pick(p.sel)} @mouseenter=${() => point({ sels: its(p) })}>
      <td style=${`padding-left:${10 + depth * 12}px`} title=${p.tip || ''}>${p.label}</td><td class="dim">${boneType(p)}</td><td>${third(p)}</td></tr>`)}</tbody>
  </table>`;
}
// a bone's shape, made as the others are: a leg's and an ear's joined into the body, a chain's behind it
export function addShapeOn(n) {
  const leg = !!build.legs?.[n], ear = !!build.chains?.[n]?.ear, list = leg || ear ? 'shapes' : 'back';
  const s = leg ? { name: n, bone: n, r: 1, smooth: 0.5 } : ear ? { name: n, bone: n, base: [[-1.2, 0.5], [1.2, -0.5]], smooth: 0.4 } : { name: n, bone: n, r: 1 };
  commit(() => { (build[list] ||= []).push(s); setSel({ type: 'item', list, i: build[list].length - 1 }); });
  refresh();
}

// the shapes: an eye (hidden on the stage, here only), name, what it is on (a joint, a bone; box: none), what it is,
// and where it does otherwise than its layer
function whereWhat(p) {
  const o = p.obj;
  if (p.sel.type === 'face') return ['head', 'face'];
  if (o.bone) return [o.bone, TYPE_OF_BONE[boneKind(o)] || ''];
  if (p.sel.list === 'top' && p.sel.j === undefined) return [o.shapes[0]?.on || 'box', 'group'];
  return [o.on || 'box', p.sel.list === 'dots' ? 'dot' : geomOf(o) || ''];
}
function shapesTable(all) {
  const rule = (r, has) => html`<span class=${`rule${has ? '' : ' off'}`} title=${RULES[r][has ? 0 : 1]}>${icon(r)}</span>`;
  const layer = (label) => {
    let on = all.filter((p) => p.group === label);
    if (!on.length && !ADD[label]) return nothing; // (a layer with nothing on it yet: to add to)
    const [rules, about] = LAYER[label], legs = label === 'Behind' ? on.filter((p) => boneKind(p.obj) === 'leg') : [];
    // (as they are drawn: behind, the tails, then the far legs as one; on top, the groups, then the shapes on bones)
    if (legs.length) on = on.filter((p) => !legs.includes(p));
    if (label === 'On top') on = [...on.filter((p) => !p.obj.bone), ...on.filter((p) => p.obj.bone)];
    return html`<tbody>
      <tr class="layer" @mouseenter=${() => point({ layer: label })}><th colspan="5"><div>
        <span title=${about}>${label}</span><span class="rules">${Object.keys(RULES).map((r) => rule(r, rules.includes(r)))}</span>
        ${ADD[label] ? html`<button class="icon" title=${`Add to ${label.toLowerCase()}`} aria-label=${`Add to ${label.toLowerCase()}`} @click=${() => add(ADD[label])}>${icon('plus')}</button>` : nothing}
      </div></th></tr>
      ${on.map((p) => shapeRow(p))}
      ${legs.length ? html`<tr class="sub" @mouseenter=${() => point({ sels: legs.map((p) => p.sel) })}><td></td>
        <td colspan="4" title="The far legs: drawn as one shape, after the tails, in the far side’s tone; collisions test them">the far legs, as one</td></tr>
        ${legs.map((p) => shapeRow(p, 1))}` : nothing}
    </tbody>`;
  };
  return html`<table class="list shapesList" @mouseleave=${() => point(null)}>
    <colgroup><col class="cEye"><col><col class="cOn"><col class="cType"><col class="cFlags"></colgroup>
    <thead><tr><th></th><th>Name</th><th>On</th><th>Type</th><th></th></tr></thead>
    ${DRAWN.map(layer)}
  </table>`;
}
function shapeRow(p, depth = p.depth || 0) {
  const o = p.obj, off = hidden.has(keyOf(p.sel)), item = p.sel.type === 'item', naming = item && renamingSel && same(renamingSel, p.sel), [on, type] = whereWhat(p);
  const eye = p.sel.type === 'face' ? nothing
    : html`<button class=${`eye${off ? ' off' : ''}`} title=${off ? 'Hidden: show it (H)' : 'Hide it, here only: not saved (H)'} @click=${stop(() => hide(p.sel))}>${icon(off ? 'eyeOff' : 'eye')}</button>`;
  const name = naming
    ? html`<input class="rename" type="text" .value=${o.name || ''} placeholder=${p.label} @click=${stop(() => {})} @dblclick=${stop(() => {})} @blur=${(e) => endRename(e.target.value)}
        @keydown=${(e) => { e.stopPropagation(); if (e.key === 'Enter') endRename(e.target.value); if (e.key === 'Escape') endRename(null); }}>`
    : html`<span>${p.label}</span>`;
  const flags = o?.bone ? FLAGS.filter(([k, , , is = Boolean]) => is(o[k])).map(([, i, t]) => html`<span title=${t}>${icon(i)}</span>`) : nothing;
  return html`<tr class=${rowClass(p)} .sel=${p.sel} draggable=${item && !naming ? 'true' : 'false'}
      @click=${() => pick(p.sel)} @dblclick=${(e) => { if (item && !e.target.closest('.eye')) startRename(p.sel); }} @mouseenter=${() => point({ sels: [p.sel] })}
      @dragstart=${(e) => dragStart(e, p.sel)} @dragend=${dragEnd} @dragover=${(e) => dragOver(e, p.sel)} @dragleave=${dragLeave} @drop=${(e) => dropOn(e, p.sel)}>
    <td>${eye}</td>
    <td><div class="name" style=${`padding-left:${depth * 12}px`}>${p.color ? html`<span class="sw" style=${`background:${p.color}`}></span>` : nothing}${name}</div></td>
    <td class="dim">${on}</td><td class="dim">${type}</td><td class="flags">${flags}</td>
  </tr>`;
}

// a shape dragged to another place in its list (the order they are drawn in: the list's, back to front), or in its
// group; only among its own sort (behind: the tails, the far legs; on top: the groups, the shapes on bones)
let dragged = null;
const sortOf = (s) => { const o = s.j === undefined && build[s.list]?.[s.i]; return s.list === 'back' ? (o && boneKind(o) === 'leg' ? 'leg' : '') : s.list === 'top' && o?.bone ? 'bone' : ''; };
const together = (a, b) => a.list === b.list && (a.j === undefined) === (b.j === undefined) && (a.j === undefined || a.i === b.i) && sortOf(a) === sortOf(b);
const clearDrops = () => { for (const x of $('shapes').querySelectorAll('.dropBefore, .dropAfter, .dragging')) x.classList.remove('dropBefore', 'dropAfter', 'dragging'); };
function dragStart(e, s) { if (s.type !== 'item') { e.preventDefault(); return; } dragged = s; e.currentTarget.classList.add('dragging'); e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', s.list); }
function dragEnd() { dragged = null; clearDrops(); }
function dragOver(e, s) {
  if (!dragged || !together(dragged, s)) return;
  e.preventDefault(); e.dataTransfer.dropEffect = 'move';
  const r = e.currentTarget, box = r.getBoundingClientRect(), after = e.clientY > box.top + box.height / 2;
  for (const x of $('shapes').querySelectorAll('.dropBefore, .dropAfter')) if (x !== r) x.classList.remove('dropBefore', 'dropAfter');
  r.classList.toggle('dropAfter', after); r.classList.toggle('dropBefore', !after);
}
function dragLeave(e) { e.currentTarget.classList.remove('dropBefore', 'dropAfter'); }
function dropOn(e, s) {
  e.preventDefault();
  const from = dragged, after = e.currentTarget.classList.contains('dropAfter');
  clearDrops(); dragged = null;
  if (from && together(from, s)) reorder(from, s, after);
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
  commit(() => { arr.splice(b, 0, arr.splice(a, 1)[0]); setSel(child ? { ...from, j: b } : { ...from, i: b }); });
  listParts(); inspect();
}
// a shape renamed (its row double-clicked, or Enter): in place, in its row; a pose that uses it by name (use) still does
export function startRename(s) { renamingSel = s; listParts(); }
function endRename(value) { // (null: as it was)
  const s = renamingSel, p = s && parts().find((q) => same(q.sel, s));
  if (!s) return;
  renamingSel = null;
  if (value === null || !p) listParts(); else rename(s, p.obj, value);
}
export function rename(s, o, name) {
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
function add(list) { commit(() => { (build[list] ||= []).push(fresh(list)); setSel({ type: 'item', list, i: build[list].length - 1 }); }); refresh(); }

// moves a list item: up or down (d), copied, gone, or to another layer (body shapes, paint, on top)
export function itemDo(what, arg) {
  if (sel.j !== undefined) { childDo(what, arg); return; }
  const { list, i } = sel, arr = build[list];
  if (what === 'layer' && arr[i].bone) { // (a shape on a bone: as it is, to a layer its bone lets it be in)
    if (arg === list || !BONE_LAYERS[boneKind(arr[i])]?.includes(arg)) return;
    rehide(list, (x) => (x === i ? -1 : x > i ? x - 1 : x));
    commit(() => { const [x] = arr.splice(i, 1); if (!arr.length && list !== 'shapes') delete build[list]; const into = (build[arg] ||= []); into.push(x); setSel({ type: 'item', list: arg, i: into.length - 1 }); });
    listParts(); inspect(); return;
  }
  commit(() => {
    if (what === 'move') { const j = i + arg; if (j < 0 || j >= arr.length) return; [arr[i], arr[j]] = [arr[j], arr[i]]; setSel({ ...sel, i: j }); rehide(list, (x) => (x === i ? j : x === j ? i : x)); }
    else if (what === 'copy') { arr.splice(i + 1, 0, JSON.parse(JSON.stringify(arr[i]))); setSel({ ...sel, i: i + 1 }); rehide(list, (x) => (x > i ? x + 1 : x)); }
    else if (what === 'delete') { arr.splice(i, 1); if (!arr.length && list !== 'shapes') delete build[list]; setSel({ type: 'rig' }); rehide(list, (x) => (x === i ? -1 : x > i ? x - 1 : x)); }
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
      setSel({ type: 'item', list: arg, i: into.length - 1 });
    }
  });
  listParts(); inspect();
}

// the same for a shape in a group (the last one gone: the group); and one added to a group (a copy of its last, moved)
function childDo(what, arg) {
  const { i, j } = sel, t = build.top[i], arr = t.shapes;
  const clear = () => { for (const k of [...hidden]) if (k.startsWith(`item:top:${i}:`)) hidden.delete(k); };
  if (what === 'delete' && arr.length === 1) { setSel({ type: 'item', list: 'top', i }); itemDo('delete'); return; }
  commit(() => {
    if (what === 'move') { const k = j + arg; if (k < 0 || k >= arr.length) return; [arr[j], arr[k]] = [arr[k], arr[j]]; setSel({ ...sel, j: k }); }
    else if (what === 'copy') { arr.splice(j + 1, 0, JSON.parse(JSON.stringify(arr[j]))); setSel({ ...sel, j: j + 1 }); }
    else if (what === 'delete') { arr.splice(j, 1); setSel({ type: 'item', list: 'top', i }); }
    clear();
  });
  listParts(); inspect();
}
export function addChild(i) {
  const t = build.top[i], s = JSON.parse(JSON.stringify(t.shapes[t.shapes.length - 1]));
  delete s.name; shiftShape(s, [1, 0]);
  commit(() => { t.shapes.push(s); setSel({ type: 'item', list: 'top', i, j: t.shapes.length - 1 }); });
  listParts(); inspect();
}

