// pear: an asset (see asset.js), written by the editor; data only
export default {
  format: 1,
  name: 'pear',
  size: [14, 12],
  layers: [
    {
      name: 'cactus',
      color: 'green',
      shapes: [{ ellipse: [4.2, 6.5, 2.5, 3.2] }, { ellipse: [10, 7.5, 2.4, 3] }, { ellipse: [7, 7.5, 3.4, 5] }],
      paint: [
        { color: 'darkGreen', box: [7, 4, 8, 6] },
        { color: 'darkGreen', box: [11, 6, 12, 10] },
        { color: 'darkGreen', box: [9, 7, 10, 11] },
        { color: 'lightGreen', box: [2, 4, 3, 9] },
        { color: 'lightGreen', box: [4, 4, 5, 11] },
      ],
      dots: [
        { at: [6, 3], color: 'darkGreen' },
        { at: [3, 4], color: 'darkGreen' },
        { at: [6, 8], color: 'darkGreen' },
        { at: [5, 11], color: 'darkGreen' },
      ],
    },
    {
      name: 'fruit',
      color: 'red',
      hits: false,
      shapes: [{ ellipse: [10, 4.5, 1.2, 1.2] }],
      dots: [
        { at: [3, 1], color: 'outline' },
        { at: [5, 1], color: 'outline' },
        { at: [6, 1], color: 'outline' },
        { at: [13, 5], color: 'outline' },
        { at: [0, 6], color: 'outline' },
        { at: [13, 6], color: 'outline' },
      ],
    },
  ],
};
