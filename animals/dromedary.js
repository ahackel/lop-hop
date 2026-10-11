// The dromedary as a rig (see the cat, and kit.js): sandy, one big pointed hump (its tip a stiff chain: it wobbles a little
// as it runs), a long neck curving forward and up, a long head with droopy lips and a small ear, long thin legs with
// knobbly knees, a thin tail with a tuft.
import { quadruped, earsBack, standIdle } from './kit.js';
import { toBuild } from '../asset.js';
import asset from '../assets/dromedary.js';

// its build: its file (assets/dromedary.js, see asset.js), which the editor saves into
export const build = toBuild(asset);

// the dromedary with its moves, from its build
export const make = (rig) => {
  // lying low: its legs folded under it, the hump low, the neck stretched out along the ground
  const low = { joints: { hip: [7, 15.4], chest: [13.5, 15.4], head: [21.4, 14.6] }, torso: { r: 3, ends: 3.6 }, ownShapes: true,
    shapes: [{ on: 'spine', ellipse: [3.2, -2, 3.6, 1.8] }, { on: 'chest', capsule: [1.6, 0, 6, -0.6, 1.2] }, ...rig.shapes.filter((x) => x.on === 'head')],
    paint: [rig.paint[0]],
    chains: { tail: { at: [-3.6, -0.8], angle: 1.8 }, hump: { at: [3.2, -2.4] }, ...earsBack(rig) } };

  return { ...rig, rears: 0.35, poses: quadruped(rig, low, { idle: standIdle(rig, { tail: 2.6, swish: 0.15 }) }) }; // (rears: only a little up on its hind legs, for a treat: see reaching)
};

export default make(build);
