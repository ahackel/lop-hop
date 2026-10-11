// The cheetah as a rig (see the cat, and kit.js): slim and long-legged, golden with black spots, black tear lines from
// its eyes, a long tail with dark rings and a white tip.
import { quadruped, standIdle } from './kit.js';
import { toBuild } from '../asset.js';
import asset from '../assets/cheetah.js';

// its build: its file (assets/cheetah.js, see asset.js), which the editor saves into
export const build = toBuild(asset);

// the cheetah with its moves, from its build
export const make = (rig) => {
  const low = { joints: { hip: [8, 16.5], chest: [15, 16.5], head: [19.8, 15.6] }, torso: { r: 2.6, ends: 4.5 },
    chains: { tail: { at: [-4, -0.5], angle: 1.75, curl: 0 } } };

  // (rears: how far up on its hind legs it gets, reaching for a treat: long and thin, upright it would be a stick)
  return { ...rig, rears: 0.45, poses: quadruped(rig, low, { idle: standIdle(rig, { tail: 2.2, swish: 0.15 }) }) }; // (resting, the tail hangs a bit down)
};

export default make(build);
