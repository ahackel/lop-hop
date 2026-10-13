// What every setting in the inspector is for (its tooltip, see field in inspector.js), by its name, and the unit its
// number is shown in (see numIn: px, art pixels; ° an angle kept in radians; % a share kept as 0…1; s seconds; ×
// times the usual). A setting with its own tooltip where it is made keeps that one
export const TIPS = {
  // what it is, where it is
  name: 'Its name: a pose, a skin, a move uses it by this',
  bone: 'The bone it is on: a joint (in its frame; the box: none), or a bone it is drawn along (as the pose has it)',
  shape: 'What it is: an ellipse, a capsule (a rounded line), a box or a triangle',
  along: 'What it is drawn as along its bone',
  on: 'What it is on: it goes with it, turns with it (the box: on nothing)',
  at: 'Where it is on what it is on, in its frame',
  joint: 'The joint it hangs from',
  place: 'Where it is, in the frame of what it is on',
  pivot: 'What it turns about (drag the ring on the stage)',
  x: 'Across: + forward (right)', y: 'Up and down: + down',
  w: 'How wide', h: 'How tall',
  rotation: 'Its turn about its middle, + clockwise',
  angle: 'Its turn, + clockwise',
  length: 'How long it is',
  radius: 'A box: how round its corners. A capsule: how thick (half)',
  // a shape
  ellipse: 'Its middle (x, y) and its half widths (rx, ry)', capsule: 'From a (ax, ay) to b (bx, by), r thick (half)', box: 'From corner 0 to corner 1, r: how round its corners', triangle: 'Its three corners',
  r: 'How thick it is (half its width)',
  ends: 'How far it reaches past both ends of its bone',
  end: 'A capsule along a bone: how round its far end',
  round: 'A box along a bone: how round its corners',
  foot: 'A flat foot at its end: how long (rx) and how tall (ry); none: a round paw',
  base: 'A triangle along a bone: its base’s two ends, about the bone’s root',
  color: 'Its own color; none: its group’s (or the fur’s)',
  tipColor: 'Its end in another color (an ear’s tip)', tipSize: 'How much of its end is in the tip color',
  smooth: 'How smoothly it joins the shapes next to it in a joined group (0: a sharp crease, 1: the usual)',
  marks: 'Markings along it: [where along it 0…1, color, how thick]',
  grows: 'Grown out of the body: not outlined where it starts on it',
  role: 'What the game does with it: a tail is wagged when petted, an ear laid back, a trunk reaches for a treat',
  swings: 'Swung as the body moves, on a bone of its own (a tail, an ear, a strand of hair)',
  floppy: 'How floppy it swings: less, stiff and quick; more, loose and heavy (sets stiffness, damping, weight: ⚙)',
  // a group
  join: 'Its shapes melt into one smooth silhouette', outline: 'The color it is outlined in', hits: 'Collisions test it', far: 'In the far side’s tone',
  spikes: 'Where it bristles: ticks out of its outline', speck: 'A color for specks inside the spikes',
  paint: 'Markings: shapes in a color, only where the group is', dots: 'Single pixels',
  // a bone, a leg, a swing
  reaches: 'A joint or bone it reaches: from where it is to its end there, bowed to keep its length (a neck reaching the head)',
  bend: 'Which way it bends: a leg’s knee back (1) or forward (-1); a reaching bone’s bow',
  links: 'How many straight parts it bends in: more, smoother',
  thigh: 'How long the upper leg is', shin: 'How long the lower leg is',
  curl: 'How much each link turns from the one before, + forward',
  tip: 'Where its tip is at rest, in its joint’s frame',
  ear: 'An ear: from its root to its tip, laid back when petted',
  stiffness: 'How hard it springs back to rest: more, stiffer and quicker',
  damping: 'How quickly its swinging dies down: less, it rings on',
  weight: 'How much it hangs down',
  // the animal
  fur: 'Its color, where a group has none of its own',
  socks: 'A color for the lower legs',
  pad: 'The near paws flat on the ground: how long and how tall',
  noseColor: 'The nose’s color',
  eye: 'Where its eye is on the head', nose: 'Where its nose is on the head', mouth: 'Where its mouth is on the head; none: no mouth drawn',
  inks: 'Colors of its own for its face’s frames, each by a letter',
  head: 'The head turns about here, from the head joint',
  size: 'Its box: how wide and how tall, in pixels', up: 'Its top row drawn on up, so many rows more (a branch’s trunk, on up into the sky)',
  clip: 'Drawn only inside this box: [x0, y0, x1, y1]',
  to: 'What it reaches', headPivot: 'What the head turns about, from the head joint',
  // a move
  paw: 'Where the paw is in this frame', root: 'Where the leg joins the body in this frame',
  like: 'Its settings as another animal’s move has them',
  part: 'Which of the face’s pictures to draw: the eye’s or the mouth’s',
  'in files': 'The animals whose files use this color', 'drawn in': 'What on the stage is drawn in it',
  turn: 'Its turn here, + clockwise; a key here holds it', curlKey: 'How much it curls here',
  'head turn': 'The head’s turn in this frame, + down',
  'on its back': 'Lying on its back in this frame (knocked out)',
  frames: 'How many frames the move has',
  // the palette
  contrast: 'By night every color is day × contrast + lift: less, all nearer the middle', lift: 'By night every color is day × contrast + lift: more, all lighter',
  day: 'Its color by day', night: 'Its color by night',
};

// a setting's unit, by its name: [unit, times what is kept] (see numIn)
const DEG = ['°', 180 / Math.PI], PCT = ['%', 100], PX = ['px', 1];
export const UNITS = {
  angle: DEG, rotation: DEG, turn: DEG, 'head turn': DEG, most: DEG, lean: DEG, upright: DEG, wag: DEG, nuzzle: DEG,
  x: PX, y: PX, w: PX, h: PX, at: PX, paw: PX, root: PX, tip: PX, place: PX, pivot: PX, size: PX, clip: PX, length: PX, r: PX, ends: PX, end: PX, round: PX, radius: PX, thigh: PX, shin: PX, tipSize: PX,
  hang: PX, hop: PX, stretch: PX, reach: PX, lift: PX, bob: PX, ground: PX, height: PX, gather: PX, crouch: PX,
  squashFor: ['s', 1], chewFor: ['s', 1], wagRate: ['/s', 1], fits: ['/s', 1],
  stance: PCT, land: PCT, happy: PCT, rears: PCT, squash: PCT, floppy: PCT, smooth: PCT,
  rate: ['×', 1],
};
export const unitOf = (k) => (UNITS[k] ? { unit: UNITS[k][0], scale: UNITS[k][1] } : {});
