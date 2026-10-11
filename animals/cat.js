// The cat as a rig (see kit.js for what a rig holds): a ginger kitten, pointed ears, the tail up.
import { jump, crawl, standing, bump, wave } from './kit.js';

// @build: the rig, edited in the editor (editor/), which rewrites what is between these lines
export const build = {
  fur: 'GINGER',
  joints: { hip: [7, 12], chest: [14, 12], head: [19.5, 8.5] },
  torso: { r: 3.8, ends: 3.5 },
  shapes: [{ name: 'head', on: 'head', ellipse: [0, 0, 4, 3.7] }, { name: 'muzzle', on: 'head', ellipse: [2.8, 1.5, 2, 1.6] }],
  paint: [
    { name: 'stripe', color: 'STRIPE', on: 'spine', capsule: [-0.5, -4, -1, -1.7, 0.6] },
    { name: 'stripe', color: 'STRIPE', on: 'spine', capsule: [2.5, -4, 2, -1.7, 0.6] },
    { name: 'stripe', color: 'STRIPE', on: 'spine', capsule: [5.5, -4, 5, -1.7, 0.6] },
    { name: 'muzzle', color: 'BELLY', on: 'head', ellipse: [2.8, 1.5, 2, 1.6] },
    { name: 'chest', color: 'BELLY', on: 'chest', ellipse: [2, 1, 2.5, 2.2] },
  ],
  legs: {
    hindFar: { on: 'hip', at: [0.5, 1.5], thigh: 2.75, shin: 2.75, r: 0.9, far: true, bend: 1 },
    frontFar: { on: 'chest', at: [1.5, 1.5], thigh: 2.75, shin: 2.75, r: 0.9, far: true, bend: -1 },
    hindNear: { on: 'hip', at: [-0.5, 1.5], thigh: 2.75, shin: 2.75, r: 1, bend: 1 },
    frontNear: { on: 'chest', at: [1, 1.5], thigh: 2.75, shin: 2.75, r: 1, bend: -1 },
  },
  chains: {
    tail: { on: 'hip', at: [-3, -1.5], angle: 0.6, links: 4, length: 8, r: 1.1, curl: 0.3, stiffness: 900, damping: 30, weight: 60 },
    earA: { on: 'head', ear: [[-3.1, -2.3], [0, -3.5]], tip: [-2.5, -6.9], stiffness: 1400, damping: 22, weight: 60 },
    earB: { on: 'head', ear: [[0.5, -3.7], [3.5, -1.9]], tip: [2.5, -7.1], stiffness: 1400, damping: 22, weight: 60 },
  },
  face: { eye: [1, -1], nose: [3.5, 1], noseColor: 'PINK' },
  moves: {
    jump: [
      {
        joints: { hip: [7, 12.45], chest: [14, 11.1], head: [19.5, 7.9] },
        paws: { hindNear: [3.3, 16.9], hindFar: [4.3, 16.9], frontNear: [17.6, 16.6], frontFar: [18.5, 16.6] },
      },
      {
        joints: { hip: [7, 11.55], chest: [14, 12.9], head: [19.5, 9.1] },
        paws: { hindNear: [3.9, 17.3], hindFar: [4.9, 17.3], frontNear: [17, 17.9], frontFar: [17.8, 17.9] },
      },
    ],
  },
};
// @end

// lying low (ducking, and knocked out on its back): the body long and flat, the ears laid back
const low = { joints: { hip: [7, 16.3], chest: [14, 16.3], head: [19.5, 15.3] }, torso: { r: 2.9, ends: 4.5 },
  chains: { tail: { at: [-3.5, -0.3], angle: 1.55 }, earA: { tip: [-4.2, -5] }, earB: { tip: [1.5, -5.2] } } };

// sitting, t (0…1) through an 8 s loop: a round body on its haunch, the front legs straight, the tail along the ground.
// It breathes (4 times), swishes its tail (its tip flicking), flicks an ear now and then, and once glances up.
const sit = (t) => {
  const b = 0.25 * wave(t, 4), look = bump(t, 0.42, 0.66, 0.05), flick = bump(t, 0.15, 0.19, 0.015) + bump(t, 0.79, 0.82, 0.015);
  return {
    joints: { hip: [9.5, 14], chest: [13, 13 - b * 0.5], head: [14.5 - look * 0.4, 7.5 - b * 0.6 - look * 0.4] }, torso: { r: 0 }, headAngle: -0.35 * look,
    shapes: [{ ellipse: [9.5, 14 - b, 5.5, 5 + b] }, { ellipse: [13, 13 - b * 0.5, 3 + b * 0.3, 4.5 + b * 0.5] }, { ellipse: [10, 18.6, 3.5, 1.2] }],
    roots: { hindNear: [8, 16], hindFar: [10, 16], frontNear: [13, 15], frontFar: [15, 15] },
    paws: { hindNear: [8, 18.4], hindFar: [10, 18.4], frontNear: [13, 18.4], frontFar: [15.2, 18.4] },
    paint: [
      { color: 'STRIPE', capsule: [5.5, 10 - b, 5, 12.5 - b, 0.6] }, { color: 'STRIPE', capsule: [8.5, 10 - b, 8, 12.5 - b, 0.6] },
      { color: 'BELLY', ellipse: [14, 12 - b * 0.5, 2, 2.5] }, { color: 'BELLY', on: 'head', ellipse: [2.8, 1.5, 2, 1.6] },
    ],
    chains: {
      tail: { root: [4.5, 17], angle: 1.3 + 0.15 * wave(t, 2), curl: 0.3 + 0.3 * wave(t, 2, -0.2) },
      earA: { tip: flick ? [-2.5 - 2.5 * flick, -6.9 + 1.8 * flick] : [-2.5, -6.9] },
    },
  };
};

// the cat with its moves, from its build
export const make = (rig) => ({ ...rig, poses: {
  // the run: a rotary gallop worked out from where the cat is in its stride, in `frames` poses. Each paw pushes back
  // along the ground (reach) for `stance` of the stride, then swings forward in an arc (lift); legs: each one's place
  // in the stride and where its paw's sweep is centred (from its root). The body bobs, the hip and the chest out of step.
  run: { gait: { frames: 8, stance: 0.4, reach: 6, lift: 2.6, bob: 0.6, ground: 18.4,
    legs: { hindNear: [0, -0.5], hindFar: [0.1, -0.5], frontNear: [0.5, 0.8], frontFar: [0.6, 0.8] } } },
  duck: crawl(rig, low), // a slinking crawl (see kit.js)
  jump: jump(rig), // rising, falling (the build's own: see moves)
  hurt: [standing(rig)], // all four paws down
  ko: [{ ...low, flip: true, paws: { hindNear: [6, 11], hindFar: [10, 11], frontNear: [14, 11], frontFar: [17, 11] } }], // on its back, legs up
  idle: { frames: 80, fps: 10, at: sit }, // sitting: an 8 s loop
} });

export default make(build);
