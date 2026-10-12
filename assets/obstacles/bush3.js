// bush3: an asset (see asset.js), written by the editor; data only
export default {
  format: 1,
  name: 'bush3',
  size: [16, 13],
  layers: [
    {
      name: 'bush',
      color: 'green',
      shapes: [
        { ellipse: [4.92, 7.8, 4.2, 4.2] },
        { ellipse: [11.08, 8, 4.2, 4.2] },
        { ellipse: [8, 6.2, 4.2, 4.5] },
        { capsule: [3.8, 10.5, 12.2, 10.5, 2] },
      ],
      paint: [{ color: 'lightGreen', box: [6, 2, 8, 3] }, { color: 'lightGreen', box: [2, 4, 5, 5] }, { color: 'darkGreen', box: [4, 12, 12, 13] }],
      dots: [
        { at: [5, 3], color: 'lightGreen' },
        { at: [1, 5], color: 'lightGreen' },
        { at: [11, 5], color: 'darkGreen' },
        { at: [9, 6], color: 'darkGreen' },
        { at: [14, 7], color: 'darkGreen' },
        { at: [12, 8], color: 'darkGreen' },
        { at: [10, 9], color: 'darkGreen' },
        { at: [13, 11], color: 'darkGreen' },
      ],
    },
  ],
};
