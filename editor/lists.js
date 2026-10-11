// The lists of parts (see editor.js): the bones and the shapes, as tables
import { $, el, icon } from './dom.js';
import { playHelp } from './handling.js';
import { inspect } from './inspector.js';
import { SWITCHES, addDot, addGroup, addShape, many, moveMany, rename, switchOn, toggle } from './layers.js';
import { html, nothing, render } from './lit/lit-html.js';
import { listPalette } from './palette.js';
import { alongOf, geomOf, parts, same } from './parts.js';
import { draw, editing } from './stage.js';
import { P, also, build, commit, editable, hide, isGroup, kind, picked, refresh, sel, toLocal, toWorld, view, setAlso, setSel } from './state.js';
import { ABOUT, keysAt, kindOf, leaves, pathsOf, rowOf } from './timeline.js';

// two tables, as Spine has them: the bones (a tree: the root (the animal itself), hip, chest and head down the spine, each
// joint's legs and chains under it), each with what kind it is (a clip: its keys); and the shapes, in their groups in
// the order they are drawn, each with what it is on and what it is. A group's head: its switches (how it is drawn, see
// asset.js), to flip. Pointed at, a row's outline shows on the stage (a group's: all of its shapes'). Shapes dragged
// into another group, or to another place in theirs; groups to another place among them. Templates: lit-html (lit/)
const BONES = ['Animal', 'Frame', 'Joints', 'Legs', 'Chains', 'Paws', 'Tails and ears'];
let renamingSel = null; // (what is being renamed, in its row)
export let hover = null; // (what is pointed at in the lists: { sels }; its outline on the stage, see drawHandles)
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
// folded: a group's rows under its head, a bone's under it (by name, for each animal: kept in this browser)
const FOLDS = 'lophop.editor.folds';
let folds = new Set();
try { folds = new Set(JSON.parse(localStorage.getItem(FOLDS)) || []); } catch { /* (none kept) */ }
const folded = (what) => folds.has(`${kind}:${what}`);
function fold(what) {
  const k = `${kind}:${what}`;
  if (!folds.delete(k)) folds.add(k);
  try { localStorage.setItem(FOLDS, JSON.stringify([...folds])); } catch { /* (not kept) */ }
  listParts();
}
const chevron = (what, has = true) => (has ? html`<button class=${`fold${folded(what) ? ' shut' : ''}`} title=${folded(what) ? 'Unfold: what is under it' : 'Fold: what is under it'} @click=${stop(() => fold(what))} @dblclick=${stop(() => {})}></button>` : html`<span class="fold"></span>`);
// picked (a click); with ⌘ added to what is picked or taken from it, with ⇧ the rows from the one picked to it too
// (shapes, markings, dots, groups: see also)
const pick = (s, e) => {
  if (e && (e.metaKey || e.ctrlKey || e.shiftKey)) { if (e.shiftKey && many(s) && many(sel)) pickRange(s); else togglePick(s); }
  else if (same(s, sel) && !also.length) return;
  else setSel(s);
  listParts(); inspect(); draw();
};
export const isPicked = (s) => picked().some((x) => same(x, s));
export function togglePick(s) {
  if (!many(s) || !many(sel)) { setSel(s); return; }
  if (same(s, sel)) { if (also.length) { setSel(also[also.length - 1], true); setAlso(also.slice(0, -1)); } return; }
  const k = also.findIndex((x) => same(x, s));
  if (k >= 0) setAlso(also.filter((_, i) => i !== k)); else { setAlso([...also, sel]); setSel(s, true); }
}
function pickRange(s) {
  const rows = [...$('shapes').querySelectorAll('tr.row')].map((r) => r.sel).filter((x) => x && x.type === s.type); // (of its kind)
  const a = rows.findIndex((x) => same(x, sel)), b = rows.findIndex((x) => same(x, s));
  if (a < 0 || b < 0) { togglePick(s); return; }
  const range = rows.slice(Math.min(a, b), Math.max(a, b) + 1).filter((x) => !same(x, s));
  setAlso([...also.filter((x) => !range.some((y) => same(x, y))), ...range]); setSel(s, true);
}
const point = (h) => { hover = h; if (editing()) draw(); };
const rowClass = (p, more = '') => `row${isPicked(p.sel) ? ' on' : ''}${p.off ? ' hidden' : ''}${more}`;
const stop = (fn) => (e) => { e.stopPropagation(); fn(e); };

