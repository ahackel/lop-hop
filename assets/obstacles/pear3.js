// pear3: an asset (see asset.js), written by the editor; data only
export default {
  format: 1,
  name: 'pear3',
  size: [14, 14],
  layers: [
    {
      name: 'cactus',
      color: 'green',
      shapes: [{ ellipse: [4.2, 6.5, 2.5, 3.2] }, { ellipse: [10, 7.5, 2.4, 3] }, { ellipse: [7, 9.5, 3.4, 5] }],
      paint: [
        { color: 'lightGreen', box: [2, 4, 3, 9] },
        { color: 'lightGreen', box: [4, 6, 5, 13] },
        { color: 'darkGreen', box: [11, 5, 12, 10] },
        { color: 'darkGreen', box: [9, 6, 10, 13] },
      ],
      dots: [{ at: [5, 8], color: 'darkGreen' }, { at: [6, 9], color: 'darkGreen' }, { at: [8, 9], color: 'darkGreen' }],
    },
    {
      name: 'fruit',
      color: 'red',
      hits: false,
      shapes: [{ ellipse: [4.2, 3.3, 1.2, 1.2] }],
      dots: [{ at: [6, 3], color: 'outline' }, { at: [0, 5], color: 'outline' }, { at: [13, 5], color: 'outline' }, { at: [0, 8], color: 'outline' }],
    },
  ],
};
