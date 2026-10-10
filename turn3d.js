// An animal in 3D (the turn lab, tools/turn.html, and ?turn3d in the game): its rig given depth (DEPTH: how thick each
// part is, how far off the middle, which are mirrored to the other side), each frame worked out from the game's own pose
// and drawn by marching a ray down every pixel: any turn, and a tilt. Its parts join smoothly as the game's do; outlined
// round it, and inside where the surface jumps in depth (a leg in front of the belly) or one part lies over another (an
// ear); the eyes, the nose and the dots stuck onto the surface, shown where they face the eye. Only animals with a DEPTH.
import { FOOT, rigParts } from './art.js';
import rabbit from './animals/rabbit.js';

const { posed, chainRest, toWorld, NAMED } = rigParts;
const RIGS = { rabbit }, OUT = NAMED.OUT;
export const has3d = (kind) => !!DEPTH[kind];

// depth, by animal: torso { rz }; shapes, by name: { z, rz, mirror }; legs, by name: { z, mirror }; chains, by name:
// { z, mirror }; dots, by name: { mirror }; eyes: { forward: how far they are turned forward from looking out to the side
// (degrees), back: how far behind where the side has them they start from (art pixels) }; marks: how big the eyes (an
// ellipsoid's radii), the nose and the dots (a ball's) are when they are balls half sunk into it (model's marks: 'balls').
// A shape is in the middle (z 0) as thick as its narrower side, unless it says;
// a leg named …Near on the near side, …Far on the far side (w: how far), a chain in the middle (end: false: without the
// ball the side has at its tip)
export const DEPTH = {
  rabbit: {
    w: 2.2,
    torso: { rz: 4.6 },
    shapes: { haunch: { z: 2.2, rz: 2.6, mirror: true }, head: { rz: 3.8 }, muzzle: { rz: 2 } },
    legs: { hindNear: { z: 2.6, mirror: true }, frontNear: { z: 1.7, mirror: true } },
    chains: { ear: { z: 4.3, mirror: true, end: false }, tail: { z: 0 } },
    dots: { blush: { mirror: true } },
    eyes: { forward: 60, back: 2.5 },
    marks: { eye: [0.6, 1, 0.6], nose: 0.7, dot: 0.6 },
  },
};

// ------------------------------------------------------------------------------------------------------- the model
const add = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]], sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]], mul = (a, k) => [a[0] * k, a[1] * k, a[2] * k];
const deg = (d) => (d * Math.PI) / 180;
const len = (a) => Math.hypot(a[0], a[1], a[2]), norm = (a) => mul(a, 1 / (len(a) || 1)), dot3 = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
// v turned about the unit axis k by t (radians)
const turnAbout = (v, k, t) => add(add(mul(v, Math.cos(t)), mul(cross(k, v), Math.sin(t))), mul(k, dot3(k, v) * (1 - Math.cos(t))));
const at3 = (p, z = 0) => [p[0], p[1], z];
// two bones from a root toward a target (as art.js's reach)
function reach(root, target, a, b, bend) {
  const dx = target[0] - root[0], dy = target[1] - root[1], d0 = Math.hypot(dx, dy), dist = Math.min(a + b - 0.01, Math.max(Math.abs(a - b) + 0.01, d0));
  const ux = dx / (d0 || 1), uy = dy / (d0 || 1), t = bend * Math.acos(Math.max(-1, Math.min(1, (a * a + dist * dist - b * b) / (2 * a * dist))));
  const kx = root[0] + (ux * Math.cos(t) - uy * Math.sin(t)) * a, ky = root[1] + (ux * Math.sin(t) + uy * Math.cos(t)) * a;
  const ex = target[0] - kx, ey = target[1] - ky, el = Math.hypot(ex, ey) || 1;
  return [[kx, ky], [kx + (ex / el) * b, ky + (ey / el) * b]];
}

