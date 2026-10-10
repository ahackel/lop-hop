// node tools/test.mjs — the song plays well with the engine (healthy audio, every mood reached, every stinger heard),
// the art keeps its promises (every animal stands tall enough to hit a branch and ducks under it), and all of it runs on
// Safari 15 (tools/old-safari.mjs).
import { oldSafari } from './old-safari.mjs'; // (first: it takes away what Safari 15 lacks before the rest loads)
import { readFileSync, existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { Engine } from '../engine/src/engine/engine.js';
import { openSongZip } from '../engine/src/bundle.js';
import { loadSamples, songSamples } from '../engine/src/samples.js';
import { courseOf, playThrough, days, starves } from './course.mjs';
import { songFor, STYLES } from '../music.js';
import { pace, drain, meals, CHASE, TOP } from '../level.js';
import { animal, ANIMALS, FOOT, GROUND, DUCK_UNDER, CROW_BOTTOM, branch, moveBody, stride, idleFrame, jumpHeight, FOOD } from '../art.js';

let failed = 0;
const ok = (cond, msg) => { console.log(`${cond ? '✓' : '✗'} ${msg}`); if (!cond) failed++; };

// the song, from its zip (song.zip: the editor's Export for a game), with the recordings it plays
const SR = 44100, { song, read } = await openSongZip(readFileSync(new URL('../song.zip', import.meta.url)));
const e = new Engine(SR, song, 3), recordings = await loadSamples(read, songSamples(song)).catch((err) => err);
ok(!(recordings instanceof Error), `song.zip holds every recording the song plays (${songSamples(song)})${recordings instanceof Error ? ` — ${recordings.message}` : ''}`);
e.setSamples(recordings instanceof Error ? {} : recordings);
function run(secs, onBlock) {
  const L = new Float32Array(128), R = new Float32Array(128);
  let peak = 0, bad = 0;
  for (let i = 0, n = Math.round(secs * SR); i < n; i += 128) {
    onBlock?.(e);
    e.process(L, R, 128);
    for (let j = 0; j < 128; j++) { if (!Number.isFinite(L[j])) bad++; peak = Math.max(peak, Math.abs(L[j])); }
  }
  return { peak, bad };
}
const h = run(90);
ok(h.bad === 0 && h.peak > 0.1 && h.peak < 1, `the song plays healthy audio (peak ${h.peak.toFixed(2)})`);
const far = [];
for (const mood of Object.keys(song.moods)) {
  e.setMood(mood);
  let got = false;
  run(40, (en) => { got ||= en.inMood(en.section); en.drainEvents(); });
  if (!got) far.push(`${mood}→${e.section.id}`);
}
ok(!far.length, `every mood reaches its section within 40 s${far.length ? ` — ${far.join(', ')}` : ''}`);
const silent = song.stingers.filter((x) => {
  e.drainEvents();
  e.sting(x.id);
  let notes = 0;
  run((x.beats * 60) / song.bpm + 1, (en) => { for (const ev of en.drainEvents()) if (ev.type === 'note') notes++; });
  return !notes;
}).map((x) => x.id);
ok(!silent.length, `every stinger plays (${song.stingers.map((x) => x.id)})${silent.length ? ` — silent: ${silent}` : ''}`);
// a super power lasts 8 s: its music has to come at once (within: 0, the next bar line) and leave as fast
{
  e.setMood('exploring');
  run(30, (en) => en.drainEvents());
  e.setMood('power', { within: 0 });
  let at = null, t = 0;
  run(4, (en) => { t += 128 / SR; if (at === null && en.section?.id === 'star') at = t; en.drainEvents(); });
  e.setMood('exploring', { within: 0 });
  let back = null; t = 0;
  run(4, (en) => { t += 128 / SR; if (back === null && en.section?.id !== 'star') back = t; en.drainEvents(); });
  ok(at !== null && at < 2 && back !== null && back < 2, `the power music comes within ${at?.toFixed(1)} s and leaves within ${back?.toFixed(1)} s`);
}
// every animal's song (music.js): the song in its colours, healthy, in a mode the chords stay sweet in, its motif two
// bars long, its menu happy (major) whatever its mode (and the rabbit's the song as it is)
{
  const steps = (p) => p.split('|').map((bar) => bar.trim().split(/\s+/).reduce((n, t) => n + (/^\.\*(\d+)$/.test(t) ? +t.slice(2) : 1), 0));
  const off = [];
  for (const kind of Object.keys(ANIMALS)) {
    const st = STYLES[kind], s = songFor(song, kind), en = new Engine(SR, s, 5);
    en.setSamples(recordings instanceof Error ? {} : recordings);
    const L = new Float32Array(128), R = new Float32Array(128), menu = new Set();
    let peak = 0, bad = 0;
    const play = (secs) => { for (let i = 0; i < secs * SR; i += 128) { en.process(L, R, 128); for (const ev of en.drainEvents()) if (ev.type === 'chord' && en.section?.id === 'nest') menu.add(ev.scale); for (let j = 0; j < 128; j++) { if (!Number.isFinite(L[j])) bad++; peak = Math.max(peak, Math.abs(L[j])); } } };
    en.setMood('menu'); play(10);
    en.setMood('action'); play(5);
    const why = [!st && 'no style', bad && 'not finite', (peak < 0.1 || peak >= 1) && `peak ${peak.toFixed(2)}`,
      !['major', 'mixolydian', 'minor', 'harmonicMinor'].includes(s.scale) && s.scale,
      kind !== 'rabbit' && st?.motif && steps(st.motif).join() !== '16,16' && `motif ${steps(st.motif)}`,
      (!menu.size || [...menu].some((x) => x !== 'major')) && `menu in ${[...menu].join(', ') || 'nothing'}`].filter(Boolean);
    if (why.length) off.push(`${kind}: ${why.join(', ')}`);
  }
  ok(!off.length && JSON.stringify(songFor(song, 'rabbit')) === JSON.stringify(song), `every animal has its own song, healthy, each motif two bars, its menu in major${off.length ? ` — ${off.join('; ')}` : ''}`);
}
const used = readFileSync(new URL('../game.js', import.meta.url), 'utf8');
const calls = [...used.matchAll(/call\('sting', '(\w+)'\)/g)].map((m) => m[1]);
ok(calls.every((id) => song.stingers.some((x) => x.id === id)), `every stinger the game calls is in the song (${[...new Set(calls)]})`);

// the art: heights in rows above the ground, the ground row included
const maskRows = (s) => [...s.mask.keys()].filter((i) => s.mask[i]).map((i) => Math.floor(i / s.w) + (s.oy || 0)); // (in the box)
const rows = (s) => FOOT - Math.min(...maskRows(s)) + 1;
const aBranch = branch(Math.random), branchBottom = aBranch.oy + Math.max(...[...aBranch.mask.entries()].filter(([, v]) => v).map(([i]) => Math.floor(i / aBranch.w)));
for (const k of Object.keys(ANIMALS)) {
  const frames = (move) => [...new Set([...Array(64).keys()].map((i) => stride(k, i / 64, move).frame))]; // (every frame of its stride)
  const stand = frames('run').map((f) => rows(animal(k, 'run', f))), duck = frames('duck').map((f) => rows(animal(k, 'duck', f)));
  ok(Math.min(...stand) >= GROUND - DUCK_UNDER + 4 && Math.max(...duck) <= GROUND - DUCK_UNDER - 1,
    `the ${k} runs into what hangs low (${Math.min(...stand)} rows tall) and ducks under it (${Math.max(...duck)} rows)`);
}
// an animal stands on the ground in every pose (its frames end on the feet's row, none below it), and its chains
// stay whole as its body runs, jumps, ducks and falls (easing from move to move, squashed as it lands: nothing below the
// ground then either)
for (const k of Object.keys(ANIMALS)) {
  const every = (move, n) => [...new Set([...Array(n).keys()].map((i) => (move === 'idle' ? idleFrame(k, i / 10) : stride(k, i / n, move).frame)))].map((f) => [move, f]);
  const poses = [...every('run', 64), ['jump', 0], ['jump', 1], ...every('duck', 64), ...every('idle', 200), ['hurt', 0], ['ko', 0]];
  const leaps = [...Array(64).keys()].some((i) => stride(k, i / 64).lift > 0); // (a leap's frames may be in the air: none below the ground then)
  const low = poses.filter(([p]) => p !== 'jump' && p !== 'ko').map(([p, f]) => { const s = animal(k, p, f); return p === 'run' && leaps ? s.oy + s.h - 1 <= FOOT : s.oy + s.h - 1 === FOOT && s.px.slice(-s.w).some(Boolean); }); // (its last row: the feet's, drawn)
  const body = {}, moves = [['run', 0, 0], ['jump', 0, -20], ['jump', 1, -10], ['run', 1, 0], ['duck', 0, 0], ['run', 2, 0], ['hurt', 0, 0], ['duck', 1, 0], ['ko', 0, 0], ['idle', 1, 0]];
  let whole = true;
  for (let i = 0; i < 900; i++) {
    const [p, f, up] = moves[Math.floor(i / 90) % moves.length];
    moveBody(body, k, p, f, 20, 59 + up * Math.sin((i % 90) / 90 * Math.PI), 200, 1 / 60);
    const s = animal(k, p, f, { body });
    whole &&= Object.values(body.chains).every((c) => c.every((q) => Number.isFinite(q.p[0]) && Number.isFinite(q.p[1]))) && s.w < 60 && s.h < 60 && s.oy + s.h - 1 <= FOOT;
  }
  ok(low.every(Boolean) && whole, `the ${k}'s rig stands on the ground in every pose, its chains stay whole in motion`);
}
// every animal's build is written the way the workshop saves it (so a save changes only what was edited): in its file,
// or in its asset (assets/<kind>.js, see asset.js), which a save writes back just as it was
{
  const { spliceBuild, formatAsset } = await import('./rig-format.js'), { fromRig, toBuild, toDepth } = await import('../asset.js');
  const off = [];
  for (const k of Object.keys(ANIMALS)) {
    const url = new URL(`../animals/${k}.js`, import.meta.url), src = readFileSync(url, 'utf8'), { build } = await import(url);
    const assetUrl = new URL(`../assets/${k}.js`, import.meta.url);
    if (existsSync(assetUrl)) {
      const { default: a } = await import(assetUrl), text = readFileSync(assetUrl, 'utf8');
      if (formatAsset(a) !== text || formatAsset(fromRig(k, toBuild(a), toDepth(a))) !== text) off.push(`${k} (its asset)`);
    } else if (spliceBuild(src, build) !== src) off.push(k);
  }
  ok(!off.length, `every animal's build is in the workshop's format${off.length ? ` — npm run rigs: ${off}` : ''}`);
}
// every animal jumps the tallest cactus (20 high), even the heavy ones
const heights = Object.keys(ANIMALS).map((k) => [k, Math.round(jumpHeight(k))]);
ok(heights.every(([, h]) => h >= 24), `every animal jumps high enough (${heights.map(([k, h]) => `${k} ${h}`).join(', ')})`);
const mults = Object.values(ANIMALS).map((t) => t.mult);
ok(mults.every((m, i) => !i || m > mults[i - 1]), `each animal counts more than the one before (${mults.join(', ')})`);
ok(branchBottom <= DUCK_UNDER && branchBottom >= DUCK_UNDER - 2, `branches end just above a ducking animal (row ${branchBottom})`);
ok(CROW_BOTTOM > 0, 'crows have a lowest row');
// every animal has its food, and its file is kept for playing offline (sw.js)
const sw = readFileSync(new URL('../sw.js', import.meta.url), 'utf8'), missing = Object.keys(ANIMALS).filter((k) => !FOOD[ANIMALS[k].food] || !sw.includes(`'animals/${k}.js'`));
ok(!missing.length, `every animal has its food and is kept offline${missing.length ? ` — not: ${missing}` : ''}`);

// the courses (level.js): the same every run, the next animal's another; every one can be got past (a player who
// presses only every tenth of a second, at a chase's speed or not); harder every day, with no end of food (a run
// ends); a little harder with every animal, every one getting through its first night (to unlock the next)
const KINDS = Object.keys(ANIMALS);
const looks = (kind) => JSON.stringify(courseOf(kind, 3000).map((p) => [p.at, p.items.map((o) => [o.kind, o.dx, o.y, o.sprite.w, o.sprite.h, o.sprite.px?.join('')]), p.food, p.gold]));
ok(looks('rabbit') === looks('rabbit') && looks('rabbit') !== looks('cat'), 'a course is the same every run, each animal its own');
const stuck = KINDS.flatMap((k) => [1, CHASE].map((c) => [k, c, playThrough(k, 6, c)])).filter(([, , r]) => r);
ok(!stuck.length, `every course can be got past, six days and nights${stuck.map(([k, c, r]) => `\n  ${k}${c > 1 ? ' (chased)' : ''} at ${r.s}: ${r.near.join(', ')}`).join('')}`);
const ramp = KINDS.filter((k) => { const d = days(k, 6); return d.some((x, i) => i && (x.speed < Math.min(d[i - 1].speed + 1, TOP - 2) || x.drain <= d[i - 1].drain)) || d[5].every >= d[0].every * 0.8; });
ok(!ramp.length, `every day is faster (up to the top speed) and more tiring, obstacles closer by the sixth${ramp.length ? ` — not: ${ramp}` : ''}`);
const ends = KINDS.map((k) => [k, starves(k, 0.8)]);
ok(ends.every(([, d], i) => d && d >= 2.2 && d <= 8 && (!i || d <= ends[i - 1][1] + 0.5)) && ends[0][1] - ends[ends.length - 1][1] >= 2,
  `eating 4 in 5, energy runs out after the first night and by day 8, sooner with every animal (${ends.map(([k, d]) => `${k} ${d}`).join(', ')})`);
const dial = (f) => KINDS.every((k, i) => !i || f(k) > f(KINDS[i - 1]));
ok(dial((k) => pace(k, 20000)) && dial((k) => drain(k, 0)) && dial((k) => -meals(k, 0)),
  'every animal runs faster, tires sooner and finds less food than the one before');

// every language (lang/<code>.txt): English has every id the game writes (whatever it passes to t, the buttons' and
// the credits', the animals', the super powers'), and no other; every other language the same ids; all of it in
// letters the font has, and short enough: a line of help across the screen (with the longest animal), a button's word
// in its frame
const { parseLang, LANGS } = await import('../lang.js'), { GLYPHS } = await import('../font.js');
const src = readFileSync(new URL('../game.js', import.meta.url), 'utf8');
const ID = /^(page|button|title|run|end|scores|credits|gate|shop)\.[a-z_]+$/;
const shakers = [...src.slice(src.indexOf('const POWERS'), src.indexOf('};', src.indexOf('const POWERS'))).matchAll(/(\w+): \{[^}]*shakes: true/g)].map((m) => m[1]);
const wanted = new Set([...[...src.matchAll(/'([a-z_.]+)'/g)].map((m) => m[1]).filter((s) => ID.test(s)), ...['bumped', 'tired', 'caught'].map((w) => `end.${w}`),
  ...KINDS.flatMap((k) => [`animal.${k}`, `animal.${k}.the`, `power.${k}`]), ...shakers.map((k) => `power.${k}.shaken`)]);
const langs = Object.fromEntries(LANGS.map((l) => [l, parseLang(readFileSync(new URL(`../lang/${l}.txt`, import.meta.url), 'utf8'))]));
const longest = (table) => KINDS.map((k) => table[`animal.${k}.the`] || '').sort((a, b) => b.length - a.length)[0];
for (const [lang, table] of Object.entries(langs)) {
  const want = lang === 'en' ? wanted : new Set(Object.keys(langs.en)), missing = [...want].filter((id) => !(id in table)), stale = Object.keys(table).filter((id) => !want.has(id));
  ok(!missing.length && !stale.length, `lang/${lang}.txt has every id the game writes, and no other${missing.length ? ` — missing: ${missing.join(', ')}` : ''}${stale.length ? ` — not written: ${stale.join(', ')}` : ''}`);
  const game = Object.entries(table).filter(([id]) => !id.startsWith('page.')), unknown = game.filter(([, v]) => [...v.replace(/\{\w+\}/g, '')].some((c) => !GLYPHS[c]));
  ok(!unknown.length, `lang/${lang}.txt: only letters the font has${unknown.length ? ` — not: ${unknown.map(([, v]) => v).join(' | ')}` : ''}`);
  const fill = (v) => v.replace(/\{the\}/g, longest(table)).replace(/\{name\}/g, longest(table)).replace(/\{n\}/g, '999');
  const wide = game.filter(([id, v]) => fill(v).length > 70 || (id.startsWith('button.') && v.length > 7));
  ok(!wide.length, `lang/${lang}.txt: every line fits the screen, every button's word its frame${wide.length ? ` — not: ${wide.map(([, v]) => fill(v)).join(' | ')}` : ''}`);
  const holes = (v) => (v.match(/\{\w+\}/g) || []).sort().join(), odd = Object.entries(table).filter(([id, v]) => holes(v) !== holes(langs.en[id] || '') || /\{\w*[A-Z]/.test(v));
  ok(!odd.length, `lang/${lang}.txt: what goes in ({name}, {the}, {n}) as in English${odd.length ? ` — not: ${odd.map(([id]) => id).join(', ')}` : ''}`);
  ok(sw.includes(`'lang/${lang}.txt'`), `lang/${lang}.txt is kept offline (sw.js)`);
}

// the older iPad (Safari 15): nothing newer than it without a fallback
const newer = oldSafari();
ok(!newer.length, `nothing newer than Safari 15 without a fallback${newer.length ? `:\n  ${newer.join('\n  ')}` : ''}`);

// every file of the game parses (the rest above loads only some of them: a slip in game.js would pass, and the page stay blank)
const broken = ['game.js', 'art.js', 'font.js', 'asset.js', 'level.js', 'music.js', 'lang.js', 'version.js'].filter((f) => {
  try { execFileSync(process.execPath, ['--check', new URL(`../${f}`, import.meta.url).pathname], { stdio: 'pipe' }); return false; } catch { return true; }
});
ok(!broken.length, `every file of the game parses${broken.length ? ` (not ${broken.join(', ')}: node --check says why)` : ''}`);

console.log(failed ? `\n${failed} failed` : '\nall passed');
process.exit(failed ? 1 : 0);
