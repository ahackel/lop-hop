// An object of the game as an asset: one file of data (assets/<name>.js), all there is to it: what the editor (editor/)
// makes and saves, and the game draws and moves. The first kind: an animal, as a rig (see the rigs in art.js).
//
// format 2, an animal (2D, from the side; x forward, y down, in the 26 × 20 box, its feet on row 19):
//   format, name; of: the animal it is made from, a skin of it (the wolf: the fox's, its own over it: recolored; the
//                editor makes one, and edits it with the one it is made from)
//   fur          its color (a palette name: see NAMED in art.js), as every color is
//   joints       the bones down the spine: hip, chest, head, places in the box. The spine runs from the hip to the chest
//   torso        r (how thick), ends (how far past the hip and the chest), capsule (round ends): along the spine; r 0: none
//   shapes       the body: ellipse [x, y, rx, ry], capsule [ax, ay, bx, by, r], box [x0, y0, x1, y1, r] or triangle
//                [[x, y] × 3], `on` a joint (in its frame: spine, hip, chest turn with the spine; head with the head) or in
//                the box; joined smoothly (smooth: how much), outlined, and what collisions test; a name to use it by
//   paint        markings: shapes in a color, only on the body
//   top          shapes drawn over the body, outlined (horns, fangs): { color, shapes }; no collisions
//   dots         single pixels: { on, at, color }
//   spikes       a shape where the body bristles (speck: a color for specks inside)
//   socks        a color for the lower legs
//   legs         bones that bend to reach their paws, each: on (hip or chest), at (where it joins), thigh, shin, r, far
//                (behind the body), bend (1: the knee back, -1: forward), foot [rx, ry] (a flat foot)
//   chains       bones swung by the body's motion: a tail (on, at, angle from straight up, more: further back; links, length,
//                r or [r at the root, r at the tip], curl per link, +: forward; color, marks [[t along it, color, r]], end (a
//                round end), front (drawn over the body), joined (in front, grown out of the body: not outlined where it
//                starts), overEye (in front, over the eyes too: the pig's lop ear), line (a thin line, not outlined: a
//                rhino's tail)) or a pointed ear (ear: its base [[x, y] × 2] on the head, tip). stiffness pulls each link to
//                its rest, damping stops it ringing, weight pulls it down
//   face         eye, nose, mouth (none: no mouth drawn), points in the head's frame; noseColor; frames: its own pictures
//                for its eye and its mouth, or more of them, by name: { eye: { open: { at: [column, row] (the pixel put
//                on the eye's point), rows: ['x', 'x'] (. nothing, x the dark line, w white, p pink, r red, k ink) } },
//                mouth: {…} }; what it doesn't have is as FACE_FRAMES in art.js has it (eye: open, blink, hurt, ko, happy;
//                mouth: shut, open, happy)
//   recolor      { name: name }: colors swapped everywhere (the wolf: a grey fox)
//   front        seen from the front, shown a moment as it turns round (see front in art.js): a build of its own, sitting,
//                facing out of the screen: joints, shapes, top, dots, chains (ears hanging either side), face with eyes
//                [[x, y] × 2] for its eye; no legs. None: it turns at once
//   handling     how it is handled on the home screen, by the game's own code (see HANDLING in art.js: what is not here
//                is as there; the editor's Play mode tries them): held { at (where the hand holds it, from the middle of its
//                back), sag, tip, hang, settle, most }, squirm { fits, strength, paddle, nod }, dropped { righting, damping,
//                squash, squashFor }, petted { lean, duck, nuzzle, ears, wag, wagRate, happy }, fed { stretch, upright,
//                rears, chews, nod, chewFor }
//   moves        by name (run, duck, jump, hurt, ko, idle; the gorilla's drum, the elephant's spray), each:
//                a gait, worked out from where it is in its stride (the run, the crawl): { gait: its settings (see gaitPose
//                  and leapPose in art.js), and what else of the pose it changes (lying low: joints, torso, shapes, pad) }
//                or a clip: { frames, fps (a loop, played over time: the idle), keys: [{ at: a frame, ease, what of the pose
//                  it sets }] }. Each thing a key sets goes from it to the next key that sets it by its ease (step,
//                  linear, smooth, sine; linear if none); a loop's last on round to its first; null: not set
//                a pose: joints, paws { leg: [x, y] }, headAngle, torso, chains { name: angle, at, curl, tip }, roots
//                  { leg: [x, y] }, flip (on its back), pad, over; eye, mouth (its face's frames by name: open and shut if
//                  none; blinking, open is blink); shapes (ownShapes: only its own), paint, top, dots. A
//                  shape of the build's own by its name: { use: name, move: [dx, dy], what of it is other }

const OWN = ['format', 'name', 'of']; // (the file's, not the rig's)

// an asset → the rig's build
export function toBuild(asset) {
  const build = {};
  for (const k in asset) if (!OWN.includes(k)) build[k] = asset[k];
  return build;
}

// a rig's build → its asset (of: kept from the asset it was, if any)
// (its moves last, as the files have them)
export function toAsset(name, build, was = {}) {
  const { moves, ...rest } = toBuild(build);
  return { format: 2, name, ...(was.of && { of: was.of }), ...rest, ...(moves && { moves }) };
}
