// boulders: an asset (see asset.js), written by the editor; data only
export default {
  format: 1,
  name: 'boulders',
  size: [20, 19],
  layers: [
    {
      name: 'rocks',
      color: 'faint',
      outline: 'ink',
      shapes: [{ ellipse: [10, 14.4, 8.6, 5.6] }, { ellipse: [8.226, 7.4, 5.2, 4.6] }],
      paint: [{ color: 'dim', box: [12, 5, 13, 8] }, { color: 'dim', box: [17, 15, 18, 17] }],
      dots: [
        { at: [7, 4], color: 'background' },
        { at: [6, 5], color: 'background' },
        { at: [7, 10], color: 'background' },
        { at: [6, 11], color: 'background' },
        { at: [17, 12], color: 'dim' },
        { at: [13, 14], color: 'black' },
        { at: [18, 14], color: 'dim' },
        { at: [14, 15], color: 'black' },
        { at: [16, 17], color: 'dim' },
      ],
    },
  ],
};
