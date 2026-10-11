// The cheetah as a rig (see the cat, and kit.js): slim and long-legged, golden with black spots, black tear lines from
// its eyes, a long tail with dark rings and a white tip.
import { quadruped, standIdle } from './kit.js';

// @build: the rig, edited in the editor (editor/), which rewrites what is between these lines
export const build = {
  fur: 'CHEETAH',
  joints: { hip: [8, 10.8], chest: [15, 10.8], head: [19.6, 7.6] },
  torso: { r: 3, ends: 3 },
  shapes: [
    { name: 'chest', on: 'chest', ellipse: [0.5, 0.4, 2.6, 2.8] },
    { name: 'head', on: 'head', ellipse: [0, 0, 3.3, 3.1] },
    { name: 'muzzle', on: 'head', ellipse: [2.5, 1.4, 1.4, 1.1] },
    { name: 'ear', on: 'head', ellipse: [-2, -2.8, 1.1, 1.1] },
    { name: 'ear', on: 'head', ellipse: [1, -3.2, 1.1, 1.1] },
  ],
  paint: [
    { name: 'muzzle', color: 'BELLY', on: 'head', ellipse: [2.5, 1.4, 1.4, 1.1] },
    { name: 'belly', color: 'BELLY', on: 'spine', ellipse: [5, 2.5, 4.5, 0.9] },
  ],
  dots: [
    { name: 'spot', on: 'spine', at: [-1, -2] },
    { name: 'spot', on: 'spine', at: [1.5, -2.5] },
    { name: 'spot', on: 'spine', at: [4, -2.2] },
    { name: 'spot', on: 'spine', at: [6.5, -1.7] },
    { name: 'spot', on: 'spine', at: [0.5, 0] },
    { name: 'spot', on: 'spine', at: [3, 0.1] },
    { name: 'tear line', on: 'head', at: [1, 1] },
    { name: 'tear line', on: 'head', at: [1.4, 1.7] },
    { name: 'cheek', on: 'head', at: [0, 1.4], color: 'PINK' },
  ],
  legs: {
    hindFar: { on: 'hip', at: [1, 2], thigh: 2.9, shin: 2.9, r: 0.77, far: true, bend: 1 },
    frontFar: { on: 'chest', at: [0.5, 2], thigh: 2.9, shin: 2.9, r: 0.77, far: true, bend: -1 },
    hindNear: { on: 'hip', at: [0, 2], thigh: 2.9, shin: 2.9, r: 0.85, bend: 1 },
    frontNear: { on: 'chest', at: [0, 2], thigh: 2.9, shin: 2.9, r: 0.85, bend: -1 },
  },
  chains: {
    tail: {
      on: 'hip',
      at: [-2.5, -0.8],
      angle: 1.1,
      links: 4,
      length: 8,
      r: 0.8,
      curl: -0.15,
      marks: [[0.45, 'OUT', 0], [0.7, 'OUT', 0], [1, 'BELLY', 0]],
      stiffness: 600,
      damping: 18,
      weight: 40,
    },
  },
  face: { eye: [0.9, -1], nose: [3.6, 1] },
};
// @end

// the cheetah with its moves, from its build
export const make = (rig) => {
  const low = { joints: { hip: [8, 16.5], chest: [15, 16.5], head: [19.8, 15.6] }, torso: { r: 2.6, ends: 4.5 },
    chains: { tail: { at: [-4, -0.5], angle: 1.75, curl: 0 } } };

  // (rears: how far up on its hind legs it gets, reaching for a treat: long and thin, upright it would be a stick)
  return { ...rig, rears: 0.45, poses: quadruped(rig, low, { idle: standIdle(rig, { tail: 2.2, swish: 0.15 }) }) }; // (resting, the tail hangs a bit down)
};

export default make(build);
