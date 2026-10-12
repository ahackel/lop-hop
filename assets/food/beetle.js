// beetle: an asset (see asset.js), written by the editor; data only
export default {
  format: 1,
  name: 'beetle',
  size: [9, 7],
  layers: [
    {
      name: 'legs',
      color: 'black',
      outline: false,
      shapes: [
        { capsule: [2, 4, 0.5, 6, 0.4] },
        { capsule: [4.5, 4.5, 4.5, 6.5, 0.4] },
        { capsule: [7, 4, 8.5, 6, 0.4] },
        { capsule: [3, 2, 1.5, 0.5, 0.4] },
        { capsule: [6, 2, 7.5, 0.5, 0.4] },
      ],
    },
    {
      name: 'darkGreen',
      color: 'darkGreen',
      shapes: [{ ellipse: [4.5, 3.5, 3, 2.3] }],
      dots: [{ at: [4, 2], color: 'background' }, { at: [4, 3], color: 'black' }, { at: [4, 4], color: 'black' }],
    },
  ],
};
