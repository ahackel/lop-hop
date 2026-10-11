// The skunk as a rig (see the cat, and kit.js): round and fluffy, black with a white stripe from its forehead down its
// back, a big bushy tail with a white tip; its head drawn over its round body.
import { quadruped } from './kit.js';

const head = { color: 'SKUNK', shapes: [{ on: 'head', ellipse: [0, 0, 3.3, 3] }, { on: 'head', ellipse: [3, 1.2, 1.8, 1.2] }, { on: 'head', ellipse: [-1.6, -2.8, 1, 1] }],
  paint: [{ color: 'BELLY', on: 'head', capsule: [1.8, -1.4, -1.2, -2.8, 0.7] }] }; // (and the stripe up its forehead)

// @build: the rig, edited in the editor (editor/), which rewrites what is between these lines
export const build = {
  fur: 'SKUNK',
  joints: { hip: [8, 11.2], chest: [13, 11.2], head: [18.8, 12.6] },
  torso: { r: 7.2, ends: 4 },
  shapes: [],
  paint: [{ name: 'stripe', color: 'BELLY', on: 'spine', capsule: [8, -4.7, -1.5, -5.6, 0.9] }],
  top: [
    {
      name: 'head',
      color: 'SKUNK',
      shapes: [{ on: 'head', ellipse: [0, 0, 3.3, 3] }, { on: 'head', ellipse: [3, 1.2, 1.8, 1.2] }, { on: 'head', ellipse: [-1.6, -2.8, 1, 1] }],
      paint: [{ color: 'BELLY', on: 'head', capsule: [1.8, -1.4, -1.2, -2.8, 0.7] }],
    },
  ],
  legs: {
    hindFar: { on: 'hip', at: [1, 4.3], thigh: 1.6, shin: 1.6, r: 0.8, far: true, bend: 1 },
    frontFar: { on: 'chest', at: [2, 4.3], thigh: 1.6, shin: 1.6, r: 0.8, far: true, bend: -1 },
    hindNear: { on: 'hip', at: [0, 4.3], thigh: 1.6, shin: 1.6, r: 0.9, bend: 1 },
    frontNear: { on: 'chest', at: [1.5, 4.3], thigh: 1.6, shin: 1.6, r: 0.9, bend: -1 },
  },
  chains: {
    tail: {
      on: 'hip',
      at: [-2, -1.2],
      angle: 0.48,
      links: 3,
      length: 7.6,
      r: [2.3, 2.5],
      curl: 0.5,
      marks: [[0.95, 'BELLY', 1.5]],
      stiffness: 600,
      damping: 22,
      weight: 50,
    },
  },
  face: { eye: [0.7, -0.6], nose: [4.6, 1] },
};
// @end

// the skunk with its moves, from its build
export const make = (rig) => {
  // lying low: the tail flat behind, the stripe along its back
  const low = { joints: { hip: [8, 16], chest: [15, 16], head: [19.5, 16] }, torso: { r: 3, ends: 4.5 },
    paint: [{ color: 'BELLY', on: 'spine', capsule: [11.5, -2.4, -2, -2.7, 0.9] }],
    chains: { tail: { at: [-3, -1], angle: 1.7, curl: 0.1 } } };

  return { ...rig, poses: quadruped(rig, low) };
};

export default make(build);
