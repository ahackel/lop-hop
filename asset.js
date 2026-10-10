// An object of the game as an asset: one file of data (assets/<name>.js), all there is to its look, in 3D: what the
// editor will make and change, and the game draws from. The first kind of object: an animal, as a rig (a skeleton in
// the side's plane that the game's moves pose: see art.js) with parts in 3D on its joints. Its moves are still code
// (animals/<name>.js: the gaits, the idle loops, the poses the game works out); the asset holds what they move.
//
// format 1, an animal (x forward, y down, z toward its near side; in the 26 × 20 box, its feet on row 19):
//   name, color: its fur's palette color; smooth: how softly its parts join (1 as most)
//   joints: { hip, chest, head: [x, y] }; torso: { r, ends, depth } (between hip and chest: how thick, how far past
//     them, how deep)
//   parts: [{ name, shape: 'ellipsoid', on: a joint, at: [x, y, z] from it, size: [rx, ry, rz], mirror: true (one on
//     the far side as well, at -z), …the rest as the rig's shapes have it }] or { shape: 'capsule', from, to: [x, y,
//     z], r }
//   legs: { name: { on, at, thigh, shin, r, bend, z, mirror, … } } (…Near: the near side's, …Far: the far side's)
//   chains: { name: { on, at, angle, links, length, r, end, …, z, mirror, end3d: false (no ball at its tip in 3D) } }
//     (a tail, an ear: swung by the game's physics)
//   face: { eye, nose, noseColor, forward: how far the eyes turn forward from looking out to the side (degrees), back:
//     how far behind where the side has them they sit, marks: { eye: [rx, ry, rz], nose: r, dot: r } (as balls) }
//   dots: [{ name, on, at, color, mirror }] (the blush)
//   front2d: the 2D front view the game shows turning (till it turns in 3D); moves: a move's keyframes, as the rig's
//   anything else: as the rig has it
// toBuild and toDepth make the rig's build and its depth (turn3d.js DEPTH) of it, as the game has used them; fromRig
// the other way (the workshop's saves; tools/assets.mjs, an animal made into an asset).

const own = (o, keys) => { const out = {}; for (const k in o) if (!keys.includes(k)) out[k] = o[k]; return out; };
const map = (o, f) => (o ? Object.fromEntries(Object.entries(o).map(([k, v]) => [k, f(v, k)])) : o);
const ANIMAL = ['format', 'name', 'color', 'joints', 'torso', 'parts', 'legs', 'chains', 'face', 'dots', 'front2d', 'moves'];

// → the rig's build
export function toBuild(a) {
  const b = { fur: a.color, ...own(a, [...ANIMAL, 'color']) };
  b.joints = a.joints;
  if (a.torso) b.torso = own(a.torso, ['depth']);
  if (a.parts) b.shapes = a.parts.map((p) => {
    const s = { ...(p.name !== undefined && { name: p.name }), ...(p.on !== undefined && { on: p.on }) };
    if (p.shape === 'capsule') s.capsule = [p.from[0], p.from[1], p.to[0], p.to[1], p.r];
    else s.ellipse = [p.at[0], p.at[1], p.size[0], p.size[1]];
    return { ...s, ...own(p, ['name', 'on', 'shape', 'at', 'size', 'from', 'to', 'r', 'mirror']) };
  });
  if (a.dots) b.dots = a.dots.map((d) => own(d, ['mirror']));
  if (a.legs) b.legs = map(a.legs, (l) => own(l, ['z', 'mirror']));
  if (a.chains) b.chains = map(a.chains, (c) => own(c, ['z', 'mirror', 'end3d']));
  if (a.face) b.face = own(a.face, ['forward', 'back', 'marks']);
  if (a.front2d) b.front = a.front2d;
  if (a.moves) b.moves = a.moves;
  return b;
}

// → its depth (turn3d.js DEPTH)
export function toDepth(a) {
  const d = { w: 0, shapes: {}, legs: {}, chains: {}, dots: {} };
  if (a.torso?.depth !== undefined) d.torso = { rz: a.torso.depth };
  (a.parts || []).forEach((p) => {
    const z = p.shape === 'capsule' ? p.from[2] : p.at[2];
    if (p.name !== undefined) d.shapes[p.name] = { z, ...(p.size && { rz: p.size[2] }), ...(p.mirror && { mirror: true }) };
  });
  for (const n in a.legs || {}) d.legs[n] = { z: a.legs[n].z, ...(a.legs[n].mirror && { mirror: true }) };
  for (const n in a.chains || {}) d.chains[n] = { z: a.chains[n].z || 0, ...(a.chains[n].mirror && { mirror: true }), ...(a.chains[n].end3d === false && { end: false }) };
  for (const x of a.dots || []) if (x.name !== undefined) d.dots[x.name] = { mirror: x.mirror !== false };
  if (a.face) { d.eyes = { forward: a.face.forward || 0, back: a.face.back || 0 }; if (a.face.marks) d.marks = a.face.marks; }
  return d;
}

// a rig's build and its depth (DEPTH, or none: flat, in the middle) → an asset
export function fromRig(name, b, depth = {}) {
  const w = depth.w ?? 2, a = { format: 1, name, color: b.fur, ...own(b, ['fur', 'joints', 'torso', 'shapes', 'dots', 'legs', 'chains', 'face', 'front', 'moves']) };
  a.joints = b.joints;
  if (b.torso) a.torso = { ...b.torso, ...(depth.torso?.rz !== undefined && { depth: depth.torso.rz }) };
  if (b.shapes) a.parts = b.shapes.map((s) => {
    const d = (s.name !== undefined && depth.shapes?.[s.name]) || {}, z = d.z || 0, rest = own(s, ['name', 'on', 'ellipse', 'capsule']);
    const head = { ...(s.name !== undefined && { name: s.name }), shape: s.capsule ? 'capsule' : 'ellipsoid', ...(s.on !== undefined && { on: s.on }) };
    const [x, y, u, v, r] = s.capsule || s.ellipse;
    const where = s.capsule ? { from: [x, y, z], to: [u, v, z], r } : { at: [x, y, z], size: [u, v, d.rz ?? Math.min(u, v)] };
    return { ...head, ...where, ...(d.mirror && { mirror: true }), ...rest };
  });
  if (b.legs) a.legs = map(b.legs, (l, n) => { const d = depth.legs?.[n] || {}; return { ...l, z: d.z ?? (n.endsWith('Far') ? -w : w), ...(d.mirror && { mirror: true }) }; });
  if (b.chains) a.chains = map(b.chains, (c, n) => { const d = depth.chains?.[n] || {}; return { ...c, z: d.z || 0, ...(d.mirror && { mirror: true }), ...(d.end === false && { end3d: false }) }; });
  if (b.face) a.face = { ...b.face, forward: depth.eyes?.forward || 0, back: depth.eyes?.back || 0, ...(depth.marks && { marks: depth.marks }) };
  if (b.dots) a.dots = b.dots.map((x) => ({ ...x, mirror: depth.dots?.[x.name]?.mirror ?? true }));
  if (b.front) a.front2d = b.front;
  if (b.moves) a.moves = b.moves;
  return a;
}