// the animal in a move's frame as parts in 3D (x forward, y down, z toward its near side; the 26×20 box): ellipsoids
// (c, a: turned in the side's plane, r [rx, ry, rz]) and capsules (a, b, r), each with an id (the same part in every pose:
// a skinned mesh's bone, see tools/turn-mesh.js), a color, a group (body: joined
// smoothly; each chain its own) and how smoothly it joins (k); and what is stuck onto it (decals: where they start,
// which way they go to reach the surface, a color, eye: drawn as an eye). chains: where the body has them (by name: its
// points, in the box, as the game swings them: see chainPoints), else at rest; swing: how far each is swung out to its
// side (flare) and back (lag) by turning (see swingChains); marks: 'decals' (the eyes, the nose and the dots stuck on as
// the game's pixels, once it is drawn), 'balls' (each a ball half sunk into the surface where it would be stuck: parts
// of the model, group marks, no outline between them and the body; blink: the eyes squashed), or 'none'
export function model(kind, move, frame, o = {}) { return modelPosed(kind, posed(kind, move, frame), o); }
// the same from the rig posed already (art.js's posed, or as any of its pictures has it: reaching, petted, held)
export function modelPosed(kind, P, { smooth = 1, depth = DEPTH[kind], chains = null, swing = null, marks = 'decals', blink = false } = {}) {
  const rig = RIGS[kind], { p, F, J } = P, fur = NAMED[rig.fur], k = (rig.smooth ?? 1) * smooth;
  const prims = [], decals = [];
  const both = (z, mirror, f) => { f(z); if (mirror && z) f(-z); };
  if (P.torso.r > 0) {
    const half = Math.hypot(J.chest[0] - J.hip[0], J.chest[1] - J.hip[1]) / 2, c = toWorld(F.spine, [half, 0]);
    prims.push({ id: 'torso', type: 'ell', c: at3(c), a: P.a, r: [half + P.torso.ends, P.torso.r, depth.torso?.rz ?? P.torso.r], color: fur, group: 'body', k });
  }
  [...(p.ownShapes ? [] : rig.shapes || []), ...(p.shapes || [])].forEach((s, i) => {
    const f = s.on ? F[s.on] : null, d = depth.shapes?.[s.name] || {}, id = (z) => `${s.name || i}${z < 0 ? ' far' : ''}`;
    if (s.ellipse) {
      const [ex, ey, rx, ry] = s.ellipse, c = toWorld(f, [ex, ey]);
      both(d.z || 0, d.mirror, (z) => prims.push({ id: id(z), type: 'ell', c: at3(c, z), a: f ? f.a : 0, r: [rx, ry, d.rz ?? Math.min(rx, ry)], color: fur, group: 'body', k: k * (s.smooth ?? 1) }));
    } else if (s.capsule) {
      const [ax, ay, bx, by, r] = s.capsule, a = toWorld(f, [ax, ay]), b = toWorld(f, [bx, by]);
      both(d.z || 0, d.mirror, (z) => prims.push({ id: id(z), type: 'cap', a: at3(a, z), b: at3(b, z), r, color: fur, group: 'body', k: k * (s.smooth ?? 1) }));
    }
  });
  for (const name in rig.legs || {}) {
    const L = rig.legs[name], d = depth.legs?.[name] || {}, root = p.roots?.[name] || toWorld(F[L.on], L.at), [knee, paw] = reach(root, p.paws[name], L.thigh, L.shin, L.bend);
    const z = d.z ?? (name.endsWith('Far') ? -depth.w : depth.w);
    both(z, d.mirror, (z) => {
      const id = `${name}${z < 0 && d.mirror ? ' far' : ''}`;
      prims.push({ id: `${id} thigh`, type: 'cap', a: at3(root, z), b: at3(knee, z), r: L.r, color: fur, group: 'body', k: k * 0.5 });
      prims.push({ id: `${id} shin`, type: 'cap', a: at3(knee, z), b: at3(paw, z), r: L.r, color: fur, group: 'body', k: k * 0.5 });
    });
  }
  for (const name in rig.chains || {}) {
    const c = { ...rig.chains[name], ...p.chains?.[name] };
    if (c.ear) continue; // (a pointed ear: not yet)
    const pts = chains?.[name] || restOf(kind, P, name);
    const r = (i) => (Array.isArray(c.r) ? c.r[0] + ((c.r[1] - c.r[0]) * i) / Math.max(1, pts.length - 2) : c.r ?? 1), d = depth.chains?.[name] || {}, color = NAMED[c.color] || fur;
    both(d.z || 0, d.mirror, (z) => {
      const group = `${name}${z < 0 ? ' far' : ''}`, s = z < 0 ? -1 : 1, sw = swing?.[name], n = pts.length - 1, root = at3(pts[0], z);
      // swung: the whole chain turned about its root, its tip toward where flare (out to its side) and lag (back) push
      // it; its links as long as ever, however hard it turns
      let axis = null, angle = 0;
      if (sw && n && (sw.flare || sw.lag)) {
        const tip = sub(at3(pts[n], z), root), to = add(tip, [s * sw.lag, 0, s * sw.flare]), c = cross(tip, to), cl = len(c);
        if (cl > 1e-6) { axis = mul(c, 1 / cl); angle = Math.min(1.4, Math.atan2(cl, dot3(tip, to))); }
      }
      const at = (i) => (axis ? add(root, turnAbout(sub(at3(pts[i], z), root), axis, angle)) : at3(pts[i], z));
      for (let i = 1; i < pts.length; i++) prims.push({ id: `${group} ${i}`, type: 'cap', a: at(i - 1), b: at(i), r: r(i - 1), color, group, k: 0.3 });
      if (c.end && d.end !== false) { const e = at(n); prims.push({ id: `${group} end`, type: 'cap', a: e, b: e, r: c.end, color, group, k: 0.3 }); }
    });
  }
  // stuck on: each eye from where the side has it (moved back), out to its side (turned forward), the nose forward,
  // the dots out to their side
  const fwd = [Math.cos(F.head.a), Math.sin(F.head.a), 0], face = rig.face;
  for (const s of [1, -1]) {
    const e = depth.eyes || {}, turn = deg(e.forward || 0), dir = norm(add(mul(fwd, Math.sin(turn)), [0, 0, s * Math.cos(turn)]));
    decals.push({ from: at3(toWorld(F.head, [face.eye[0] - (e.back || 0), face.eye[1]])), dir, color: OUT, eye: true });
  }
  if (face.nose) decals.push({ from: at3(toWorld(F.head, face.nose)), dir: fwd, color: NAMED[face.noseColor] || OUT, nose: true });
  for (const d of p.dots || rig.dots || []) {
    const from = at3(toWorld(d.on ? F[d.on] : null, d.at)), mirror = depth.dots?.[d.name]?.mirror ?? true;
    decals.push({ from, dir: [0, 0, 1], color: NAMED[d.color] || OUT });
    if (mirror) decals.push({ from, dir: [0, 0, -1], color: NAMED[d.color] || OUT });
  }
  if (marks === 'none') return { prims, decals: [] };
  if (marks !== 'balls') return { prims, decals };
  // balls: each where it would be stuck, its middle on the surface (half in it); an eye upright, turned as the head is
  const size = { eye: [0.6, 1, 0.6], nose: 0.7, dot: 0.6, ...depth.marks }, ball = (r) => [r, r, r];
  const at = decalPoints({ prims, decals });
  decals.forEach((dc, i) => {
    const { p } = at[i], r = dc.eye ? (blink ? [size.eye[0], size.eye[1] * 0.3, size.eye[2]] : size.eye) : ball(dc.nose ? size.nose : size.dot);
    prims.push({ id: `mark ${i}`, type: 'ell', c: dc.eye && blink ? add(p, [0, size.eye[1] * 0.6, 0]) : p, a: F.head.a, r, color: dc.color, group: 'marks', k: 0 });
  });
  return { prims, decals: [] };
}

