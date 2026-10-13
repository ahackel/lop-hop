// The constants all the animals share (level.js unless said; MEAL also game.js and tools/course.mjs; the bumps game.js):
// each [name, label, min, max, step, what it does, unit, the files it is in], in groups. Set on the settings page
// (settings.js), tried on the balance page (balance.js); written by POST /consts (see serve.mjs)
import { readConsts } from './balance-format.js';

export const SHARED = [
  ['Speed', [
    ['START_SPEED', 'Start', 60, 200, 5, 'as a run starts', 'px/s'],
    ['ACCEL', 'Accel', 0.5, 8, 0.1, 'how quickly it speeds up as it runs'],
    ['MAX_SPEED', 'Top', 150, 400, 5, 'top speed on the first day', 'px/s'],
    ['DAY_SPEED', 'Day speed', 0, 60, 1, 'top speed added every day of hardness', 'px/s'],
    ['KNEE', 'Knee', 100, 450, 5, 'past this, the speed rises ever more slowly…', 'px/s'],
    ['TOP', 'Ceiling', 150, 600, 5, '…never reaching this', 'px/s'],
    ['CHASE', 'Chase', 1, 1.4, 0.01, 'the world goes this much faster while chased', '×'],
  ]],
  ['Days and nights', [
    ['DAY', 'Day', 400, 3000, 50, 'a day’s run', 'pts'],
    ['NIGHT', 'Night', 200, 2000, 50, 'a night’s run (times the animal’s speed)', 'pts'],
    ['HUNT', 'Hunt', 0, 600, 10, 'the chaser comes this far into the night', 'pts'],
    ['HEAD', 'Head start', 0, 0.3, 0.005, 'each animal after the first starts this much harder', 'days'],
  ]],
  ['Obstacles', [
    ['DAY_TIGHT', 'Day tight', 0, 0.2, 0.005, 'gaps closer every day…'],
    ['MIN_TIGHT', 'Min tight', 0.3, 1, 0.01, '…down to this', '×'],
    ['DAY_CROWS', 'Day crows', 0, 0.1, 0.005, 'more crows every day (branches twice as many)'],
    ['MOST_CROWS', 'Most crows', 0, 1, 0.01, 'at most this share of obstacles crows'],
    ['MOST_BRANCHES', 'Most branches', 0, 1, 0.01, '… and branches'],
    ['DAY_PACKS', 'Day packs', 0, 1, 0.01, 'packs more often every day'],
    ['BRANCHES_FROM', 'Branches from', 0, 1000, 10, 'into a run', 'pts'],
    ['CROWS_FROM', 'Crows from', 0, 1000, 10, 'into a run', 'pts'],
    ['REACT', 'React', 0.05, 0.4, 0.01, 'the least time to act after landing', 's'],
  ]],
  ['Energy and food', [
    ['DRAIN', 'Drain', 0.5, 5, 0.05, 'energy lost a second (of 100)', '/s'],
    ['DAY_DRAIN', 'Day drain', 0, 1, 0.01, 'more tiring every day'],
    ['DAY_FOOD', 'Day food', 0, 0.2, 0.005, 'food rarer every day…'],
    ['LEAST_FOOD', 'Least food', 0, 1, 0.01, '…down to this'],
    ['MEAL', 'Meal', 4, 30, 1, 'energy from one food (of 100)', '', ['game.js', 'tools/course.mjs']],
  ]],
  ['Bumps and the chase', [
    ['BUMP', 'Bump', 5, 60, 1, 'energy a bump costs (of 100, times the place’s bump)', '', ['game.js']],
    ['RECOVER', 'Recover', 1, 15, 0.5, 'how long the chaser takes to fall back after a bump (a second bump before: caught)', 's', ['game.js']],
    ['DAY_RECOVER', 'Day recover', 0, 5, 0.25, 'more every day of hardness', 's', ['game.js']],
  ]],
  ['Golden food', [
    ['GOLD_FIRST', 'First', 0, 1000, 10, 'the first some this many points in', 'pts'],
    ['DAY_GOLD', 'Day gold', 0, 0.5, 0.01, 'rarer every day'],
  ]],
].map(([group, items]) => ({ group, items: items.map(([key, label, min, max, step, help, unit = '', files = ['level.js']]) => ({ key, label, min, max, step, help, unit, files, file: files[0] })) }));
export const SHARED_BY_KEY = Object.fromEntries(SHARED.flatMap((g) => g.items.map((d) => [d.key, d])));
export const MAIN = ['START_SPEED', 'MAX_SPEED', 'DAY', 'NIGHT', 'DRAIN', 'MEAL']; // (the shared ones shown first; the rest: ⚙)

// each as the files have it now (read from them: their numbers, see balance-format.js)
export async function inFiles() {
  const [level, course, game] = await Promise.all(['../level.js', './course.mjs', '../game.js'].map((p) => fetch(new URL(p, import.meta.url)).then((r) => r.text())));
  return { ...readConsts(game), ...readConsts(level), MEAL: readConsts(course).MEAL };
}
// the changed ones ({ NAME: v }) as POST /consts takes them: each into the files it is in
export const byFile = (changed) => { const into = {}; for (const [n, v] of Object.entries(changed)) for (const f of SHARED_BY_KEY[n].files) (into[f] ||= {})[n] = v; return into; };
