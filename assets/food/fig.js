// fig: an asset (see asset.js), written by the editor; data only
export default {
  format: 1,
  name: 'fig',
  size: [9, 9],
  layers: [
    { name: 'darkGreen', color: 'darkGreen', outline: false, shapes: [{ capsule: [4.5, 0.6, 4.5, 2, 0.5] }] },
    {
      name: 'purple',
      color: 'purple',
      shapes: [{ ellipse: [4.5, 5.6, 3.2, 3] }, { capsule: [4.5, 5, 4.5, 2.4, 1.2] }],
      dots: [{ at: [3, 4], color: 'background' }, { at: [4, 7], color: 'pink' }],
    },
  ],
};
