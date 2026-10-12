// stump: an asset (see asset.js), written by the editor; data only
export default {
  format: 1,
  name: 'stump',
  size: [15, 10],
  layers: [
    { name: 'bark', color: 'brown', shapes: [{ box: [2, 4, 13, 10] }, { ellipse: [7.5, 9.5, 6.7, 1.6] }] },
    {
      name: 'top',
      color: 'sand',
      shapes: [{ ellipse: [7.5, 3.6, 5, 1.7] }],
      dots: [{ at: [5, 3], color: 'tan' }, { at: [7, 3], color: 'brown' }, { at: [9, 3], color: 'tan' }],
    },
  ],
};
