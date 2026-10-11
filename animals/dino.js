// The dino as a rig (see the cat, and kit.js): a little T. rex, after the runner of Google's game. A big skull with a long
// rounded snout, the eye at its back, a nostril at its front, the lower jaw hanging open below it (teeth in the gap); a
// thick neck, a body leaning forward with a lighter belly, a tiny arm, a strong thigh, legs with big feet, a long
// tapering tail. Made of shapes, it stays smooth as it grows giant (drawn bigger, not its pixels: see drawRig).
import { quadruped, crawl } from './kit.js';
import { toBuild } from '../asset.js';
import asset from '../assets/dino.js';

// its build: its file (assets/dino.js, see asset.js), which the editor saves into
export const build = toBuild(asset);

// the dino with its moves, from its build
export const make = (rig) => {
  // lying low: long and flat, the head forward on the ground, the tail out behind
  const low = { joints: { hip: [9, 15.5], chest: [16, 15.5], head: [19.5, 13.8] }, torso: { r: 2.4, ends: 5 }, ownShapes: true, shapes: rig.shapes.filter((x) => x.on === 'head'),
    paint: [{ color: 'DINO_LIGHT', on: 'spine', ellipse: [3.5, 1.4, 5, 1] }], chains: { tail: { at: [-4.5, -0.5], angle: 1.5 } } };

  // the run: two legs taking turns, a long stride
  const run = { gait: { frames: 8, stance: 0.45, reach: 5, lift: 2.2, bob: 0.5, ground: 18.4, legs: { hindNear: [0, 0.5], hindFar: [0.5, -0.5] } } };
  // jumping: legs apart as it rises, together as it falls (its body upright)
  const jump = [{ paws: { hindNear: [8, 17.6], hindFar: [15, 17.8] } }, { paws: { hindNear: [11, 18], hindFar: [13, 17.4] } }];

  return { ...rig, poses: quadruped(rig, low, { run, jump, duck: crawl(rig, low, { legs: { hindNear: [0, 0], hindFar: [0.5, 1] } }) }) };
};

export default make(build);
