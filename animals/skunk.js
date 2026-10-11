// The skunk as a rig (see the cat, and kit.js): round and fluffy, black with a white stripe from its forehead down its
// back, a big bushy tail with a white tip; its head drawn over its round body.
import { quadruped } from './kit.js';
import { toBuild } from '../asset.js';
import asset from '../assets/skunk.js';

const head = { color: 'SKUNK', shapes: [{ on: 'head', ellipse: [0, 0, 3.3, 3] }, { on: 'head', ellipse: [3, 1.2, 1.8, 1.2] }, { on: 'head', ellipse: [-1.6, -2.8, 1, 1] }],
  paint: [{ color: 'BELLY', on: 'head', capsule: [1.8, -1.4, -1.2, -2.8, 0.7] }] }; // (and the stripe up its forehead)

// its build: its file (assets/skunk.js, see asset.js), which the editor saves into
export const build = toBuild(asset);

// the skunk with its moves, from its build
export const make = (rig) => {
  // lying low: the tail flat behind, the stripe along its back
  const low = { joints: { hip: [8, 16], chest: [15, 16], head: [19.5, 16] }, torso: { r: 3, ends: 4.5 },
    paint: [{ color: 'BELLY', on: 'spine', capsule: [11.5, -2.4, -2, -2.7, 0.9] }],
    chains: { tail: { at: [-3, -1], angle: 1.7, curl: 0.1 } } };

  return { ...rig, poses: quadruped(rig, low) };
};

export default make(build);
