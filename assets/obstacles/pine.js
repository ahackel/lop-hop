// pine: an asset (see asset.js), written by the editor; data only
export default {
  format: 1,
  name: 'pine',
  size: [15, 18],
  layers: [
    { name: 'trunk', color: 'brown', shapes: [{ capsule: [7.5, 13, 7.5, 18, 1.3] }] },
    {
      name: 'needles',
      color: 'darkGreen',
      shapes: [
        { triangle: [[7.5, 1.8], [4.5, 7.255], [10.5, 7.255]] },
        { triangle: [[7.5, 5.55], [2.8, 11.005], [12.2, 11.005]] },
        { triangle: [[7.5, 9.3], [1.1, 14.755], [13.9, 14.755]] },
      ],
      paint: [{ color: 'green', box: [5, 5, 6, 7] }],
      dots: [
        { at: [6, 4], color: 'green' },
        { at: [6, 7], color: 'green' },
        { at: [5, 8], color: 'green' },
        { at: [4, 9], color: 'green' },
        { at: [3, 10], color: 'green' },
        { at: [5, 11], color: 'green' },
        { at: [4, 12], color: 'green' },
        { at: [3, 13], color: 'green' },
        { at: [1, 14], color: 'green' },
      ],
    },
  ],
};
