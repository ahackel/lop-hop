// The boar as a rig (see the cat, and kit.js): dark and stocky, bristles along its back, a long snout, pointed, pink at
// its end, little white tusks, a pointed ear (darker), a thin tail, thin legs.
import { quadruped, earsBack, standIdle } from './kit.js';
import { toBuild } from '../asset.js';
import asset from '../assets/boar.js';

// its build: its file (assets/boar.js, see asset.js), which the editor saves into
export const build = toBuild(asset);

// the boar with its moves, from its build
export const make = (rig) => {
  const low = { joints: { hip: [8, 16.2], chest: [15, 16.2], head: [18.8, 15.7] }, torso: { r: 3, ends: 4.5 },
    chains: { tail: { at: [-4, -1], angle: 1.6 }, ...earsBack(rig, -1) } }; // (its ears snapped forward, not back)

  return { ...rig, poses: quadruped(rig, low, { idle: standIdle(rig, { tail: 2.5, swish: 0.1 }) }) }; // (resting, the tail hangs down)
};

export default make(build);
