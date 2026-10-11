// yak: an asset (see asset.js), written by the editor; data only
export default {
  format: 2,
  name: 'yak',
  fur: 'YAK',
  joints: { hip: [7.5, 10.6], chest: [14.5, 10.6], head: [19.4, 11] },
  torso: { r: 4.6, ends: 3.8 },
  shapes: [
    { name: 'hump', on: 'spine', ellipse: [6, -3.4, 4, 3] },
    { name: 'skirt', on: 'spine', box: [-3.6, 0, 10.6, 4.6, 1.4] },
    { name: 'tuft', on: 'spine', triangle: [[-3.6, 3.8], [-1.4, 3.8], [-2.8, 6.4]] },
    { name: 'tuft', on: 'spine', triangle: [[0.8, 3.8], [3.2, 3.8], [1.8, 6.6]] },
    { name: 'tuft', on: 'spine', triangle: [[5.2, 3.8], [7.6, 3.8], [6.2, 6.6]] },
    { name: 'tuft', on: 'spine', triangle: [[8.4, 3.8], [10.6, 3.8], [9.8, 6.4]] },
    { name: 'head', on: 'head', ellipse: [0.4, 0.2, 3.7, 3.6] },
    { name: 'muzzle', on: 'head', ellipse: [2.8, 1.8, 1.9, 1.7] },
  ],
  paint: [
    { name: 'blaze', color: 'BELLY', on: 'head', capsule: [0.6, -2.4, 2.8, 2.2, 1.6] },
    { name: 'strands', color: 'BOAR', on: 'spine', capsule: [-1.6, 1.6, -2, 5.6, 0.4] },
    { name: 'strands', color: 'BOAR', on: 'spine', capsule: [2, 1.8, 1.8, 5.8, 0.4] },
    { name: 'strands', color: 'BOAR', on: 'spine', capsule: [6.4, 1.8, 6.2, 5.8, 0.4] },
    { name: 'strands', color: 'BOAR', on: 'spine', capsule: [9.6, 1.6, 9.8, 5.6, 0.4] },
  ],
  dots: [{ name: 'nostril', on: 'head', at: [4.2, 1.8] }],
  top: [
    {
      name: 'horns',
      color: 'HORN',
      shapes: [
        { on: 'head', capsule: [-0.4, -2.8, 2.8, -4, 0.85] },
        { on: 'head', capsule: [2.8, -4, 4, -5.6, 0.7] },
        { on: 'head', capsule: [4, -5.6, 5.4, -5.8, 0.5] },
      ],
    },
  ],
  legs: {
    hindFar: { on: 'hip', at: [1, 3.4], thigh: 1.9, shin: 1.9, r: 1.2, far: true, bend: 1 },
    frontFar: { on: 'chest', at: [1, 3.4], thigh: 1.9, shin: 1.9, r: 1.2, far: true, bend: -1 },
    hindNear: { on: 'hip', at: [0, 3.4], thigh: 1.9, shin: 1.9, r: 1.35, bend: 1 },
    frontNear: { on: 'chest', at: [0, 3.4], thigh: 1.9, shin: 1.9, r: 1.35, bend: -1 },
  },
  chains: { tail: { on: 'hip', at: [-4.2, -1.6], angle: 2.4, links: 2, length: 4.4, r: 0.5, end: 1.2, stiffness: 500, damping: 14, weight: 60 } },
  face: { eye: [1.2, -0.4] },
};
