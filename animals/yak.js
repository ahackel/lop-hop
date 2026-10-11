// The yak bull as a rig (see the cat, and kit.js): heavy and dark, a hump at its shoulders, a long shaggy coat hanging
// down like a skirt (a fringe of tufts), a white blaze down its face, wide curved horns (on top), a bushy tail.
import { quadruped, standIdle, jump } from './kit.js';
import { toBuild } from '../asset.js';
import asset from '../assets/yak.js';

// its build: its file (assets/yak.js, see asset.js), which the editor saves into
export const build = toBuild(asset);

// the yak with its moves, from its build
export const make = (rig) => {
  // lying low: flat, its coat spread on the ground, the head down and forward
  const low = { joints: { hip: [7.5, 15.4], chest: [15, 15.4], head: [20, 14.6] }, torso: { r: 3.2, ends: 4.4 }, ownShapes: true,
    shapes: [{ on: 'spine', box: [-4, -1, 11.4, 3, 1.2] }, ...rig.shapes.filter((x) => x.on === 'head')], chains: { tail: { at: [-4.4, -1], angle: 1.7 } } };

  // jumping: its coat swung up a little, the legs tucked under it
  const tucked = rig.shapes.map((x) => (x.name === 'skirt' ? { ...x, box: [-3.6, 0, 10.6, 3.4, 1.4] } : x.name === 'tuft' ? { ...x, triangle: x.triangle.map(([a, b]) => [a, b - 1.4]) } : x));
  const jumps = jump(rig).map((p) => ({ ...p, ownShapes: true, shapes: tucked, paws: Object.fromEntries(Object.entries(p.paws).map(([k, [x, y]]) => [k, [x, y - 1.6]])) }));
  return { ...rig, poses: quadruped(rig, low, { idle: standIdle(rig, { tail: 2.6, swish: 0.15 }), jump: jumps }) };
};

export default make(build);
