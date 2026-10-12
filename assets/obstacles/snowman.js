// snowman: an asset (see asset.js), written by the editor; data only
export default {
  format: 1,
  name: 'snowman',
  size: [15, 19],
  layers: [
    {
      name: 'arms',
      color: 'brown',
      outline: false,
      hits: false,
      shapes: [{ capsule: [4.5, 7.8, 1, 4.8, 0.5] }, { capsule: [10.5, 7.8, 14, 5.3, 0.5] }],
    },
    {
      name: 'snow',
      color: 'white',
      shapes: [{ ellipse: [7.5, 14.4, 4.6, 4.6] }, { ellipse: [7.5, 7.8, 3.4, 3.4] }, { ellipse: [7.5, 3, 2.6, 2.6] }],
      paint: [{ color: 'blue', box: [11, 15, 12, 17] }, { color: 'blue', box: [10, 16, 11, 18] }, { color: 'blue', box: [9, 17, 10, 19] }],
      dots: [
        { at: [6, 2], color: 'black' },
        { at: [8, 2], color: 'black' },
        { at: [4, 3], color: 'orange' },
        { at: [5, 3], color: 'orange' },
        { at: [9, 3], color: 'blue' },
        { at: [7, 7], color: 'black' },
        { at: [10, 8], color: 'blue' },
        { at: [7, 9], color: 'black' },
        { at: [9, 9], color: 'blue' },
        { at: [8, 18], color: 'blue' },
      ],
    },
  ],
};
