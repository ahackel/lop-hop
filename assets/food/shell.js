// shell: an asset (see asset.js), written by the editor; data only
export default {
  format: 1,
  name: 'shell',
  size: [10, 8],
  layers: [
    {
      name: 'white',
      color: 'white',
      shapes: [{ ellipse: [5, 4.4, 4.2, 3.4] }, { ellipse: [5, 7, 1.6, 0.9] }],
      paint: [
        { color: 'pink', capsule: [5, 7, 2, 2, 0.4] },
        { color: 'pink', capsule: [5, 7, 5, 1.5, 0.4] },
        { color: 'pink', capsule: [5, 7, 8, 2, 0.4] },
      ],
    },
  ],
};
