// roast: an asset (see asset.js), written by the editor; data only
export default {
  format: 1,
  name: 'roast',
  size: [16, 12],
  layers: [
    {
      name: 'white',
      color: 'white',
      shapes: [{ capsule: [3.2, 9.2, 8, 5.5, 0.8] }, { ellipse: [2.4, 8.2, 1.2, 1.2] }, { ellipse: [4, 10.3, 1.2, 1.2] }],
    },
    { name: 'brown', color: 'brown', shapes: [{ ellipse: [10.5, 4.6, 4.6, 3.6] }] },
    { name: 'tan', color: 'tan', outline: false, shapes: [{ ellipse: [10.2, 3.5, 2.6, 1.5] }], dots: [{ at: [9, 2], color: 'background' }] },
  ],
};
