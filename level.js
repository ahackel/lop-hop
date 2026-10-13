// The course an animal runs: what comes (the day's land's obstacles, see LANDS; branches, crows; food, golden food), where, and how fast
// the world goes there. It depends on the animal and on how far the run is, nothing else: the same animal's run looks
// the same every time, whatever the player does (bumps, super powers, the chase at night change how fast it goes by,
// not what comes). Each piece of the course has its own random numbers (seeded by the animal and its number), so one
// that comes out differently (the sly fox finds more food) changes nothing after it.
//
// It gets harder all the way, with no top: faster (ever more slowly near a top speed: see pace), closer together, more
// crows, branches and packs, less food, more tiring (hardness: days run, in steps of a day and a night, and a head
// start for each animal after the rabbit, on top of its own dials in art.js). Whatever comes can be got past: the gap
// before an obstacle leaves room to land from the jump before it (or stand up from a duck) and jump, duck or stay low
// in time, at the speed of a night's chase (see fair; tools/test.mjs checks it by playing every course through).
//   course(kind) → { next() → piece }   piece: { at, items, food, gold }, at: the distance (art pixels) where its left
//                                         edge comes in at the right of the screen; items (obstacles), food and gold
//                                         from there (dx)
//   pace(kind, d) → speed               hardness(kind, s), drain(kind, s), dayOf(kind, s), nightAt(kind, day), chaserOf(kind)
import { W, GROUND, ANIMALS, ORDER, DUCK_UNDER, CROW_BOTTOM, JUMP, GRAVITY, FOOD, LANDS, crow, hitbox, stride, jumpFrame } from './art.js';

// ------------------------------------------------------------------------------------------------------------- tuning
export const START_SPEED = 110, MAX_SPEED = 255, ACCEL = 3; // art pixels per second (per second, as it runs: see pace)
export const SCORE_PER_PX = 0.17; // (with the top speed at 200: a day and its night about 50 seconds, points a second as when it went up to 400)
export const BRANCHES_FROM = 150, CROWS_FROM = 300, FAST_FROM = 700; // the scores where branches, crows (tension) and speed (action) begin
// a day's run (points), then the night's (about as long whoever runs: they all run near the top speed), the chaser coming
// that far into it, the sky paling that far before its end (dawn: the den); an animal after the rabbit starts that
// much harder (in days)
export const DAY = 1000, NIGHT = 600, HUNT = 170, PALE = 220, HEAD = 0.06;
// for every day of hardness: faster (px/s), gaps closer (down to MIN_TIGHT), more crows and branches (up to their
// most), packs more often, food rarer (down to LEAST_FOOD), more tiring
const DAY_SPEED = 22, DAY_TIGHT = 0.07, MIN_TIGHT = 0.45, DAY_CROWS = 0.035, MOST_CROWS = 0.42, MOST_BRANCHES = 0.62, DAY_PACKS = 0.25;
const DAY_FOOD = 0.05, LEAST_FOOD = 0.45, DRAIN = 1.85, DAY_DRAIN = 0.27;
export const CHASE = 1.12; // the world goes faster while the chaser is after the animal
const REACT = 0.15; // seconds: what a gap leaves, at the least, to act after a jump lands (or a duck ends)
// golden food: the first some 250 points in, then one every GOLD_SECS of running (8 s of super power), a little
// rarer every day (DAY_GOLD)
export const GOLD_FIRST = 250, GOLD_SECS = [24, 36], DAY_GOLD = 0.1;

