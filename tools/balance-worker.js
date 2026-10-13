// The balance page's numbers (balance/), worked out off the page by the game's own code: level.js and
// course.mjs with the shared constants as the page has them (a copy of each, its numbers changed, loaded as a module
// of its own), the animals as the page has them (their order, feel and places: given to art.js here, see setAnimals).
//   ← { roster: { animals, places } (as assets/animals.js has them), shared: { NAME: v }, kinds }   → { kind, m } for each kind, in that order; then { done }
//   m: { all, some (the day energy runs out, eating all the food, 4 in 5; null: not within 12), cycle (points: a day
//        and its night), mult, jumpH (px), air (s), days: [{ speed, every, sees, food, drain }] (days 1-8; food and
//        drain: energy a second), next: getting the next animal (see unlocking) }
import { ANIMALS, JUMP, GRAVITY, jumpHeight, setAnimals } from '../art.js';
import { readConsts, setConsts } from './balance-format.js';

const url = (p) => new URL(p, import.meta.url).href;
const text = (p) => fetch(url(p)).then((r) => r.text());
const sources = Promise.all([text('../level.js'), text('./course.mjs'), text('../game.js')]);
const blob = (src) => URL.createObjectURL(new Blob([src], { type: 'text/javascript' }));
const loaded = new Map(); // (the shared constants, as JSON → the modules made with them)

async function load(shared) {
  const key = JSON.stringify(shared);
  if (!loaded.has(key)) {
    const [level, course, game] = await sources, art = url('../art.js');
    const lv = blob(setConsts(level, shared).replace(/from '\.\/art\.js'/g, `from '${art}'`));
    const cs = blob(setConsts(course, shared).replace(/from '\.\.\/art\.js'/g, `from '${art}'`).replace(/from '\.\.\/level\.js'/g, `from '${lv}'`)
      .replace(/process\.argv\[1\]/g, "''")); // (run as a script in node only)
    loaded.set(key, Promise.all([import(lv), import(cs), { ...readConsts(game), ...readConsts(course), ...shared }]));
  }
  return loaded.get(key);
}

// Getting the next animal: away from it till dawn, home at the den (see arrive in game.js), for a player who misses: each
// obstacle is run into with a chance (miss, at REF_SPEED; more, the faster it goes: less time to see it coming), which
// costs energy (BUMP, times the animal's bump), and while the chaser is after it a second bump before it has fallen back
// (RECOVER, DAY_RECOVER) is caught; it eats 4 in 5 of the food and the golden food (POWER_SECS without losing energy, the
// chaser falling back). The same course every time (as in the game), the misses at random (TRIALS runs, the same random
// numbers for every miss rate, so a higher one never does better).
//   → { secs (the first dawn, without a miss), score (there), half (the miss rate half the players get it at),
//       chance: [at each of SKILLS: getting home], lost: { caught, tired } (the runs lost at SKILLS[1], which way) }
export const SKILLS = [0.03, 0.06, 0.12];
const REF_SPEED = 220, TRIALS = 600, EATS = 0.8;
function unlocking(kind, level, c) {
  const a = ANIMALS[kind], n = level.nightAt(kind, 1), last = level.nightAt(kind, 3), track = level.course(kind), pieces = [];
  for (let p = track.next(); p.at * level.SCORE_PER_PX < last.to; p = track.next()) pieces.push(p);
  const steps = pieces.map((p, i) => {
    const s = p.at * level.SCORE_PER_PX, day = level.dayOf(kind, s), hunted = s >= level.nightAt(kind, day).hunt;
    const v = level.pace(kind, p.at) * (hunted ? level.CHASE : 1), end = i + 1 < pieces.length ? pieces[i + 1].at : last.to / level.SCORE_PER_PX;
    return { secs: (end - p.at) / v, risk: v / REF_SPEED, hunted, day, drain: level.drain(kind, s), meals: p.food.filter((f) => !f.sly).length, gold: !!p.gold,
      recover: 0.95 * (c.RECOVER + c.DAY_RECOVER * Math.min(6, level.hardness(kind, s))) };
  });
  const run = (miss, rnd, dawns = 1) => {
    let energy = 100, t = 0, bumped = -Infinity, power = 0, day = 1;
    for (const st of steps) {
      if (st.day > dawns) break;
      if (st.day !== day) { day = st.day; bumped = -Infinity; } // (the chaser gone at dawn)
      if (power <= 0 && rnd() < miss * st.risk) {
        energy -= c.BUMP * a.bump;
        if (energy <= 0) return 'tired';
        if (st.hunted) { if (t - bumped < st.recover) return 'caught'; bumped = t; }
      }
      if (st.gold && rnd() < EATS) { power = c.POWER_SECS; bumped = -Infinity; }
      const free = Math.min(power, st.secs);
      power -= free;
      energy -= st.drain * (st.secs - free);
      if (energy <= 0) return 'tired';
      for (let m = 0; m < st.meals; m++) if (rnd() < EATS) energy = Math.min(100, energy + c.MEAL);
      t += st.secs;
    }
    return 'free';
  };
  const runs = (miss, dawns) => {
    const rnd = level.random(level.seedOf(kind) ^ 0x5eed), out = { free: 0, caught: 0, tired: 0 };
    for (let i = 0; i < TRIALS; i++) out[run(miss, rnd, dawns)]++;
    return out;
  };
  let lo = 0, hi = 0.6;
  for (let i = 0; i < 14; i++) { const mid = (lo + hi) / 2; if (runs(mid).free >= TRIALS / 2) lo = mid; else hi = mid; }
  const at = runs(SKILLS[1]), lost = Math.max(1, at.caught + at.tired);
  return {
    secs: steps.filter((st) => st.day === 1).reduce((t, st) => t + st.secs, 0), score: n.to * a.mult + c.HOME, half: lo,
    chance: SKILLS.map((q) => runs(q).free / TRIALS), lost: { caught: at.caught / lost, tired: at.tired / lost },
  };
}

function measure(kind, [level, course, c]) {
  const a = ANIMALS[kind], meal = c.MEAL;
  return {
    next: unlocking(kind, level, c),
    all: course.starves(kind), some: course.starves(kind, 0.8), cycle: level.nightAt(kind, 1).to, mult: a.mult,
    jumpH: jumpHeight(kind), air: (2 * JUMP * a.jump) / (GRAVITY * a.gravity),
    days: course.days(kind, 8).map((d) => ({ speed: d.speed, every: d.every, sees: d.sees, food: d.food * meal, drain: d.drain })),
  };
}

onmessage = async ({ data: { roster, shared, kinds } }) => {
  try {
    setAnimals(roster);
    const mods = await load(shared);
    for (const kind of kinds) postMessage({ kind, m: measure(kind, mods) });
    postMessage({ done: true });
  } catch (e) {
    postMessage({ error: String(e.stack || e) });
  }
};
