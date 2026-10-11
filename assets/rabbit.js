// rabbit: an asset (see asset.js), written by the editor; data only
export default {
  format: 2,
  name: 'rabbit',
  fur: 'FUR',
  joints: { hip: [7, 13.5], chest: [12, 13.5], head: [15.5, 9] },
  torso: { r: 5, ends: 4.5 },
  shapes: [
    { name: 'haunch', on: 'hip', ellipse: [0.5, 1.5, 5, 4] },
    { name: 'head', on: 'head', ellipse: [0, 0, 4.5, 4.5] },
    { name: 'muzzle', on: 'head', ellipse: [3.5, 1.8, 2.5, 2.2] },
  ],
  dots: [{ name: 'blush', on: 'head', at: [2.5, 2], color: 'PINK' }],
  legs: {
    hindFar: { on: 'hip', at: [1, 2], thigh: 3.2, shin: 4.6, r: 1.2, bend: 1, far: true },
    frontFar: { on: 'chest', at: [3.3, 0.5], thigh: 2.8, shin: 2.8, r: 1.1, bend: -1, far: true },
    hindNear: { on: 'hip', at: [0, 2], thigh: 3.2, shin: 4.6, r: 1.3, bend: 1 },
    frontNear: { on: 'chest', at: [2.5, 0.5], thigh: 2.8, shin: 2.8, r: 1.2, bend: -1 },
  },
  chains: {
    tail: { on: 'hip', at: [-4.7, -1], angle: 1.2, links: 1, length: 0.5, r: 1.9, stiffness: 900, damping: 16, weight: 80 },
    ear: {
      on: 'head',
      at: [-2, -3],
      angle: 2.7,
      links: 2,
      length: 5.6,
      r: 1.4,
      end: 2.1,
      color: 'EAR',
      front: true,
      stiffness: 240,
      damping: 8,
      weight: 140,
    },
  },
  face: { eye: [1.5, -1], nose: [4.5, 1], noseColor: 'PINK' },
  front: {
    joints: { hip: [13, 15], chest: [13, 12], head: [13, 9] },
    shapes: [
      { name: 'body', ellipse: [13.5, 15.6, 5.2, 4] },
      { name: 'head', on: 'head', ellipse: [0.5, 0, 5.4, 4.4] },
      { name: 'footL', ellipse: [9.8, 18.4, 2.3, 1.1] },
      { name: 'footR', ellipse: [17.2, 18.4, 2.3, 1.1] },
    ],
    top: [{ shapes: [{ ellipse: [11, 18.5, 1.1, 0.9] }, { ellipse: [16, 18.5, 1.1, 0.9] }] }],
    chains: {
      earL: { on: 'head', at: [-3, -3.4], angle: 2.3, links: 2, length: 7, r: 1.4, end: 2, curl: -0.6, color: 'EAR', front: true },
      earR: { on: 'head', at: [4, -3.4], angle: -2.3, links: 2, length: 7, r: 1.4, end: 2, curl: 0.6, color: 'EAR', front: true },
    },
    face: { eyes: [[-2, -0.5], [2, -0.5]], nose: [0, 1.5], noseColor: 'PINK' },
  },
  moves: {
    jump: [
      {
        joints: { hip: [7, 14.5], chest: [12, 12.3], head: [15.5, 7.8] },
        paws: { hindNear: [0, 17.6], hindFar: [1, 17.6], frontNear: [19, 15], frontFar: [19.8, 15.2] },
      },
      {
        joints: { hip: [7.5, 12.8], chest: [12, 14], head: [16, 9.5] },
        paws: { hindNear: [11.5, 17.6], hindFar: [12.5, 17.6], frontNear: [16.5, 17.8], frontFar: [17.3, 17.8] },
      },
    ],
  },
};
