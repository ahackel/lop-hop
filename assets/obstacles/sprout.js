// sprout: an asset (see asset.js), written by the editor; data only
export default {
  format: 1,
  name: 'sprout',
  size: [12, 12],
  layers: [
    {
      name: 'cactus',
      color: 'green',
      shapes: [{ capsule: [8.6, 7, 8.6, 14, 1.8] }, { capsule: [4.2, 4.8, 4.2, 14, 2.1] }],
      paint: [
        { color: 'darkGreen', box: [4, 3, 6, 12] },
        { color: 'darkGreen', box: [9, 5, 10, 12] },
        { color: 'lightGreen', box: [2, 4, 3, 12] },
        { color: 'lightGreen', box: [7, 6, 8, 12] },
      ],
      dots: [
        { at: [4, 1], color: 'outline' },
        { at: [7, 4], color: 'outline' },
        { at: [11, 6], color: 'outline' },
        { at: [11, 7], color: 'outline' },
        { at: [11, 8], color: 'outline' },
      ],
    },
  ],
};
