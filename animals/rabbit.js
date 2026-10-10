// The rabbit as a rig (see the cat, and kit.js): round and compact, one lop ear in front, a cotton tail, a pink nose and
// blush; long hind feet, short front legs. It hops (a leap: see leapPose in art.js): crouched on the ground, gathered,
// pushing off with its hind feet, stretched out as it rises, reaching for the ground as it falls.
import { crawl, jump, ko, bump, wave } from './kit.js';

// @build: the rig, edited in the workshop (tools/workshop.html), which rewrites what is between these lines
export const build = {
  fur: 'FUR',
  joints: { hip: [7, 13.5], chest: [12, 13.5], head: [15.5, 9] },
  torso: { r: 5, ends: 4.5 },
  shapes: [
    { name: 'haunch', on: 'hip', ellipse: [0.5, 1.5, 5, 4] },
    { name: 'head', on: 'head', ellipse: [0, 0, 4.5, 4.5] },
    { name: 'muzzle', on: 'head', ellipse: [3.5, 1.8, 2.5, 2.2] },
  ],
  dots: [{ name: 'blush', on: 'head', at: [2.5, 2], color: 'PINK' }],
  legs: {
    hindNear: { on: 'hip', at: [0, 2], thigh: 3.2, shin: 4.6, r: 1.3, bend: 1 },
    frontNear: { on: 'chest', at: [2.5, 0.5], thigh: 2.8, shin: 2.8, r: 1.2, bend: -1 },
  },
  chains: {
    tail: { on: 'hip', at: [-4.7, -1], angle: 1.2, links: 1, length: 0.5, r: 1.9, stiffness: 900, damping: 16, weight: 80 },
    ear: {
      on: 'head',
      at: [-2, -3],
      angle: 2.7,
      links: 2,
      length: 5.6,
      r: 1.4,
      end: 2.1,
      color: 'EAR',
      front: true,
      stiffness: 240,
      damping: 8,
      weight: 140,
    },
  },
  face: { eye: [1.5, -1], nose: [4.5, 1], noseColor: 'PINK' },
  front: {
    joints: { hip: [13, 15], chest: [13, 12], head: [13, 9] },
    shapes: [
      { name: 'body', ellipse: [13.5, 15.6, 5.2, 4] },
      { name: 'head', on: 'head', ellipse: [0.5, 0, 5.4, 4.4] },
      { name: 'footL', ellipse: [9.8, 18.4, 2.3, 1.1] },
      { name: 'footR', ellipse: [17.2, 18.4, 2.3, 1.1] },
    ],
    top: [{ shapes: [{ ellipse: [11, 18.5, 1.1, 0.9] }, { ellipse: [16, 18.5, 1.1, 0.9] }] }],
    chains: {
      earL: { on: 'head', at: [-3, -3.4], angle: 2.3, links: 2, length: 7, r: 1.4, end: 2, curl: -0.6, color: 'EAR', front: true },
      earR: { on: 'head', at: [4, -3.4], angle: -2.3, links: 2, length: 7, r: 1.4, end: 2, curl: 0.6, color: 'EAR', front: true },
    },
    face: { eyes: [[-2, -0.5], [2, -0.5]], nose: [0, 1.5], noseColor: 'PINK' },
  },
  moves: {
    jump: [
      { joints: { hip: [7, 14.5], chest: [12, 12.3], head: [15.5, 7.8] }, paws: { hindNear: [0, 17.6], frontNear: [19, 15] } },
      { joints: { hip: [7.5, 12.8], chest: [12, 14], head: [16, 9.5] }, paws: { hindNear: [11.5, 17.6], frontNear: [16.5, 17.8] } },
    ],
  },
};
// @end

// the rabbit with its moves, from its build
export const make = (rig) => {
  // crouched on the ground: the foot flat, the front paws down
  const crouched = { paws: { hindNear: [11, 18.4], frontNear: [15, 18.4] } };
  // lying low: long and flat
  const low = { joints: { hip: [7.5, 16], chest: [12.5, 16], head: [17.5, 15.5] }, torso: { r: 3.3, ends: 6 },
    chains: { tail: { at: [-5.5, -0.5], angle: 1.5 } } };

  // the hop: long and slow (rate: 0.6 of the usual strides), on the ground for the first quarter of it, then 6 high
  const run = { gait: { leap: true, rate: 0.6, frames: 12, land: 0.25, height: 6, stretch: 1.5, gather: 1, crouch: 0.6, pitch: 1.2, ground: 18.4, legs: {
    hindNear: { down: [0, 0.25], at: [4, 2], air: [-14, -1.5] }, frontNear: { down: [0.92, 0.25], at: [0.5, -0.5], air: [4.5, -3] },
  } } };

  // sitting about, t (0…1) through an 8 s loop: crouched, breathing, its nose twitching now and then; once it sits up tall
  // to look about
  const idle = (t) => {
    const b = 0.3 * wave(t, 4), tall = bump(t, 0.45, 0.7, 0.06), twitch = (bump(t, 0.1, 0.2, 0.01) + bump(t, 0.8, 0.88, 0.01)) * (wave(t, 60) > 0 ? 0.5 : 0);
    return { ...crouched, ownShapes: true, shapes: rig.shapes.map((x) => (x.name === 'muzzle' ? { ...x, ellipse: [x.ellipse[0], x.ellipse[1] - twitch, x.ellipse[2], x.ellipse[3]] } : x)),
      joints: { hip: [7, 13.5], chest: [12, 13.5 - 2 * tall - b * 0.3], head: [15.5 - 0.5 * tall, 9 - 2.5 * tall - b * 0.5] }, torso: { r: 5 + b }, headAngle: -0.15 * tall };
  };

  return { ...rig, poses: {
  run,
  jump: jump(rig), // (the build's own: see moves)
  duck: crawl(rig, low, { bob: 0.2, legs: { hindNear: [0, 1], frontNear: [0.5, 2.5] } }), // (its round back barely rolling)
  hurt: [crouched],
  ko: [{ ...ko(rig, low), dots: [] }],
  idle: { frames: 80, fps: 10, at: idle },
} };
};

export default make(build);