// the bones: an icon (a bone; its kind: its tooltip), name (down the tree); a clip's: its keys (◆ here, ◇ at another frame). What
// is drawn on them: the shapes' (see their Bone). A leg or a chain dragged onto a joint: on it (where it is, kept)
const BONE_TYPES = { rig: ['root', 'The animal'], frame: ['frame', 'The frame shown'], joint: ['bone', 'A joint, down the spine'], leg: ['bone', 'A leg'], paw: ['bone', 'A paw'] };
const boneType = (p) => (p.sel.type === 'chain' ? ['bone', build.chains[p.sel.name]?.ear ? 'An ear' : 'A chain (a tail)'] : BONE_TYPES[p.sel.type] || ['bone', '']);
const typeIcon = ([ic, tip]) => html`<span class="kindIcon" title=${tip}>${icon(ic)}</span>`;
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
  const foldOf = (p) => `bone:${p.sel.type}:${p.sel.name || ''}`, shown = [];
  let under = Infinity; // (the depth of a folded bone the rows go on under)
  rows.forEach(([p, depth], i) => {
    if (depth <= under) under = Infinity;
    if (depth > under) return;
    const kids = rows[i + 1]?.[1] > depth;
    shown.push([p, depth, kids]);
    if (kids && folded(foldOf(p))) under = depth;
  });
  const clip = view.move !== 'edit';
  const keyed = clip && new Set(pathsOf().map(rowOf)), here = clip && keysAt(view.frame).flatMap((k) => leaves(k)).map(rowOf);
  const key = (p) => {
    const n = p.sel.name, at = p.sel.type === 'frame' ? here.length > 0 : here.includes(n);
    return at ? html`<span class="key" title="A key at this frame">${icon('key')}</span>`
      : keyed.has(n) ? html`<span class="key off" title="Keys at other frames">${icon('keyed')}</span>` : nothing;
  };
  return html`<table class="list bonesList" @mouseleave=${() => point(null)}>
    <colgroup><col>${clip ? html`<col class="cKey">` : nothing}</colgroup>
    <thead><tr><th>Name</th>${clip ? html`<th>Key</th>` : nothing}</tr></thead>
    <tbody>${shown.map(([p, depth, kids]) => html`<tr class=${rowClass(p)} .sel=${p.sel} draggable=${!clip && (p.sel.type === 'leg' || p.sel.type === 'chain') ? 'true' : 'false'}
        @click=${(e) => pick(p.sel, e)} @mouseenter=${() => point({ sels: [p.sel] })}
        @dragstart=${(e) => { boneDragged = p.sel; e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', p.sel.name); }} @dragend=${boneDragEnd}
        @dragover=${(e) => { if (!boneDropOn(p.sel)) return; e.preventDefault(); e.currentTarget.classList.add('dropInto'); }}
        @dragleave=${(e) => { if (!e.currentTarget.contains(e.relatedTarget)) e.currentTarget.classList.remove('dropInto'); }}
        @drop=${(e) => { e.preventDefault(); const from = boneDropOn(p.sel) && boneDragged; boneDragEnd(); if (from) reparent(from, p.sel.name); }}>
      <td title=${p.tip || ''}><div class="name" style=${`padding-left:${depth * 12}px`}>${chevron(foldOf(p), kids)}${typeIcon(boneType(p))}<span>${p.label}</span></div></td>${clip ? html`<td>${key(p)}</td>` : nothing}</tr>`)}</tbody>
  </table>`;
}

// a leg or a chain dragged onto a joint: on it, where it is kept (its root, an ear's tip, a tail's angle: in the joint's
// frame, as Setup shows them)
let boneDragged = null;
const boneDropOn = (s) => !!boneDragged && s.type === 'joint' && (boneDragged.type === 'leg' ? build.legs : build.chains)[boneDragged.name]?.on !== s.name;
function boneDragEnd() { boneDragged = null; for (const x of $('bones').querySelectorAll('.dropInto')) x.classList.remove('dropInto'); }
function reparent(from, j) {
  const o = (from.type === 'leg' ? build.legs : build.chains)[from.name], f = P.F[o.on], g = P.F[j], r3 = (v) => +v.toFixed(3);
  const into = (q) => toLocal(g, ...toWorld(f, q)).map(r3);
  commit(() => {
    o.at = into(o.at);
    if (o.tip) o.tip = into(o.tip);
    if (from.type === 'chain' && !o.ear) o.angle = r3((o.angle || 0) + g.a - f.a);
    o.on = j;
  });
  refresh();
}

// the shapes: an eye (hidden on the stage, here only), an icon for what it is, name (its own color: a swatch), the bone
// it is on (a joint, a bone it is drawn along; box: none)
const KINDS = { ellipse: 'An ellipse', capsule: 'A capsule', box: 'A box', triangle: 'A triangle' };
function whereWhat(p) {
  const o = p.obj, t = p.sel.type;
  if (t === 'face') return ['head', ['face', 'The face']];
  if (t === 'dot') return [o.on || 'box', ['dot', 'A dot: one pixel']];
  if (t === 'spikes') return [o.on || 'box', ['spikes', 'Spikes: where it bristles']];
  const k = o.bone ? alongOf(o) : geomOf(o) || 'ellipse';
  return [o.bone || o.on || 'box', [k, o.bone ? `${KINDS[k]}, drawn along ${o.bone}` : KINDS[k]]];
}
const eyeOf = (p) => html`<button class=${`eye${p.off ? ' off' : ''}`} title=${p.off ? 'Hidden: show it (H)' : 'Hide it, here only: not saved (H)'} @click=${stop(() => hide(p.obj))}>${icon(p.off ? 'eyeOff' : 'eye')}</button>`;
const nameOf = (p) => (renamingSel && same(renamingSel, p.sel)
  ? html`<input class="rename" type="text" .value=${p.obj.name || ''} placeholder=${p.label} @click=${stop(() => {})} @dblclick=${stop(() => {})} @blur=${(e) => endRename(e.target.value)}
      @keydown=${(e) => { e.stopPropagation(); if (e.key === 'Enter') endRename(e.target.value); if (e.key === 'Escape') endRename(null); }}>`
  : html`<span>${p.label}</span>`);
const dragging = (p) => ({ draggable: renamingSel && same(renamingSel, p.sel) ? 'false' : 'true' });
function shapesTable(all) {
  const group = (G, g) => {
    if (!isGroup(G)) { // the face: where it is drawn among the groups, the dots with it
      const fp = all.find((p) => p.sel.type === 'face'), dots = all.filter((p) => p.sel.type === 'dot');
      return html`<tbody>
        ${fp ? html`<tr class=${rowClass(fp, ' layer')} .sel=${fp.sel} draggable="true" @click=${(e) => pick(fp.sel, e)} @mouseenter=${() => point({ sels: [fp.sel] })}>
          <td></td><th colspan="2"><div>${chevron('face', dots.length > 0)}${typeIcon(['face', 'The face'])}<span title="The eye, nose and mouth, and the dots: everything before them recolored (see recolor)">face</span>
          <button class="icon" title="Add a dot" aria-label="Add a dot" @click=${stop(addDot)}>${icon('plus')}</button></div></th></tr>` : nothing}
        ${folded('face') ? nothing : dots.map((p) => shapeRow(p))}
      </tbody>`;
    }
    const gp = all.find((p) => p.sel.type === 'group' && p.sel.g === g), kids = all.filter((p) => p.sel.g === g && p.sel.type === 'item');
    const paint = all.filter((p) => p.sel.g === g && p.sel.type === 'paint'), spikes = all.find((p) => p.sel.g === g && p.sel.type === 'spikes');
    return html`<tbody>
      <tr class=${rowClass(gp, ' layer')} .sel=${gp.sel} draggable=${dragging(gp).draggable} @click=${(e) => pick(gp.sel, e)} @mouseenter=${() => point({ sels: [gp.sel] })}
        @dblclick=${(e) => { if (!e.target.closest('button')) startRename(gp.sel); }}>
        <td>${eyeOf(gp)}</td>
        <th colspan="2"><div>${chevron(`group:${G.name}`, kids.length + paint.length > 0 || !!spikes)}${typeIcon(['group', 'A group: drawn as one'])}<span class="sw" style=${`background:${gp.color}`}></span>${nameOf(gp)}
          <span class="rules">${SWITCHES.map(([k, ic, yes, no]) => html`<button class=${`rule${switchOn(G, k) ? '' : ' off'}`} title=${`${switchOn(G, k) ? yes : no} (click: ${switchOn(G, k) ? 'off' : 'on'})`} @click=${stop(() => toggle(g, k))}>${icon(ic)}</button>`)}</span>
          <button class="icon" title="Add a shape to it" aria-label="Add a shape to it" @click=${stop(() => addShape(g))}>${icon('plus')}</button></div></th>
      </tr>
      ${folded(`group:${G.name}`) ? nothing : html`${kids.map((p) => shapeRow(p))}
      ${paint.length ? html`<tr class="sub"><td></td><td colspan="2" title="Markings: shapes in a color, only where the group is">paint</td></tr>${paint.map((p) => shapeRow(p, 2))}` : nothing}
      ${spikes ? shapeRow(spikes) : nothing}`}
    </tbody>`;
  };
  return html`<table class="list shapesList" @mouseleave=${() => point(null)}>
    <colgroup><col class="cEye"><col><col class="cOn"></colgroup>
    <thead><tr><th></th><th>Name</th><th>Bone</th></tr></thead>
    ${(build.layers || []).map(group)}
    <tbody><tr class="sub"><td></td><td colspan="2"><button class="withIcon" title="A new group, drawn before the face" @click=${addGroup}>${icon('plus')}<span>Group</span></button></td></tr></tbody>
  </table>`;
}
function shapeRow(p, depth = p.depth || 0) {
  const [on, type] = whereWhat(p), renames = p.sel.type !== 'spikes', own = p.sel.type === 'item' ? p.obj.color : p.sel.type !== 'spikes';
  return html`<tr class=${rowClass(p)} .sel=${p.sel} draggable=${p.sel.type === 'spikes' ? 'false' : dragging(p).draggable}
      @click=${(e) => pick(p.sel, e)} @dblclick=${(e) => { if (renames && !e.target.closest('.eye')) startRename(p.sel); }} @mouseenter=${() => point({ sels: [p.sel] })}>
    <td>${eyeOf(p)}</td>
    <td><div class="name" style=${`padding-left:${depth * 12}px`}>${typeIcon(type)}${own && p.color ? html`<span class="sw" style=${`background:${p.color}`}></span>` : nothing}${nameOf(p)}${p.obj.grows ? html`<span class="flag" title="Grown out of the body: not outlined where it starts on it">${icon('joined')}</span>` : nothing}</div></td>
    <td class="dim">${on}</td>
  </tr>`;
}

// dragged: a shape into another group (onto its head: at its end) or to a place among its shapes; a marking among the
// markings; a dot among the dots; a group (or the face) to a place among the groups. One of those picked: those of its
// kind picked with it too
let dragged = null;
const modeOf = (from, to) => {
  if (!from || same(from, to)) return null;
  if (from.type === 'item' || from.type === 'paint') return to.type === from.type ? 'line' : to.type === 'group' ? 'into' : null;
  if (from.type === 'dot') return to.type === 'dot' ? 'line' : null;
  if (from.type === 'group' || from.type === 'face') return to.type === 'group' || to.type === 'face' ? 'group' : null;
  return null;
};
const clearDrops = () => { for (const x of $('shapes').querySelectorAll('.dropBefore, .dropAfter, .dropInto, .dragging')) x.classList.remove('dropBefore', 'dropAfter', 'dropInto', 'dragging'); };
function dragStart(e, s) { dragged = s; e.currentTarget.classList.add('dragging'); e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', s.type); }
function dragEnd() { dragged = null; clearDrops(); }
function dragOver(e, s) {
  const mode = modeOf(dragged, s);
  if (!mode) return;
  e.preventDefault(); e.dataTransfer.dropEffect = 'move';
  const r = e.currentTarget, box = r.getBoundingClientRect(), after = e.clientY > box.top + box.height / 2, target = mode === 'group' ? r.parentElement : r;
  for (const x of $('shapes').querySelectorAll('.dropBefore, .dropAfter, .dropInto')) if (x !== target) x.classList.remove('dropBefore', 'dropAfter', 'dropInto');
  target.classList.toggle('dropInto', mode === 'into');
  target.classList.toggle('dropAfter', mode !== 'into' && after); target.classList.toggle('dropBefore', mode !== 'into' && !after);
}
function dragLeave(e) { e.currentTarget.classList.remove('dropBefore', 'dropAfter', 'dropInto'); }
function dropOn(e, s) {
  e.preventDefault();
  const from = dragged, mode = modeOf(from, s), r = e.currentTarget, t = mode === 'group' ? r.parentElement : r, after = t.classList.contains('dropAfter');
  clearDrops(); dragged = null;
  if (!mode) return;
  const froms = isPicked(from) ? picked().filter((x) => x.type === from.type) : [from];
  if (mode === 'into') moveMany(froms, s.g);
  else if (mode === 'group') moveMany(froms, s.g + (after ? 1 : 0));
  else moveMany(froms, s.g, s.i + (after ? 1 : 0));
}
// (bound on the table: the rows' own drag events, found by their pick)
const rowSel = (e) => e.target.closest?.('tr')?.sel;
$('shapes').addEventListener('dragstart', (e) => { const s = rowSel(e); if (s && s.type !== 'spikes') dragStart({ currentTarget: e.target.closest('tr'), dataTransfer: e.dataTransfer }, s); });
$('shapes').addEventListener('dragend', dragEnd);
$('shapes').addEventListener('dragover', (e) => { const r = e.target.closest?.('tr'); if (r?.sel) dragOver({ currentTarget: r, clientY: e.clientY, dataTransfer: e.dataTransfer, preventDefault: () => e.preventDefault() }, r.sel); });
$('shapes').addEventListener('dragleave', (e) => { const r = e.target.closest?.('tr'); if (r && !r.contains(e.relatedTarget)) dragLeave({ currentTarget: r }); });
$('shapes').addEventListener('drop', (e) => { const r = e.target.closest?.('tr'); if (r?.sel) dropOn({ currentTarget: r, preventDefault: () => e.preventDefault() }, r.sel); });

// renamed (its row double-clicked, or Enter): in place, in its row
export function startRename(s) { renamingSel = s; listParts(); }
function endRename(value) { // (null: as it was)
  const s = renamingSel, p = s && parts().find((q) => same(q.sel, s));
  if (!s) return;
  renamingSel = null;
  if (value === null || !p) listParts(); else rename(s, p.obj, value);
}
