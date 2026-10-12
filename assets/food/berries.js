// berries: an asset (see asset.js), written by the editor; data only
export default {
  format: 1,
  name: 'berries',
  size: [10, 8],
  layers: [
    { name: 'green', color: 'green', outline: false, shapes: [{ ellipse: [6.8, 1.3, 1.5, 0.8] }] },
    { name: 'blue', color: 'blue', shapes: [{ ellipse: [3, 3.5, 1.6, 1.6] }], dots: [{ at: [2, 3], color: 'background' }] },
    { name: 'blue2', color: 'blue', shapes: [{ ellipse: [6, 3.6, 1.6, 1.6] }], dots: [{ at: [5, 3], color: 'background' }] },
    { name: 'blue3', color: 'blue', shapes: [{ ellipse: [4.5, 5.8, 1.6, 1.6] }], dots: [{ at: [4, 5], color: 'background' }] },
    { name: 'blue4', color: 'blue', shapes: [{ ellipse: [7.6, 6, 1.6, 1.6] }], dots: [{ at: [7, 5], color: 'background' }] },
  ],
};
