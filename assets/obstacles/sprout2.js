// sprout2: an asset (see asset.js), written by the editor; data only
export default {
  format: 1,
  name: 'sprout2',
  size: [12, 13],
  layers: [
    {
      name: 'cactus',
      color: 'green',
      shapes: [{ capsule: [8.6, 7, 8.6, 15, 1.8] }, { capsule: [4.2, 4.8, 4.2, 15, 2.1] }],
      paint: [
        { color: 'darkGreen', box: [4, 3, 6, 13] },
        { color: 'darkGreen', box: [9, 5, 10, 13] },
        { color: 'lightGreen', box: [2, 4, 3, 13] },
        { color: 'lightGreen', box: [7, 6, 8, 13] },
      ],
      dots: [
        { at: [4, 1], color: 'outline' },
        { at: [2, 2], color: 'outline' },
        { at: [1, 3], color: 'outline' },
        { at: [7, 3], color: 'outline' },
        { at: [9, 3], color: 'outline' },
        { at: [0, 7], color: 'outline' },
        { at: [0, 9], color: 'outline' },
      ],
    },
  ],
};
