// fox: an asset (see asset.js), written by the editor; data only
export default {
  format: 2,
  name: 'fox',
  fur: 'FOX',
  joints: { hip: [9, 11.8], chest: [15, 11.8], head: [19.8, 8.6] },
  torso: { r: 3.5, ends: 3.5 },
  shapes: [
    { name: 'chest', on: 'chest', ellipse: [1.5, 0.2, 2.6, 3] },
    { name: 'head', on: 'head', ellipse: [0, 0, 3.5, 3.2] },
    { name: 'snout', on: 'head', capsule: [1.2, 1.4, 4.8, 2, 1.3] },
  ],
  paint: [
    { name: 'belly', color: 'BELLY', on: 'spine', ellipse: [4, 2.8, 5, 1.1] },
    { name: 'chest', color: 'BELLY', on: 'chest', ellipse: [2.6, 1.2, 1.8, 2] },
    { name: 'jaw', color: 'BELLY', on: 'head', ellipse: [2.8, 2.5, 2.2, 0.9] },
  ],
  socks: 'BROWN',
  legs: {
    hindFar: { on: 'hip', at: [0.5, 1.7], thigh: 2.75, shin: 2.75, r: 0.8, far: true, bend: 1 },
    frontFar: { on: 'chest', at: [1.5, 1.7], thigh: 2.75, shin: 2.75, r: 0.8, far: true, bend: -1 },
    hindNear: { on: 'hip', at: [-0.5, 1.7], thigh: 2.75, shin: 2.75, r: 0.9, bend: 1 },
    frontNear: { on: 'chest', at: [1, 1.7], thigh: 2.75, shin: 2.75, r: 0.9, bend: -1 },
  },
  chains: {
    tail: {
      on: 'hip',
      at: [-3, -1.3],
      angle: 0.75,
      links: 3,
      length: 5.5,
      r: [1.6, 2.1],
      marks: [[1.15, 'BELLY', 1.8]],
      stiffness: 800,
      damping: 26,
      weight: 70,
    },
    earA: { on: 'head', ear: [[-2.4, -2.3], [0.2, -3.4]], tip: [-1.9, -7], tipColor: 'BROWN', stiffness: 1400, damping: 22, weight: 60 },
    earB: { on: 'head', ear: [[0.4, -3.3], [2.8, -2.2]], tip: [2, -7.1], tipColor: 'BROWN', stiffness: 1400, damping: 22, weight: 60 },
  },
  face: { eye: [0.7, -1.1], nose: [5.2, 1.4] },
};
