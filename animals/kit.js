// What the four-legged rigs share (see the cat, and the rigs in art.js), worked out from a rig's own build: standing,
// the gallop, jumping, lying low (the crawl, knocked out on its back) and an idle that breathes and looks about. Places
// are in the 26×20 box, the feet on row 19; a leg's length is its thigh and shin.
//
// An animal's file holds its build (between `// @build` and `// @end`: the data the workshop edits and writes back) and
// its make: the build with its moves (poses). A build:
//   fur          its color (a palette name: see NAMED in art.js), as every color is
//   joints       hip, chest, head: places in the box. The spine runs from the hip to the chest
//   torso        r (how thick), ends (how far past the hip and the chest), capsule (round ends): along the spine; r 0: none
//   shapes       the body: ellipse [x, y, rx, ry], capsule [ax, ay, bx, by, r], box [x0, y0, x1, y1, r] or triangle
//                [[x, y] × 3], `on` a joint (in its frame: spine, hip, chest turn with the spine; head with the head) or in
//                the box; joined smoothly (smooth: how much), outlined, and what collisions test
//   paint        markings: shapes in a color, only on the body
//   top          shapes drawn over the body, outlined (horns, fangs): { color, shapes }; no collisions
//   dots         single pixels: { on, at, color }
//   spikes       a shape where the body bristles (speck: a color for specks inside)
//   socks        a color for the lower legs
//   legs         each: on (hip or chest), at (where it joins), thigh, shin, r, far (behind the body), bend (1: the knee
//                back, -1: forward), foot [rx, ry] (a flat foot)
//   chains       swung by the body's motion: a tail (on, at, angle from straight up, more: further back; links, length, r
//                or [r at the root, r at the tip], curl per link, +: forward; color, marks [[t along it, color, r]], end (a
//                round end), front (drawn over the body), joined (in front, grown out of the body: not outlined where it starts), overEye (in front, over the eyes too: the pig's lop ear), line (a thin line, not outlined: a
//                rhino's tail)) or a pointed ear (ear: its base [[x, y] × 2] on the head, tip).
//                stiffness pulls each link to its rest, damping stops it ringing, weight pulls it down
//   face         eye, nose (in the head's frame), noseColor
//   recolor      { name: name }: colors swapped everywhere (the wolf: a grey fox)
//   front        seen from the front, shown a moment as it turns round (see front in art.js): a build of its own, sitting,
//                facing out of the screen: joints, shapes, top, dots, chains (ears hanging either side), face with eyes
//                [[x, y] × 2] for its eye; no legs. None: it turns at once
//   moves        the build's own over the moves its make works out, by name (run, duck, jump, hurt, ko): keyframes set by
//                hand (a list of poses, each: joints, paws { leg: [x, y] }, headAngle, torso, chains { name: what of it
//                changes: angle, at, curl, tip }), or { gait: settings } over a gait's (the workshop's timeline sets both)

export const ease = (u) => u * u * (3 - 2 * u), clamp01 = (u) => Math.min(1, Math.max(0, u));
// eased in from a to a + e and out from b - e to b: 0…1…0
export const bump = (t, a, b, e) => ease(clamp01((t - a) / e)) * ease(clamp01((b - t) / e));
export const wave = (t, n, o = 0) => Math.sin(Math.PI * 2 * (n * t + o));
const GROUND = 18.4;
const add = (a, b) => [a[0] + b[0], a[1] + b[1]];

// where a leg joins the body (joints: the pose's, over the rig's; flip: on its back)
export function root(rig, name, joints = {}, flip = false) {
  const L = rig.legs[name], J = { ...rig.joints, ...joints }, a = Math.atan2(J.chest[1] - J.hip[1], J.chest[0] - J.hip[0]);
  const [x, y] = [L.at[0], L.at[1] * (flip ? -1 : 1)], o = J[L.on];
  return [o[0] + x * Math.cos(a) - y * Math.sin(a), o[1] + x * Math.sin(a) + y * Math.cos(a)];
}
const length = (rig, name) => rig.legs[name].thigh + rig.legs[name].shin;
const paws = (rig, f) => Object.fromEntries(Object.keys(rig.legs).map((n) => [n, f(n, rig.legs[n])]));
const hind = (n) => n.startsWith('hind');

// standing, all four paws down under their roots (the far ones a little forward)
export const standing = (rig) => ({ paws: paws(rig, (n, L) => [root(rig, n)[0] + (L.far ? 1 : hind(n) ? 0.5 : -0.5), GROUND]) });

// the run: a rotary gallop (see the cat's), its reach and lift as long as the legs
export const gallop = (rig, o = {}) => {
  const L = length(rig, 'hindNear');
  return { gait: { frames: 8, stance: 0.4, reach: 1.1 * L, lift: 0.47 * L, bob: 0.6, ground: GROUND,
    legs: { hindNear: [0, -0.5], hindFar: [0.1, -0.5], frontNear: [0.5, 0.8], frontFar: [0.6, 0.8] }, ...o } };
};