const KINDS = ORDER; // (the animals in order, as art.js has them now)
const T = (kind) => ANIMALS[kind];
// who chases an animal at night (and joins it, the first time it gets away till dawn): the next one (see ANIMALS); the
// last, the rabbit
export const chaserOf = (k) => KINDS[KINDS.indexOf(k) + 1] || 'rabbit';
const cycle = () => DAY + NIGHT; // (points: a day and its night)
// how much harder than the start (days), s points into a run
export const hardness = (kind, s) => s / cycle(kind) + KINDS.indexOf(kind) * HEAD;
// the day s points into a run is in (1, 2, …), and where that day's night falls, where its chaser comes, where the
// sky pales, where it ends; the land an animal runs in
export const dayOf = (kind, s) => Math.floor(s / cycle(kind)) + 1;
export const landOf = (kind) => LANDS[KINDS.indexOf(kind) % LANDS.length]; // (each animal's obstacles, round the lands: see LANDS)
export const nightAt = (kind, day) => { const from = (day - 1) * cycle(kind) + DAY; return { from, hunt: from + HUNT, pale: day * cycle(kind) - PALE, to: day * cycle(kind) }; };
// how fast the world goes by, d art pixels into a run (before the chase, a bump, a super power): speeding up as it
// runs, up to a top that rises with every day, and past KNEE ever more slowly, never reaching TOP (an animal's own
// speed too): at 60 frames a second the eye follows what comes up to some 200 art pixels a second, two thirds of a screen
// (tried on devices: faster, the world and what is in it smear, whatever the screen does: the frame is held while the
// eye moves on)
export let KNEE = 150, TOP = 200;
// another top (to try one, see ?top in game.js): never reaching top, ever more slowly from three quarters of it on
export function topSpeed(top) { TOP = top; KNEE = top * 0.75; }
const bend = (v) => (v <= KNEE ? v : KNEE + (TOP - KNEE) * (1 - Math.exp((KNEE - v) / (TOP - KNEE))));
export const pace = (kind, d) => bend(Math.min(Math.sqrt(START_SPEED ** 2 + 2 * ACCEL * d), MAX_SPEED + DAY_SPEED * hardness(kind, d * SCORE_PER_PX)) * T(kind).speed);
// energy lost per second (of 100)
export const drain = (kind, s) => DRAIN * T(kind).drain * (1 + DAY_DRAIN * hardness(kind, s));
// how often food comes with an obstacle (on average: see course)
export const meals = (kind, s) => 0.35 * T(kind).meals * Math.max(LEAST_FOOD, 1 - DAY_FOOD * hardness(kind, s));

