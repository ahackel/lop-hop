// apple: an asset (see asset.js), written by the editor; data only
export default {
  format: 1,
  name: 'apple',
  size: [8, 9],
  layers: [
    { name: 'brown', color: 'brown', outline: false, shapes: [{ capsule: [4, 0.6, 4.2, 2.2, 0.5] }] },
    { name: 'green', color: 'green', outline: false, shapes: [{ ellipse: [5.8, 1.3, 1.3, 0.7] }] },
    { name: 'red', color: 'red', shapes: [{ ellipse: [4, 5.4, 3, 3] }], dots: [{ at: [3, 4], color: 'background' }] },
  ],
};
