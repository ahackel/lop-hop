// pine3: an asset (see asset.js), written by the editor; data only
export default {
  format: 1,
  name: 'pine3',
  size: [15, 21],
  layers: [
    { name: 'trunk', color: 'brown', shapes: [{ capsule: [7.5, 16, 7.5, 21, 1.3] }] },
    {
      name: 'needles',
      color: 'darkGreen',
      shapes: [
        { triangle: [[7.5, 1.8], [4.5, 8.618], [10.5, 8.618]] },
        { triangle: [[7.5, 6.488], [2.8, 13.306], [12.2, 13.306]] },
        { triangle: [[7.5, 11.175], [1.1, 17.993], [13.9, 17.993]] },
      ],
      paint: [{ color: 'green', box: [6, 4, 7, 6] }, { color: 'green', box: [5, 6, 6, 11] }, { color: 'green', box: [3, 15, 4, 17] }],
      dots: [
        { at: [4, 11], color: 'green' },
        { at: [3, 12], color: 'green' },
        { at: [5, 13], color: 'green' },
        { at: [4, 14], color: 'green' },
        { at: [2, 17], color: 'green' },
      ],
    },
  ],
};
