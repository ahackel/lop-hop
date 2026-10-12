// The bones (see asset.js: bones) as the editor changes them: one added on a joint or a bone, put on another (where it
// is, kept), renamed (what is on it and its keys in the moves with it), deleted (what was on it on what it was on, where
// it is). Places are kept as Setup shows them (the build's own pose)
import { ON_BONE, geomOf, minus, r3, shiftShape } from './parts.js';
import { P, build, commit, eachIn, isGroup, refresh, setSel, toLocal, toWorld } from './state.js';

const ID = { o: [0, 0], a: 0, flip: 1 };
const frame = (n) => (n ? P.F[n] : P.F.box) || ID;
// from one frame into another, where it is: a point, a turn
const into = (f, g) => (q) => toLocal(g, ...toWorld(f, q)).map(r3);
const turnInto = (f, g, a) => r3((f.a + a * f.flip - g.a) * g.flip);
// what a name is taken by already (a joint, a leg, a swing, a bone; a leg's part)
export const taken = (n) => n === 'spine' || /\.(thigh|shin)$/.test(n) || [build.joints, build.legs, build.chains, build.bones].some((o) => o && n in o);
export function freeBone(stem = 'bone') { let n = stem; for (let k = 2; taken(n); k++) n = `${stem}${k}`; return n; }
// a bone and the bones on it, all the way down (a bone is put on none of them)
export function under(n) {
  const out = new Set([n]);
  for (let more = true; more;) { more = false; for (const [k, b] of Object.entries(build.bones || {})) if (out.has(b.on) && !out.has(k)) { out.add(k); more = true; } }
  return out;
}
const setOn = (o, on) => { if (on) o.on = on; else delete o.on; };

