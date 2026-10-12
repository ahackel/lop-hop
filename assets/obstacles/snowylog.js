// snowylog: an asset (see asset.js), written by the editor; data only
export default {
  format: 1,
  name: 'snowylog',
  size: [16, 9],
  layers: [
    {
      name: 'log',
      color: 'brown',
      shapes: [{ capsule: [3.5, 5, 11, 5, 3.4] }],
      paint: [{ color: 'white', box: [6, 2, 13, 3] }, { color: 'white', box: [9, 3, 11, 4] }, { color: 'white', box: [12, 3, 14, 4] }],
      dots: [{ at: [7, 3], color: 'white' }, { at: [13, 4], color: 'white' }],
    },
    {
      name: 'end',
      color: 'sand',
      shapes: [{ ellipse: [3.5, 5, 2.4, 3.4] }],
      paint: [{ color: 'white', box: [2, 2, 5, 3] }, { color: 'white', box: [3, 3, 5, 4] }, { color: 'brown', box: [3, 4, 4, 6] }],
      dots: [
        { at: [1, 2], color: 'white' },
        { at: [5, 2], color: 'white' },
        { at: [0, 3], color: 'white' },
        { at: [1, 3], color: 'white' },
        { at: [6, 3], color: 'white' },
        { at: [0, 4], color: 'white' },
      ],
    },
  ],
};
