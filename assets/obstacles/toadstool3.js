// toadstool3: an asset (see asset.js), written by the editor; data only
export default {
  format: 1,
  name: 'toadstool3',
  size: [15, 13],
  layers: [
    { name: 'stem', color: 'white', shapes: [{ capsule: [7.5, 5.6, 7.5, 13, 2.2] }], paint: [{ color: 'faint', box: [9, 8, 10, 13] }] },
    {
      name: 'cap',
      color: 'red',
      clip: [0, 0, 15, 7],
      shapes: [{ ellipse: [7.5, 5.6, 6.5, 3.8] }],
      dots: [{ at: [9, 3], color: 'white' }, { at: [5, 4], color: 'white' }, { at: [11, 5], color: 'white' }, { at: [7, 6], color: 'white' }],
    },
  ],
};