// a chain at rest in a pose: its points, in the box
function restOf(kind, P, name) {
  const rest = chainRest(kind, P, name), pts = [rest.root];
  for (let i = 0, dir = rest.dir; i < rest.links; i++) {
    pts.push([pts[i][0] + (dir[0] * rest.length) / rest.links, pts[i][1] + (dir[1] * rest.length) / rest.links]);
    dir = [dir[0] * Math.cos(rest.curl) - dir[1] * Math.sin(rest.curl), dir[0] * Math.sin(rest.curl) + dir[1] * Math.cos(rest.curl)];
  }
  return pts;
}
// the chains where a body (the game's moveBody, which swings them in the side's plane) has them: in the box, to a
// quarter pixel (as the game draws them); none moved yet: null
export function chainPoints(body) {
  if (!body?.chains || !body.at) return null;
  const out = {}, q = (v) => Math.round(v * 4) / 4;
  for (const name in body.chains) out[name] = body.chains[name].map((pt) => [q(pt.p[0] - body.at[0]), q(pt.p[1] - body.at[1])]);
  return out;
}
// turning swings the chains out to their side too, which the side's plane has no room for: each a spring (its own
// stiffness and damping) pushed out by the turn's speed (spin: as round a merry-go-round, the further from the middle
// the more) and back by its speeding up and slowing down (it lags behind the turn). st: kept by the caller ({ name:
// { flare, lag, fv, lv } }), w: how fast it turns (radians a second), a: how fast that changes, gain: how much
export function swingChains(st, kind, w, a, dt, gain = 0.4, depth = DEPTH[kind]) {
  const rig = RIGS[kind], n = Math.max(1, Math.ceil(dt * 240)), h = dt / n;
  for (const name in rig.chains) {
    const c = rig.chains[name], z = Math.abs(depth.chains?.[name]?.z || 0), s = st[name] || (st[name] = { flare: 0, lag: 0, fv: 0, lv: 0 });
    for (let i = 0; i < n; i++) {
      s.fv += (w * w * (z + (c.length || 0) / 2) * gain - c.stiffness * s.flare - c.damping * s.fv) * h; s.flare += s.fv * h;
      if (s.flare < -0.5) { s.flare = -0.5; s.fv = Math.max(0, s.fv); } // (stopped by the head: not into it)
      s.lv += (a * z * gain - c.stiffness * s.lag - c.damping * s.lv) * h; s.lag += s.lv * h;
    }
  }
  return st;
}

