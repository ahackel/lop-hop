// peanut: an asset (see asset.js), written by the editor; data only
export default {
  format: 1,
  name: 'peanut',
  size: [11, 7],
  layers: [
    {
      name: 'tan',
      color: 'tan',
      shapes: [{ ellipse: [3.2, 3.6, 2.6, 2.4] }, { ellipse: [7.6, 3.4, 2.7, 2.5] }, { capsule: [3.5, 3.6, 7.3, 3.4, 1.7] }],
      paint: [
        { color: 'brown', ellipse: [2.6, 3, 0.5, 0.5] },
        { color: 'brown', ellipse: [4, 4.6, 0.5, 0.5] },
        { color: 'brown', ellipse: [7, 2.6, 0.5, 0.5] },
        { color: 'brown', ellipse: [8.4, 4.2, 0.5, 0.5] },
        { color: 'brown', ellipse: [6.2, 4.4, 0.5, 0.5] },
      ],
      dots: [{ at: [7, 1], color: 'background' }],
    },
  ],
};
