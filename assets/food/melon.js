// melon: an asset (see asset.js), written by the editor; data only
export default {
  format: 1,
  name: 'melon',
  size: [12, 8],
  layers: [
    {
      name: 'darkGreen',
      color: 'darkGreen',
      shapes: [{ ellipse: [6, 1, 5.4, 6] }],
      paint: [{ color: 'green', ellipse: [6, 1, 4.6, 5] }, { color: 'red', ellipse: [6, 1, 4.2, 4.4] }],
      dots: [{ at: [4, 2], color: 'black' }, { at: [8, 2], color: 'black' }, { at: [6, 3], color: 'black' }],
      clip: [0, 1, 12, 8],
    },
  ],
};
