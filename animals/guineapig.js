// The guinea pig as a rig (see the cat, and kit.js): a round loaf with no tail and no neck, white with a ginger rump, a
// dark saddle and a ginger head with a white blaze down its nose; a fur swirl on its back, little round ears, tiny legs.
import { quadruped, standIdle } from './kit.js';

// @build: the rig, edited in the editor (editor/), which rewrites what is between these lines
export const build = {
  fur: 'FUR',
  joints: { hip: [8, 11.3], chest: [14, 11.3], head: [18.4, 10.4] },
  torso: { r: 6.5, ends: 4.4 },
  shapes: [{ name: 'head', on: 'head', ellipse: [0, 0, 4.6, 4.4] }, { name: 'muzzle', on: 'head', ellipse: [3.2, 1.4, 2.4, 2.2] }],
  paint: [
    { name: 'rump', color: 'GINGER', on: 'spine', ellipse: [-3.5, 0, 4.5, 6] },
    { name: 'saddle', color: 'SKUNK', on: 'spine', ellipse: [4.2, -4.4, 3, 3] },
    { name: 'head', color: 'GINGER', on: 'head', ellipse: [-0.6, -0.8, 4, 3.8] },
    { name: 'blaze', color: 'FUR', on: 'head', capsule: [3.4, -4.4, 4.2, 1.5, 0.9] },
  ],
  top: [{ name: 'ear', color: 'PINK', shapes: [{ on: 'head', ellipse: [-1.8, -3.9, 1.5, 1.2] }] }],
  legs: {
    hindFar: { on: 'hip', at: [1, 5.4], thigh: 1, shin: 1, r: 0.8, far: true, bend: 1 },
    frontFar: { on: 'chest', at: [1.5, 5.4], thigh: 1, shin: 1, r: 0.8, far: true, bend: -1 },
    hindNear: { on: 'hip', at: [0, 5.4], thigh: 1, shin: 1, r: 0.9, bend: 1 },
    frontNear: { on: 'chest', at: [1, 5.4], thigh: 1, shin: 1, r: 0.9, bend: -1 },
  },
  chains: {},
  face: { eye: [1, -1.2], nose: [5.4, 1], noseColor: 'PINK' },
};
// @end

// the guinea pig with its moves, from its build
export const make = (rig) => {
  // lying low: a flat loaf
  const low = { joints: { hip: [8, 15.2], chest: [14.5, 15.2], head: [19.4, 14.6] }, torso: { r: 3.8, ends: 5 } };

  return { ...rig, poses: quadruped(rig, low, { idle: standIdle(rig, { breath: 0.4 }) }) };
};

export default make(build);
