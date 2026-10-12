// toadstool2: an asset (see asset.js), written by the editor; data only
export default {
  format: 1,
  name: 'toadstool2',
  size: [14, 12],
  layers: [
    { name: 'stem', color: 'white', shapes: [{ capsule: [7, 5.6, 7, 12, 2.2] }], paint: [{ color: 'faint', box: [8, 8, 9, 12] }] },
    {
      name: 'cap',
      color: 'red',
      clip: [0, 0, 14, 7],
      shapes: [{ ellipse: [7, 5.6, 6, 3.8] }],
      dots: [{ at: [8, 3], color: 'white' }, { at: [5, 4], color: 'white' }, { at: [10, 5], color: 'white' }, { at: [7, 6], color: 'white' }],
    },
  ],
};
