// The parts of the build (see editor.js): what picks each, its handles (where, and what dragging one does), its outline
import { rigParts } from '../art.js';
import { GEOMS, P, build, editable, hidden, isGroup, kind, sdShape, sel, swatch, toLocal, toWorld, view } from './state.js';
import { frames, kindOf, setKey } from './timeline.js';

// every part of the build: what picks it (sel), its name in the list, its color, the object the inspector edits, its
// handles (each: where, and what dragging it there does), its outline and whether a point is on it
const frameOf = (on) => (on ? P.F[on] : null);
const local = (f, p) => (f ? toLocal(f, p[0], p[1]) : p);
const world = (f, p) => toWorld(f, p);
export let step = 0.1;
const round = (v) => Math.round(v / step) * step;
const roundAll = (p) => p.map((v) => +round(v).toFixed(3));
export const plus = (a, b) => [a[0] + b[0], a[1] + b[1]], minus = (a, b) => [a[0] - b[0], a[1] - b[1]], times = (a, k) => [a[0] * k, a[1] * k];

export function geomOf(s) { return GEOMS.find((g) => Array.isArray(s[g])); }
// a shape on a bone (bone, along: see asset.js): the kind of bone it is on; what it is drawn as along it (none: as its
// bone had it); its settings, each as art.js draws it if not set (so every one shows in the inspector)
export const boneKind = (s) => (s.bone === 'spine' ? 'spine' : build.legs?.[s.bone] ? 'leg' : build.chains?.[s.bone]?.ear ? 'ear' : build.chains?.[s.bone] ? 'tail' : null);
export const alongOf = (s) => s.along || (s.bone === 'spine' ? (s.round ? 'capsule' : 'ellipse') : build.chains?.[s.bone]?.ear ? 'triangle' : 'capsule');
// a shape with a bone of its own: a chain only it is on, by its name (in its file: in the shape, see asset.js); in Setup
// its bone's handles are its own, not a bone's in the list
const shapesOn = (n) => (build.layers || []).filter(isGroup).flatMap((G) => G.shapes).filter((x) => x.bone === n);
export const isOwn = (n) => { const on = shapesOn(n); return !!build.chains?.[n] && on.length === 1 && on[0].name === n; };
export const ownChain = (s) => (s?.bone && s.name === s.bone && isOwn(s.bone) ? build.chains[s.bone] : null);
// what a shape can be on: a joint, a leg's thigh or shin, none (the box)
export const onChoices = () => ['', 'spine', 'hip', 'chest', 'head', ...Object.keys(build.legs || {}).flatMap((n) => [`${n}.thigh`, `${n}.shin`])];
export const spineShape = () => (build.layers || []).filter(isGroup).flatMap((G) => G.shapes).find((s) => s.bone === 'spine'); // (the torso: a move's torso changes it)
export const ALONG = { // (each kind's own settings along a bone)
  ellipse: { r: 1, ends: 0 }, capsule: { r: 1, ends: 0, end: 0 }, box: { r: 1, ends: 0, round: 0 }, triangle: { base: [[-1.2, 0.5], [1.2, -0.5]], tipColor: undefined, tipSize: 2 },
};
export function boneDefaults(s) {
  const k = alongOf(s);
  return { bone: '', along: k, ...ALONG[k], ...(ALONG[k].base && { base: ALONG[k].base.map((q) => [...q]) }), ...(k === 'capsule' && { foot: null }), color: undefined, smooth: 1, marks: [], grows: false }; // (every capsule the same: a flat foot at its end on any)
}
// an object as the inspector shows it: what it has, and what it does not have yet as it is drawn without it (setting one
// sets it)
export function withDefaults(o, defaults) {
  const keys = () => [...Object.keys(defaults), ...Object.keys(o).filter((k) => !(k in defaults))];
  return new Proxy(o, {
    get: (t, k) => (k in t ? t[k] : defaults[k]),
    set: (t, k, v) => { t[k] = v; return true; }, // (as any setting of it: not as the default shows it, see getOwnPropertyDescriptor)
    has: (t, k) => k in t || k in defaults,
    ownKeys: () => keys(),
    getOwnPropertyDescriptor: (t, k) => ({ value: k in t ? t[k] : defaults[k], enumerable: true, configurable: true, writable: true }),
  });
}
// a shape on a bone as the stage shows it: its outline and what picks it (as the pose has the bone, see onBone in
// art.js), its handles (how thick it is, how far past its ends; a triangle's base)
function boneBits(s) {
  const o = rigParts.onBone(kind, P, s, s === spineShape());
  if (!o) return { handles: [], lines: [], hit: () => false };
  const handles = [], k = alongOf(s), { pts, rf, at } = o.line, a = pts[0], b = pts[pts.length - 1], n = pts.length;
  const dirOf = (p, q) => { const d = minus(q, p), l = Math.hypot(...d) || 1; return [d[0] / l, d[1] / l]; };
  const thick = (q, dir, r, put) => { const nrm = [-dir[1], dir[0]]; handles.push({ at: plus(q, times(nrm, r)), size: true, set: (p) => put(Math.max(0.1, +round(Math.hypot(...minus(p, q))).toFixed(3))) }); };
  const rr = (i) => (Array.isArray(s.r) ? s.r[i ? 1 : 0] : s.r ?? 1);
  const torso = s === spineShape(), dr = torso && typeof s.r !== 'object' ? (P.torso.r ?? 1) - (s.r ?? 1) : 0, de = torso ? (P.torso.ends || 0) - (s.ends || 0) : 0; // (the torso: drawn as the pose has it, more or less)
  if (k === 'triangle') (s.base || []).forEach((d, i) => handles.push({ at: world(rf, plus(at, d)), set: (p) => { s.base[i] = roundAll(minus(local(rf, p), at)); } }));
  else if (k === 'capsule') {
    if (Array.isArray(s.r)) { thick(a, dirOf(a, pts[1]), rr(0), (v) => { s.r = [v, s.r[1]]; }); thick(b, dirOf(pts[n - 2], b), rr(1), (v) => { s.r = [s.r[0], v]; }); }
    else { const q = mix(pts[n - 2], b, 0.5); thick(q, dirOf(pts[n - 2], b), rr(0) + dr, (v) => { s.r = Math.max(0.1, +(v - dr).toFixed(3)); }); }
  } else { // (an ellipse, a box: from its root to its end, in its frame)
    const f = o.parts[0].f, len = Math.hypot(...minus(b, a)), r = Math.max(0.05, Math.abs(o.parts[0].s.ellipse?.[3] ?? o.parts[0].s.box[3])), e = (s.ends || 0) + de;
    handles.push({ at: world(f, [len / 2, -r]), size: true, set: (p) => { s.r = Math.max(0, +(round(Math.abs(local(f, p)[1])) - dr).toFixed(3)); } });
    handles.push({ at: world(f, [len + e, 0]), size: true, set: (p) => { s.ends = Math.max(0, +(round(local(f, p)[0] - len) - de).toFixed(3)); } });
  }
  const bits = o.parts.map((q) => shapeBits(q.s, q.f || null));
  return { handles, lines: bits.flatMap((x) => x.lines), hit: (p) => bits.some((x) => x.hit(p)) };
}
const mix = (p, q, t) => plus(p, times(minus(q, p), t));
const bitsOf = (s) => (s.bone ? boneBits(s) : shapeBits(s));
// a group's frame for one of its shapes: its pivot (at) in the shape's joint's frame, turned by its angle (as drawRig)
// (a shape on a bone: its bone's, see boneBits)
function groupFrame(t, s) {
  if (!t.at && !t.angle) return frameOf(s.on);
  const b = frameOf(s.on) || { o: [0, 0], a: 0, flip: 1 };
  return { o: world(b, t.at || [0, 0]), a: b.a + (t.angle || 0) * b.flip, flip: b.flip };
}
const turnBy = (v, a) => [v[0] * Math.cos(a) - v[1] * Math.sin(a), v[0] * Math.sin(a) + v[1] * Math.cos(a)];
// a shape moved by d, in its own coordinates
export function shiftShape(s, [dx, dy]) {
  const g = geomOf(s), v = s[g], r = (x) => +x.toFixed(3);
  if (g === 'triangle') for (const q of v) { q[0] = r(q[0] + dx); q[1] = r(q[1] + dy); }
  else if (g === 'ellipse') { v[0] = r(v[0] + dx); v[1] = r(v[1] + dy); }
  else { v[0] = r(v[0] + dx); v[1] = r(v[1] + dy); v[2] = r(v[2] + dx); v[3] = r(v[3] + dy); }
}
// a group's pivot put at q, its shapes staying where they are
export function repivot(t, q) {
  const at = t.at || [0, 0], d = turnBy(minus(at, q), -(t.angle || 0));
  for (const s of [...t.shapes, ...(t.paint || [])]) shiftShape(s, d);
  t.at = q;
}
// the middle of a group's shapes, in their joint's frame
export function middleOf(t) {
  const pts = t.shapes.flatMap((s) => { const g = geomOf(s), v = s[g]; return g === 'triangle' ? v : g === 'ellipse' ? [[v[0], v[1]]] : [[v[0], v[1]], [v[2], v[3]]]; });
  const m = [pts.reduce((a, q) => a + q[0], 0) / pts.length, pts.reduce((a, q) => a + q[1], 0) / pts.length];
  return roundAll(plus(t.at || [0, 0], turnBy(m, t.angle || 0)));
}
export let alt = false; // (⌥ held, dragging: see a group's pivot)
// handles and outline of a shape (in its joint's frame)
function shapeBits(s, fr) { // (fr: its frame, if not its joint's: in a group, see groupFrame)
  const f = fr !== undefined ? fr : frameOf(s.on), g = geomOf(s), v = s[g];
  // (an ellipse, a box: turned about its middle by its angle; its handles with it)
  const turns = g === 'ellipse' || g === 'box', ang = turns ? s.angle || 0 : 0, c0 = g === 'ellipse' ? [v[0], v[1]] : g === 'box' ? [(v[0] + v[2]) / 2, (v[1] + v[3]) / 2] : [0, 0];
  const L = (p) => plus(c0, turnBy(minus(local(f, p), c0), -ang)), Wd = (p) => world(f, plus(c0, turnBy(minus(p, c0), ang)));
  const handles = [], lines = [];
  const point = (get, put, anchor) => handles.push({ at: Wd(get()), set: (p) => put(roundAll(L(p))), anchor });
  const mover = (pts) => { // the middle: moves all of it
    const mid = () => [pts().reduce((a, q) => a + q[0], 0) / pts().length, pts().reduce((a, q) => a + q[1], 0) / pts().length];
    handles.push({ at: Wd(mid()), anchor: true, move: true, set: (p) => { const d = minus(roundAll(local(f, p)), mid()); shift(d); } });
  };
  const turner = (out) => { // its turn: the handle on the line out of its middle
    const at = Wd(plus(c0, [out + 1.5, 0]));
    handles.push({ at, size: true, set: (p) => { const q = minus(local(f, p), c0), a = Math.round(Math.atan2(q[1], q[0]) / (alt ? 0.01 : Math.PI / 36)) * (alt ? 0.01 : Math.PI / 36); if (Math.abs(a) < 0.005) delete s.angle; else s.angle = +a.toFixed(3); } });
    lines.push([world(f, c0), at]);
  };
  const shift = (d) => {
    if (g === 'ellipse') { v[0] = +(v[0] + d[0]).toFixed(3); v[1] = +(v[1] + d[1]).toFixed(3); }
    else if (g === 'triangle') for (const q of v) { q[0] = +(q[0] + d[0]).toFixed(3); q[1] = +(q[1] + d[1]).toFixed(3); }
    else { for (const i of [0, 2]) v[i] = +(v[i] + d[0]).toFixed(3); for (const i of [1, 3]) v[i] = +(v[i] + d[1]).toFixed(3); }
  };
  const ring = (n, at) => { const pts = []; for (let i = 0; i <= n; i++) pts.push(Wd(at((i / n) * Math.PI * 2))); return pts; };
  if (g === 'ellipse') {
    mover(() => [[v[0], v[1]]]);
    handles.push({ at: Wd([v[0] + v[2], v[1]]), size: true, set: (p) => { v[2] = Math.max(0.2, +Math.abs(round(L(p)[0] - v[0])).toFixed(3)); } });
    handles.push({ at: Wd([v[0], v[1] + v[3]]), size: true, set: (p) => { v[3] = Math.max(0.2, +Math.abs(round(L(p)[1] - v[1])).toFixed(3)); } });
    turner(v[2]);
    lines.push(ring(40, (t) => [v[0] + v[2] * Math.cos(t), v[1] + v[3] * Math.sin(t)]));
  } else if (g === 'capsule') {
    const a = [v[0], v[1]], b = [v[2], v[3]], len = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1, d = [(b[0] - a[0]) / len, (b[1] - a[1]) / len], n = [-d[1], d[0]], r = v[4];
    point(() => a, (q) => { v[0] = q[0]; v[1] = q[1]; });
    point(() => b, (q) => { v[2] = q[0]; v[3] = q[1]; });
    const mid = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
    handles.push({ at: Wd(plus(mid, [n[0] * r, n[1] * r])), size: true, set: (p) => { const q = L(p); v[4] = Math.max(0.2, +round(Math.hypot(q[0] - mid[0], q[1] - mid[1])).toFixed(3)); } });
    mover(() => [[v[0], v[1]], [v[2], v[3]]]);
    const arc = (c, from) => { const pts = []; for (let i = 0; i <= 16; i++) { const t = from + (i / 16) * Math.PI; pts.push(Wd([c[0] + r * (n[0] * Math.cos(t) + d[0] * Math.sin(t)), c[1] + r * (n[1] * Math.cos(t) + d[1] * Math.sin(t))])); } return pts; };
    lines.push([...arc(b, 0), ...arc(a, Math.PI), Wd(plus(b, [n[0] * r, n[1] * r]))]);
  } else if (g === 'box') {
    if (ang) { // (turned: as wide and as tall about its middle, which stays)
      const half = (i, q) => { const h = Math.max(0.2, +Math.abs(round(q[i] - c0[i])).toFixed(3)); v[i] = +(c0[i] - h).toFixed(3); v[i + 2] = +(c0[i] + h).toFixed(3); };
      handles.push({ at: Wd([v[2], c0[1]]), size: true, set: (p) => half(0, L(p)) }, { at: Wd([c0[0], v[3]]), size: true, set: (p) => half(1, L(p)) });
    } else {
      point(() => [v[0], v[1]], (q) => { v[0] = q[0]; v[1] = q[1]; });
      point(() => [v[2], v[3]], (q) => { v[2] = q[0]; v[3] = q[1]; });
    }
    turner(Math.abs(v[2] - v[0]) / 2);
    mover(() => [[v[0], v[1]], [v[2], v[3]]]);
    lines.push([[v[0], v[1]], [v[2], v[1]], [v[2], v[3]], [v[0], v[3]], [v[0], v[1]]].map(Wd));
  } else {
    v.forEach((q, i) => point(() => q, (p) => { v[i] = p; }));
    mover(() => v);
    lines.push([...v, v[0]].map(Wd));
  }
  return { handles, lines, hit: (p) => { const q = L(p); return sdShape(s, q[0], q[1]) <= 0; } };
}

