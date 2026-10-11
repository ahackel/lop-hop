// hedgehog: an asset (see asset.js), written by the editor; data only
export default {
  format: 2,
  name: 'hedgehog',
  fur: 'BROWN',
  joints: { hip: [8, 11.3], chest: [14, 11.3], head: [18.5, 13] },
  torso: { r: 7.2, ends: 5.5 },
  shapes: [
    { name: 'belly', on: 'spine', ellipse: [4, 4.2, 6, 2.5] },
    { name: 'face', on: 'head', ellipse: [0, 0, 3.4, 3] },
    { name: 'snout', on: 'head', capsule: [1.5, 1.4, 5.1, 1.8, 1.1] },
  ],
  paint: [
    { name: 'face', color: 'EAR', on: 'head', ellipse: [0, 0, 3.4, 3] },
    { name: 'snout', color: 'EAR', on: 'head', capsule: [1.5, 1.4, 5.1, 1.8, 1.1] },
    { name: 'belly', color: 'EAR', on: 'spine', ellipse: [4.5, 5.1, 5, 1.3] },
  ],
  spikes: { on: 'spine', box: [-12, -12, 9, 3.7], speck: 'TAN' },
  top: [{ name: 'ear', color: 'EAR', shapes: [{ on: 'head', ellipse: [-0.9, -3.4, 1.1, 1.1] }] }],
  legs: {
    hindFar: { on: 'hip', at: [1, 5.2], thigh: 1.2, shin: 1.2, r: 0.8, far: true, bend: 1 },
    frontFar: { on: 'chest', at: [1.5, 5.2], thigh: 1.2, shin: 1.2, r: 0.8, far: true, bend: -1 },
    hindNear: { on: 'hip', at: [0, 5.2], thigh: 1.2, shin: 1.2, r: 0.9, bend: 1 },
    frontNear: { on: 'chest', at: [1, 5.2], thigh: 1.2, shin: 1.2, r: 0.9, bend: -1 },
  },
  chains: {},
  face: { eye: [1, -0.6], nose: [5.5, 1.4] },
};
