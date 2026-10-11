// The pig as a rig (see the cat, and kit.js): pink and round, a flat snout with two nostrils, a big lop ear flopping
// forward over its eye (swinging as it runs),
// a curly tail that springs about, little dark trotters.
import { quadruped, standIdle } from './kit.js';

// @build: the rig, edited in the editor (editor/), which rewrites what is between these lines
export const build = {
  fur: 'PIG',
  joints: { hip: [8, 11.2], chest: [14.5, 11.2], head: [20, 8.4] },
  torso: { r: 5.6, ends: 3.6 },
  shapes: [{ name: 'head', on: 'head', ellipse: [0, 0, 4.6, 4.4], smooth: 0.3 }, { name: 'snout', on: 'head', box: [3.6, 0, 7.2, 3.2, 1.1] }],
  paint: [{ name: 'snout', color: 'PIG_DARK', on: 'head', ellipse: [6.6, 1.6, 1.6, 2] }],
  dots: [
    { name: 'nostril', on: 'head', at: [5.8, 0.7] },
    { name: 'nostril', on: 'head', at: [5.8, 2.4] },
    { name: 'blush', on: 'head', at: [2.2, 1.8], color: 'PIG_DARK' },
  ],
  socks: 'PIG_DARK',
  legs: {
    hindFar: { on: 'hip', at: [1, 4.4], thigh: 1.6, shin: 1.6, r: 0.65, far: true, bend: 1 },
    frontFar: { on: 'chest', at: [0.5, 4.4], thigh: 1.6, shin: 1.6, r: 0.65, far: true, bend: -1 },
    hindNear: { on: 'hip', at: [0, 4.4], thigh: 1.6, shin: 1.6, r: 0.75, bend: 1 },
    frontNear: { on: 'chest', at: [0, 4.4], thigh: 1.6, shin: 1.6, r: 0.75, bend: -1 },
  },
  chains: {
    tail: { on: 'hip', at: [-4.6, -2.2], angle: 0.9, links: 4, length: 4.4, r: 0.5, curl: 1.1, stiffness: 300, damping: 6, weight: 60 },
    ear: {
      on: 'head',
      at: [0.2, -3.6],
      angle: -2.6,
      links: 2,
      length: 3.6,
      r: [1.3, 1.5],
      end: 1.7,
      color: 'PIG_DARK',
      front: true,
      overEye: true,
      stiffness: 240,
      damping: 8,
      weight: 140,
    },
  },
  face: { eye: [2.8, -0.4] },
};
// @end

// the pig with its moves, from its build
export const make = (rig) => {
  // lying low: flat, the ear flopped forward
  const low = { joints: { hip: [8, 15.8], chest: [15, 15.8], head: [19.6, 15] }, torso: { r: 3.4, ends: 4.2 },
    chains: { tail: { at: [-4.4, -1], angle: 1.2 }, ear: { angle: -2.6 } } };

  return { ...rig, poses: quadruped(rig, low, { idle: standIdle(rig, { swish: 0.3 }) }) };
};

export default make(build);
