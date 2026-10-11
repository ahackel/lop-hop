// The hedgehog as a rig (see the cat, and kit.js): a round spiky back, a cream face and belly, a pointed snout, a little
// round ear; short legs. (Its power, rolled up in a ball: drawn on its own, see balls in art.js.)
import { quadruped } from './kit.js';

// @build: the rig, edited in the editor (editor/), which rewrites what is between these lines
export const build = {
  fur: 'BROWN',
  joints: { hip: [8, 11.3], chest: [14, 11.3], head: [18.5, 13] },
  torso: { r: 7.2, ends: 5.5 },
  shapes: [
    { name: 'belly', on: 'spine', ellipse: [4, 4.2, 6, 2.5] },
    { name: 'face', on: 'head', ellipse: [0, 0, 3.4, 3] },
    { name: 'snout', on: 'head', capsule: [1.5, 1.4, 5.1, 1.8, 1.1] },
  ],
  paint: [
    { name: 'face', color: 'EAR', on: 'head', ellipse: [0, 0, 3.4, 3] },
    { name: 'snout', color: 'EAR', on: 'head', capsule: [1.5, 1.4, 5.1, 1.8, 1.1] },
    { name: 'belly', color: 'EAR', on: 'spine', ellipse: [4.5, 5.1, 5, 1.3] },
  ],
  spikes: { on: 'spine', box: [-12, -12, 9, 3.7], speck: 'TAN' },
  top: [{ name: 'ear', color: 'EAR', shapes: [{ on: 'head', ellipse: [-0.9, -3.4, 1.1, 1.1] }] }],
  legs: {
    hindFar: { on: 'hip', at: [1, 5.2], thigh: 1.2, shin: 1.2, r: 0.8, far: true, bend: 1 },
    frontFar: { on: 'chest', at: [1.5, 5.2], thigh: 1.2, shin: 1.2, r: 0.8, far: true, bend: -1 },
    hindNear: { on: 'hip', at: [0, 5.2], thigh: 1.2, shin: 1.2, r: 0.9, bend: 1 },
    frontNear: { on: 'chest', at: [1, 5.2], thigh: 1.2, shin: 1.2, r: 0.9, bend: -1 },
  },
  chains: {},
  face: { eye: [1, -0.6], nose: [5.5, 1.4] },
};
// @end

// the hedgehog with its moves, from its build
export const make = (rig) => {
  // lying low: flat, the spikes still up
  const low = { joints: { hip: [8.5, 15.5], chest: [14.5, 15.5], head: [19.5, 16] }, torso: { r: 4, ends: 6 } };

  return { ...rig, poses: quadruped(rig, low) };
};

export default make(build);
