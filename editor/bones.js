// The bones (see asset.js: bones) as the editor changes them: one added on a joint or a bone, put on another (where it
// is, kept), renamed (what is on it and its keys in the moves with it), deleted (what was on it on what it was on, where
// it is). Places are kept as Setup shows them (the build's own pose)
import { geomOf } from './parts.js';
import { P, build, commit, isGroup, refresh, setSel, toLocal, toWorld } from './state.js';

const ID = { o: [0, 0], a: 0, flip: 1 };
const frame = (n) => (n ? P.F[n] : P.F.box) || ID;
const r3 = (v) => +(+v).toFixed(3);
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
// renamed: what is on it (a shape, a swing, a leg, a bone, a dot), what is drawn along it, its keys in the moves
export function renameBone(was, to) {
  to = to.trim();
  if (!to || to === was || taken(to) || /[.\s]/.test(to)) { refresh(); return; }
  const renamed = (o) => { const out = {}; for (const k in o) out[k === was ? to : k] = o[k]; return out; };
  const walk = (o) => {
    if (!o || typeof o !== 'object') return;
    if (o.on === was) o.on = to;
    if (o.bone === was) o.bone = to;
    if (o.bones && typeof o.bones === 'object' && !Array.isArray(o.bones) && was in o.bones) o.bones = renamed(o.bones);
    for (const v of Object.values(o)) walk(v);
  };
  commit(() => { walk(build); setSel({ type: 'bone', name: to }); });
  refresh();
}
// a shape moved from one frame into another, where it is
function shapeInto(s, f, g) {
  const m = into(f, g), k = geomOf(s), v = s[k];
  if (!k) return;
  if (k === 'triangle') s.triangle = v.map(m);
  else if (k === 'capsule') s.capsule = [...m(v.slice(0, 2)), ...m(v.slice(2, 4)), v[4]];
  else {
    const c = k === 'ellipse' ? [v[0], v[1]] : [(v[0] + v[2]) / 2, (v[1] + v[3]) / 2], q = m(c), d = [q[0] - c[0], q[1] - c[1]];
    s[k] = k === 'ellipse' ? [q[0], q[1], v[2], v[3]] : [r3(v[0] + d[0]), r3(v[1] + d[1]), r3(v[2] + d[0]), r3(v[3] + d[1]), v[4]];
    const a = turnInto(f, g, s.angle || 0);
    if (Math.abs(a) > 0.0005) s.angle = a; else delete s.angle;
  }
}
const ALONG = ['bone', 'along', 'r', 'ends', 'round', 'foot', 'end', 'marks', 'grows', 'base', 'tipColor', 'tipSize'];
// what is on a bone moved from its frame (f) into another (g), where it is: on what it is now (to: put on another; a
// leg or a swing, which want a joint, on the chest for the box); a shape drawn along it, a capsule where it is
function rehome(n, f, g, to) {
  const on = to === undefined ? n : to, gj = to === '' ? frame('chest') : g, onj = to === '' ? 'chest' : on;
  for (const c of Object.values(build.bones)) if (c.on === n) { c.at = into(f, g)(c.at || [0, 0]); c.angle = turnInto(f, g, c.angle || 0); setOn(c, on); }
  for (const L of Object.values(build.legs || {})) if (L.on === n) { L.at = into(f, gj)(L.at); L.on = onj; }
  for (const c of Object.values(build.chains || {})) if (c.on === n) {
    c.at = into(f, gj)(c.at); if (c.tip) c.tip = into(f, gj)(c.tip); if (!c.ear) c.angle = r3((c.angle || 0) + gj.a - f.a); c.on = onj;
  }
  const b = build.bones[n], len = b.length || 0, a = toLocal(g, ...f.o).map(r3), e = toLocal(g, ...toWorld(f, [len, 0])).map(r3);
  for (const G of (build.layers || []).filter(isGroup)) {
    const all = [...G.shapes, ...(G.paint || [])], mine = all.filter((s) => s.on === n);
    if (mine.length && (G.at || G.angle) && mine.length === all.length) { // (a group with a pivot: the pivot moved, its shapes as they are)
      G.at = into(f, g)(G.at || [0, 0]); const t = turnInto(f, g, G.angle || 0); if (Math.abs(t) > 0.0005) G.angle = t; else delete G.angle;
      for (const s of mine) setOn(s, on);
    } else for (const s of mine) { shapeInto(s, f, g); setOn(s, on); }
    if (G.spikes?.on === n) { shapeInto(G.spikes, f, g); setOn(G.spikes, on); }
    if (to !== undefined) for (const s of G.shapes) if (s.bone === n) { const r = Array.isArray(s.r) ? Math.max(...s.r) : s.r ?? 1; for (const x of ALONG) delete s[x]; s.capsule = [...a, ...e, r]; setOn(s, on); }
  }
  for (const d of build.dots || []) if (d.on === n) { d.at = into(f, g)(d.at); setOn(d, on); }
}
// a bone moved or turned alone (⌥-dragged): what is on it stays where it is
export function moveAlone(n, at, angle) {
  const B = build.bones[n], up = frame(B.on), f = frame(n), g = { o: toWorld(up, at), a: up.a + angle * up.flip, flip: up.flip };
  rehome(n, f, g);
  B.at = at; B.angle = angle;
}
// deleted: what was on it on what it was on, where it is (see rehome); its keys in the moves gone
export function deleteBone(n) {
  const b = build.bones[n], up = b.on || '';
  commit(() => {
    rehome(n, frame(n), frame(up), up);
    const walk = (o) => { if (!o || typeof o !== 'object') return; if (o.bones && !Array.isArray(o.bones) && n in o.bones && o !== build) { delete o.bones[n]; if (!Object.keys(o.bones).length) delete o.bones; } for (const v of Object.values(o)) walk(v); };
    walk(build.moves);
    delete build.bones[n];
    if (!Object.keys(build.bones).length) delete build.bones;
    setSel(up && build.bones?.[up] ? { type: 'bone', name: up } : up in (build.joints || {}) ? { type: 'joint', name: up } : { type: 'rig' });
  });
  refresh();
}
