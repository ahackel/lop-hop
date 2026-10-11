// The dromedary as a rig (see the cat, and kit.js): sandy, one big pointed hump (its tip a stiff chain: it wobbles a little
// as it runs), a long neck curving forward and up, a long head with droopy lips and a small ear, long thin legs with
// knobbly knees, a thin tail with a tuft.
import { quadruped, earsBack, standIdle } from './kit.js';

// @build: the rig, edited in the editor (editor/), which rewrites what is between these lines
export const build = {
  fur: 'CAMEL',
  joints: { hip: [7, 9.6], chest: [13, 9.6], head: [20.6, 4.6] },
  torso: { r: 3.8, ends: 3 },
  shapes: [
    { name: 'hump', on: 'spine', triangle: [[-0.8, -2.4], [3.2, -6.6], [7, -2.4]] },
    { name: 'neck', on: 'chest', capsule: [1.6, -0.2, 5.8, -3.4, 1.3], smooth: 0.5 },
    { name: 'head', on: 'head', capsule: [-0.8, 0, 2.6, 0.8, 1.5] },
    { name: 'lip', on: 'head', ellipse: [2.6, 2, 1.1, 0.8] },
  ],
  paint: [{ name: 'muzzle', color: 'CAMEL_DARK', on: 'head', ellipse: [3.4, 1, 0.9, 1.6] }],
  dots: [{ name: 'nostril', on: 'head', at: [3.5, 0] }],
  socks: 'CAMEL_DARK',
  legs: {
    hindFar: { on: 'hip', at: [1, 2.8], thigh: 3.1, shin: 3.4, r: 0.65, far: true, bend: 1 },
    frontFar: { on: 'chest', at: [1, 2.8], thigh: 3.1, shin: 3.4, r: 0.65, far: true, bend: -1 },
    hindNear: { on: 'hip', at: [0, 2.8], thigh: 3.1, shin: 3.4, r: 0.75, bend: 1 },
    frontNear: { on: 'chest', at: [0, 2.8], thigh: 3.1, shin: 3.4, r: 0.75, bend: -1 },
  },
  chains: {
    tail: {
      on: 'hip',
      at: [-3.6, -1.4],
      angle: 2.2,
      links: 2,
      length: 4.4,
      r: 0.45,
      color: 'OUT',
      line: true,
      marks: [[1, 'CAMEL_DARK', 1]],
      stiffness: 500,
      damping: 14,
      weight: 60,
    },
    hump: {
      on: 'hip',
      at: [3.2, -5.2],
      angle: 0,
      links: 2,
      length: 2.4,
      r: [1.5, 0.6],
      marks: [[0.7, 'CAMEL_DARK', 1.4]],
      front: true,
      joined: true,
      stiffness: 3000,
      damping: 20,
      weight: 10,
    },
    ear: { on: 'head', ear: [[-1.6, -1.2], [-0.4, -1.4]], tip: [-1.6, -3], stiffness: 1400, damping: 22, weight: 60 },
  },
  face: { eye: [0.4, -0.6] },
};
// @end

// the dromedary with its moves, from its build
export const make = (rig) => {
  // lying low: its legs folded under it, the hump low, the neck stretched out along the ground
  const low = { joints: { hip: [7, 15.4], chest: [13.5, 15.4], head: [21.4, 14.6] }, torso: { r: 3, ends: 3.6 }, ownShapes: true,
    shapes: [{ on: 'spine', ellipse: [3.2, -2, 3.6, 1.8] }, { on: 'chest', capsule: [1.6, 0, 6, -0.6, 1.2] }, ...rig.shapes.filter((x) => x.on === 'head')],
    paint: [rig.paint[0]],
    chains: { tail: { at: [-3.6, -0.8], angle: 1.8 }, hump: { at: [3.2, -2.4] }, ...earsBack(rig) } };

  return { ...rig, rears: 0.35, poses: quadruped(rig, low, { idle: standIdle(rig, { tail: 2.6, swish: 0.15 }) }) }; // (rears: only a little up on its hind legs, for a treat: see reaching)
};

export default make(build);
