// acorn: an asset (see asset.js), written by the editor; data only
export default {
  format: 1,
  name: 'acorn',
  size: [8, 9],
  layers: [
    { name: 'rust', color: 'rust', shapes: [{ ellipse: [4, 5.8, 2.4, 2.6] }] },
    {
      name: 'brown',
      color: 'brown',
      shapes: [{ ellipse: [4, 3.3, 3.2, 1.7] }],
      dots: [{ at: [4, 0], color: 'brown' }, { at: [3, 5], color: 'background' }],
    },
  ],
};
