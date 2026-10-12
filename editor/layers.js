// The groups (see asset.js: layers) as the editor changes them: what a pick is in (a group, a shape in one, its paint,
// a dot), moved up or down, copied, deleted, dragged into another group or to another place among the groups, added;
// a group's switches; renamed (a pose that uses one by name still does)
import { inspect } from './inspector.js';
import { listParts } from './lists.js';
import { alongOf, geomOf, ownChain, shiftShape } from './parts.js';
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
// the shapes' own bones (see ownChain) with them: copied (each a name of its own), gone (their keys in the moves too),
// renamed (and their keys)
const shapesIn = (x) => (Array.isArray(x?.shapes) ? x.shapes : x && typeof x === 'object' ? [x] : []); // (a group's, or itself)
const ownIn = (xs) => xs.flatMap(shapesIn).filter((s) => ownChain(s)).map((s) => s.name); // (before: own while one shape is on it)
function freeName(n) {
  const stem = n.replace(/\d+$/, '') || 'swing', taken = new Set([...Object.keys(build.chains || {}), ...Object.keys(build.legs || {}), ...Object.keys(build.joints || {}), ...Object.keys(build.bones || {}), 'spine']);
  let m = stem;
  for (let k = 2; taken.has(m); k++) m = `${stem}${k}`;
  return m;
}
function ownCopies(copies, own) { // (copies: their shapes still on the originals' bones)
  for (const s of copies.flatMap(shapesIn)) {
    if (!own.includes(s.bone) || s.name !== s.bone) continue;
    const n = freeName(s.name);
    build.chains[n] = clone(build.chains[s.bone]); s.name = s.bone = n;
  }
}
const chainKeys = (f) => { const walk = (o) => { if (!o || typeof o !== 'object') return; if (o.chains && typeof o.chains === 'object' && !Array.isArray(o.chains)) f(o); for (const v of Object.values(o)) walk(v); }; walk(build.moves); };
function dropOwn(names) {
  for (const n of names) {
    delete build.chains?.[n];
    chainKeys((o) => { delete o.chains[n]; if (!Object.keys(o.chains).length) delete o.chains; });
  }
  if (build.chains && !Object.keys(build.chains).length) delete build.chains;
}
// swinging, or not: an option of any shape on a joint. On, its bone is its own, made from what it is, so it looks as it
// did: a capsule bends from its first point to its second (a tail, a strand), a triangle swings from its base (an ear),
// an ellipse or a box swings from below its middle to above it. Off, it is the shape it is at rest again, on the joint its
// bone hung from (its keys in the moves gone). A move that uses it by name (in the body) only as it is: no more (it is
// drawn in every move as it swings); one that changes it: not (see swingable)
const r3 = (v) => +(+v).toFixed(3), rot = ([x, y], a) => [x * Math.cos(a) - y * Math.sin(a), x * Math.sin(a) + y * Math.cos(a)];
const at3 = (q) => q.map(r3);
const usesOf = (s) => { const out = []; if (!s.name) return out; const walk = (m) => { if (!m || typeof m !== 'object') return; if (Array.isArray(m.shapes)) for (const x of m.shapes) if (x?.use === s.name) out.push([m.shapes, x]); for (const v of Object.values(m)) walk(v); }; walk(build.moves); return out; };
export const swingable = (s) => (!s.on ? 'Not on a joint' : usesOf(s).some(([, x]) => Object.keys(x).length > 1) ? 'A move changes it (by its name): it can’t swing' : '');
const SWINGS = { stiffness: 300, damping: 8, weight: 80 }, EARS = { stiffness: 1400, damping: 22, weight: 60 };
// how one swung, kept while the editor is open (off and on again: as it was); a new one's role: on the head an ear, on
// the hip a tail
const madeOf = (c, o) => JSON.stringify([c.at, c.angle, c.length, c.tip, c.links, c.curl, o.r, o.ends, o.base, o.round]); // (what its shape is made from)
const swung = new WeakMap(), SWUNG = ['links', 'curl', 'stiffness', 'damping', 'weight', 'role'], ALONG_TOO = ['marks', 'end', 'foot', 'tipColor', 'tipSize', 'grows'];
export function swingOn(s) {
  const g = geomOf(s), v = s[g], a = s.angle || 0, name = s.name && !(s.name in (build.chains || {})) && !(s.name in (build.legs || {})) && s.name !== 'spine' ? s.name : freeName(s.name || g);
  let chain, along;
  if (g === 'capsule') {
    const d = [v[2] - v[0], v[3] - v[1]];
    chain = { on: s.on, at: at3([v[0], v[1]]), angle: r3(-Math.atan2(d[0], -d[1])), links: 3, length: r3(Math.hypot(...d)), curl: 0, ...SWINGS };
    along = { along: 'capsule', r: v[4] };
  } else if (g === 'triangle') { // (its tip: its point furthest from the joint)
    const t = v.reduce((m, q, i) => (Math.hypot(...q) > Math.hypot(...v[m]) ? i : m), 0), [p, q] = v.filter((_, i) => i !== t), root = [(p[0] + q[0]) / 2, (p[1] + q[1]) / 2];
    chain = { on: s.on, ear: true, at: at3(root), tip: at3(v[t]), ...EARS };
    along = { along: 'triangle', base: [at3([p[0] - root[0], p[1] - root[1]]), at3([q[0] - root[0], q[1] - root[1]])] };
  } else { // (an ellipse, a box: from below its middle to above it, turned as it is)
    const c = g === 'ellipse' ? [v[0], v[1]] : [(v[0] + v[2]) / 2, (v[1] + v[3]) / 2], w = g === 'ellipse' ? v[2] : Math.abs(v[2] - v[0]) / 2, h = g === 'ellipse' ? v[3] : Math.abs(v[3] - v[1]) / 2;
    const k = g === 'ellipse' ? h * 0.7 : h, up = rot([0, -k], a);
    chain = { on: s.on, ear: true, at: at3([c[0] - up[0], c[1] - up[1]]), tip: at3([c[0] + up[0], c[1] + up[1]]), ...EARS };
    along = { along: g, r: r3(w), ...(h - k > 0.001 && { ends: r3(h - k) }), ...(g === 'box' && v[4] && { round: v[4] }) };
  }
  const was = swung.get(s);
  if (was) {
    const c = was.chain;
    for (const k of SWUNG) if (k in c && (k !== 'links' && k !== 'curl' || !chain.ear)) chain[k] = c[k]; else if (k === 'role') delete chain.role;
    if (!chain.ear && Math.abs(chain.length - c.length) < 0.01 && Math.abs(chain.angle - c.angle) < 0.01) Object.assign(chain, { length: c.length, angle: c.angle }); // (not changed: as it was)
    Object.assign(along, was.along);
  } else { const role = s.on === 'head' && chain.ear ? 'ear' : s.on === 'hip' && !chain.ear ? 'tail' : null; if (role) chain.role = role; }
  if (!chain.curl) delete chain.curl;
  if (was?.name === name) for (const [m, kv, ord] of was.keys) { const c = { ...m.chains, [name]: kv }, o = {}; for (const k of [...ord, ...Object.keys(c)]) if (k in c && !(k in o)) o[k] = c[k]; m.chains = o; } // (its keys in the moves: again, where they were)
  const geomOf0 = { [g]: clone(v), ...(s.angle && { angle: s.angle }) };
  swung.set(s, { ...was, plain: s.name, geom: geomOf0, made: madeOf(chain, along), uses: usesOf(s).map(([list, x]) => [list, x, list.indexOf(x)]) }); // (plain: its name before, if its bone needed another; geom: what it was, made: its bone as made from it)
  for (const [list, x] of usesOf(s)) list.splice(list.indexOf(x), 1);
  for (const k of ['ellipse', 'capsule', 'box', 'triangle', 'on', 'angle']) delete s[k];
  const rest = { ...s };
  for (const k in s) delete s[k];
  const all = { name, bone: name, ...along, ...rest, name, bone: name };
  for (const k of [...(was?.order || []).filter((x) => x in all), ...Object.keys(all)]) if (!(k in s)) s[k] = all[k]; // (in the order it had)
  if (was?.order) { const ord = Object.keys(was.chain); const c = {}; for (const k of [...ord.filter((x) => x in chain), ...Object.keys(chain)]) c[k] = chain[k]; chain = c; }
  (build.chains ||= {})[name] = chain;
}
export function swingOff(s) {
  const c = build.chains[s.bone], k = alongOf(s);
  let root = c.at, tip, dir;
  if (c.ear) tip = c.tip;
  else { // (a tail's points at rest, in its joint's frame: from its root to its end)
    let d = [-Math.sin(c.angle || 0), -Math.cos(c.angle || 0)], q = root;
    for (let i = 0, n = c.links || 1; i < n; i++, d = rot(d, c.curl || 0)) q = [q[0] + (d[0] * c.length) / n, q[1] + (d[1] * c.length) / n];
    tip = q;
  }
  const len = Math.hypot(tip[0] - root[0], tip[1] - root[1]) || 1; dir = [(tip[0] - root[0]) / len, (tip[1] - root[1]) / len];
  const r = Array.isArray(s.r) ? Math.max(...s.r) : s.r ?? 1, ends = s.ends || 0, mid = [(root[0] + tip[0]) / 2, (root[1] + tip[1]) / 2], a = r3(Math.atan2(dir[0], -dir[1]));
  let geom;
  if (k === 'capsule') geom = { capsule: [...at3(root), ...at3(tip), r3(r)] };
  else if (k === 'triangle') { const b = s.base || [[0, 0], [0, 0]]; geom = { triangle: [at3([root[0] + b[0][0], root[1] + b[0][1]]), at3([root[0] + b[1][0], root[1] + b[1][1]]), at3(tip)] }; }
  else if (k === 'ellipse') geom = { ellipse: [...at3(mid), r3(r), r3(len / 2 + ends)], ...(Math.abs(a) > 0.005 && { angle: a }) };
  else geom = { box: [r3(mid[0] - r), r3(mid[1] - len / 2 - ends), r3(mid[0] + r), r3(mid[1] + len / 2 + ends), s.round || 0], ...(Math.abs(a) > 0.005 && { angle: a }) };
  const name = s.bone, keep = { ...s };
  const before = swung.get(s);
  for (const [list, x, i] of before?.uses || []) list.splice(Math.min(i, list.length), 0, x); // (the moves that used it by name: again)
  if (before && 'plain' in before) { if (before.plain) keep.name = before.plain; else delete keep.name; }
  const keys = []; chainKeys((m) => { if (name in m.chains) keys.push([m, m.chains[name], Object.keys(m.chains)]); });
  if (before?.made && before.made === madeOf(c, s)) geom = before.geom; // (its bone not changed: the shape exactly as it was)
  swung.set(s, { name, keys, order: Object.keys(s), chain: { ...c }, along: Object.fromEntries(ALONG_TOO.filter((x) => x in s).map((x) => [x, s[x]]).concat(Array.isArray(s.r) ? [['r', s.r]] : [])) });
  for (const x of ['bone', 'along', 'r', 'ends', 'round', 'foot', 'end', 'marks', 'grows', 'base', 'tipColor', 'tipSize']) delete keep[x];
  for (const x in s) delete s[x];
  Object.assign(s, { ...(keep.name && { name: keep.name }), on: c.on, ...geom, ...keep });
  dropOwn([name]);
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
      const own = ownIn(objs), copies = objs.map((x) => { const arr = [...arrs].find(([, xs]) => xs.includes(x))[0], c = clone(x); arr.splice(arr.indexOf(x) + 1, 0, c); return c; });
      ownCopies(copies, own);
      repick(copies[0], copies.slice(1), sel);
    } else {
      const G = sel.type === 'item' || sel.type === 'paint' ? layers()[sel.g] : null, own = ownIn(objs); // (picked after: its group, if left)
      for (const [arr, xs] of arrs) for (const x of xs) { const i = arr.indexOf(x); if (i >= 0) arr.splice(i, 1); hidden.delete(x); }
      dropOwn(own);
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
    else if (what === 'copy') { const own = ownIn([arr[at]]), c = clone(arr[at]); arr.splice(at + 1, 0, c); ownCopies([c], own); setSel({ ...sel, [k]: at + 1 }); }
    else if (what === 'delete') {
      const own = ownIn([arr[at]]), [x] = arr.splice(at, 1);
      hidden.delete(x); dropOwn(own);
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
  const to = name.trim(), was = o.name, body = s.g === bodyIndex(), own = s.type === 'item' && ownChain(o);
  if (own && to !== was && (!to || to in (build.chains || {}) || to in (build.legs || {}) || to in (build.joints || {}) || to in (build.bones || {}) || to === 'spine')) { listParts(); return; } // (its bone's name: its, and not another's)
  const list = s.type === 'group' ? 'top' : body && s.type === 'item' && !o.bone ? 'shapes' : body && s.type === 'paint' ? 'paint' : null;
  if (to === (was || '')) { listParts(); return; }
  const uses = (m, f) => { if (!m || typeof m !== 'object') return; if (Array.isArray(m[list])) for (const x of m[list]) if (x?.use === was) f(x); for (const v of Object.values(m)) uses(v, f); };
  let used = false;
  if (was && list) uses(build.moves, () => { used = true; });
  if (!to && used) { listParts(); return; } // (a name a pose uses: kept)
  commit(() => {
    if (to) o.name = to; else delete o.name;
    if (used) uses(build.moves, (x) => { x.use = to; });
    if (own) { build.chains[to] = own; delete build.chains[was]; o.bone = to; chainKeys((m) => { if (was in m.chains) { m.chains[to] = m.chains[was]; delete m.chains[was]; } }); }
  });
  listParts(); inspect();
}
