// rock: an asset (see asset.js), written by the editor; data only
export default {
  format: 1,
  name: 'rock',
  size: [11, 8],
  layers: [
    {
      name: 'rock',
      color: 'faint',
      outline: 'ink',
      shapes: [{ ellipse: [5.5, 7, 4.5, 5] }],
      paint: [{ color: 'background', box: [5, 3, 7, 4] }],
      dots: [{ at: [4, 4], color: 'background' }],
    },
  ],
};
