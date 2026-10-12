// mushroom: an asset (see asset.js), written by the editor; data only
export default {
  format: 1,
  name: 'mushroom',
  size: [9, 9],
  layers: [
    { name: 'white', color: 'white', shapes: [{ capsule: [4.5, 5, 4.5, 7.6, 1.2] }] },
    {
      name: 'red',
      color: 'red',
      shapes: [{ ellipse: [4.5, 4.4, 4, 3.6] }],
      paint: [
        { color: 'white', ellipse: [3, 2.5, 0.7, 0.7] },
        { color: 'white', ellipse: [6, 2, 0.7, 0.7] },
        { color: 'white', ellipse: [5, 3.6, 0.5, 0.5] },
      ],
      clip: [0, 0, 9, 5],
    },
  ],
};
