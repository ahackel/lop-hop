// The guinea pig as a rig (see the cat, and kit.js): a round loaf with no tail and no neck, white with a ginger rump, a
// dark saddle and a ginger head with a white blaze down its nose; a fur swirl on its back, little round ears, tiny legs.
import { quadruped, standIdle } from './kit.js';
import { toBuild } from '../asset.js';
import asset from '../assets/guineapig.js';

// its build: its file (assets/guineapig.js, see asset.js), which the editor saves into
export const build = toBuild(asset);

// the guinea pig with its moves, from its build
export const make = (rig) => {
  // lying low: a flat loaf
  const low = { joints: { hip: [8, 15.2], chest: [14.5, 15.2], head: [19.4, 14.6] }, torso: { r: 3.8, ends: 5 } };

  return { ...rig, poses: quadruped(rig, low, { idle: standIdle(rig, { breath: 0.4 }) }) };
};

export default make(build);
