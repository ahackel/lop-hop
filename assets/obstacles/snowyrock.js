// snowyrock: an asset (see asset.js), written by the editor; data only
export default {
  format: 1,
  name: 'snowyrock',
  size: [11, 8],
  layers: [
    {
      name: 'rock',
      color: 'faint',
      outline: 'ink',
      shapes: [{ ellipse: [5.5, 7, 4.5, 5] }],
      paint: [
        { color: 'white', box: [4, 2, 7, 3] },
        { color: 'white', box: [2, 3, 5, 4] },
        { color: 'white', box: [6, 3, 9, 4] },
        { color: 'white', box: [1, 5, 2, 7] },
        { color: 'white', box: [9, 5, 10, 7] },
      ],
      dots: [{ at: [5, 3], color: 'background' }, { at: [3, 4], color: 'white' }, { at: [4, 4], color: 'background' }, { at: [7, 4], color: 'white' }],
    },
  ],
};
