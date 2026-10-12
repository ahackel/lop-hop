// snowman2: an asset (see asset.js), written by the editor; data only
export default {
  format: 1,
  name: 'snowman2',
  size: [15, 20],
  layers: [
    {
      name: 'arms',
      color: 'brown',
      outline: false,
      hits: false,
      shapes: [{ capsule: [4.5, 8.8, 1, 5.8, 0.5] }, { capsule: [10.5, 8.8, 14, 6.3, 0.5] }],
    },
    {
      name: 'snow',
      color: 'white',
      shapes: [{ ellipse: [7.5, 15.4, 4.6, 4.6] }, { ellipse: [7.5, 8.8, 3.4, 3.4] }, { ellipse: [7.5, 4, 2.6, 2.6] }],
      paint: [{ color: 'blue', box: [11, 16, 12, 18] }, { color: 'blue', box: [10, 17, 11, 19] }, { color: 'blue', box: [9, 18, 10, 20] }],
      dots: [
        { at: [6, 3], color: 'black' },
        { at: [8, 3], color: 'black' },
        { at: [5, 4], color: 'orange' },
        { at: [9, 4], color: 'blue' },
        { at: [7, 8], color: 'black' },
        { at: [10, 9], color: 'blue' },
        { at: [7, 10], color: 'black' },
        { at: [9, 10], color: 'blue' },
        { at: [8, 19], color: 'blue' },
      ],
    },
    {
      name: 'hat',
      color: 'black',
      outline: false,
      shapes: [{ box: [5, 0, 10, 2] }, { box: [4, 1, 5, 2] }, { box: [10, 1, 11, 2] }],
      dots: [{ at: [4, 4], color: 'orange' }],
    },
  ],
};
