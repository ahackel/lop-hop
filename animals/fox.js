// The fox as a rig (see the cat, and kit.js): slim, a long snout, pointed ears with dark tips, dark socks, a white belly
// and jaw, a bushy tail with a white tip.
import { quadruped, earsBack, bump, wave } from './kit.js';

// @build: the rig, edited in the editor (editor/), which rewrites what is between these lines
export const build = {
  fur: 'FOX',
  joints: { hip: [9, 11.8], chest: [15, 11.8], head: [19.8, 8.6] },
  torso: { r: 3.5, ends: 3.5 },
  shapes: [
    { name: 'chest', on: 'chest', ellipse: [1.5, 0.2, 2.6, 3] },
    { name: 'head', on: 'head', ellipse: [0, 0, 3.5, 3.2] },
    { name: 'snout', on: 'head', capsule: [1.2, 1.4, 4.8, 2, 1.3] },
  ],
  paint: [
    { name: 'belly', color: 'BELLY', on: 'spine', ellipse: [4, 2.8, 5, 1.1] },
    { name: 'chest', color: 'BELLY', on: 'chest', ellipse: [2.6, 1.2, 1.8, 2] },
    { name: 'jaw', color: 'BELLY', on: 'head', ellipse: [2.8, 2.5, 2.2, 0.9] },
  ],
  socks: 'BROWN',
  legs: {
    hindFar: { on: 'hip', at: [0.5, 1.7], thigh: 2.75, shin: 2.75, r: 0.8, far: true, bend: 1 },
    frontFar: { on: 'chest', at: [1.5, 1.7], thigh: 2.75, shin: 2.75, r: 0.8, far: true, bend: -1 },
    hindNear: { on: 'hip', at: [-0.5, 1.7], thigh: 2.75, shin: 2.75, r: 0.9, bend: 1 },
    frontNear: { on: 'chest', at: [1, 1.7], thigh: 2.75, shin: 2.75, r: 0.9, bend: -1 },
  },
  chains: {
    tail: {
      on: 'hip',
      at: [-3, -1.3],
      angle: 0.75,
      links: 3,
      length: 5.5,
      r: [1.6, 2.1],
      marks: [[1.15, 'BELLY', 1.8]],
      stiffness: 800,
      damping: 26,
      weight: 70,
    },
    earA: { on: 'head', ear: [[-2.4, -2.3], [0.2, -3.4]], tip: [-1.9, -7], tipColor: 'BROWN', stiffness: 1400, damping: 22, weight: 60 },
    earB: { on: 'head', ear: [[0.4, -3.3], [2.8, -2.2]], tip: [2, -7.1], tipColor: 'BROWN', stiffness: 1400, damping: 22, weight: 60 },
  },
  face: { eye: [0.7, -1.1], nose: [5.2, 1.4] },
};
// @end

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
