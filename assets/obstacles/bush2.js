// bush2: an asset (see asset.js), written by the editor; data only
export default {
  format: 1,
  name: 'bush2',
  size: [15, 12],
  layers: [
    {
      name: 'bush',
      color: 'green',
      shapes: [
        { ellipse: [4.64, 7.22, 3.9, 3.78] },
        { ellipse: [10.36, 7.4, 3.9, 3.78] },
        { ellipse: [7.5, 5.78, 3.9, 4.05] },
        { capsule: [3.6, 9.5, 11.4, 9.5, 2] },
      ],
      paint: [{ color: 'lightGreen', box: [5, 2, 8, 3] }, { color: 'lightGreen', box: [2, 4, 4, 5] }, { color: 'darkGreen', box: [4, 11, 11, 12] }],
      dots: [
        { at: [4, 3], color: 'lightGreen' },
        { at: [1, 5], color: 'lightGreen' },
        { at: [11, 5], color: 'darkGreen' },
        { at: [9, 6], color: 'darkGreen' },
        { at: [4, 7], color: 'red' },
        { at: [12, 8], color: 'darkGreen' },
        { at: [8, 9], color: 'red' },
        { at: [10, 9], color: 'darkGreen' },
        { at: [11, 9], color: 'red' },
      ],
    },
  ],
};
