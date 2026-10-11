// An object of the game as an asset: one file of data (assets/<name>.js), all there is to it: what the editor (editor/)
// makes and saves, and the game draws and moves. The first kind: an animal, as a rig (see the rigs in art.js). And the
// game's own: its palette.
//
// the palette (assets/palette.js, format 1): the game's colors, all of them, by name; everything is drawn in them (a
// color in an asset: its name). The shaded look works out each color's tones (outline, underside, far leg) by rule,
// always darker (see TONES in art.js): no color is needed for shading, only for markings. At most 63, roles and all
//   roles        colors with a job, not to paint with (but outline: dots, a nose), each { day, night }: outline, ink
//                (eyes, words), background (the sky; what is drawn in it looks like the sky), faint, dim
//   colors       { name: its color by day }, named for the color (orange, darkGreen), never for what wears it
//   night        the colors by night, each channel: day × contrast + lift (toward the middle: dark ones lighter, light
//                ones darker, to show against the night sky)
//
// format 5, an animal (2D, from the side; x forward, y down, in the 26 × 20 box, its feet on row 19). Its bones are what
// moves (joints, legs, chains), only that; all it looks like is shapes, in groups, each shape in the box, on a joint, or
// on a bone (bone: drawn along it, as the pose has it). A bone has any shapes on it, or none (it moves, undrawn); a shape
// may have one of its own (chain: a tail, an ear, a strand of a mane, swung as the body moves)
//   format, name; of: the animal it is made from, a skin of it (the wolf: the fox's, its own over it: recolored; the
//                editor makes one, and edits it with the one it is made from)
//   fur          its color (a palette name: see the palette, above), as every color is
//   joints       the bones down the spine: hip, chest, head, places in the box. The spine runs from the hip to the chest
//   layers       what it looks like, back to front: groups, and 'face' (where the face and the dots are drawn; all before
//                it recolored, see recolor). A group is drawn as one: { name, shapes, color (none: its fur), join: its
//                shapes joined smoothly into one (each shape's smooth: how much, 1 if none), outline: false (not outlined
//                round it), hits (what collisions test), far (in the far side's tone, where no group that hits covers
//                it), at, angle (a pivot, in its shapes' joint's frame, and a turn about it: moved or turned, all of
//                them go with it), paint (markings: shapes in a color, only on the group), spikes (where it bristles,
//                see below) }. The body: the first group joined that hits, whose shapes, paint and spikes a pose changes; its legs'
//                socks are drawn with it, and the paws lying low (over) over it
//   a shape      ellipse [x, y, rx, ry], capsule [ax, ay, bx, by, r], box [x0, y0, x1, y1, r] or triangle [[x, y] × 3]
//                (an ellipse, a box: angle, turned about its middle, radians, + clockwise),
//                `on` a joint (in its frame: spine, hip, chest turn with the spine; head with the head) or in the box;
//                or `bone`: drawn along a bone (the spine, from the hip to the chest; a leg, from its root by its knee
//                to its paw; a chain, by its links), as the pose has it, `along` as one of the same: an ellipse or a
//                box from its root to its end (r: how thick; ends: how far past both; a box's round: its corners),
//                a capsule through its points (r, or [r at the root, r at the end]; ends; end: a round end; foot
//                [rx, ry]: a flat foot) or a triangle from its base to its end (base [[x, y] × 2]: its base's ends,
//                about its root, in its joint's frame; tipColor, tipSize: its end in a color); any along a bone:
//                marks [[t along it, color, r]], grows (grown out of the body: not outlined where it starts on it).
//                The torso: the first shape on the spine (a move's torso: thicker, longer, -: less). Any: color (its own, in
//                its group), a name to use it by; chain: a bone of its own, drawn along as a bone is (see chains;
//                named by the shape); role: neck (one on the chest: a head reaching for a treat stays at its end)
//   dots         single pixels: { on, at, color }, drawn with the face
//   spikes       (a group's) a shape where it bristles (speck: a color for specks inside)
//   socks        a color for the lower legs
//   legs         bones that bend to reach their paws, each: on (hip or chest), at (where it joins), thigh, shin, bend (1:
//                the knee back, -1: forward)
//   chains       bones swung by the body's motion, by name: a tail (on, at, angle from straight up, more: further back;
//                links, length, curl per link, +: forward) or an ear (ear: true; at, its root, and tip, on the head).
//                stiffness pulls each link to its rest, damping stops it ringing, weight pulls it down; role: what the
//                game does with it (tail: wagged, petted; ear: laid back, petted, a lop ear hanging as the head turns up;
//                trunk: reaching for a treat, eating from its tip; none: only swung). One with a shape of its own is in
//                it (a shape's chain, named by the shape), not here
//   headPivot    [x, y]: what the head turns about, from the head joint (where the neck meets it; none: the joint)
//   face         eye, nose, mouth (none: no mouth drawn), points in the head's frame; noseColor; frames: its own pictures
//                for its eye and its mouth, or more of them, by name: { eye: { open: { at: [column, row] (the pixel put
//                on the eye's point), rows: ['x', 'x'] (. nothing, x the dark line, w white, p pink, r red, k ink, or one
//                of its inks) } }, mouth: {…} }; what it doesn't have is as FACE_FRAMES in art.js has it (eye: open, blink,
//                hurt, ko, happy; mouth: shut, open, happy); inks: its own, any color of the palette by a letter of its
//                own: { a: 'brown' }
//   recolor      { name: name }: colors swapped everywhere (the wolf: a grey fox)
//   handling     how it is handled on the home screen, by the game's own code (see HANDLING in art.js: what is not here
//                is as there; the editor's Play mode tries them): held { at (where the hand holds it, from the middle of its
//                back), sag, tip, hang, settle, most }, squirm { fits, strength, paddle, nod }, dropped { righting, damping,
//                squash, squashFor }, petted { lean, duck, nuzzle, ears, wag, wagRate, happy }, fed { stretch, upright,
//                rears, hop, chews, nod, chewFor }
//   moves        by name (run, duck, jump, hurt, ko, idle; the gorilla's drum, the elephant's spray), each:
//                a gait, worked out from where it is in its stride (the run, the crawl): { gait: its settings (see gaitPose
//                  and leapPose in art.js), and what else of the pose it changes (lying low: joints, torso, shapes, pad) }
//                or a clip: { frames, fps (a loop, played over time: the idle), keys: [{ at: a frame, ease, what of the pose
//                  it sets }] }. Each thing a key sets goes from it to the next key that sets it by its ease (step,
//                  linear, smooth, sine; linear if none); a loop's last on round to its first; null: not set
//                a pose: joints, paws { leg: [x, y] }, headAngle, torso { thicker, longer: than the torso shape, -: less }, chains { name: angle, at, curl, tip }, roots
//                  { leg: [x, y] }, flip (on its back), pad (the near paws flat: [rx, ry]), over (drawn over the body); eye, mouth (its face's frames by name: open and shut if
//                  none; blinking, open is blink); shapes (the body's own and these; ownShapes: only these), paint
//                  (the body's), top (groups of its own: after the body and the groups on no bone after it), dots. A
//                  shape or group of the build's own by its name: { use: name, move: [dx, dy], what of it is other }

