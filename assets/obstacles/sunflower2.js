// sunflower2: an asset (see asset.js), written by the editor; data only
export default {
  format: 1,
  name: 'sunflower2',
  size: [13, 20],
  layers: [
    {
      name: 'stem',
      color: 'green',
      shapes: [{ capsule: [6.5, 5.8, 6.5, 20, 0.9] }, { ellipse: [3.9, 10.9, 2.4, 1.1] }, { ellipse: [9.1, 13.96, 2.4, 1.1] }],
    },
    {
      name: 'flower',
      color: 'yellow',
      shapes: [{ ellipse: [6.5, 5.8, 4.3, 4.3] }],
      dots: [
        { at: [5, 2], color: 'orange' },
        { at: [7, 2], color: 'orange' },
        { at: [3, 4], color: 'orange' },
        { at: [9, 4], color: 'orange' },
        { at: [3, 7], color: 'orange' },
        { at: [9, 7], color: 'orange' },
        { at: [5, 9], color: 'orange' },
        { at: [7, 9], color: 'orange' },
      ],
    },
    { name: 'middle', color: 'brown', outline: false, shapes: [{ ellipse: [6, 5.8, 2.1, 2.1] }] },
  ],
};
