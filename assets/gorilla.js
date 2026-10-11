// gorilla: an asset (see asset.js), written by the editor; data only
export default {
  format: 2,
  name: 'gorilla',
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
