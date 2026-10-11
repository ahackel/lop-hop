// An object of the game as an asset: one file of data (assets/<name>.js), all there is to its look: what the editor
// (editor/) makes and saves, and the game draws from. The first kind: an animal, as a rig (see animals/kit.js and the
// rigs in art.js): its bones, the shapes on them, its face, the physics of its chains, its moves' keys. What it does with
// them is still code: animals/<name>.js makes its moves (the gaits, the idle loops, the poses the game works out).
//
// format 2, an animal (2D, from the side; x forward, y down, in the 26 × 20 box, its feet on row 19):
//   format, name; of: the animal it is made from (the wolf: the fox's, recolored), if any
//   fur          its color (a palette name: see NAMED in art.js), as every color is; smooth: how softly its parts join
//   joints       the bones down the spine: hip, chest, head, each a place [x, y] in the box
//   torso        r (how thick), ends (how far past the hip and the chest), capsule (round ends): along the spine
//   shapes       the body, on a bone (on: spine, hip, chest, head) or in the box: ellipse [x, y, rx, ry], capsule
//                [ax, ay, bx, by, r], box [x0, y0, x1, y1, r] or triangle [[x, y] × 3]
//   paint, top, dots, spikes, socks
//                the layers over the body: markings in a color; shapes on top, outlined; single pixels; bristles; the
//                lower legs' color
//   legs         bones that bend to reach their paws: { name: { on, at, thigh, shin, r, bend, far, foot } }
//   chains       bones the body's motion swings: a tail, a lop ear (on, at, angle, links, length, r, …) or a pointed ear
//                (ear, tip); stiffness, damping, weight
//   face         eye, nose, noseColor; recolor: colors swapped everywhere
//   front        seen from the front a moment as it turns round: a build of its own
//   moves        keys set by hand, over the moves its make works out (see withMoves in art.js)
// (each in full: see animals/kit.js)

const OWN = ['format', 'name', 'of']; // (the file's, not the rig's)

// an asset → the rig's build
export function toBuild(asset) {
  const build = {};
  for (const k in asset) if (!OWN.includes(k)) build[k] = asset[k];
  return build;
}

// a rig's build → its asset (of: kept from the asset it was, if any)
export const toAsset = (name, build, was = {}) => ({ format: 2, name, ...(was.of && { of: was.of }), ...toBuild(build) });
