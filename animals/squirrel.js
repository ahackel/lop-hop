// The squirrel as a rig (see the cat, and kit.js): red, a tufted ear, a white belly, a big bushy tail curled up over its
// back. It runs in long leaps.
import { quadruped, earsBack } from './kit.js';
import { toBuild } from '../asset.js';
import asset from '../assets/squirrel.js';

// its build: its file (assets/squirrel.js, see asset.js), which the editor saves into
export const build = toBuild(asset);

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
