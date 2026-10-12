// ice3: an asset (see asset.js), written by the editor; data only
export default {
  format: 1,
  name: 'ice3',
  size: [14, 12],
  layers: [
    {
      name: 'ice',
      color: 'blue',
      shapes: [{ box: [1, 2, 13, 12] }],
      paint: [
        { color: 'white', box: [1, 2, 13, 3] },
        { color: 'white', box: [3, 3, 5, 4] },
        { color: 'white', box: [6, 3, 8, 4] },
        { color: 'white', box: [9, 3, 11, 4] },
      ],
      dots: [
        { at: [1, 3], color: 'white' },
        { at: [12, 3], color: 'white' },
        { at: [5, 6], color: 'white' },
        { at: [4, 7], color: 'white' },
        { at: [3, 8], color: 'white' },
        { at: [11, 10], color: 'white' },
      ],
    },
  ],
};
