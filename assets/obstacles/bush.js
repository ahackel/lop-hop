// bush: an asset (see asset.js), written by the editor; data only
export default {
  format: 1,
  name: 'bush',
  size: [14, 11],
  layers: [
    {
      name: 'bush',
      color: 'green',
      shapes: [
        { ellipse: [4.36, 6.64, 3.6, 3.36] },
        { ellipse: [9.64, 6.8, 3.6, 3.36] },
        { ellipse: [7, 5.36, 3.6, 3.6] },
        { capsule: [3.4, 8.5, 10.6, 8.5, 2] },
      ],
      paint: [
        { color: 'lightGreen', box: [5, 2, 7, 3] },
        { color: 'lightGreen', box: [3, 3, 5, 4] },
        { color: 'darkGreen', box: [10, 9, 11, 11] },
        { color: 'darkGreen', box: [3, 10, 10, 11] },
      ],
      dots: [
        { at: [8, 3], color: 'darkGreen' },
        { at: [2, 4], color: 'lightGreen' },
        { at: [1, 5], color: 'lightGreen' },
        { at: [11, 5], color: 'darkGreen' },
        { at: [9, 6], color: 'darkGreen' },
        { at: [12, 8], color: 'darkGreen' },
      ],
    },
  ],
};