// a new bone on a joint or a bone (on a bone: at its end), picked
export function addBone(on) {
  const n = freeBone();
  commit(() => {
    const up = build.bones?.[on];
    (build.bones ||= {})[n] = { on, at: up ? [up.length || 0, 0] : [0, 0], angle: 0, length: 3 };
    setSel({ type: 'bone', name: n });
  });
  refresh();
}
// a bone put on another joint or bone (none: the box), where it is
export function reparentBone(n, to) {
  const b = build.bones[n];
  if (under(n).has(to) || (b.on || '') === to) return;
  const f = frame(b.on), g = frame(to);
  commit(() => { b.at = into(f, g)(b.at || [0, 0]); b.angle = turnInto(f, g, b.angle || 0); setOn(b, to); });
  refresh();
}
// renamed: what is on it (a shape, a swing, a leg, a bone, a dot), what is drawn along it, a bone reaching it, its keys in
// the moves
export function renameBone(was, to) {
  to = to.trim();
  if (!to || to === was || taken(to) || /[.\s]/.test(to)) { refresh(); return; }
  const renamed = (o) => { const out = {}; for (const k in o) out[k === was ? to : k] = o[k]; return out; };
  const put = (o) => {
    if (o.on === was) o.on = to;
    if (o.bone === was) o.bone = to;
    if (o.bones && typeof o.bones === 'object' && !Array.isArray(o.bones) && was in o.bones) o.bones = renamed(o.bones);
  };
  commit(() => {
    eachIn(build, put);
    for (const b of Object.values(build.bones)) if (b.to === was) b.to = to; // (one reaching it)
    setSel({ type: 'bone', name: to });
  });
  refresh();
}
// a shape moved from one frame into another, where it is
function shapeInto(s, f, g) {
  const m = into(f, g), k = geomOf(s), v = s[k];
  if (!k) return;
  if (k === 'triangle') s.triangle = v.map(m);
  else if (k === 'capsule') s.capsule = [...m(v.slice(0, 2)), ...m(v.slice(2, 4)), v[4]];
  else {
    const c = k === 'ellipse' ? [v[0], v[1]] : [(v[0] + v[2]) / 2, (v[1] + v[3]) / 2];
    shiftShape(s, minus(m(c), c));
    const a = turnInto(f, g, s.angle || 0);
    if (Math.abs(a) > 0.0005) s.angle = a; else delete s.angle;
  }
}
// a leg or a swing moved from one frame into another, where it is: its root, an ear's tip, a tail's turn (chain: a swing)
export function moveOnto(o, f, g, on, chain) {
  const m = into(f, g);
  o.at = m(o.at);
  if (o.tip) o.tip = m(o.tip);
  if (chain && !o.ear) o.angle = r3((o.angle || 0) + g.a - f.a);
  o.on = on;
}
// what is on a bone moved from its frame (f) into another (g), where it is: on what it is now (to: put on another; a
// leg or a swing, which want a joint, on the chest for the box); a shape drawn along it, a capsule where it is
function rehome(n, f, g, to) {
  const on = to === undefined ? n : to, gj = to === '' ? frame('chest') : g, onj = to === '' ? 'chest' : on;
  for (const c of Object.values(build.bones)) if (c.on === n) { c.at = into(f, g)(c.at || [0, 0]); c.angle = turnInto(f, g, c.angle || 0); setOn(c, on); }
  for (const L of Object.values(build.legs || {})) if (L.on === n) moveOnto(L, f, gj, onj);
  for (const c of Object.values(build.chains || {})) if (c.on === n) moveOnto(c, f, gj, onj, true);
  const b = build.bones[n], len = b.length || 0, a = toLocal(g, ...f.o).map(r3), e = toLocal(g, ...toWorld(f, [len, 0])).map(r3);
  for (const G of (build.layers || []).filter(isGroup)) {
    const all = [...G.shapes, ...(G.paint || [])], mine = all.filter((s) => s.on === n);
    if (mine.length && (G.at || G.angle) && mine.length === all.length) { // (a group with a pivot: the pivot moved, its shapes as they are)
      G.at = into(f, g)(G.at || [0, 0]); const t = turnInto(f, g, G.angle || 0); if (Math.abs(t) > 0.0005) G.angle = t; else delete G.angle;
      for (const s of mine) setOn(s, on);
    } else for (const s of mine) { shapeInto(s, f, g); setOn(s, on); }
    if (G.spikes?.on === n) { shapeInto(G.spikes, f, g); setOn(G.spikes, on); }
    if (to !== undefined) for (const s of G.shapes) if (s.bone === n) { const r = Array.isArray(s.r) ? Math.max(...s.r) : s.r ?? 1; for (const x of ON_BONE) delete s[x]; s.capsule = [...a, ...e, r]; setOn(s, on); }
  }
  for (const d of build.dots || []) if (d.on === n) { d.at = into(f, g)(d.at); setOn(d, on); }
}
// a bone reaching a joint or a bone (see bonesOn in art.js), where it is: its end where its tip was, as long as it was
// (none long: as far as it is); or no more (''): turned as its first part was, as long as it was
export function reachTo(n, to) {
  const b = build.bones[n], f = frame(n), up = frame(b.on), tip = f.pts ? f.pts[f.pts.length - 1] : toWorld(f, [b.length || 0, 0]);
  const { on, at, length = 0, bend, links } = b;
  for (const k in b) delete b[k];
  Object.assign(b, on && { on }, at && { at }); // (in the order a file has them)
  if (to) Object.assign(b, { to, end: toLocal(frame(to), ...tip).map(r3), length: length || r3(Math.hypot(...minus(tip, f.o))) }, bend && { bend }, links && { links });
  else { if (f.a !== up.a) b.angle = r3((f.a - up.a) * up.flip); if (length) b.length = length; }
}
// what a bone may reach: a joint, or a bone not on it (nor reaching it)
export const reachChoices = (n) => { const no = under(n); return [...Object.keys(build.joints), ...Object.keys(build.bones || {}).filter((k) => !no.has(k) && build.bones[k].to !== n)]; };
// a bone moved or turned alone (⌥-dragged): what is on it stays where it is
export function moveAlone(n, at, angle) {
  const B = build.bones[n], up = frame(B.on), f = frame(n), g = { o: toWorld(up, at), a: up.a + angle * up.flip, flip: up.flip };
  rehome(n, f, g);
  B.at = at; B.angle = angle;
}
// deleted: what was on it on what it was on, where it is (see rehome); one reaching it no more; its keys in the moves gone
export function deleteBone(n) {
  const up = build.bones[n].on || '';
  commit(() => {
    rehome(n, frame(n), frame(up), up);
    for (const k in build.bones) if (build.bones[k].to === n) reachTo(k, '');
    eachIn(build.moves, (o) => { if (o.bones && !Array.isArray(o.bones) && n in o.bones) { delete o.bones[n]; if (!Object.keys(o.bones).length) delete o.bones; } });
    delete build.bones[n];
    if (!Object.keys(build.bones).length) delete build.bones;
    setSel(up && build.bones?.[up] ? { type: 'bone', name: up } : up in (build.joints || {}) ? { type: 'joint', name: up } : { type: 'rig' });
  });
  refresh();
}
