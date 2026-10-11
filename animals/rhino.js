// The rhino as a rig (see the cat, and kit.js): big and grey, a great horn on its nose and a small one behind it (drawn
// on top), skin folds, thick short legs, a pointed ear, a thin tail.
import { quadruped, earsBack, standIdle } from './kit.js';

// @build: the rig, edited in the editor (editor/), which rewrites what is between these lines
export const build = {
  fur: 'RHINO',
  joints: { hip: [7.5, 11.5], chest: [14.5, 11.5], head: [19, 11] },
  torso: { r: 5, ends: 4 },
  shapes: [{ name: 'head', on: 'head', capsule: [-2.5, -1, 3, 1.4, 3] }],
  paint: [
    { name: 'fold', color: 'RHINO_DARK', on: 'spine', capsule: [2, -4.5, 2, 4.5, 0.5] },
    { name: 'fold', color: 'RHINO_DARK', on: 'spine', capsule: [7, -3.9, 7, 3.5, 0.5] },
  ],
  top: [
    {
      name: 'horns',
      color: 'EAR',
      shapes: [{ on: 'head', triangle: [[2.4, -0.6], [4.4, -6.8], [5.4, 0]] }, { on: 'head', triangle: [[0, -2], [0.8, -4.4], [2, -2]] }],
    },
  ],
  legs: {
    hindFar: { on: 'hip', at: [1, 3.5], thigh: 1.75, shin: 1.75, r: 1.35, far: true, bend: 1 },
    frontFar: { on: 'chest', at: [0.5, 3.5], thigh: 1.75, shin: 1.75, r: 1.35, far: true, bend: -1 },
    hindNear: { on: 'hip', at: [0, 3.5], thigh: 1.75, shin: 1.75, r: 1.5, bend: 1 },
    frontNear: { on: 'chest', at: [0, 3.5], thigh: 1.75, shin: 1.75, r: 1.5, bend: -1 },
  },
  chains: {
    tail: {
      on: 'hip',
      at: [-4.6, -1.6],
      angle: 1.45,
      links: 2,
      length: 4.4,
      r: 0.45,
      color: 'OUT',
      line: true,
      marks: [[1, 'OUT', 0.8]],
      stiffness: 500,
      damping: 14,
      weight: 60,
    },
    ear: { on: 'head', ear: [[-3.6, -3.4], [-1.2, -3.8]], tip: [-3.1, -7.4], stiffness: 1400, damping: 22, weight: 60 },
    earFar: { on: 'head', ear: [[-1.1, -2.8], [1.3, -3.2]], tip: [-0.6, -6.8], stiffness: 1400, damping: 22, weight: 60 },
  },
  face: { eye: [-0.4, -1], nose: [5.6, 1.6] },
};
// @end

// the rhino with its moves, from its build
export const make = (rig) => {
  const low = { joints: { hip: [8, 16], chest: [15, 16], head: [19.8, 15.6] }, torso: { r: 3.2, ends: 4.5 },
    paint: [{ color: 'RHINO_DARK', on: 'spine', capsule: [2, -2.6, 2, 2.6, 0.5] }, { color: 'RHINO_DARK', on: 'spine', capsule: [7, -2.6, 7, 2.6, 0.5] }],
    shapes: [{ on: 'head', capsule: [-2.8, -0.2, 2.8, 1, 2.3] }], ownShapes: true,
    top: [], chains: { tail: { at: [-4.8, -1], angle: 1.9 }, ...earsBack(rig) } };
  // (lying low, its horns smaller)
  low.top = [{ color: 'EAR', shapes: [{ on: 'head', triangle: [[1.7, -0.6], [3.2, -5], [4.4, 0]] }, { on: 'head', triangle: [[-0.4, -1.2], [0.2, -3.2], [1.2, -1.2]] }] }];

  return { ...rig, poses: quadruped(rig, low, { idle: standIdle(rig, { tail: 2.5, swish: 0.1 }) }) }; // (resting, the tail hangs down)
};

export default make(build);
