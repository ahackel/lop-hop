// The gorilla as a rig (see the cat, and kit.js): big and black, walking on its knuckles (long, thick arms; short legs),
// its shoulders high, a silver back, a crest on its head, a heavy brow over a grey face. (Its power: drumming on its
// chest, standing up: see drum.) Its arms swing up and forward as it jumps.
import { quadruped, standIdle, jump } from './kit.js';

// @build: the rig, edited in the editor (editor/), which rewrites what is between these lines
export const build = {
  fur: 'GORILLA',
  joints: { hip: [7.5, 11.2], chest: [13.5, 9], head: [18.6, 8.4] },
  torso: { r: 4.2, ends: 2.6 },
  shapes: [
    { name: 'shoulders', on: 'chest', ellipse: [0.4, -0.4, 4.4, 4.6] },
    { name: 'head', on: 'head', ellipse: [0.8, 0.2, 4.1, 4.1] },
    { name: 'crest', on: 'head', ellipse: [-0.6, -2.8, 2.6, 2] },
    { name: 'jaw', on: 'head', ellipse: [2.6, 2.2, 2.4, 2] },
  ],
  paint: [
    { name: 'silver', color: 'SILVER', on: 'spine', ellipse: [1.2, -2.4, 4.4, 2.2] },
    { name: 'face', color: 'GORILLA_FACE', on: 'head', ellipse: [2.8, 1.2, 2.4, 2.8] },
  ],
  dots: [{ name: 'nostril', on: 'head', at: [4.2, 1.4] }],
  top: [{ name: 'brow', color: 'GORILLA', shapes: [{ on: 'head', capsule: [0.8, -1.6, 4.2, -1.3, 0.75] }] }],
  legs: {
    hindFar: { on: 'hip', at: [1, 3.2], thigh: 2, shin: 2.2, r: 1.1, far: true, bend: 1 },
    frontFar: { on: 'chest', at: [1.2, 3.4], thigh: 3.2, shin: 3.2, r: 1.2, foot: [1.2, 0.8], far: true, bend: 1 },
    hindNear: { on: 'hip', at: [0, 3.2], thigh: 2, shin: 2.2, r: 1.25, bend: 1 },
    frontNear: { on: 'chest', at: [0.2, 3.4], thigh: 3.2, shin: 3.2, r: 1.35, foot: [1.3, 0.8], bend: 1 },
  },
  chains: {},
  face: { eye: [2.6, -0.4] },
};
// @end

// the gorilla with its moves, from its build
export const make = (rig) => {
  // lying low: flat on its belly, the head down on its arms
  const low = { joints: { hip: [7.5, 15.4], chest: [14, 15], head: [19.4, 14.4] }, torso: { r: 3.4, ends: 3.4 }, ownShapes: true,
    shapes: [{ on: 'chest', ellipse: [0, -0.4, 3.6, 2.8] }, ...rig.shapes.slice(1)],
    paint: [{ color: 'SILVER', on: 'spine', ellipse: [1.6, -1.8, 4, 1.4] }, rig.paint[1]], top: [] };

  // jumping: its arms (from its shoulders) swinging over its head, back and forth
  const arms = (p, [near, far]) => ({ ...p, roots: { frontNear: [14, 6.4], frontFar: [15, 6.2] }, paws: { ...p.paws, frontNear: near, frontFar: far } });
  const back = [[12, 0.4], [13.6, 0]], ahead = [[18.8, -0.2], [20.4, 0.6]], [rise, fall] = jump(rig);
  const poses = quadruped(rig, low, { idle: standIdle(rig, { breath: 0.35 }), jump: [arms(rise, back), arms(rise, ahead), arms(fall, back), arms(fall, ahead)] });
  // drumming (its power): standing up, beating its chest with one fist and the other
  const up = { joints: { hip: [9, 13.6], chest: [11.6, 7.2], head: [13.8, 3.4] }, headAngle: 0 };
  // (the arms: drawn over the chest, outlined; its fists one up, one down)
  const arm = (shoulder, fist, r) => [{ capsule: [...shoulder, shoulder[0] + 2.4, shoulder[1] + 3.4, r] }, { capsule: [shoulder[0] + 2.4, shoulder[1] + 3.4, ...fist, r] }, { ellipse: [...fist, r + 0.3, r + 0.3] }];
  const fists = (a) => ({ ...up, paws: { hindNear: [8.6, 18.4], hindFar: [11, 18.4], frontNear: [12, 12], frontFar: [12, 12] },
    top: [{ color: 'GORILLA', shapes: [...arm([11.4, 7.6], [13.8 + 0.6 * a, 9 - 1.4 * a], 1.1), ...arm([12.6, 8.6], [14.8 - 0.6 * a, 10.4 - 1.4 * (1 - a)], 1.2)] }] });
  poses.drum = [fists(0), fists(1)];
  return { ...rig, poses };
};

export default make(build);
