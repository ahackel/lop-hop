// skunk: an asset (see asset.js), written by the editor; data only
export default {
  format: 2,
  name: 'skunk',
  fur: 'SKUNK',
  joints: { hip: [8, 11.2], chest: [13, 11.2], head: [18.8, 12.6] },
  torso: { r: 7.2, ends: 4 },
  shapes: [],
  paint: [{ name: 'stripe', color: 'BELLY', on: 'spine', capsule: [8, -4.7, -1.5, -5.6, 0.9] }],
  top: [
    {
      name: 'head',
      color: 'SKUNK',
      shapes: [{ on: 'head', ellipse: [0, 0, 3.3, 3] }, { on: 'head', ellipse: [3, 1.2, 1.8, 1.2] }, { on: 'head', ellipse: [-1.6, -2.8, 1, 1] }],
      paint: [{ color: 'BELLY', on: 'head', capsule: [1.8, -1.4, -1.2, -2.8, 0.7] }],
    },
  ],
  legs: {
    hindFar: { on: 'hip', at: [1, 4.3], thigh: 1.6, shin: 1.6, r: 0.8, far: true, bend: 1 },
    frontFar: { on: 'chest', at: [2, 4.3], thigh: 1.6, shin: 1.6, r: 0.8, far: true, bend: -1 },
    hindNear: { on: 'hip', at: [0, 4.3], thigh: 1.6, shin: 1.6, r: 0.9, bend: 1 },
    frontNear: { on: 'chest', at: [1.5, 4.3], thigh: 1.6, shin: 1.6, r: 0.9, bend: -1 },
  },
  chains: {
    tail: {
      on: 'hip',
      at: [-2, -1.2],
      angle: 0.48,
      links: 3,
      length: 7.6,
      r: [2.3, 2.5],
      curl: 0.5,
      marks: [[0.95, 'BELLY', 1.5]],
      stiffness: 600,
      damping: 22,
      weight: 50,
    },
  },
  face: { eye: [0.7, -0.6], nose: [4.6, 1] },
};
