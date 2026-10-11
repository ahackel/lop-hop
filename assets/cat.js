// cat: an asset (see asset.js), written by the editor; data only
export default {
  format: 2,
  name: 'cat',
  fur: 'GINGER',
  joints: { hip: [7, 12], chest: [14, 12], head: [19.5, 8.5] },
  torso: { r: 3.8, ends: 3.5 },
  shapes: [{ name: 'head', on: 'head', ellipse: [0, 0, 4, 3.7] }, { name: 'muzzle', on: 'head', ellipse: [2.8, 1.5, 2, 1.6] }],
  paint: [
    { name: 'stripe', color: 'STRIPE', on: 'spine', capsule: [-0.5, -4, -1, -1.7, 0.6] },
    { name: 'stripe', color: 'STRIPE', on: 'spine', capsule: [2.5, -4, 2, -1.7, 0.6] },
    { name: 'stripe', color: 'STRIPE', on: 'spine', capsule: [5.5, -4, 5, -1.7, 0.6] },
    { name: 'muzzle', color: 'BELLY', on: 'head', ellipse: [2.8, 1.5, 2, 1.6] },
    { name: 'chest', color: 'BELLY', on: 'chest', ellipse: [2, 1, 2.5, 2.2] },
  ],
  legs: {
    hindFar: { on: 'hip', at: [0.5, 1.5], thigh: 2.75, shin: 2.75, r: 0.9, far: true, bend: 1 },
    frontFar: { on: 'chest', at: [1.5, 1.5], thigh: 2.75, shin: 2.75, r: 0.9, far: true, bend: -1 },
    hindNear: { on: 'hip', at: [-0.5, 1.5], thigh: 2.75, shin: 2.75, r: 1, bend: 1 },
    frontNear: { on: 'chest', at: [1, 1.5], thigh: 2.75, shin: 2.75, r: 1, bend: -1 },
  },
  chains: {
    tail: { on: 'hip', at: [-3, -1.5], angle: 0.6, links: 4, length: 8, r: 1.1, curl: 0.3, stiffness: 900, damping: 30, weight: 60 },
    earA: { on: 'head', ear: [[-3.1, -2.3], [0, -3.5]], tip: [-2.5, -6.9], stiffness: 1400, damping: 22, weight: 60 },
    earB: { on: 'head', ear: [[0.5, -3.7], [3.5, -1.9]], tip: [2.5, -7.1], stiffness: 1400, damping: 22, weight: 60 },
  },
  face: { eye: [1, -1], nose: [3.5, 1], noseColor: 'PINK' },
  moves: {
    jump: [
      {
        joints: { hip: [7, 12.45], chest: [14, 11.1], head: [19.5, 7.9] },
        paws: { hindNear: [3.3, 16.9], hindFar: [4.3, 16.9], frontNear: [17.6, 16.6], frontFar: [18.5, 16.6] },
      },
      {
        joints: { hip: [7, 11.55], chest: [14, 12.9], head: [19.5, 9.1] },
        paws: { hindNear: [3.9, 17.3], hindFar: [4.9, 17.3], frontNear: [17, 17.9], frontFar: [17.8, 17.9] },
      },
    ],
  },
};
