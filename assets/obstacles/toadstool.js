// toadstool: an asset (see asset.js), written by the editor; data only
export default {
  format: 1,
  name: 'toadstool',
  size: [13, 11],
  layers: [
    { name: 'stem', color: 'white', shapes: [{ capsule: [6.5, 5.6, 6.5, 11, 2.2] }], paint: [{ color: 'faint', box: [8, 8, 9, 11] }] },
    {
      name: 'cap',
      color: 'red',
      clip: [0, 0, 13, 7],
      shapes: [{ ellipse: [6.5, 5.6, 5.5, 3.8] }],
      dots: [{ at: [8, 3], color: 'white' }, { at: [10, 5], color: 'white' }, { at: [6, 6], color: 'white' }],
    },
  ],
};
