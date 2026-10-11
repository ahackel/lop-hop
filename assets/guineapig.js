// guineapig: an asset (see asset.js), written by the editor; data only
export default {
  format: 2,
  name: 'guineapig',
  fur: 'FUR',
  joints: { hip: [8, 11.3], chest: [14, 11.3], head: [18.4, 10.4] },
  torso: { r: 6.5, ends: 4.4 },
  shapes: [{ name: 'head', on: 'head', ellipse: [0, 0, 4.6, 4.4] }, { name: 'muzzle', on: 'head', ellipse: [3.2, 1.4, 2.4, 2.2] }],
  paint: [
    { name: 'rump', color: 'GINGER', on: 'spine', ellipse: [-3.5, 0, 4.5, 6] },
    { name: 'saddle', color: 'SKUNK', on: 'spine', ellipse: [4.2, -4.4, 3, 3] },
    { name: 'head', color: 'GINGER', on: 'head', ellipse: [-0.6, -0.8, 4, 3.8] },
    { name: 'blaze', color: 'FUR', on: 'head', capsule: [3.4, -4.4, 4.2, 1.5, 0.9] },
  ],
  top: [{ name: 'ear', color: 'PINK', shapes: [{ on: 'head', ellipse: [-1.8, -3.9, 1.5, 1.2] }] }],
  legs: {
    hindFar: { on: 'hip', at: [1, 5.4], thigh: 1, shin: 1, r: 0.8, far: true, bend: 1 },
    frontFar: { on: 'chest', at: [1.5, 5.4], thigh: 1, shin: 1, r: 0.8, far: true, bend: -1 },
    hindNear: { on: 'hip', at: [0, 5.4], thigh: 1, shin: 1, r: 0.9, bend: 1 },
    frontNear: { on: 'chest', at: [1, 5.4], thigh: 1, shin: 1, r: 0.9, bend: -1 },
  },
  chains: {},
  face: { eye: [1, -1.2], nose: [5.4, 1], noseColor: 'PINK' },
};
