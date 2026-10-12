// carrot: an asset (see asset.js), written by the editor; data only
export default {
  format: 1,
  name: 'carrot',
  size: [9, 12],
  layers: [
    {
      name: 'green',
      color: 'green',
      outline: false,
      shapes: [{ capsule: [4.5, 3.5, 2.6, 0.8, 0.6] }, { capsule: [4.5, 3.5, 4.5, 0.4, 0.6] }, { capsule: [4.5, 3.5, 6.4, 0.9, 0.6] }],
    },
    {
      name: 'orange',
      color: 'orange',
      shapes: [{ ellipse: [4.5, 4.8, 2.4, 1.5] }, { triangle: [[2.1, 4.8], [6.9, 4.8], [4.6, 11.2]] }],
      paint: [{ color: 'rust', capsule: [3.5, 6.5, 4.4, 6.5, 0.4] }, { color: 'rust', capsule: [4.6, 8.5, 5.2, 8.5, 0.4] }],
      dots: [{ at: [3, 5], color: 'background' }],
    },
  ],
};
