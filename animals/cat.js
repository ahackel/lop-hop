// The cat as a rig (see kit.js for what a rig holds): a ginger kitten, pointed ears, the tail up.
import { jump, crawl, standing, bump, wave } from './kit.js';
import { toBuild } from '../asset.js';
import asset from '../assets/cat.js';

// its build: its file (assets/cat.js, see asset.js), which the editor saves into
export const build = toBuild(asset);

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
