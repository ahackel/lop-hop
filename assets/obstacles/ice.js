// ice: an asset (see asset.js), written by the editor; data only
export default {
  format: 1,
  name: 'ice',
  size: [12, 10],
  layers: [
    {
      name: 'ice',
      color: 'blue',
      shapes: [{ box: [1, 2, 11, 10] }],
      paint: [
        { color: 'white', box: [1, 2, 11, 3] },
        { color: 'white', box: [3, 3, 5, 4] },
        { color: 'white', box: [6, 3, 8, 4] },
        { color: 'white', box: [9, 3, 11, 4] },
      ],
      dots: [
        { at: [1, 3], color: 'white' },
        { at: [5, 4], color: 'white' },
        { at: [4, 5], color: 'white' },
        { at: [3, 6], color: 'white' },
        { at: [9, 8], color: 'white' },
      ],
    },
  ],
};
