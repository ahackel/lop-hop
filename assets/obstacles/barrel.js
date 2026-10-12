// barrel: an asset (see asset.js), written by the editor; data only
export default {
  format: 1,
  name: 'barrel',
  size: [14, 12],
  layers: [
    {
      name: 'cactus',
      color: 'green',
      shapes: [{ ellipse: [7, 8, 5.453, 5] }],
      paint: [
        { color: 'darkGreen', box: [7, 3, 8, 12] },
        { color: 'darkGreen', box: [6, 4, 7, 12] },
        { color: 'darkGreen', box: [11, 5, 12, 11] },
        { color: 'lightGreen', box: [2, 5, 3, 11] },
      ],
      dots: [
        { at: [7, 1], color: 'pink' },
        { at: [3, 2], color: 'outline' },
        { at: [6, 2], color: 'pink' },
        { at: [7, 2], color: 'yellow' },
        { at: [8, 2], color: 'pink' },
        { at: [6, 3], color: 'pink' },
        { at: [8, 3], color: 'pink' },
        { at: [0, 5], color: 'outline' },
        { at: [13, 5], color: 'outline' },
        { at: [13, 6], color: 'outline' },
        { at: [13, 8], color: 'outline' },
        { at: [0, 9], color: 'outline' },
      ],
    },
  ],
};
