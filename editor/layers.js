// The groups (see asset.js: layers) as the editor changes them: what a pick is in (a group, a shape in one, its paint,
// a dot), moved up or down, copied, deleted, dragged into another group or to another place among the groups, added;
// a group's switches; renamed (a pose that uses one by name still does)
import { inspect } from './inspector.js';
import { listParts } from './lists.js';
import { geomOf, shiftShape } from './parts.js';
import { also, build, commit, hidden, isGroup, refresh, sel, setAlso, setSel } from './state.js';

export const layers = () => (build.layers ||= []);
export const bodyIndex = () => layers().findIndex((G) => isGroup(G) && G.join && G.hits); // (the body: the first group joined that hits)
const clone = (o) => JSON.parse(JSON.stringify(o));
const prune = (G) => { if (G?.paint && !G.paint.length) delete G.paint; };
const among = (s) => (s.type === 'group' || s.type === 'face' ? 'g' : 'i'); // (a group is where it is among the groups)

// the list a pick is in, and where in it
export function placeOf(s) {
  const G = layers()[s.g];
  if (s.type === 'item') return { arr: G.shapes, at: s.i };
  if (s.type === 'paint') return { arr: G.paint, at: s.i };
  if (s.type === 'dot') return { arr: build.dots, at: s.i };
  if (s.type === 'group' || s.type === 'face') return { arr: layers(), at: s.g };
  return null;
}
// where a thing is now (by what it is: its pick, after the lists have changed), or null (gone)
export function selOf(x) {
  const L = layers(), g = L.indexOf(x);
  if (g >= 0) return isGroup(x) ? { type: 'group', g } : { type: 'face' };
  if (build.dots?.includes(x)) return { type: 'dot', i: build.dots.indexOf(x) };
  for (const [g, G] of L.entries()) {
    if (!isGroup(G)) continue;
    if (G.shapes.includes(x)) return { type: 'item', g, i: G.shapes.indexOf(x) };
    if (G.paint?.includes(x)) return { type: 'paint', g, i: G.paint.indexOf(x) };
  }
  return null;
}
const MANY = ['item', 'paint', 'dot', 'group']; // (what is picked together)
export const many = (s) => MANY.includes(s.type);
const objOf = (s) => { const p = placeOf(s); return p && p.arr[p.at]; };
// picked again, by what it is: the one shown (else the first left), and the rest with it
function repick(main, rest, none) {
  const sels = [main, ...rest].map(selOf).filter(Boolean);
  if (!sels.length) { setSel(none); return; }
  setSel(sels[0]); setAlso(sels.slice(1));
}
// the pick and those picked with it moved up or down their lists (d: as a block, each in its own), copied (each after
// itself), gone
function manyDo(what, d) {
  const sels = [sel, ...also].filter(many), objs = sels.map(objOf), arrs = new Map();
  for (const [k, s] of sels.entries()) { const { arr } = placeOf(s); if (!arrs.has(arr)) arrs.set(arr, []); arrs.get(arr).push(objs[k]); }
  commit(() => {
    if (what === 'move') {
      for (const [arr, xs] of arrs) {
        const at = xs.map((x) => arr.indexOf(x)).sort((a, b) => (d < 0 ? a - b : b - a));
        let stuck = d < 0 ? -1 : arr.length;
        for (const i of at) { if (i + d === stuck) { stuck = i; continue; } [arr[i], arr[i + d]] = [arr[i + d], arr[i]]; }
      }
      repick(objs[0], objs.slice(1), sel);
    } else if (what === 'copy') {
      const copies = objs.map((x) => { const arr = [...arrs].find(([, xs]) => xs.includes(x))[0], c = clone(x); arr.splice(arr.indexOf(x) + 1, 0, c); return c; });
      repick(copies[0], copies.slice(1), sel);
    } else {
      const G = sel.type === 'item' || sel.type === 'paint' ? layers()[sel.g] : null; // (picked after: its group, if left)
      for (const [arr, xs] of arrs) for (const x of xs) { const i = arr.indexOf(x); if (i >= 0) arr.splice(i, 1); hidden.delete(x); }
      for (const L of layers()) if (isGroup(L)) prune(L);
      if (build.dots && !build.dots.length) delete build.dots;
      setSel(G && layers().includes(G) ? { type: 'group', g: layers().indexOf(G) } : { type: 'rig' });
    }
  });
  refresh();
}
// the pick moved up or down its list (d), copied, gone
export function itemDo(what, d) {
  if (also.length && many(sel)) { manyDo(what, d); return; }
  const p = placeOf(sel);
  if (!p) return;
  const { arr, at } = p, k = among(sel), to = at + (d || 0);
  if (what === 'move' && (to < 0 || to >= arr.length)) return;
  if (sel.type === 'face' && what !== 'move') return;
  commit(() => {
    if (what === 'move') { [arr[at], arr[to]] = [arr[to], arr[at]]; setSel({ ...sel, [k]: to }); }
    else if (what === 'copy') { arr.splice(at + 1, 0, clone(arr[at])); setSel({ ...sel, [k]: at + 1 }); }
    else if (what === 'delete') {
      const [x] = arr.splice(at, 1);
      hidden.delete(x);
      if (sel.type === 'paint') prune(layers()[sel.g]);
      if (sel.type === 'dot' && !arr.length) delete build.dots;
      setSel(sel.type === 'item' || sel.type === 'paint' ? { type: 'group', g: sel.g } : { type: 'rig' });
    }
  });
  refresh();
}
// picks of one kind put into group g before i, in the order they are drawn (groups: among the groups before g; dots:
// among the dots before i; i, g: as the lists are before; none: at the end)
export function moveMany(froms, g, i) {
  if (froms.length < 2) { moveTo(froms[0], g, i); return; }
  const type = froms[0].type, whole = type === 'group' || type === 'face';
  const order = (s) => [s.g ?? 0, s.i ?? 0], objs = [...froms].sort((a, b) => order(a)[0] - order(b)[0] || order(a)[1] - order(b)[1]).map(objOf);
  const dstOf = () => (whole ? layers() : type === 'dot' ? build.dots : type === 'paint' ? (layers()[g].paint ||= []) : layers()[g].shapes);
  const dst = whole ? layers() : type === 'dot' ? build.dots : type === 'paint' ? layers()[g].paint || [] : layers()[g].shapes;
  let before = dst[whole ? g : i]; // (what they go before: the first after it not moved)
  for (let k = dst.indexOf(before); before !== undefined && objs.includes(before); k++) before = dst[k + 1];
  const shown = objOf(sel), G = !whole && type !== 'dot' && layers()[g];
  commit(() => {
    for (const x of objs) { const s = selOf(x), { arr, at } = placeOf(s); arr.splice(at, 1); }
    const to = dstOf(), at = before === undefined ? to.length : to.indexOf(before);
    to.splice(at, 0, ...objs);
    for (const L of layers()) if (isGroup(L) && L !== G) prune(L);
    repick(objs.includes(shown) ? shown : objs[0], objs.filter((x) => x !== shown), sel);
  });
  listParts(); inspect();
}
// a pick put into group g at i (a group, a face: among the groups at g; a dot: among the dots at i; i: as the list is
// before; none: at its end)
export function moveTo(from, g, i) {
  const src = placeOf(from), whole = from.type === 'group' || from.type === 'face';
  const dstOf = () => (whole ? layers() : from.type === 'paint' ? (layers()[g].paint ||= []) : from.type === 'dot' ? build.dots : layers()[g].shapes);
  const same = whole || from.type === 'dot' || from.g === g;
  let to = whole ? g ?? layers().length : i ?? ((from.type === 'paint' ? layers()[g].paint?.length : from.type === 'dot' ? build.dots.length : layers()[g].shapes.length) || 0);
  if (same && to > src.at) to--;
  if (same && to === src.at) return;
  commit(() => {
    const [x] = src.arr.splice(src.at, 1);
    dstOf().splice(to, 0, x);
    if (from.type === 'paint') prune(layers()[from.g]);
    setSel(whole ? { ...from, g: to } : from.type === 'dot' ? { ...from, i: to } : { ...from, g, i: to });
  });
  listParts(); inspect();
}
// added: a shape to a group (a copy of its last shape on no bone, moved a little; none: one on the spine), a marking,
// a group (before the face), a dot
export function addShape(g) {
  const G = layers()[g], last = [...G.shapes].reverse().find((s) => !s.bone && geomOf(s));
  const s = last ? clone(last) : { on: 'spine', ellipse: [2, 0, 2, 1.5] };
  if (last) { delete s.name; shiftShape(s, [1, 0]); } else s.name = 'shape';
  commit(() => { G.shapes.push(s); setSel({ type: 'item', g, i: G.shapes.length - 1 }); });
  refresh();
}
export function addPaint(g) {
  const G = layers()[g];
  commit(() => { (G.paint ||= []).push({ name: 'marking', color: 'white', on: G.shapes.find((s) => !s.bone)?.on || 'spine', ellipse: [2, 0, 2, 1.5] }); setSel({ type: 'paint', g, i: G.paint.length - 1 }); });
  refresh();
}
export function addGroup() {
  const names = new Set(layers().filter(isGroup).map((G) => G.name)), at = layers().indexOf('face');
  let name = 'group';
  for (let n = 2; names.has(name); n++) name = `group${n}`;
  const g = at < 0 ? layers().length : at;
  commit(() => { layers().splice(g, 0, { name, shapes: [{ on: 'head', ellipse: [0, -3, 1, 1] }] }); setSel({ type: 'group', g }); });
  refresh();
}
export function addDot() {
  commit(() => { (build.dots ||= []).push({ name: 'dot', on: 'head', at: [0, 0], color: 'outline' }); setSel({ type: 'dot', i: build.dots.length - 1 }); });
  refresh();
}
// a group's switches (see asset.js): its icon, what it means on and off, its name in the inspector
export const SWITCHES = [
  ['join', 'joined', 'Joined: its shapes melt into one', 'Not joined: its shapes as they are, one silhouette', 'joined'],
  ['outline', 'outlined', 'Outlined round all of it', 'Not outlined', 'outlined'],
  ['hits', 'hits', 'Collisions test it', 'Collisions don’t test it', 'hits'],
  ['far', 'far', 'In the far side’s tone (where nothing nearer covers it)', 'Not in the far side’s tone', 'far tone'],
];
// a group's switch flipped: joined, outlined (on unless off), hits, far
export function toggle(g, key) {
  const G = layers()[g];
  commit(() => {
    if (key === 'outline') { if (G.outline === false) delete G.outline; else G.outline = false; }
    else if (G[key]) delete G[key]; else G[key] = true;
  });
  refresh();
}
export const switchOn = (G, key) => (key === 'outline' ? G.outline !== false : !!G[key]);
// spikes on a group, or none
export function setSpikes(g, on) {
  const G = layers()[g];
  commit(() => { if (on) G.spikes = { on: 'spine', box: [-4, -6, 6, -1, 0] }; else { hidden.delete(G.spikes); delete G.spikes; } });
  refresh();
}

// renamed: a pose that uses it by name (use, see asset.js) still does: the body's shapes (a pose's shapes), its paint (a
// pose's paint), a group (a pose's top)
export function rename(s, o, name) {
  const to = name.trim(), was = o.name, body = s.g === bodyIndex();
  const list = s.type === 'group' ? 'top' : body && s.type === 'item' && !o.bone ? 'shapes' : body && s.type === 'paint' ? 'paint' : null;
  if (to === (was || '')) { listParts(); return; }
  const uses = (m, f) => { if (!m || typeof m !== 'object') return; if (Array.isArray(m[list])) for (const x of m[list]) if (x?.use === was) f(x); for (const v of Object.values(m)) uses(v, f); };
  let used = false;
  if (was && list) uses(build.moves, () => { used = true; });
  if (!to && used) { listParts(); return; } // (a name a pose uses: kept)
  commit(() => { if (to) o.name = to; else delete o.name; if (used) uses(build.moves, (x) => { x.use = to; }); });
  listParts(); inspect();
}
