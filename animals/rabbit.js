// The rabbit as a rig (see the cat, and kit.js): round and compact, one lop ear in front, a cotton tail, a pink nose and
// blush; long hind feet, short front legs. It hops (a leap: see leapPose in art.js): crouched on the ground, gathered,
// pushing off with its hind feet, stretched out as it rises, reaching for the ground as it falls.
import { crawl, jump, ko, bump, wave } from './kit.js';
import { toBuild } from '../asset.js';
import asset from '../assets/rabbit.js';

// its build: from its asset (assets/rabbit.js, see asset.js), which the workshop saves into
export const build = toBuild(asset);
export { asset };

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
