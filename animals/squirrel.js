// The squirrel as a rig (see the cat, and kit.js): red, a tufted ear, a white belly, a big bushy tail curled up over its
// back. It runs in long leaps.
import { quadruped, earsBack } from './kit.js';

// @build: the rig, edited in the editor (editor/), which rewrites what is between these lines
export const build = {
  fur: 'STRIPE',
  joints: { hip: [9, 13], chest: [14, 13], head: [18.5, 9.6] },
  torso: { r: 3.6, ends: 3.5 },
  shapes: [
    { name: 'haunch', on: 'hip', ellipse: [0, 1.2, 3.8, 3.4] },
    { name: 'head', on: 'head', ellipse: [0, 0, 3.3, 3.1] },
    { name: 'snout', on: 'head', ellipse: [2.8, 1.2, 1.7, 1.4] },
  ],
  paint: [
    { name: 'belly', color: 'BELLY', on: 'spine', ellipse: [5, 2.2, 4, 1.3] },
    { name: 'jaw', color: 'BELLY', on: 'head', ellipse: [2.5, 2, 1.6, 0.8] },
  ],
  legs: {
    hindFar: { on: 'hip', at: [0.5, 2.5], thigh: 1.6, shin: 1.6, r: 0.75, far: true, bend: 1 },
    frontFar: { on: 'chest', at: [1.5, 2], thigh: 1.8, shin: 1.8, r: 0.75, far: true, bend: -1 },
    hindNear: { on: 'hip', at: [-0.5, 2.5], thigh: 1.6, shin: 1.6, r: 0.85, bend: 1 },
    frontNear: { on: 'chest', at: [1, 2], thigh: 1.8, shin: 1.8, r: 0.85, bend: -1 },
  },
  chains: {
    tail: { on: 'hip', at: [-3, -1], angle: 0.42, links: 4, length: 9.2, r: [2.2, 2.6], curl: 0.45, stiffness: 600, damping: 22, weight: 50 },
    ear: { on: 'head', ear: [[-1.9, -2.4], [0.1, -3.2]], tip: [-1.5, -6.8], stiffness: 1400, damping: 22, weight: 60 },
    earFar: { on: 'head', ear: [[0.6, -1.8], [2.6, -2.6]], tip: [1, -6.2], stiffness: 1400, damping: 22, weight: 60 },
  },
  face: { eye: [1, -0.8], nose: [4.5, 0.8] },
};
// @end

// the squirrel with its moves, from its build
export const make = (rig) => {
  // lying low: the tail out flat behind
  const low = { joints: { hip: [9.5, 16.4], chest: [14.5, 16.4], head: [19, 15.6] }, torso: { r: 2.6, ends: 4.5 },
    chains: { tail: { at: [-3.5, -0.5], angle: 1.75, curl: 0.05 }, ...earsBack(rig) } };

  // the run: long leaps (rate: 0.6 of the usual strides). Landing on its front paws, the hind ones coming down ahead of them (gathered, crouching), pushing
  // off and flying stretched out, the hind legs trailing and the front ones reaching for the ground
  const run = { gait: { leap: true, rate: 0.6, frames: 12, land: 0.3, height: 8, stretch: 2, gather: 1.8, crouch: 0.8, pitch: 1.1, ground: 18.4, legs: {
    hindNear: { down: [0, 0.35], at: [3, -2], air: [-5, -1.5] }, hindFar: { down: [0.02, 0.35], at: [3.5, -1.5], air: [-4.5, -1.5] },
    frontNear: { down: [0.95, 0.25], at: [1.5, -2], air: [5, -3] }, frontFar: { down: [0.96, 0.27], at: [2, -1.5], air: [5.5, -3] },
  } } };

  return { ...rig, poses: quadruped(rig, low, { run }) };
};

export default make(build);
