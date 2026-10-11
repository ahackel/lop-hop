// The rhino as a rig (see the cat, and kit.js): big and grey, a great horn on its nose and a small one behind it (drawn
// on top), skin folds, thick short legs, a pointed ear, a thin tail.
import { quadruped, earsBack, standIdle } from './kit.js';
import { toBuild } from '../asset.js';
import asset from '../assets/rhino.js';

// its build: its file (assets/rhino.js, see asset.js), which the editor saves into
export const build = toBuild(asset);

// the rhino with its moves, from its build
export const make = (rig) => {
  const low = { joints: { hip: [8, 16], chest: [15, 16], head: [19.8, 15.6] }, torso: { r: 3.2, ends: 4.5 },
    paint: [{ color: 'RHINO_DARK', on: 'spine', capsule: [2, -2.6, 2, 2.6, 0.5] }, { color: 'RHINO_DARK', on: 'spine', capsule: [7, -2.6, 7, 2.6, 0.5] }],
    shapes: [{ on: 'head', capsule: [-2.8, -0.2, 2.8, 1, 2.3] }], ownShapes: true,
    top: [], chains: { tail: { at: [-4.8, -1], angle: 1.9 }, ...earsBack(rig) } };
  // (lying low, its horns smaller)
  low.top = [{ color: 'EAR', shapes: [{ on: 'head', triangle: [[1.7, -0.6], [3.2, -5], [4.4, 0]] }, { on: 'head', triangle: [[-0.4, -1.2], [0.2, -3.2], [1.2, -1.2]] }] }];

  return { ...rig, poses: quadruped(rig, low, { idle: standIdle(rig, { tail: 2.5, swish: 0.1 }) }) }; // (resting, the tail hangs down)
};

export default make(build);