export function parts() {
  const out = [];
  if (!editable()) return out;
  if (view.move !== 'edit') return kindOf(view.move) === 'clip' ? poseParts() : out;
  out.push({ sel: { type: 'rig' }, group: 'Animal', label: 'root', obj: build, handles: [], lines: [] });
  for (const n in build.joints) {
    const jp = { sel: { type: 'joint', name: n }, group: 'Joints', label: n, obj: build.joints, key: n, lines: [],
      handles: [{ at: P.J[n], anchor: true, joint: true, set: (p) => { build.joints[n] = roundAll(p); } }] };
    if (n === 'head') { // (what it turns about: from the joint, as it is at rest)
      const pv = plus(P.J.head, build.headPivot || [0, 0]);
      jp.handles.push({ at: pv, size: true, set: (p) => { const q = roundAll(minus(p, P.J.head)); if (q[0] || q[1]) build.headPivot = q; else delete build.headPivot; } });
      jp.lines.push([P.J.head, pv]);
    }
    out.push(jp);
  }
  // each group (in the order drawn): itself (on no bone: its pivot, dragged: all of it moves, with ⌥ the pivot alone; and
  // its turn, the handle on the line out of the pivot), then its shapes, its paint, its spikes, each a part of its own
  const face = (g) => {
    if (build.face) {
      const f = P.F.head, fc = build.face;
      out.push({ sel: { type: 'face' }, layer: g, label: 'face', color: swatch(fc.noseColor || 'outline'), obj: fc, lines: [],
        handles: ['eye', 'nose', 'mouth'].filter((k) => fc[k]).map((k) => ({ at: world(f, fc[k]), anchor: k === 'eye', set: (p) => { fc[k] = roundAll(local(f, p)); } })) });
    }
    (build.dots || []).forEach((d, i) => {
      const f = frameOf(d.on);
      out.push({ sel: { type: 'dot', i }, layer: g, label: d.name || 'dot', color: swatch(d.color || 'outline'), obj: d, depth: 1, off: hidden.has(d), lines: [],
        handles: [{ at: world(f, d.at), anchor: true, set: (p) => { d.at = roundAll(local(f, p)); } }] });
    });
  };
  (build.layers || []).forEach((G, g) => {
    if (!isGroup(G)) { face(g); return; }
    const off = hidden.has(G), kids = G.shapes.map((s) => (s.bone ? boneBits(s) : shapeBits(s, groupFrame(G, s))));
    const gp = { sel: { type: 'group', g }, layer: g, label: G.name || 'group', color: swatch(G.color || build.fur), obj: G, off, handles: [], lines: kids.flatMap((k) => k.lines), hit: (p) => kids.some((k) => k.hit?.(p)) };
    if (G.shapes.length && !G.shapes.some((s) => s.bone)) {
      const b = frameOf(G.shapes[0].on), at = G.at || [0, 0], a = G.angle || 0, pivot = world(b, at), turnAt = world(b, plus(at, [Math.cos(a) * 3, Math.sin(a) * 3]));
      gp.handles.push({ at: pivot, anchor: true, move: true, set: (p) => { const q = roundAll(local(b, p)); if (alt) repivot(G, q); else G.at = q; } },
        { at: turnAt, size: true, set: (p) => { const q = minus(local(b, p), G.at || [0, 0]); G.angle = +Math.atan2(q[1], q[0]).toFixed(3); } });
      gp.lines.push([pivot, turnAt]);
    }
    out.push(gp);
    G.shapes.forEach((s, i) => {
      const own = ownChain(s), cb = own && chainBits(own), k = cb ? { ...kids[i], handles: [...kids[i].handles, ...cb.handles], lines: [...kids[i].lines, ...cb.lines] } : kids[i];
      out.push({ sel: { type: 'item', g, i }, layer: g, label: s.name || geomOf(s) || alongOf(s), color: swatch(s.color || G.color || build.fur), obj: s, depth: 1, off: off || hidden.has(s), ...k });
    });
    (G.paint || []).forEach((s, i) => out.push({ sel: { type: 'paint', g, i }, layer: g, label: s.name || geomOf(s), color: swatch(s.color), obj: s, depth: 2, off: off || hidden.has(s), ...shapeBits(s, groupFrame(G, s)) }));
    if (G.spikes) out.push({ sel: { type: 'spikes', g }, layer: g, label: 'spikes', obj: G.spikes, depth: 1, off: off || hidden.has(G.spikes), ...shapeBits(G.spikes), hit: null });
  });
  if (!(build.layers || []).includes('face')) face(-1);
  for (const n in build.legs) {
    const L = build.legs[n], f = frameOf(L.on);
    out.push({ sel: { type: 'leg', name: n }, group: 'Legs', label: n, obj: L, lines: [],
      handles: [{ at: world(f, L.at), anchor: true, set: (p) => { L.at = roundAll(local(f, p)); } }] });
  }
  for (const n in build.chains) if (!isOwn(n)) out.push({ sel: { type: 'chain', name: n }, group: 'Chains', label: n, obj: build.chains[n], ...chainBits(build.chains[n]) });
  return out;
}
// a chain's handles: an ear's root and tip; a tail's root, and its tip (how long, its angle)
function chainBits(c) {
  const f = frameOf(c.on), handles = [], lines = [];
  if (c.ear) {
    handles.push({ at: world(f, c.at), set: (p) => { c.at = roundAll(local(f, p)); } });
    handles.push({ at: world(f, c.tip), anchor: true, set: (p) => { c.tip = roundAll(local(f, p)); } });
    lines.push([world(f, c.at), world(f, c.tip)]);
  } else {
    const root = world(f, c.at), th = f.a - c.angle, tip = plus(root, [Math.sin(th) * c.length, -Math.cos(th) * c.length]);
    handles.push({ at: root, anchor: true, set: (p) => { c.at = roundAll(local(f, p)); } });
    handles.push({ at: tip, size: true, set: (p) => {
      const d = minus(p, world(f, c.at));
      c.length = Math.max(0.3, +round(Math.hypot(d[0], d[1])).toFixed(3));
      c.angle = +(f.a - Math.atan2(d[0], -d[1])).toFixed(3);
    } });
    lines.push([root, tip]);
  }
  return { handles, lines };
}
// a clip's parts at the frame shown: its joints (the head with its turn), each paw, each tail's angle and ear's tip;
// dragging one sets a key there (see setKey)
export function poseParts() {
  const out = [], F = P.F, pivot = plus(P.J.head, build.headPivot || [0, 0]), turnAt = plus(pivot, [Math.cos(F.head.a) * 5, Math.sin(F.head.a) * 5]), n = frames(view.move); // (the head's turn: about its pivot)
  out.push({ sel: { type: 'frame' }, group: 'Frame', label: `frame ${view.frame + 1} of ${n}`, obj: null, handles: [], lines: [] });
  for (const j of Object.keys(build.joints)) {
    const handles = [{ at: P.J[j], anchor: true, joint: true, set: (p) => setKey(`joints.${j}`, roundAll(p)) }];
    if (j === 'head') handles.push({ at: turnAt, size: true, set: (p) => { const d = minus(p, pivot); setKey('headAngle', +Math.atan2(d[1], d[0]).toFixed(2)); } });
    out.push({ sel: { type: 'joint', name: j }, group: 'Joints', label: j, ...(j === 'head' && { tip: 'The ring: its turn' }), obj: null, lines: j === 'head' ? [[pivot, turnAt]] : [], handles });
  }
  for (const l in build.legs) {
    out.push({ sel: { type: 'paw', name: l }, group: 'Paws', label: l, obj: null, lines: [],
      handles: [{ at: P.p.paws[l], anchor: true, set: (p) => setKey(`paws.${l}`, roundAll(p)) }] });
  }
  for (const c in build.chains) {
    const r = rigParts.chainRest(kind, P, c), f = F[r.on], tip = plus(r.root, times(r.dir, r.length));
    const handles = [{ at: tip, anchor: true, set: r.ear ? (p) => setKey(`chains.${c}.tip`, roundAll(local(f, p)))
      : (p) => { const d = minus(p, r.root); setKey(`chains.${c}.angle`, +(f.a - Math.atan2(d[0], -d[1])).toFixed(3)); } }];
    out.push({ sel: { type: 'chain', name: c }, group: 'Tails and ears', label: c, obj: null, handles,
      lines: [[r.root, tip]] });
  }
  return out;
}
export const same = (a, b) => a.type === b.type && a.g === b.g && a.i === b.i && a.name === b.name; // (g: its group, i: where in it)
export const current = () => parts().find((p) => same(p.sel, sel));

export function setStep(v) { return (step = v); }
export function setAlt(v) { return (alt = v); }