// jumping: rising, the nose up, the hind legs trailing and the front ones reaching forward; falling, the nose down, the
// paws reaching for the ground (as far as the legs are long)
export function jump(rig) {
  const pose = (dy, hindAt, frontAt) => {
    const joints = { hip: add(rig.joints.hip, [0, dy]), chest: add(rig.joints.chest, [0, -2 * dy]), head: add(rig.joints.head, [0, -1.33 * dy]) };
    return { joints, paws: paws(rig, (n, L) => {
      const r = root(rig, n, joints), len = length(rig, n), [dx, up] = hind(n) ? hindAt : frontAt;
      return [r[0] + dx * len + (L.far ? 1 : 0), GROUND - up * (GROUND - r[1])];
    }) };
  };
  return [pose(0.45, [-0.58, 0.3], [0.47, 0.37]), pose(-0.45, [-0.47, 0.22], [0.36, 0.1])];
}

// ears laid back (lying low): each pointed ear's tip turned back by `by` about the middle of its base, a little shorter
export function earsBack(rig, by = 0.7) {
  const out = {};
  for (const name in rig.chains) {
    const c = rig.chains[name];
    if (!c.ear) continue;
    const m = [(c.ear[0][0] + c.ear[1][0]) / 2, (c.ear[0][1] + c.ear[1][1]) / 2], v = [(c.tip[0] - m[0]) * 0.85, (c.tip[1] - m[1]) * 0.85];
    out[name] = { tip: [m[0] + v[0] * Math.cos(-by) - v[1] * Math.sin(-by), m[1] + v[0] * Math.sin(-by) + v[1] * Math.cos(-by)] };
  }
  return out;
}

// ducking: a slinking crawl, low and flat (low: the pose lying down), the head held level, the shoulders and the haunch
// rolling. Diagonal paws step together, slow and low, the near ones flat (pad) and outlined over the belly (over). Squashed
// down, it spreads out: a pixel or two longer than lying low (the hip back, the chest and the head forward)
const stretched = (rig, low) => {
  const J = { ...rig.joints, ...low.joints }, torso = { ...rig.torso, ...low.torso }, by = (k, dx) => add(J[k], [dx, 0]);
  return { ...low, joints: { ...low.joints, hip: by('hip', -0.5), chest: by('chest', 0.5), head: by('head', 0.5) }, torso: { ...torso, ends: (torso.ends ?? 0) + 0.2 } };
};
export const crawl = (rig, low, o = {}) => ({ ...stretched(rig, low), pad: [1.8, 1], over: true,
  gait: { frames: 8, stance: 0.6, reach: 4, lift: 0.8, bob: 0.6, beat: 2, head: 0, ground: GROUND,
    legs: { hindNear: [0, -1], frontFar: [0.05, 1.5], hindFar: [0.5, 1.5], frontNear: [0.55, 3] }, ...o } });

// knocked out: lying low, on its back, the legs up
export const ko = (rig, low) => ({ ...low, flip: true, paws: paws(rig, (n, L) => {
  const r = root(rig, n, low.joints, true);
  return [r[0] + (hind(n) ? (L.far ? 2.5 : -0.5) : L.far ? 1.5 : -1), r[1] - 0.7 * length(rig, n)];
}) });

// standing about, t (0…1) through an 8 s loop: it breathes (4 times), swishes its tail, flicks an ear now and then and
// once looks up. (o: how much of each, tail: where the tail rests if not where it is in the build (π: hanging down); more: a
// pose's own settings over it)
export function standIdle(rig, o = {}, more = () => ({})) {
  const base = standing(rig), tail = rig.chains?.tail, ear = Object.keys(rig.chains || {}).find((n) => rig.chains[n].ear);
  const at = (t) => {
    const b = (o.breath ?? 0.3) * wave(t, 4), look = bump(t, 0.42, 0.66, 0.05), flick = bump(t, 0.15, 0.19, 0.015) + bump(t, 0.79, 0.82, 0.015);
    const J = rig.joints, chains = {};
    if (tail) chains.tail = { angle: (o.tail ?? tail.angle) + (o.swish ?? 0.2) * wave(t, 2) };
    if (ear && flick) { const c = rig.chains[ear]; chains[ear] = { tip: [c.tip[0] - 2 * flick, c.tip[1] + 1.5 * flick] }; }
    const extra = more(t, b, look);
    return { ...base, ...extra, joints: { hip: J.hip, chest: add(J.chest, [0, -0.3 * b]), head: add(J.head, [-0.3 * look, -0.4 * b - 0.4 * look]) },
      torso: rig.torso.r ? { r: rig.torso.r + b } : {}, headAngle: -(o.look ?? 0.3) * look, chains: { ...chains, ...extra.chains } };
  };
  return { frames: 80, fps: 10, at };
}

// the usual moves of a four-legged rig: low (lying down: joints, torso, chains), and any to change or add
export const quadruped = (rig, low, moves = {}) => ({
  run: gallop(rig), duck: crawl(rig, low), jump: jump(rig), hurt: [standing(rig)], ko: [ko(rig, low)], idle: standIdle(rig), ...moves,
});
