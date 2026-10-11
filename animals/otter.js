// The otter as a rig (see the cat, and kit.js): long and low, dark brown with a light face and belly, a small round ear,
// a long thick tail tapering to its tip.
import { quadruped } from './kit.js';
import { toBuild } from '../asset.js';
import asset from '../assets/otter.js';

// its build: its file (assets/otter.js, see asset.js), which the editor saves into
export const build = toBuild(asset);

// the otter with its moves, from its build
export const make = (rig) => {
  // lying low: one long line on the ground
  const low = { joints: { hip: [4.5, 16.6], chest: [17, 16.6], head: [20.5, 15.6] }, torso: { r: 2.6, ends: 0, capsule: true },
    chains: { tail: { at: [-0.5, 0.3], angle: 1.7 } } };

  return { ...rig, poses: quadruped(rig, low) };
};

export default make(build);
