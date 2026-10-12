// ice2: an asset (see asset.js), written by the editor; data only
export default {
  format: 1,
  name: 'ice2',
  size: [13, 11],
  layers: [
    {
      name: 'ice',
      color: 'blue',
      shapes: [{ box: [1, 2, 12, 11] }],
      paint: [
        { color: 'white', box: [1, 2, 12, 3] },
        { color: 'white', box: [3, 3, 5, 4] },
        { color: 'white', box: [6, 3, 8, 4] },
        { color: 'white', box: [9, 3, 11, 4] },
      ],
      dots: [
        { at: [1, 3], color: 'white' },
        { at: [5, 5], color: 'white' },
        { at: [4, 6], color: 'white' },
        { at: [3, 7], color: 'white' },
        { at: [10, 9], color: 'white' },
      ],
    },
  ],
};
