// The bear as a rig (see the cat, and kit.js): big and brown, a hump at its shoulders, round ears, a light snout, a
// stubby tail.
import { quadruped } from './kit.js';
import { toBuild } from '../asset.js';
import asset from '../assets/bear.js';

// its build: its file (assets/bear.js, see asset.js), which the editor saves into
export const build = toBuild(asset);

// the bear with its moves, from its build
export const make = (rig) => {
  const low = { joints: { hip: [7.5, 15.8], chest: [15.5, 15.8], head: [19.8, 15.4] }, torso: { r: 3.3, ends: 4.5 },
    shapes: [{ on: 'spine', ellipse: [5, -1.3, 4, 2] }], ownShapes: true };
  low.shapes.push(...rig.shapes.slice(1));

  return { ...rig, poses: quadruped(rig, low) };
};

export default make(build);