// distances, negative inside (an ellipsoid's: Inigo Quilez's estimate)
export function sdPrim(q, x, y, z) {
  if (q.type === 'ell') {
    const dx = x - q.c[0], dy = y - q.c[1], dz = z - q.c[2], cs = q.cos, sn = q.sin;
    const lx = (dx * cs + dy * sn) / q.r[0], ly = (-dx * sn + dy * cs) / q.r[1], lz = dz / q.r[2];
    const k0 = Math.sqrt(lx * lx + ly * ly + lz * lz);
    if (k0 < 1e-6) return -Math.min(q.r[0], q.r[1], q.r[2]);
    const k1 = Math.sqrt((lx / q.r[0]) ** 2 + (ly / q.r[1]) ** 2 + (lz / q.r[2]) ** 2);
    return (k0 * (k0 - 1)) / k1;
  }
  const ax = q.a[0], ay = q.a[1], az = q.a[2], bx = q.b[0] - ax, by = q.b[1] - ay, bz = q.b[2] - az, px = x - ax, py = y - ay, pz = z - az;
  const h = Math.max(0, Math.min(1, (px * bx + py * by + pz * bz) / (bx * bx + by * by + bz * bz || 1)));
  return Math.hypot(px - bx * h, py - by * h, pz - bz * h) - q.r;
}
const smin = (a, b, k) => { if (k <= 0) return Math.min(a, b); const h = Math.max(k - Math.abs(a - b), 0) / k; return Math.min(a, b) - h * h * k * 0.25; };
// the scene's distance at a point, and which part is nearest (out.prim) in the group that is (out.group)
export function scene(m, x, y, z, out, bodyOnly = false) {
  let body = Infinity, best = Infinity, prim = null;
  for (const q of m.prims) {
    if (q.group !== 'body') continue;
    const d = sdPrim(q, x, y, z);
    body = smin(body, d, q.k);
    if (d < best) { best = d; prim = q; }
  }
  let d = body, group = 'body';
  if (!bodyOnly) for (const q of m.prims) {
    if (q.group === 'body') continue;
    const e = sdPrim(q, x, y, z);
    if (e < d) { d = e; group = q.group; prim = q; }
  }
  if (out) { out.group = group; out.prim = prim; }
  return d;
}

