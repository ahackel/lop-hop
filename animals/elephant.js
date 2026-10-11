// The elephant as a rig (see the cat, and kit.js): big and grey, a round head with a triangular ear hanging down (on top),
// a long trunk that swings as it runs and curls up at the tip, a short white tusk, thick legs like columns, a thin tail.
import { quadruped, standIdle } from './kit.js';
import { toBuild } from '../asset.js';
import asset from '../assets/elephant.js';

const ear = (dy = 0) => [{ color: 'ELEPHANT_DARK', shapes: [{ on: 'head', triangle: [[-5.6, -2 + dy], [-1.4, -2.4 + dy], [-3.2, 3.8 + dy]] }] }];

// its build: its file (assets/elephant.js, see asset.js), which the editor saves into
export const build = toBuild(asset);

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
