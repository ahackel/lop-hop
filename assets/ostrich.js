// ostrich: an asset (see asset.js), written by the editor; data only
export default {
  format: 2,
  name: 'ostrich',
  fur: 'OSTRICH',
  joints: { hip: [9, 9.6], chest: [14, 9.2], head: [18.8, 1] },
  torso: { r: 3.8, ends: 3 },
  shapes: [
    { name: 'neck', on: 'chest', capsule: [1.6, -1.6, 4.8, -7.8, 0.6], smooth: 0.3 },
    { name: 'head', on: 'head', ellipse: [0, 0, 2.6, 2.2] },
    { name: 'beak', on: 'head', capsule: [1.4, 0.7, 4, 0.9, 0.8] },
  ],
  paint: [
    { name: 'neck', color: 'OSTRICH_SKIN', on: 'chest', capsule: [1.6, -1.6, 4.8, -7.8, 0.6] },
    { name: 'head', color: 'OSTRICH_SKIN', on: 'head', ellipse: [0, 0, 2.7, 2.3] },
    { name: 'beak', color: 'WOOD', on: 'head', capsule: [1.4, 0.7, 4, 0.9, 0.8] },
    { name: 'wing', color: 'BELLY', on: 'spine', ellipse: [1.4, 0.4, 3, 1.5] },
  ],
  socks: 'OSTRICH_SKIN',
  legs: {
    hindFar: { on: 'hip', at: [2.2, 2.6], thigh: 4, shin: 4.4, r: 0.75, foot: [1.3, 0.6], far: true, bend: -1 },
    hindNear: { on: 'hip', at: [0.6, 2.6], thigh: 4, shin: 4.4, r: 0.85, foot: [1.3, 0.6], bend: -1 },
  },
  chains: {
    tail: {
      on: 'hip',
      at: [-3.2, -1.2],
      angle: 0.9,
      links: 2,
      length: 3.2,
      r: [1.2, 0.9],
      end: 1,
      color: 'BELLY',
      stiffness: 700,
      damping: 14,
      weight: 40,
    },
  },
  face: { eye: [0.2, -0.6] },
};
