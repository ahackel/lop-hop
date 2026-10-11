// The dog as a rig (see the cat, and kit.js): a beagle puppy, white with a tan saddle and head, a floppy brown ear in
// front, a wagging tail with a white tip; its tongue out as it runs.
import { quadruped, gallop, ko, bump, wave } from './kit.js';
import { toBuild } from '../asset.js';
import asset from '../assets/dog.js';

const tongue = [{ color: 'PINK', shapes: [{ on: 'head', ellipse: [3, 4.3, 1, 1.2] }] }];

// its build: its file (assets/dog.js, see asset.js), which the editor saves into
export const build = toBuild(asset);

// the dog with its moves, from its build
export const make = (rig) => {
  // lying low: long and flat, the tail out behind
  const low = { joints: { hip: [6.5, 16], chest: [14.5, 16], head: [19.5, 14.8] }, torso: { r: 3.2, ends: 4 },
    chains: { tail: { at: [-3.5, -1], angle: 1.45 } } };

  // sitting, t (0…1) through an 8 s loop: on its haunch, the front legs straight, panting; the tail thumping the ground
  // (twice a second), and once it looks up (the tongue in)
  const sit = (t) => {
    const b = 0.25 * wave(t, 4), look = bump(t, 0.42, 0.66, 0.05);
    return {
      ownShapes: true, torso: { r: 0 },
      joints: { hip: [9, 14.5], chest: [13.5, 12 - b * 0.5], head: [17 - look * 0.4, 6.5 - b * 0.6 - look * 0.4] }, headAngle: -0.35 * look,
      shapes: [{ ellipse: [9, 14.5 - b, 5.5, 4.5 + b] }, { ellipse: [13.5, 12 - b * 0.5, 3.8, 5 + b * 0.5] }, { ellipse: [9.5, 18.6, 3.5, 1.2] },
        { on: 'head', ellipse: [0, 0, 4.4, 4.2] }, { on: 'head', ellipse: [3.5, 1.8, 2.6, 2] }],
      roots: { hindNear: [8, 16], hindFar: [10, 16], frontNear: [13.5, 14], frontFar: [15.5, 14] },
      paws: { hindNear: [8, 18.4], hindFar: [10, 18.4], frontNear: [13.5, 18.4], frontFar: [15.8, 18.4] },
      paint: [{ color: 'TAN', ellipse: [8, 12 - b, 5, 3] }, ...rig.paint.slice(1)],
      chains: { tail: { root: [4, 16.5], angle: 0.8 + 0.3 * wave(t, 16) } }, // (the spine leans back half a turn of a radian)
      top: look > 0.1 ? [] : [{ color: 'PINK', shapes: [{ on: 'head', ellipse: [3, 4.3 + 0.3 * b, 1, 1.2] }] }],
    };
  };

  return { ...rig, poses: quadruped(rig, low, {
  run: { top: tongue, ...gallop(rig) },
  ko: [{ ...ko(rig, low), top: tongue }],
  idle: { frames: 80, fps: 10, at: sit },
}) };
};

export default make(build);
