// The elephant as a rig (see the cat, and kit.js): big and grey, a round head with a triangular ear hanging down (on top),
// a long trunk that swings as it runs and curls up at the tip, a short white tusk, thick legs like columns, a thin tail.
import { quadruped, standIdle } from './kit.js';

const ear = (dy = 0) => [{ color: 'ELEPHANT_DARK', shapes: [{ on: 'head', triangle: [[-5.6, -2 + dy], [-1.4, -2.4 + dy], [-3.2, 3.8 + dy]] }] }];

// @build: the rig, edited in the editor (editor/), which rewrites what is between these lines
export const build = {
  fur: 'ELEPHANT',
  joints: { hip: [7, 10.5], chest: [13.5, 10], head: [18.3, 7.4] },
  torso: { r: 5, ends: 3.6 },
  shapes: [{ name: 'head', on: 'head', ellipse: [0.6, 0.5, 4.3, 4.5] }, { name: 'brow', on: 'head', ellipse: [-0.4, -1.9, 3.5, 2.7] }],
  paint: [],
  top: [
    { name: 'ear', color: 'ELEPHANT_DARK', shapes: [{ on: 'head', triangle: [[-5.6, -2], [-1.4, -2.4], [-3.2, 3.8]] }] },
    { name: 'tusk', color: 'BELLY', shapes: [{ on: 'head', capsule: [2.8, 3, 5, 4, 0.55] }] },
  ],
  legs: {
    hindFar: { on: 'hip', at: [1, 3.6], thigh: 2.2, shin: 2.2, r: 1.45, foot: [1.6, 0.7], far: true, bend: 1 },
    frontFar: { on: 'chest', at: [1, 3.6], thigh: 2.2, shin: 2.2, r: 1.45, foot: [1.6, 0.7], far: true, bend: -1 },
    hindNear: { on: 'hip', at: [0, 3.6], thigh: 2.2, shin: 2.2, r: 1.6, foot: [1.7, 0.7], bend: 1 },
    frontNear: { on: 'chest', at: [0, 3.6], thigh: 2.2, shin: 2.2, r: 1.6, foot: [1.7, 0.7], bend: -1 },
  },
  chains: {
    trunk: {
      on: 'head',
      at: [4, 3],
      angle: 3.3,
      links: 4,
      length: 7.5,
      r: [1.35, 0.7],
      curl: 0.18,
      front: true,
      joined: true,
      stiffness: 900,
      damping: 20,
      weight: 50,
    },
    tail: {
      on: 'hip',
      at: [-4.9, -1.4],
      angle: 1.6,
      links: 2,
      length: 4.8,
      r: 0.45,
      color: 'OUT',
      line: true,
      marks: [[1, 'OUT', 0.8]],
      stiffness: 500,
      damping: 14,
      weight: 60,
    },
  },
  face: { eye: [1.4, -1] },
};
// @end

// the elephant with its moves, from its build
export const make = (rig) => {
  // lying low: flat, the trunk out along the ground, the ear laid back
  const low = { joints: { hip: [8, 15.6], chest: [14.5, 15.4], head: [19.4, 14.2] }, torso: { r: 3.4, ends: 4.5 }, top: [...ear(-0.6), rig.top[1]],
    chains: { trunk: { angle: 4.3, curl: 0.05 }, tail: { at: [-4.8, -1], angle: 1.9 } } };

  const poses = quadruped(rig, low, { idle: standIdle(rig, { tail: 2.5, swish: 0.1 }) }); // (resting, the tail hangs down)
  // spraying (its power): running with the trunk raised, held out to the front, the tip lifted (the game sprays from it)
  poses.spray = { ...poses.run, chains: { trunk: { angle: 5.45, curl: 0.12 } } };
  return { ...rig, poses };
};

export default make(build);