// --------------------------------------------------------------------------------------------------------- drawing
// a picture: GW × GH art pixels, from GX, GY in the box (palette indices, 0: nothing)
export const GX = -9, GY = -10, GW = 44, GH = 31;
const pic = () => new Uint8Array(GW * GH);
const PIVOT = [13, 13, 0], FLOOR = FOOT + 1; // (it turns about the middle of the box; nothing below its feet)

// the model turned (yaw: 0 its side, facing right; 90: facing out of the screen; tilt: seen from above), drawn: a ray
// down every pixel's middle; then the outlines, then what is stuck on. Inside, a pixel is outlined where its neighbour's
// surface is nearer and not the same surface: another part, or air between the two (the point half way between them
// more than gap outside it: a leg in front of the belly, not the belly curving away)
export function draw3d(m, yaw, tilt, { gap = 0.25, blink = false } = {}) {
  const { toView, toWorld3, midV, R, dirW } = view(m, yaw, tilt);
  const hitG = new Array(GW * GH).fill(null), depth = new Float32Array(GW * GH), hit = new Float32Array(GW * GH * 3), color = pic(), info = {};
  for (let j = 0; j < GH; j++) for (let i = 0; i < GW; i++) {
    const vx = GX + i + 0.5, vy = GY + j + 0.5;
    if (vy >= FLOOR) continue;
    const ox = vx - midV[0], oy = vy - midV[1];
    if (ox * ox + oy * oy > R * R) continue;
    const zIn = midV[2] + Math.sqrt(R * R - ox * ox - oy * oy), o = toWorld3([vx, vy, zIn]);
    for (let t = 0, n = 0; t < 2 * R && n < 120; n++) {
      const x = o[0] + dirW[0] * t, y = o[1] + dirW[1] * t, z = o[2] + dirW[2] * t, d = scene(m, x, y, z, info);
      if (d < 0.01) { const g = j * GW + i; hitG[g] = info.group; depth[g] = zIn - t; color[g] = info.prim.color; hit.set([x, y, z], g * 3); break; }
      t += Math.max(d * 0.8, 0.01);
    }
  }
  // outlines: round it (outside), and inside where a neighbour is nearer: another part, or the same one across air
  const out = color.slice();
  for (let j = 0; j < GH; j++) for (let i = 0; i < GW; i++) {
    const g = j * GW + i;
    for (const [di, dj] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const a = i + di, b = j + dj;
      if (a < 0 || b < 0 || a >= GW || b >= GH) continue;
      const h = b * GW + a;
      if (hitG[h] === null) continue;
      if (hitG[g] === null) { if (GY + j < FLOOR) out[g] = OUT; break; }
      if (depth[h] <= depth[g] + 0.3) continue;
      if (hitG[h] === 'marks' || hitG[g] === 'marks') continue; // (a ball sunk into it: no line round it inside)
      if (hitG[h] !== hitG[g] || scene(m, (hit[g * 3] + hit[h * 3]) / 2, (hit[g * 3 + 1] + hit[h * 3 + 1]) / 2, (hit[g * 3 + 2] + hit[h * 3 + 2]) / 2) > gap) { out[g] = OUT; break; }
    }
  }
  // stuck on: shown where it is not hidden; on a profile, just outside it, in the pixel inside it
  out.eyes = []; // (where the eyes went, in the box: for the lab's check)
  for (const { v, nv, color: c, eye } of decalsAt(m, toView)) {
    let i = Math.floor(v[0]) - GX, j = Math.floor(v[1]) - GY; // (the pixel it falls in; just outside, on a profile: the one inside it)
    if (i >= 0 && j >= 0 && i < GW && j < GH && hitG[j * GW + i] === null) { if (Math.abs(nv[0]) >= Math.abs(nv[1])) i -= Math.sign(nv[0]); else j -= Math.sign(nv[1]); }
    const g = j * GW + i;
    if (i < 0 || j < 0 || i >= GW || j >= GH || hitG[g] !== 'body' || v[2] < depth[g] - 2) continue; // (on the body, not under an ear)
    if (eye) { out.eyes.push([i + GX, j + GY]); if (j + 1 < GH && hitG[g + GW] !== null) out[g + GW] = OUT; if (!blink) out[g] = OUT; } // (as the game's: two high, the lower one blinking)
    else out[g] = c;
  }
  return out;
}

