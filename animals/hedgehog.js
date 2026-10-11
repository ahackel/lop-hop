// The hedgehog as a rig (see the cat, and kit.js): a round spiky back, a cream face and belly, a pointed snout, a little
// round ear; short legs. (Its power, rolled up in a ball: drawn on its own, see balls in art.js.)
import { quadruped } from './kit.js';
import { toBuild } from '../asset.js';
import asset from '../assets/hedgehog.js';

// its build: its file (assets/hedgehog.js, see asset.js), which the editor saves into
export const build = toBuild(asset);

// the hedgehog with its moves, from its build
export const make = (rig) => {
  // lying low: flat, the spikes still up
  const low = { joints: { hip: [8.5, 15.5], chest: [14.5, 15.5], head: [19.5, 16] }, torso: { r: 4, ends: 6 } };

  return { ...rig, poses: quadruped(rig, low) };
};

export default make(build);
