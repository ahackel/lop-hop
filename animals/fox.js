// The fox as a rig (see the cat, and kit.js): slim, a long snout, pointed ears with dark tips, dark socks, a white belly
// and jaw, a bushy tail with a white tip.
import { quadruped, earsBack, bump, wave } from './kit.js';
import { toBuild } from '../asset.js';
import asset from '../assets/fox.js';

// its build: its file (assets/fox.js, see asset.js), which the editor saves into
export const build = toBuild(asset);

// the fox with its moves, from its build
export const make = (rig) => {
  const low = { joints: { hip: [8, 16.3], chest: [15, 16.3], head: [19.5, 15.3] }, torso: { r: 2.9, ends: 4 },
    chains: { tail: { at: [-2.5, -0.8], angle: 1.5 }, ...earsBack(rig) } };

  // sitting, t (0…1) through an 8 s loop: upright, the bushy tail along the ground by its feet, swishing; it breathes, an
  // ear flicks, and once it looks up
  const sit = (t) => {
    const b = 0.25 * wave(t, 4), look = bump(t, 0.42, 0.66, 0.05), flick = bump(t, 0.3, 0.34, 0.015);
    return {
      ownShapes: true, torso: { r: 0 },
      joints: { hip: [10.5, 14], chest: [14, 12.5 - b * 0.5], head: [16 - look * 0.4, 7.5 - b * 0.6 - look * 0.4] }, headAngle: -0.35 * look,
      shapes: [{ ellipse: [10.5, 14 - b, 5, 4.6 + b] }, { ellipse: [14, 12.5 - b * 0.5, 2.8, 4.2 + b * 0.5] }, { ellipse: [11, 18.6, 3.2, 1.1] },
        ...rig.shapes.slice(1)],
      roots: { hindNear: [9.5, 16], hindFar: [11.5, 16], frontNear: [14, 15], frontFar: [16, 15] },
      paws: { hindNear: [9.5, 18.4], hindFar: [11.5, 18.4], frontNear: [14, 18.4], frontFar: [16.2, 18.4] },
      paint: [{ color: 'BELLY', ellipse: [14.5, 12.5 - b * 0.5, 1.8, 3] }, rig.paint[2]],
      chains: { tail: { root: [6, 17], angle: 1.1 + 0.15 * wave(t, 2) }, earA: { tip: [-1.9 - 2 * flick, -7 + 1.5 * flick] } },
    };
  };

  return { ...rig, poses: quadruped(rig, low, { idle: { frames: 80, fps: 10, at: sit } }) };
};

export default make(build);
