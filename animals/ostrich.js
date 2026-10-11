// The ostrich as a rig (see the cat, and kit.js): on two long legs (as the dino), a round body of black feathers with a
// white wing plume and white tail plumes, a long bare neck, a head with a big eye and a pale flat beak, pink legs.
// (Its power: flying, its wings beating, see its jump.)
import { quadruped, crawl } from './kit.js';

// @build: the rig, edited in the editor (editor/), which rewrites what is between these lines
export const build = {
  fur: 'OSTRICH',
  joints: { hip: [9, 9.6], chest: [14, 9.2], head: [18.8, 1] },
  torso: { r: 3.8, ends: 3 },
  shapes: [
    { name: 'neck', on: 'chest', capsule: [1.6, -1.6, 4.8, -7.8, 0.6], smooth: 0.3 },
    { name: 'head', on: 'head', ellipse: [0, 0, 2.6, 2.2] },
    { name: 'beak', on: 'head', capsule: [1.4, 0.7, 4, 0.9, 0.8] },
  ],
  paint: [
    { name: 'neck', color: 'OSTRICH_SKIN', on: 'chest', capsule: [1.6, -1.6, 4.8, -7.8, 0.6] },
    { name: 'head', color: 'OSTRICH_SKIN', on: 'head', ellipse: [0, 0, 2.7, 2.3] },
    { name: 'beak', color: 'WOOD', on: 'head', capsule: [1.4, 0.7, 4, 0.9, 0.8] },
    { name: 'wing', color: 'BELLY', on: 'spine', ellipse: [1.4, 0.4, 3, 1.5] },
  ],
  socks: 'OSTRICH_SKIN',
  legs: {
    hindFar: { on: 'hip', at: [2.2, 2.6], thigh: 4, shin: 4.4, r: 0.75, foot: [1.3, 0.6], far: true, bend: -1 },
    hindNear: { on: 'hip', at: [0.6, 2.6], thigh: 4, shin: 4.4, r: 0.85, foot: [1.3, 0.6], bend: -1 },
  },
  chains: {
    tail: {
      on: 'hip',
      at: [-3.2, -1.2],
      angle: 0.9,
      links: 2,
      length: 3.2,
      r: [1.2, 0.9],
      end: 1,
      color: 'BELLY',
      stiffness: 700,
      damping: 14,
      weight: 40,
    },
  },
  face: { eye: [0.2, -0.6] },
};
// @end

// the ostrich with its moves, from its build
export const make = (rig) => {
  // lying low: the body on the ground, the neck stretched out flat in front
  const low = { joints: { hip: [8.5, 15.4], chest: [13.5, 15.4], head: [20.6, 15.2] }, torso: { r: 3, ends: 3.4 }, ownShapes: true,
    shapes: [{ on: 'chest', capsule: [1.4, -0.4, 5.4, -0.2, 0.6] }, ...rig.shapes.slice(1)],
    paint: [{ color: 'OSTRICH_SKIN', on: 'chest', capsule: [1.4, -0.4, 5.4, -0.2, 0.6] }, ...rig.paint.slice(1, 3), { color: 'BELLY', on: 'spine', ellipse: [1.4, 0, 3, 1.2] }],
    chains: { tail: { at: [-3.4, -0.6], angle: 1.2 } } };

  // the run: two long legs taking turns, a long stride
  const run = { gait: { frames: 8, stance: 0.45, reach: 7, lift: 3, bob: 0.6, ground: 18.4, legs: { hindNear: [0, 0.5], hindFar: [0.5, -0.5] } } };
  // jumping: legs folded up under it as it rises, reaching down as it falls,
  // and flapping its wings: up, down, up, down over the jump (drawn over the body, outlined; not painted on it)
  const legs = [{ hindNear: [7, 14.6], hindFar: [10, 15] }, { hindNear: [11, 17.6], hindFar: [13, 17.2] }];
  const wing = (up) => [{ name: 'wing', color: 'BELLY', shapes: [{ on: 'spine', triangle: up ? [[-0.6, -1.4], [4.6, -1.4], [-3, -8.6]] : [[-0.6, -0.2], [4.6, -0.2], [-1.8, 5.4]] }] }];
  const paint = rig.paint.filter((x) => x.name !== 'wing');
  const jump = [0, 1, 2, 3].map((i) => ({ paws: legs[i >> 1], paint, top: wing(i % 2 === 0) }));
  return { ...rig, poses: quadruped(rig, low, { run, jump, duck: crawl(rig, low, { legs: { hindNear: [0, 0], hindFar: [0.5, 1] } }) }) };
};

export default make(build);
