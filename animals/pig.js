// The pig as a rig (see the cat, and kit.js): pink and round, a flat snout with two nostrils, a big lop ear flopping
// forward over its eye (swinging as it runs),
// a curly tail that springs about, little dark trotters.
import { quadruped, standIdle } from './kit.js';
import { toBuild } from '../asset.js';
import asset from '../assets/pig.js';

// its build: its file (assets/pig.js, see asset.js), which the editor saves into
export const build = toBuild(asset);

// the pig with its moves, from its build
export const make = (rig) => {
  // lying low: flat, the ear flopped forward
  const low = { joints: { hip: [8, 15.8], chest: [15, 15.8], head: [19.6, 15] }, torso: { r: 3.4, ends: 4.2 },
    chains: { tail: { at: [-4.4, -1], angle: 1.2 }, ear: { angle: -2.6 } } };

  return { ...rig, poses: quadruped(rig, low, { idle: standIdle(rig, { swish: 0.3 }) }) };
};

export default make(build);
