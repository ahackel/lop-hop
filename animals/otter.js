// The otter as a rig (see the cat, and kit.js): long and low, dark brown with a light face and belly, a small round ear,
// a long thick tail tapering to its tip.
import { quadruped } from './kit.js';

// @build: the rig, edited in the editor (editor/), which rewrites what is between these lines
export const build = {
  fur: 'BROWN',
  joints: { hip: [6, 14], chest: [15.5, 11.8], head: [20.3, 8.3] },
  torso: { r: 3.8, ends: 0, capsule: true },
  shapes: [
    { name: 'neck', on: 'chest', capsule: [0, 0, 4, -1.9, 2.8] },
    { name: 'head', on: 'head', ellipse: [0, 0, 3.4, 3.3] },
    { name: 'snout', on: 'head', ellipse: [2.7, 1.2, 1.8, 1.5] },
    { name: 'ear', on: 'head', ellipse: [-2, -3.3, 1.2, 1.1] },
  ],
  paint: [
    { name: 'snout', color: 'EAR', on: 'head', ellipse: [2.7, 1.2, 1.8, 1.5] },
    { name: 'chin', color: 'EAR', on: 'head', ellipse: [1.7, 2.2, 2.5, 1.4] },
    { name: 'belly', color: 'EAR', on: 'spine', ellipse: [5.4, 3.1, 4.5, 1.2] },
  ],
  legs: {
    hindFar: { on: 'hip', at: [2.5, 2.6], thigh: 1.4, shin: 1.4, r: 0.9, far: true, bend: 1 },
    frontFar: { on: 'chest', at: [0.4, 2.85], thigh: 2.2, shin: 2.2, r: 0.9, far: true, bend: -1 },
    hindNear: { on: 'hip', at: [1.5, 2.4], thigh: 1.4, shin: 1.4, r: 1, bend: 1 },
    frontNear: { on: 'chest', at: [-0.1, 2.75], thigh: 2.2, shin: 2.2, r: 1, bend: -1 },
  },
  chains: { tail: { on: 'hip', at: [-1, 0], angle: 1.45, links: 5, length: 11, r: [1.9, 0.6], curl: -0.05, stiffness: 900, damping: 28, weight: 35 } },
  face: { eye: [0.7, -0.9], nose: [4.3, 0.6] },
};
// @end

// the otter with its moves, from its build
export const make = (rig) => {
  // lying low: one long line on the ground
  const low = { joints: { hip: [4.5, 16.6], chest: [17, 16.6], head: [20.5, 15.6] }, torso: { r: 2.6, ends: 0, capsule: true },
    chains: { tail: { at: [-0.5, 0.3], angle: 1.7 } } };

  return { ...rig, poses: quadruped(rig, low) };
};

export default make(build);
