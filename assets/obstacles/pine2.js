// pine2: an asset (see asset.js), written by the editor; data only
export default {
  format: 1,
  name: 'pine2',
  size: [15, 20],
  layers: [
    { name: 'trunk', color: 'brown', shapes: [{ capsule: [7.5, 15, 7.5, 20, 1.3] }] },
    {
      name: 'needles',
      color: 'darkGreen',
      shapes: [
        { triangle: [[7.5, 1.8], [4.5, 8.164], [10.5, 8.164]] },
        { triangle: [[7.5, 6.175], [2.8, 12.539], [12.2, 12.539]] },
        { triangle: [[7.5, 10.55], [1.1, 16.914], [13.9, 16.914]] },
      ],
      paint: [{ color: 'green', box: [6, 4, 7, 6] }, { color: 'green', box: [5, 6, 6, 8] }, { color: 'green', box: [4, 10, 5, 12] }],
      dots: [
        { at: [6, 8], color: 'green' },
        { at: [5, 9], color: 'green' },
        { at: [3, 12], color: 'green' },
        { at: [5, 13], color: 'green' },
        { at: [4, 14], color: 'green' },
        { at: [3, 15], color: 'green' },
        { at: [2, 16], color: 'green' },
      ],
    },
  ],
};
