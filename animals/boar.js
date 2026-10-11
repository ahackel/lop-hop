// The boar as a rig (see the cat, and kit.js): dark and stocky, bristles along its back, a long snout, pointed, pink at
// its end, little white tusks, a pointed ear (darker), a thin tail, thin legs.
import { quadruped, earsBack, standIdle } from './kit.js';

// @build: the rig, edited in the editor (editor/), which rewrites what is between these lines
export const build = {
  fur: 'BOAR',
  joints: { hip: [8, 11.8], chest: [15, 11.8], head: [18.3, 11.2] },
  torso: { r: 4.8, ends: 3.8 },
  shapes: [{ name: 'head', on: 'head', ellipse: [0, 0, 3.9, 3.8] }, { name: 'snout', on: 'head', triangle: [[1.5, -1.8], [1.5, 3.8], [8.6, 2.4]] }],
  paint: [{ name: 'snout', color: 'SNOUT', on: 'head', triangle: [[5.6, 0.4], [5.6, 3.4], [8.8, 2.4]] }],
  dots: [
    { name: 'nostril', on: 'head', at: [7.2, 2.2] },
    { name: 'tusk', on: 'head', at: [4.2, 3.4], color: 'BELLY' },
    { name: 'tusk', on: 'head', at: [5, 2.8], color: 'BELLY' },
  ],
  spikes: { on: 'spine', box: [-12, -12, 9, -1.8] },
  legs: {
    hindFar: { on: 'hip', at: [1, 4], thigh: 1.45, shin: 1.45, r: 0.65, far: true, bend: 1 },
    frontFar: { on: 'chest', at: [0.5, 3.7], thigh: 1.6, shin: 1.6, r: 0.65, far: true, bend: -1 },
    hindNear: { on: 'hip', at: [0, 4], thigh: 1.45, shin: 1.45, r: 0.7, bend: 1 },
    frontNear: { on: 'chest', at: [0, 3.7], thigh: 1.6, shin: 1.6, r: 0.7, bend: -1 },
  },
  chains: {
    tail: {
      on: 'hip',
      at: [-4.2, -1.4],
      angle: 1.33,
      links: 2,
      length: 4,
      r: 0.45,
      color: 'OUT',
      line: true,
      stiffness: 500,
      damping: 14,
      weight: 60,
    },
    ear: {
      on: 'head',
      ear: [[-2.9, -3], [-0.1, -3.7]],
      tip: [1.2, -7.6],
      tipColor: 'BOAR_DARK',
      tipSize: 9,
      stiffness: 1400,
      damping: 22,
      weight: 60,
    },
  },
  face: { eye: [0.5, -1.3] },
};
// @end

// the boar with its moves, from its build
export const make = (rig) => {
  const low = { joints: { hip: [8, 16.2], chest: [15, 16.2], head: [18.8, 15.7] }, torso: { r: 3, ends: 4.5 },
    chains: { tail: { at: [-4, -1], angle: 1.6 }, ...earsBack(rig, -1) } }; // (its ears snapped forward, not back)

  return { ...rig, poses: quadruped(rig, low, { idle: standIdle(rig, { tail: 2.5, swish: 0.1 }) }) }; // (resting, the tail hangs down)
};

export default make(build);