// how the model is seen, turned (yaw, radians: 0 its side) and tilted: world → view (turned about the vertical, then
// tipped toward the eye) and back; a sphere round it all, in view (midV, R: rays that miss it are not marched); which
// way a ray goes, in the world (dirW). (Its ellipsoids' turns worked out, for sdPrim)
export function view(m, yaw, tilt) {
  for (const q of m.prims) if (q.type === 'ell') { q.cos = Math.cos(q.a); q.sin = Math.sin(q.a); }
  const cy = Math.cos(yaw), sy = Math.sin(yaw), ct = Math.cos(tilt), st = Math.sin(tilt);
  // world → view: turned about the vertical (yaw), then tipped toward the eye (tilt); and back
  const toView = (w) => {
    const x = w[0] - PIVOT[0], y = w[1] - PIVOT[1], z = w[2] - PIVOT[2];
    const x1 = x * cy - z * sy, z1 = x * sy + z * cy;
    return [x1 + PIVOT[0], y * ct + z1 * st + PIVOT[1], -y * st + z1 * ct + PIVOT[2]];
  };
  const toWorld3 = (v) => {
    const x1 = v[0] - PIVOT[0], y1 = v[1] - PIVOT[1], z1 = v[2] - PIVOT[2];
    const y = y1 * ct - z1 * st, zz = y1 * st + z1 * ct;
    return [x1 * cy + zz * sy + PIVOT[0], y + PIVOT[1], -x1 * sy + zz * cy + PIVOT[2]];
  };
  let lo = [Infinity, Infinity, Infinity], hi = [-Infinity, -Infinity, -Infinity];
  for (const q of m.prims) {
    const pts = q.type === 'ell' ? [q.c] : [q.a, q.b], r = q.type === 'ell' ? Math.max(...q.r) : q.r;
    for (const c of pts) for (let i = 0; i < 3; i++) { lo[i] = Math.min(lo[i], c[i] - r); hi[i] = Math.max(hi[i], c[i] + r); }
  }
  const mid = mul(add(lo, hi), 0.5), R = len(sub(hi, lo)) / 2 + 1;
  return { toView, toWorld3, cy, sy, ct, st, midV: toView(mid), R, dirW: toWorld3(add(PIVOT, [0, 0, -1])).map((v, i) => v - PIVOT[i]) };
}

