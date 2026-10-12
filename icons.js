// The game's icons, in its pixels: rows of 'x' (on) and '.' (off). The buttons' (7×7, in a frame of 11: see drawButton
// in game.js) and the pads' (9×9, in a round pad of 17: see padSvg), an arrow turned as each pad needs.
export const ICONS = {
  soundOn: ['..x....', '.xx.x..', 'xxx..x.', 'xxx..x.', 'xxx..x.', '.xx.x..', '..x....'],
  soundOff: ['..x....', '.xx....', 'xxx.x.x', 'xxx..x.', 'xxx.x.x', '.xx....', '..x....'],
  scores: ['xxxxxxx', 'x.xxx.x', '.xxxxx.', '..xxx..', '...x...', '..xxx..', '.xxxxx.'],
  credits: ['.xx.xx.', 'xxxxxxx', 'xxxxxxx', 'xxxxxxx', '.xxxxx.', '..xxx..', '...x...'],
  full: ['xx...xx', 'x.....x', '.......', '.......', '.......', 'x.....x', 'xx...xx'],
  leave: ['.x...x.', 'xx...xx', '.......', '.......', '.......', 'xx...xx', '.x...x.'],
  home: ['...x...', '..xxx..', '.xxxxx.', 'xxxxxxx', '.x...x.', '.x.x.x.', '.x.x.x.'],
  back: ['...x...', '..xx...', '.xxxxxx', 'xxxxxxx', '.xxxxxx', '..xx...', '...x...'],
  pause: ['.......', '.xx.xx.', '.xx.xx.', '.xx.xx.', '.xx.xx.', '.xx.xx.', '.......'],
  play: ['..x....', '..xx...', '..xxx..', '..xxxx.', '..xxx..', '..xx...', '..x....'],
};

// the pads' (in the bottom corners: the animal before and after on the title, duck and jump on a phone)
const ARROW = ['....x....', '...xxx...', '..xxxxx..', '.xxxxxxx.', 'xxxxxxxxx', '...xxx...', '...xxx...', '...xxx...', '...xxx...'];
const LEFT = ARROW.map((_, y) => ARROW.map((r) => r[y]).join('')); // (turned: pointing left)
const flip = (rows) => rows.map((r) => [...r].reverse().join(''));
export const PAD_ICONS = { jump: ARROW, duck: [...ARROW].reverse(), prev: LEFT, next: flip(LEFT) };