const OWN = ['format', 'name', 'of']; // (the file's, not the rig's)

// an asset → the rig's build: the shapes' own bones in its chains (each shape on its own: bone, its name)
export function toBuild(asset) {
  let build = {};
  for (const k in asset) if (!OWN.includes(k)) build[k] = asset[k];
  if (build.moves) build.moves = setTorsos(build);
  build = hoist(build);
  if (asset.format < 5) build = roles(build);
  return build;
}
const isGroup = (g) => !!g && typeof g === 'object';
const ownBone = (s) => s.chain && s.name; // (a shape with a bone of its own: by its name)
function hoist(b) {
  if (!b.layers?.some((g) => isGroup(g) && g.shapes.some(ownBone))) return b;
  const chains = { ...b.chains };
  const layers = b.layers.map((g) => (isGroup(g) && g.shapes.some(ownBone) ? { ...g, shapes: g.shapes.map((s) => {
    if (!ownBone(s)) return s;
    const { chain, ...rest } = s;
    chains[s.name] = chain;
    return { name: s.name, bone: s.name, ...rest };
  }) } : g));
  return { ...b, layers, chains };
}
// … and back: a chain only one shape is on, by its name, in it (chain)
function inline(b) {
  if (!b.chains || !b.layers) return b;
  const shapes = b.layers.filter(isGroup).flatMap((g) => g.shapes), mine = (s) => s.bone && s.name === s.bone && own.includes(s.bone);
  const own = Object.keys(b.chains).filter((n) => shapes.filter((s) => s.bone === n).length === 1 && shapes.some((s) => s.bone === n && s.name === n));
  if (!own.length) return b;
  const chains = { ...b.chains };
  for (const n of own) delete chains[n];
  const layers = b.layers.map((g) => (isGroup(g) && g.shapes.some(mine) ? { ...g, shapes: g.shapes.map((s) => {
    if (!mine(s)) return s;
    const { bone, ...rest } = s;
    return { name: s.name, chain: b.chains[bone], ...rest };
  }) } : g));
  const out = { ...b, layers, chains };
  if (!Object.keys(chains).length) delete out.chains;
  return out;
}
// a file from before roles: each chain's as the game took it then (pointed: an ear; the trunk; on the hip: a tail; on the
// head: a lop ear), the neck (on the chest). (One with roles, written as one from before: as it is)
function roles(b) {
  const out = { ...b }, shapes = (b.layers || []).filter(isGroup).flatMap((g) => g.shapes);
  if (Object.values(b.chains || {}).some((c) => c.role) || shapes.some((s) => s.role)) return b;
  if (b.chains) {
    out.chains = {};
    for (const [n, c] of Object.entries(b.chains)) { const role = c.ear ? 'ear' : n === 'trunk' ? 'trunk' : c.on === 'hip' ? 'tail' : c.on === 'head' ? 'ear' : null; out.chains[n] = role ? { ...c, role } : c; }
  }
  if (b.layers) out.layers = b.layers.map((g) => (isGroup(g) && g.shapes.some((s) => s.name === 'neck' && s.on === 'chest') ? { ...g, shapes: g.shapes.map((s) => (s.name === 'neck' && s.on === 'chest' ? { ...s, role: 'neck' } : s)) } : g));
  return out;
}
// a move's torso as a file from before had it (r, ends: as it is in the pose) → how much thicker and longer than the torso
// shape (see onLayers in art.js)
function setTorsos(b) {
  const spine = (b.layers || []).filter((g) => g && typeof g === 'object').flatMap((g) => g.shapes).find((s) => s.bone === 'spine');
  const r0 = typeof spine?.r === 'number' ? spine.r : 1, e0 = spine?.ends || 0, r3 = (v) => Math.round(v * 1000) / 1000;
  let any = false;
  const walk = (o) => {
    if (!o || typeof o !== 'object') return o;
    if (Array.isArray(o)) return o.map(walk);
    const out = {};
    for (const k in o) {
      const v = o[k];
      if (k === 'torso' && v && typeof v === 'object' && ('r' in v || 'ends' in v)) {
        any = true;
        const { r, ends, ...rest } = v;
        out[k] = { ...rest, ...(typeof r === 'number' && { thicker: r3(r - r0) }), ...(typeof ends === 'number' && { longer: r3(ends - e0) }) };
      } else out[k] = walk(v);
    }
    return out;
  };
  const moves = walk(b.moves);
  return any ? moves : b.moves;
}

// a rig's build → its asset (of: kept from the asset it was, if any)
// (its moves last, as the files have them)
export function toAsset(name, build, was = {}) {
  const { moves, ...rest } = inline(toBuild(build));
  return { format: 5, name, ...(was.of && { of: was.of }), ...rest, ...(moves && { moves }) };
}