// what is stuck on, on the body's surface: each from where it starts along its way out to it (p), which way the surface
// faces there (n), color, eye. The same however the model is turned: worked out once a model, kept on it
// (and kept by the body's shape, ears and tail apart: a run's few poses come back every stride, and many animals share
// them; the objects layer draws each live every frame)
const decalsKept = new Map();
export function decalPoints(m) {
  if (m.decalPts) return m.decalPts;
  for (const q of m.prims) if (q.type === 'ell') { q.cos = Math.cos(q.a); q.sin = Math.sin(q.a); }
  const key = JSON.stringify([m.decals, m.prims.filter((q) => q.group === 'body')]);
  if (decalsKept.has(key)) return (m.decalPts = decalsKept.get(key));
  if (decalsKept.size >= 512) decalsKept.clear();
  decalsKept.set(key, workOut(m));
  return (m.decalPts = decalsKept.get(key));
}
function workOut(m) {
  const sd = (x, y, z) => scene(m, x, y, z, null, true);
  // the first point of its way out, in steps of 0.05, outside the body: strides as long as the body says it is still
  // in (less a tenth), then halved back to the first step outside (the point stepping all the way would find)
  const along = (dc, k) => add(dc.from, mul(dc.dir, 0.05 * k));
  return m.decals.map((dc) => {
    let k = 0, inside = -1, d = sd(...dc.from);
    while (d < 0 && k < 200) { inside = k; k = Math.min(200, k + Math.max(1, Math.floor((-d * 0.9) / 0.05))); d = sd(...along(dc, k)); }
    while (k - inside > 1) { const h = (inside + k) >> 1; if (sd(...along(dc, h)) < 0) inside = h; else k = h; }
    const p = along(dc, k);
    const e = 0.05, n = norm([sd(p[0] + e, p[1], p[2]) - sd(p[0] - e, p[1], p[2]), sd(p[0], p[1] + e, p[2]) - sd(p[0], p[1] - e, p[2]), sd(p[0], p[1], p[2] + e) - sd(p[0], p[1], p[2] - e)]);
    return { p, n, color: dc.color, eye: !!dc.eye };
  });
}
// what is stuck on, as seen: those facing the eye (on the edge too: the nose in profile), in view (v), with which way
// the surface faces there (nv), color, eye
export function decalsAt(m, toView) {
  const out = [];
  for (const { p, n, color, eye } of decalPoints(m)) {
    const v = toView(p), nv = sub(toView(add(PIVOT, n)), PIVOT);
    if (nv[2] >= -0.1) out.push({ v, nv, color, eye });
  }
  return out;
}
export const PIVOT3 = PIVOT, FLOOR3 = FLOOR;


// an animal turned (yaw: degrees, to 5°), as the game draws a sprite: draw(ctx, x, y, pal) at the corner of its box
// (snap: the game's, to the nearest screen pixel). chains, swing: as for model. Kept, the most recent few hundred
const sprites3d = new Map();
export function sprite3d(kind, move, frame, yaw, { blink = false, chains = null, swing = null, snap = (v) => v } = {}) {
  const q = (v) => Math.round(v * 4) / 4, sw = {}, at = Math.round(yaw / 5) * 5;
  for (const name in swing || {}) sw[name] = { flare: q(swing[name].flare), lag: q(swing[name].lag) };
  const key = JSON.stringify([kind, move, frame, at, blink, chains, sw]);
  let s = sprites3d.get(key);
  if (s) { sprites3d.delete(key); sprites3d.set(key, s); return s; }
  const px = draw3d(model(kind, move, frame, { chains, swing: sw }), (at * Math.PI) / 180, 0, { blink }), canvases = {};
  s = {
    draw(ctx, x, y, pal) {
      let c = canvases[pal.bg];
      if (!c) {
        c = canvases[pal.bg] = Object.assign(document.createElement('canvas'), { width: GW, height: GH });
        const cx = c.getContext('2d'), img = cx.createImageData(GW, GH);
        for (let i = 0; i < px.length; i++) if (px[i]) { const v = parseInt(pal[px[i]].slice(1, 7), 16); img.data.set([v >> 16, (v >> 8) & 255, v & 255, 255], i * 4); }
        cx.putImageData(img, 0, 0);
      }
      ctx.drawImage(c, snap(x + GX), snap(y + GY));
    },
  };
  sprites3d.set(key, s);
  if (sprites3d.size > 300) sprites3d.delete(sprites3d.keys().next().value);
  return s;
}
