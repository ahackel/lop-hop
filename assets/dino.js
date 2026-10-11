// dino: an asset (see asset.js), written by the editor; data only
export default {
  format: 2,
  name: 'dino',
  fur: 'DINO',
  joints: { hip: [10, 12], chest: [14, 12], head: [17.5, 3.5] },
  torso: { r: 0 },
  shapes: [
    { name: 'body', on: 'spine', capsule: [-0.5, 0.8, 3.5, -2.8, 3.6] },
    { name: 'belly', on: 'spine', ellipse: [2.2, 1.6, 3.3, 2.9] },
    { name: 'neck', on: 'chest', capsule: [0, -3, 2.3, -7.2, 2.3] },
    { name: 'thigh', on: 'hip', ellipse: [0.4, 2, 2.3, 2.7] },
    { name: 'arm', on: 'chest', capsule: [1.9, -1.4, 3.7, -0.4, 0.6], smooth: 0.2 },
    { name: 'skull', on: 'head', box: [-3.5, -2.5, 5.5, 1.3, 1.5] },
    { name: 'jaw', on: 'head', capsule: [-2.2, 1, 3.4, 3.8, 0.95], smooth: 0.4 },
  ],
  paint: [{ name: 'belly', color: 'DINO_LIGHT', on: 'spine', ellipse: [3, 2, 2.2, 3] }],
  dots: [
    { name: 'nostril', on: 'head', at: [4.6, -1.4] },
    { name: 'tooth', on: 'head', at: [1.5, 1.9], color: 'BELLY' },
    { name: 'tooth', on: 'head', at: [3.8, 2], color: 'BELLY' },
    { name: 'claw', on: 'chest', at: [4.1, -0.2], color: 'BELLY' },
  ],
  legs: {
    hindFar: { on: 'hip', at: [2.5, 2.5], thigh: 2.2, shin: 2.2, r: 1.1, foot: [1.6, 0.8], far: true, bend: -1 },
    hindNear: { on: 'hip', at: [0.5, 2.5], thigh: 2.2, shin: 2.2, r: 1.25, foot: [1.6, 0.8], bend: -1 },
  },
  chains: {
    tail: { on: 'hip', at: [-2.5, -0.5], angle: 1.2, links: 4, length: 9, r: [2.4, 0.5], curl: -0.08, stiffness: 1200, damping: 30, weight: 40 },
  },
  face: { eye: [-0.5, -0.8] },
};
