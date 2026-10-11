// The bear as a rig (see the cat, and kit.js): big and brown, a hump at its shoulders, round ears, a light snout, a
// stubby tail.
import { quadruped } from './kit.js';

// @build: the rig, edited in the editor (editor/), which rewrites what is between these lines
export const build = {
  fur: 'BARK',
  joints: { hip: [7.5, 11.5], chest: [14.5, 11.5], head: [19, 9.3] },
  torso: { r: 5, ends: 4 },
  shapes: [
    { name: 'hump', on: 'spine', ellipse: [5, -3.3, 4.5, 3.5] },
    { name: 'head', on: 'head', ellipse: [0, 0, 3.7, 3.5] },
    { name: 'snout', on: 'head', ellipse: [3.4, 1.3, 1.9, 1.5] },
    { name: 'ear', on: 'head', ellipse: [-2.2, -3.5, 1.4, 1.4] },
    { name: 'ear', on: 'head', ellipse: [0.8, -3.7, 1.3, 1.3] },
  ],
  paint: [{ name: 'snout', color: 'WOOD', on: 'head', ellipse: [3.4, 1.3, 1.9, 1.5] }],
  legs: {
    hindFar: { on: 'hip', at: [1, 3], thigh: 2, shin: 2, r: 1.35, far: true, bend: 1 },
    frontFar: { on: 'chest', at: [1, 3], thigh: 2, shin: 2, r: 1.35, far: true, bend: -1 },
    hindNear: { on: 'hip', at: [0, 3], thigh: 2, shin: 2, r: 1.5, bend: 1 },
    frontNear: { on: 'chest', at: [0.5, 3], thigh: 2, shin: 2, r: 1.5, bend: -1 },
  },
  chains: { tail: { on: 'hip', at: [-4, -1.9], angle: 1, links: 1, length: 0.6, r: 1.2, stiffness: 600, damping: 14, weight: 60 } },
  face: { eye: [1, -0.9], nose: [5.2, 0.9] },
};
// @end

// the bear with its moves, from its build
export const make = (rig) => {
  const low = { joints: { hip: [7.5, 15.8], chest: [15.5, 15.8], head: [19.8, 15.4] }, torso: { r: 3.3, ends: 4.5 },
    shapes: [{ on: 'spine', ellipse: [5, -1.3, 4, 2] }], ownShapes: true };
  low.shapes.push(...rig.shapes.slice(1));

  return { ...rig, poses: quadruped(rig, low) };
};

export default make(build);