// random numbers, 0…1, from a seed (mulberry32); a seed from words
export function random(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
export const seedOf = (text) => [...text].reduce((h, c) => Math.imul(h ^ c.charCodeAt(0), 16777619), 2166136261) >>> 0;

// ------------------------------------------------------------------------------------------------------------ fair
// An animal's jump: in the air for how long, clearing a height (its feet above it: px over the ground) for how long
const air = (kind) => (2 * JUMP * T(kind).jump) / (GRAVITY * T(kind).gravity);
const peak = (kind) => (JUMP * T(kind).jump) ** 2 / (2 * GRAVITY * T(kind).gravity);
export const airOver = (kind, h) => air(kind) * Math.sqrt(Math.max(0, 1 - h / peak(kind)));
// how long an animal is, front to back, in any frame it runs, jumps or ducks in (px)
const bodies = new Map();
export function bodyOf(kind) {
  if (!bodies.has(kind)) {
    const frames = (move) => [...new Set([...Array(64).keys()].map((i) => stride(kind, i / 64, move).frame))].map((f) => hitbox(kind, move, f));
    const jumps = [...new Set([-1.5, -1, -0.5, 0, 0.5, 1].map((r) => jumpFrame(kind, r)))].map((f) => hitbox(kind, 'jump', f));
    let x0 = Infinity, x1 = -Infinity;
    for (const s of [...frames('run'), ...frames('duck'), ...jumps]) {
      for (let i = 0; i < s.mask.length; i++) if (s.mask[i]) { const x = (i % s.w) + (s.ox || 0); x0 = Math.min(x0, x); x1 = Math.max(x1, x); }
    }
    bodies.set(kind, x1 - x0 + 1);
  }
  return bodies.get(kind);
}
// how tall a sprite's mask stands over the ground (its bottom on the ground row)
const tall = (sp) => { for (let i = 0; i < sp.mask.length; i++) if (sp.mask[i]) return sp.h - Math.floor(i / sp.w); return 0; };

// the least gap (px) before the next obstacle (needs: jump | duck | under), after one (needs, w wide, h tall), at a
// speed: a jump over the one before, timed in the middle of its window, lands with REACT to spare before the next one
// has to be jumped (or ducked, or run under); a duck ends (or a crow is passed) with REACT to spare before a jump
export function fair(kind, before, next, v) {
  const body = bodyOf(kind);
  if (before.needs === 'jump') return Math.max(0, (body + v * airOver(kind, before.h) - before.w) / 2) + v * REACT;
  return next.needs === 'jump' ? body + v * REACT : 4;
}

// ---------------------------------------------------------------------------------------------------------- course
export function course(kind) {
  const seed = seedOf(kind), gold = random(seed ^ 0x601d);
  let n = 0, nextGold = GOLD_FIRST + gold() * 150, ahead = make(0, 120), hunger = gold(); // (hunger: food is due at 1)
  // a piece: its obstacle(s), and what comes in the gap after it (food), made from its own random numbers
  function make(i, at) {
    const rnd = random(seed + Math.imul(i + 1, 0x9e3779b9)), s = Math.floor(at * SCORE_PER_PX), h = hardness(kind, s), v = pace(kind, at), land = landOf(kind);
    const r = rnd(), items = [];
    if (s >= CROWS_FROM - T(kind).early && r < Math.min(MOST_CROWS, 0.22 + DAY_CROWS * h)) {
      const where = ['low', 'head', 'head', 'high'][Math.floor(rnd() * 4)];
      const bottom = where === 'low' ? GROUND - 1 : where === 'head' ? DUCK_UNDER : GROUND - 24;
      items.push({ kind: 'crow', sprite: crow(0), dx: 0, y: bottom - CROW_BOTTOM, fly: 20, duck: where === 'head', over: where === 'high' });
      return { items, at, w: items[0].sprite.w, h: GROUND + 1 - bottom + CROW_BOTTOM, needs: where === 'low' ? 'jump' : where === 'head' ? 'duck' : 'under', fly: 20, rnd };
    }
    if (s >= BRANCHES_FROM - T(kind).early && r < Math.min(MOST_BRANCHES, 0.38 + 2 * DAY_CROWS * h)) {
      items.push({ kind: 'branch', sprite: land.branch(rnd), dx: 0, y: 0, fly: 0, duck: true });
      return { items, at, w: items[0].sprite.w, h: 0, needs: 'duck', fly: 0, rnd };
    }
    const k = rnd();
    let sp = k < 0.3 ? land.other(rnd) : s > 150 && rnd() < 0.35 ? land.big(rnd) : land.small(rnd);
    // one too tall and wide for the animal to stay over it as long as it takes to pass it, at this speed (a heavy one
    // at the top speed: a boulder, a spire): a small one instead
    if (sp.w + bodyOf(kind) > 0.85 * v * airOver(kind, tall(sp))) sp = land.small(rnd);
    items.push({ kind: 'ground', sprite: sp, dx: 0, y: GROUND - sp.h + 1, fly: 0 });
    let w = sp.w, ht = tall(sp);
    // at speed, small ones come in twos and threes (as many as one jump clears, with room to time it)
    const packs = v > 170 && rnd() < Math.min(0.9, 0.35 * T(kind).packs * (1 + DAY_PACKS * h)) ? 1 + Math.floor(rnd() * (v > 220 ? 2 : 1)) : 0;
    for (let m = 0; m < packs; m++) {
      const more = land.small(rnd), mh = Math.max(ht, tall(more));
      if (w - 2 + more.w + bodyOf(kind) > 0.7 * v * airOver(kind, mh)) break;
      items.push({ kind: 'ground', sprite: more, dx: w - 2, y: GROUND - more.h + 1, fly: 0 });
      w += more.w - 2; ht = mh;
    }
    return { items, at, w, h: ht, needs: 'jump', fly: 0, rnd };
  }
  return {
    next() {
      const p = ahead, rnd = p.rnd, s = Math.floor(p.at * SCORE_PER_PX), h = hardness(kind, s), v = pace(kind, p.at);
      const tight = Math.max(MIN_TIGHT, T(kind).tight * (1 - DAY_TIGHT * h));
      let gap = (v * (0.75 + rnd() * 0.9) + 24) * tight + (p.needs === 'jump' ? 0 : 20); // (time to stand up after ducking)
      // what comes next (made where it would come), then room enough before it: at a chase's speed, and against a crow
      // (flying at the animal, closing in on what is before it as it comes across the screen)
      const nxt = make(++n, p.at + p.w + gap), vn = pace(kind, nxt.at) * CHASE;
      gap = Math.max(gap, fair(kind, p, nxt, vn + Math.max(p.fly, nxt.fly)) + (nxt.fly * W) / vn);
      nxt.at = p.at + p.w + gap;
      // golden food, now and then: high over a ground obstacle (jump it at the right moment)
      let g = null;
      if (p.needs === 'jump' && p.items[0].kind === 'ground' && s >= nextGold) {
        const reach = peak(kind) + 15; // (its head, at the top of a jump)
        g = { dx: p.w / 2 - 6, y: GROUND - Math.min(reach - 6, p.h + 29) };
        nextGold = s + (GOLD_SECS[0] + gold() * (GOLD_SECS[1] - GOLD_SECS[0])) * (1 + DAY_GOLD * h) * v * SCORE_PER_PX;
      }
      // food in the gap after it, on the ground or up in the air: as often as meals says (evenly, give or take), and
      // more that only the sly fox finds
      const roll = rnd(), meal = FOOD[T(kind).food], y = rnd() < 0.5 ? GROUND - meal.h - 3 : GROUND - 30 - rnd() * 10;
      hunger += meals(kind, s) * (0.6 + roll * 0.8);
      const due = hunger >= 1, food = due || roll < 0.6 ? [{ dx: p.w + gap / 2, y, sly: !due }] : [];
      if (due) hunger--;
      ahead = nxt;
      return { at: p.at, items: p.items, food, gold: g };
    },
  };
}
