// stump2: an asset (see asset.js), written by the editor; data only
export default {
  format: 1,
  name: 'stump2',
  size: [16, 11],
  layers: [
    { name: 'bark', color: 'brown', shapes: [{ box: [2, 4, 14, 11] }, { ellipse: [8, 10.5, 7.2, 1.6] }] },
    {
      name: 'top',
      color: 'sand',
      shapes: [{ ellipse: [8, 3.6, 5.5, 1.7] }],
      dots: [{ at: [6, 3], color: 'tan' }, { at: [8, 3], color: 'brown' }, { at: [10, 3], color: 'tan' }],
    },
  ],
};
