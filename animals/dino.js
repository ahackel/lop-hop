// The dino as a rig (see the cat, and kit.js): a little T. rex, after the runner of Google's game. A big skull with a long
// rounded snout, the eye at its back, a nostril at its front, the lower jaw hanging open below it (teeth in the gap); a
// thick neck, a body leaning forward with a lighter belly, a tiny arm, a strong thigh, legs with big feet, a long
// tapering tail. Made of shapes, it stays smooth as it grows giant (drawn bigger, not its pixels: see drawRig).
import { quadruped, crawl } from './kit.js';

// @build: the rig, edited in the editor (editor/), which rewrites what is between these lines
export const build = {
  fur: 'DINO',
  joints: { hip: [10, 12], chest: [14, 12], head: [17.5, 3.5] },
  torso: { r: 0 },
  shapes: [
    { name: 'body', on: 'spine', capsule: [-0.5, 0.8, 3.5, -2.8, 3.6] },
    { name: 'belly', on: 'spine', ellipse: [2.2, 1.6, 3.3, 2.9] },
    { name: 'neck', on: 'chest', capsule: [0, -3, 2.3, -7.2, 2.3] },
    { name: 'thigh', on: 'hip', ellipse: [0.4, 2, 2.3, 2.7] },
    { name: 'arm', on: 'chest', capsule: [1.9, -1.4, 3.7, -0.4, 0.6], smooth: 0.2 },
    { name: 'skull', on: 'head', box: [-3.5, -2.5, 5.5, 1.3, 1.5] },
    { name: 'jaw', on: 'head', capsule: [-2.2, 1, 3.4, 3.8, 0.95], smooth: 0.4 },
  ],
  paint: [{ name: 'belly', color: 'DINO_LIGHT', on: 'spine', ellipse: [3, 2, 2.2, 3] }],
  dots: [
    { name: 'nostril', on: 'head', at: [4.6, -1.4] },
    { name: 'tooth', on: 'head', at: [1.5, 1.9], color: 'BELLY' },
    { name: 'tooth', on: 'head', at: [3.8, 2], color: 'BELLY' },
    { name: 'claw', on: 'chest', at: [4.1, -0.2], color: 'BELLY' },
  ],
  legs: {
    hindFar: { on: 'hip', at: [2.5, 2.5], thigh: 2.2, shin: 2.2, r: 1.1, foot: [1.6, 0.8], far: true, bend: -1 },
    hindNear: { on: 'hip', at: [0.5, 2.5], thigh: 2.2, shin: 2.2, r: 1.25, foot: [1.6, 0.8], bend: -1 },
  },
  chains: {
    tail: { on: 'hip', at: [-2.5, -0.5], angle: 1.2, links: 4, length: 9, r: [2.4, 0.5], curl: -0.08, stiffness: 1200, damping: 30, weight: 40 },
  },
  face: { eye: [-0.5, -0.8] },
};
// @end

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
