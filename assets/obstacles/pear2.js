// pear2: an asset (see asset.js), written by the editor; data only
export default {
  format: 1,
  name: 'pear2',
  size: [14, 13],
  layers: [
    {
      name: 'cactus',
      color: 'green',
      shapes: [{ ellipse: [4.2, 6.5, 2.5, 3.2] }, { ellipse: [10, 7.5, 2.4, 3] }, { ellipse: [7, 8.5, 3.4, 5] }],
      paint: [
        { color: 'lightGreen', box: [2, 4, 3, 9] },
        { color: 'lightGreen', box: [4, 5, 5, 12] },
        { color: 'darkGreen', box: [3, 5, 4, 7] },
        { color: 'darkGreen', box: [11, 6, 12, 10] },
        { color: 'darkGreen', box: [8, 7, 10, 8] },
        { color: 'darkGreen', box: [9, 8, 10, 12] },
      ],
      dots: [{ at: [5, 7], color: 'darkGreen' }, { at: [7, 9], color: 'darkGreen' }],
    },
    { name: 'fruit', color: 'red', hits: false, shapes: [{ ellipse: [4.2, 3.3, 1.2, 1.2] }] },
    {
      name: 'fruit2',
      color: 'red',
      hits: false,
      shapes: [{ ellipse: [10, 4.5, 1.2, 1.2] }],
      dots: [{ at: [1, 9], color: 'outline' }, { at: [2, 10], color: 'outline' }],
    },
  ],
};
