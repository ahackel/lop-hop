// The balance page (npm run dev, then /balance, balance/index.html): every animal's dials (art.js) and the constants all the
// animals share (level.js; MEAL: game.js), changed with sliders, and what they come to, worked out by the game's own
// code (tools/course.mjs, in balance-worker.js): how hard it is to get the next animal (away from it till the first
// dawn, for a player who misses now and then), how long a run lasts for a player who never misses (eating all the
// food, or 4 in 5), the score it reaches, how fast it goes, how much warning an obstacle gives; for all the animals in
// a row (the ladder: is each harder than the one before?) and for one, day by day. What was there before shows faintly
// behind. The changes are kept in this browser (not yet written to the files).
import { ANIMALS, PALETTES, FOOD, animal } from '../art.js';
import { chaserOf } from '../level.js';
import { readConsts } from './balance-format.js';

const KINDS = Object.keys(ANIMALS);
const $ = (id) => document.getElementById(id);
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => `&${{ '&': 'amp', '<': 'lt', '>': 'gt', '"': 'quot' }[c]};`);
const decimals = (step) => (String(step).split('.')[1] || '').length;
const fmt = (v, step) => (+v).toFixed(decimals(step));
const same = (a, b) => Math.abs(a - b) < 1e-9;
const nameOf = (k) => ANIMALS[k].name.toLowerCase();

// ------------------------------------------------------------------------------------------------------ the dials
// an animal's (see tune in art.js), and the shared ones: [name, label, min, max, step, what it does] (file: level.js
// unless said)
const DIALS = [
  ['mult', 'Score ×', 0.5, 5, 0.01, 'its points count this many times'],
  ['speed', 'Speed', 0.8, 1.8, 0.005, 'start and top speed'],
  ['jump', 'Jump', 0.8, 1.3, 0.01, 'how fast it leaves the ground'],
  ['gravity', 'Gravity', 0.7, 1.5, 0.01, 'how fast it falls back'],
  ['drain', 'Drain', 0.6, 2.2, 0.005, 'energy lost a second'],
  ['meals', 'Meals', 0.4, 1.3, 0.002, 'how often food comes'],
  ['bump', 'Bump', 0.6, 2.2, 0.005, 'what a bump costs'],
  ['early', 'Early', 0, 500, 25, 'crows and branches this many points sooner'],
  ['packs', 'Packs', 0.5, 3.5, 0.05, 'obstacles in groups'],
  ['tight', 'Tight', 0.5, 1.2, 0.005, 'gaps between obstacles (less: closer)'],
].map(([key, label, min, max, step, help]) => ({ key, label, min, max, step, help }));
const SHARED = [
  ['Speed', [
    ['START_SPEED', 'Start', 60, 200, 5, 'px/s as a run starts'],
    ['ACCEL', 'Accel', 0.5, 8, 0.1, 'how quickly it speeds up as it runs'],
    ['MAX_SPEED', 'Top', 150, 400, 5, 'top speed on the first day (px/s)'],
    ['DAY_SPEED', 'Day speed', 0, 60, 1, 'top speed added every day of hardness'],
    ['KNEE', 'Knee', 200, 450, 5, 'past this, the speed rises ever more slowly…'],
    ['TOP', 'Ceiling', 300, 600, 5, '…never reaching this'],
    ['CHASE', 'Chase', 1, 1.4, 0.01, 'the world goes this much faster while chased'],
  ]],
  ['Days and nights', [
    ['DAY', 'Day', 400, 3000, 50, 'a day’s run (points)'],
    ['NIGHT', 'Night', 200, 2000, 50, 'a night’s run (points, times the animal’s speed)'],
    ['HUNT', 'Hunt', 0, 600, 10, 'the chaser comes this far into the night'],
    ['HEAD', 'Head start', 0, 0.3, 0.005, 'each animal after the rabbit starts this much harder (days)'],
  ]],
  ['Obstacles', [
    ['DAY_TIGHT', 'Day tight', 0, 0.2, 0.005, 'gaps closer every day…'],
    ['MIN_TIGHT', 'Min tight', 0.3, 1, 0.01, '…down to this'],
    ['DAY_CROWS', 'Day crows', 0, 0.1, 0.005, 'more crows every day (branches twice as many)'],
    ['MOST_CROWS', 'Most crows', 0, 1, 0.01, 'at most this share of obstacles crows'],
    ['MOST_BRANCHES', 'Most branches', 0, 1, 0.01, '… and branches'],
    ['DAY_PACKS', 'Day packs', 0, 1, 0.01, 'packs more often every day'],
    ['BRANCHES_FROM', 'Branches from', 0, 1000, 10, 'points into a run'],
    ['CROWS_FROM', 'Crows from', 0, 1000, 10, 'points into a run'],
    ['REACT', 'React', 0.05, 0.4, 0.01, 'the least time to act after landing (s)'],
  ]],
  ['Energy and food', [
    ['DRAIN', 'Drain', 0.5, 5, 0.05, 'energy lost a second (of 100)'],
    ['DAY_DRAIN', 'Day drain', 0, 1, 0.01, 'more tiring every day'],
    ['DAY_FOOD', 'Day food', 0, 0.2, 0.005, 'food rarer every day…'],
    ['LEAST_FOOD', 'Least food', 0, 1, 0.01, '…down to this'],
    ['MEAL', 'Meal', 4, 30, 1, 'energy from one food', 'game.js'],
  ]],
  ['Bumps and the chase', [
    ['BUMP', 'Bump', 5, 60, 1, 'energy a bump costs (times the animal’s bump)', 'game.js'],
    ['RECOVER', 'Recover', 1, 15, 0.5, 'seconds the chaser takes to fall back after a bump (a second bump before: caught)', 'game.js'],
    ['DAY_RECOVER', 'Day recover', 0, 5, 0.25, 'seconds more every day of hardness', 'game.js'],
  ]],
  ['Golden food', [
    ['GOLD_FIRST', 'First', 0, 1000, 10, 'the first some this many points in'],
    ['DAY_GOLD', 'Day gold', 0, 0.5, 0.01, 'rarer every day'],
  ]],
].map(([group, items]) => ({ group, items: items.map(([key, label, min, max, step, help, file = 'level.js']) => ({ key, label, min, max, step, help, file })) }));
const SHARED_BY_KEY = Object.fromEntries(SHARED.flatMap((g) => g.items.map((d) => [d.key, d])));
const DIAL_BY_KEY = Object.fromEntries(DIALS.map((d) => [d.key, d]));

const ORIG = Object.fromEntries(KINDS.map((k) => [k, Object.fromEntries(DIALS.map((d) => [d.key, ANIMALS[k][d.key]]))]));
const [levelSrc, courseSrc, gameSrc] = await Promise.all(['../level.js', './course.mjs', '../game.js'].map((p) => fetch(new URL(p, import.meta.url)).then((r) => r.text())));
const DEFAULTS = { ...readConsts(gameSrc), ...readConsts(levelSrc), MEAL: readConsts(courseSrc).MEAL };
const SKILLS = [0.03, 0.06, 0.12]; // (the miss rates the worker tries: see unlocking in balance-worker.js)
const pct = (v) => `${(v * 100).toFixed(v < 0.1 ? 1 : 0)}%`;
const oneIn = (q) => (q > 0 ? `1 in ${Math.round(1 / q)}` : 'none');

// the changes: { dials: { kind: { key: v } }, shared: { NAME: v } }, kept in this browser
const STORE = 'lop.balance';
let edits = { dials: {}, shared: {} };
try {
  const e = JSON.parse(localStorage.getItem(STORE));
  for (const k in e?.dials || {}) for (const key in e.dials[k]) if (ORIG[k] && DIAL_BY_KEY[key] && !same(e.dials[k][key], ORIG[k][key])) (edits.dials[k] ||= {})[key] = +e.dials[k][key];
  for (const n in e?.shared || {}) if (SHARED_BY_KEY[n] && !same(e.shared[n], DEFAULTS[n])) edits.shared[n] = +e.shared[n];
} catch { /* none */ }
const keep = () => { try { localStorage.setItem(STORE, JSON.stringify(edits)); } catch { /* no storage */ } };
const dialOf = (k, key) => edits.dials[k]?.[key] ?? ORIG[k][key];
const sharedOf = (n) => edits.shared[n] ?? DEFAULTS[n];
const dialsNow = () => Object.fromEntries(KINDS.map((k) => [k, { ...ORIG[k], ...edits.dials[k] }]));
const changes = () => Object.values(edits.dials).reduce((t, d) => t + Object.keys(d).length, 0) + Object.keys(edits.shared).length;

let sel = KINDS.includes(localStorage.getItem(`${STORE}.kind`)) ? localStorage.getItem(`${STORE}.kind`) : 'rabbit';
let metric = localStorage.getItem(`${STORE}.metric`) || 'next';
const view = () => (location.hash === '#shared' ? 'shared' : 'animals');

// ----------------------------------------------------------------------------------------------- the numbers
// worked out in workers: once as it was (base), and again after every change (now; a change cancels what is still
// being worked out, and it starts again with what is left, the animal looked at first)
const base = {}, now = {};
const pending = new Set(KINDS);
const firstSel = (ks) => [...ks].sort((a, b) => (b === sel) - (a === sel) || KINDS.indexOf(a) - KINDS.indexOf(b));
const spawn = () => new Worker(new URL('./balance-worker.js', import.meta.url), { type: 'module' });
let error = '', mirror = !changes(); // (no changes yet: now is as it was)
const baseWorker = spawn();
baseWorker.onmessage = ({ data }) => {
  if (data.error) error = data.error;
  if (data.kind) base[data.kind] = data.m;
  if (data.kind && mirror) { now[data.kind] = data.m; pending.delete(data.kind); }
  if (data.kind || data.error) redraw();
};
baseWorker.postMessage({ dials: ORIG, shared: {}, kinds: firstSel(KINDS) });

let live = null, busy = false, timer = 0;
function recompute(kinds) {
  mirror = false;
  for (const k of kinds) pending.add(k);
  status();
  clearTimeout(timer);
  timer = setTimeout(() => {
    if (live && busy) { live.terminate(); live = null; }
    if (!live) {
      live = spawn();
      live.onmessage = ({ data }) => {
        if (data.error) { error = data.error; busy = false; }
        if (data.kind) { now[data.kind] = data.m; pending.delete(data.kind); }
        if (data.done) busy = false;
        redraw();
      };
    }
    busy = true;
    live.postMessage({ dials: dialsNow(), shared: edits.shared, kinds: firstSel(pending) });
  }, 120);
}

function status() {
  const s = $('status'), n = pending.size;
  s.textContent = n ? `working out ${n === 1 ? nameOf([...pending][0]) : `${KINDS.length - n} of ${KINDS.length}`}…` : changes() ? `${changes()} change${changes() > 1 ? 's' : ''}, kept in this browser` : 'as in the files';
  s.classList.toggle('busy', !!n);
  $('resetAll').disabled = !changes();
}

// ------------------------------------------------------------------------------------------------------- pictures
const pal = matchMedia('(prefers-color-scheme: dark)').matches ? PALETTES.night : PALETTES.day;
const pics = {};
function pic(k) { // its idle pose, feet on the ground (44×30 art pixels)
  if (!pics[k]) {
    const c = document.createElement('canvas');
    c.width = 44; c.height = 30;
    animal(k, 'idle', 0).draw(c.getContext('2d'), 10, 7, pal);
    pics[k] = c;
  }
  return pics[k];
}
const picURL = {};
const picOf = (k) => (picURL[k] ||= pic(k).toDataURL());
function foodPic(k) {
  const f = FOOD[ANIMALS[k].food], c = document.createElement('canvas');
  c.width = f.w; c.height = f.h;
  f.draw(c.getContext('2d'), 0, 0, pal);
  return c;
}

// --------------------------------------------------------------------------------------------------------- ladder
// what the ladder shows: the bar, and a dot (if any), from an animal's numbers; up / down: which way it should go
// from one animal to the next (harder), so one that goes the other way is marked
const days = (v) => v ?? 12; // (null: not within 12 days)
const daysText = (v) => (v == null ? '12+' : v.toFixed(1));
const METRICS = {
  next: { label: 'Getting the next one', bar: (m) => m.next.half * 100, text: (v) => `${v.toFixed(1)}%`, expect: 'down',
    note: 'how many obstacles a player can run into (at the rabbit’s first speed; more when faster) and still get home at dawn (away from the next animal), half the time' },
  nextChance: { label: 'Chance to get home', bar: (m) => m.next.chance[1] * 100, dot: (m) => m.next.chance[0] * 100, text: (v) => `${Math.round(v)}%`, expect: 'down',
    note: `bars: the chance to get home (and the next animal), running into ${oneIn(SKILLS[1])} obstacles; dots: ${oneIn(SKILLS[0])}` },
  days: { label: 'Days lasted', bar: (m) => days(m.all), dot: (m) => days(m.some), text: daysText, raw: (m) => m.all, expect: 'down',
    note: 'bars: days a player who never misses lasts, eating all the food; dots: eating 4 in 5' },
  score: { label: 'Score reached', bar: (m) => (days(m.some) - 1) * m.cycle * m.mult, text: (v) => Math.round(v / 100) / 10 + 'k', expect: null,
    note: 'the score where energy runs out, eating 4 in 5 (distance × the animal’s score multiplier)' },
  speed: { label: 'Speed, day 1', bar: (m) => m.days[0].speed, text: (v) => Math.round(v), expect: 'up', note: 'how fast the world goes on the first day, on average (px/s)' },
  sees: { label: 'Warning, day 2', bar: (m) => m.days[1].sees, text: (v) => v.toFixed(2), expect: 'down', note: 'seconds an obstacle is on the screen before it reaches the animal, on day 2' },
  every: { label: 'Obstacles, day 2', bar: (m) => m.days[1].every, text: (v) => v.toFixed(2), expect: 'down', note: 'an obstacle every so many seconds on day 2' },
  jump: { label: 'Jump height', bar: (m) => m.jumpH, text: (v) => Math.round(v), expect: null, note: 'how high its feet get, the jump held (px)' },
};
const metricSel = $('metric');
metricSel.innerHTML = Object.entries(METRICS).map(([k, m]) => `<option value="${k}">${m.label}</option>`).join('');
if (!METRICS[metric]) metric = 'next';
metricSel.value = metric;
metricSel.onchange = () => { metric = metricSel.value; localStorage.setItem(`${STORE}.metric`, metric); redraw(); };

function niceMax(v) {
  const p = 10 ** Math.floor(Math.log10(v || 1)), n = v / p;
  return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 2.5 ? 2.5 : n <= 5 ? 5 : 10) * p;
}

function outOfOrder(M, vals) { // the animals that go the wrong way from the one before
  if (!M.expect) return [];
  return KINDS.filter((k, i) => i > 0 && vals[i] != null && vals[i - 1] != null && (M.expect === 'down' ? vals[i] >= vals[i - 1] - 1e-9 && vals[i] > 0.05 : vals[i] <= vals[i - 1] + 1e-9));
}

function ladder() {
  const M = METRICS[metric], CW = 44, L = 40, TOP = 16, CH = 170, H = TOP + CH + 48, Wd = L + KINDS.length * CW + 4;
  const val = (src, f) => KINDS.map((k) => (src[k] && f ? f(src[k]) : null));
  const bars = val(now, M.bar), dots = val(now, M.dot), baseBars = val(base, M.bar), baseDots = val(base, M.dot);
  const max = niceMax(Math.max(1e-6, ...[...bars, ...dots, ...baseBars, ...baseDots].filter((v) => v != null)) * 1.08);
  const y = (v) => TOP + CH - (v / max) * CH, cx = (i) => L + i * CW + CW / 2;
  const warn = new Set(outOfOrder(M, bars));
  let s = '';
  for (let t = 0; t <= 4; t++) {
    const v = (max * t) / 4;
    s += `<line x1="${L}" x2="${Wd}" y1="${y(v)}" y2="${y(v)}" stroke="var(--grid)"/><text x="${L - 4}" y="${y(v) + 3}" text-anchor="end">${M.text(v)}</text>`;
  }
  KINDS.forEach((k, i) => {
    const x = L + i * CW, b = bars[i], bb = baseBars[i], stale = pending.has(k);
    const title = `${nameOf(k)}: ${b == null ? '…' : M.text(b)}${bb != null && b != null && Math.abs(b - bb) > 1e-6 ? ` (was ${M.text(bb)})` : ''}`;
    s += `<g class="col" data-k="${k}"><title>${esc(title)}</title><rect class="hl" x="${x}" y="0" width="${CW}" height="${H}" fill="${k === sel ? 'var(--sel)' : 'transparent'}"/>`;
    if (bb != null) s += `<rect x="${cx(i) - 13}" y="${y(bb)}" width="26" height="${TOP + CH - y(bb)}" fill="none" stroke="var(--dim)" stroke-dasharray="3 2" rx="2"/>`;
    if (b != null) {
      s += `<rect x="${cx(i) - 11}" y="${y(b)}" width="22" height="${TOP + CH - y(b)}" rx="2" fill="${warn.has(k) ? 'var(--warn)' : 'var(--bar)'}" opacity="${stale ? 0.35 : 1}"/>`;
      s += `<text class="v" x="${cx(i)}" y="${Math.min(y(b), bb != null ? y(bb) : Infinity) - 3}" text-anchor="middle">${M.text(b)}</text>`;
    }
    s += `<image href="${picOf(k)}" x="${x}" y="${TOP + CH + 2}" width="44" height="30"/>`;
    const nm = nameOf(k);
    s += `<text x="${cx(i)}" y="${TOP + CH + 43}" text-anchor="middle"${nm.length > 8 ? ` textLength="${CW - 4}" lengthAdjust="spacingAndGlyphs"` : ''}${k === sel ? ' style="fill:var(--ink);font-weight:600"' : ''}>${esc(nm)}</text></g>`;
  });
  const line = (vals, attrs) => {
    const pts = vals.map((v, i) => (v == null ? null : `${cx(i)},${y(v)}`)).filter(Boolean).join(' ');
    return pts ? `<polyline points="${pts}" fill="none" ${attrs}/>` : '';
  };
  if (M.dot) {
    s += line(baseDots, 'stroke="var(--dim)" stroke-width="1" stroke-dasharray="3 2" pointer-events="none"');
    s += line(dots, 'stroke="var(--ink)" stroke-width="1.5" pointer-events="none"');
    dots.forEach((v, i) => { if (v != null) s += `<circle cx="${cx(i)}" cy="${y(v)}" r="3" fill="var(--ink)" pointer-events="none"/>`; });
  }
  s += `<line x1="${L}" x2="${Wd}" y1="${TOP + CH}" y2="${TOP + CH}" stroke="var(--dim)"/>`;
  const svg = $('ladder');
  svg.setAttribute('viewBox', `0 0 ${Wd} ${H}`);
  svg.innerHTML = s;
  $('ladderSub').textContent = M.note;
  const ws = [...warn];
  $('ladderNote').innerHTML = `<span class="key"><span class="sw" style="background:var(--bar)"></span>now</span>
    <span class="key"><span class="sw" style="border:1px dashed var(--dim)"></span>as it was</span>
    ${M.expect ? `<span class="key"><span class="sw" style="background:var(--warn)"></span>${M.expect === 'down' ? 'not lower' : 'not higher'} than the animal before</span>` : ''}
    ${ws.length ? `<span class="warns">Out of order:${ws.map((k) => `<button data-k="${k}">${esc(nameOf(k))}</button>`).join('')}</span>` : M.expect && !pending.size ? '<span class="note">Every animal harder than the one before.</span>' : ''}`;
}
$('ladder').addEventListener('click', (e) => { const g = e.target.closest('[data-k]'); if (g) select(g.dataset.k); });
$('ladderNote').addEventListener('click', (e) => { const b = e.target.closest('button[data-k]'); if (b) select(b.dataset.k); });

// ---------------------------------------------------------------------------------------------------- the sliders
// a dial: its slider over a strip with where every animal has it (the ones before and after marked), and where it was
function dialRow(d, value, orig, strip) {
  const pos = (v) => `${((Math.min(d.max, Math.max(d.min, v)) - d.min) / (d.max - d.min)) * 100}%`;
  let marks = '';
  for (const m of strip) marks += `<line x1="${pos(m.v)}" x2="${pos(m.v)}" y1="${m.c ? 3 : 7}" y2="${m.c ? 23 : 19}" stroke="${m.c || 'var(--dim)'}" stroke-width="${m.c ? 2 : 1}" opacity="${m.c ? 1 : 0.55}"><title>${esc(m.t)}</title></line>`;
  marks += `<circle cx="${pos(orig)}" cy="13" r="5" fill="none" stroke="var(--dim)" stroke-width="1.5"><title>as it was: ${fmt(orig, d.step)}</title></circle>`;
  return `<div class="dial${same(value, orig) ? '' : ' changed'}" data-key="${d.key}">
    <div class="top"><span class="label">${esc(d.label)}</span><span class="help">${esc(d.help)}${d.file ? ` <span class="file">${d.key} · ${d.file}</span>` : ''}</span>
      <span class="was" title="back to as it was">was ${fmt(orig, d.step)} ↺</span>
      <input type="number" min="${d.min}" max="${d.max}" step="${d.step}" value="${fmt(value, d.step)}"></div>
    <div class="track"><svg>${marks}</svg><input type="range" min="${d.min}" max="${d.max}" step="${d.step}" value="${value}"></div>
  </div>`;
}

function left() {
  const box = $('left');
  if (view() === 'shared') {
    box.innerHTML = `<h2>Shared by all the animals <span class="note">the numbers of every animal are worked out again (a few seconds)</span></h2>
      <div class="legend"><span><span class="ring"></span> as it was</span></div>
      ${SHARED.map((g) => `<div class="group">${esc(g.group)}</div>${g.items.map((d) => dialRow(d, sharedOf(d.key), DEFAULTS[d.key], [])).join('')}`).join('')}`;
    return;
  }
  const i = KINDS.indexOf(sel), prev = KINDS[i - 1], next = KINDS[i + 1];
  box.innerHTML = `<div id="who"><canvas width="44" height="30"></canvas>
      <div><div class="name">#${String(i + 1).padStart(2, '0')} ${esc(nameOf(sel))}</div><div class="food"><span class="fp"></span>${esc(ANIMALS[sel].food)}</div></div>
      <div class="nav"><button id="prev" ${prev ? '' : 'disabled'} title="the animal before (←)">‹</button><button id="next" ${next ? '' : 'disabled'} title="the animal after (→)">›</button></div></div>
    <div class="legend"><span><span class="tick" style="background:var(--prev)"></span> ${prev ? esc(nameOf(prev)) : '—'} (before)</span>
      <span><span class="tick" style="background:var(--next)"></span> ${next ? esc(nameOf(next)) : '—'} (after)</span>
      <span><span class="tick" style="background:var(--line)"></span> the others</span><span><span class="ring"></span> as it was</span></div>
    ${DIALS.map((d) => dialRow(d, dialOf(sel, d.key), ORIG[sel][d.key], KINDS.filter((k) => k !== sel).map((k) => ({
      v: dialOf(k, d.key), t: `${nameOf(k)}: ${fmt(dialOf(k, d.key), d.step)}`, c: k === prev ? 'var(--prev)' : k === next ? 'var(--next)' : null,
    })).sort((a, b) => !!a.c - !!b.c))).join('')}
    <div style="margin-top:8px"><button id="resetAnimal" ${edits.dials[sel] ? '' : 'disabled'}>Reset ${esc(nameOf(sel))}</button></div>`;
  box.querySelector('#who canvas').getContext('2d').drawImage(pic(sel), 0, 0);
  box.querySelector('.fp').append(foodPic(sel));
  $('prev').onclick = () => select(prev);
  $('next').onclick = () => select(next);
  $('resetAnimal').onclick = () => { delete edits.dials[sel]; keep(); left(); recompute([sel]); redraw(); };
}

function setValue(key, v) {
  const shared = view() === 'shared', d = shared ? SHARED_BY_KEY[key] : DIAL_BY_KEY[key];
  v = Math.min(d.max, Math.max(d.min, Math.round(v / d.step) * d.step));
  v = +v.toFixed(decimals(d.step));
  const orig = shared ? DEFAULTS[key] : ORIG[sel][key];
  if (shared) {
    if (same(v, orig)) delete edits.shared[key]; else edits.shared[key] = v;
    recompute(KINDS);
  } else {
    const e = (edits.dials[sel] ||= {});
    if (same(v, orig)) delete e[key]; else e[key] = v;
    if (!Object.keys(e).length) delete edits.dials[sel];
    recompute([sel]);
    const r = $('resetAnimal'); if (r) r.disabled = !edits.dials[sel];
  }
  keep();
  const row = $('left').querySelector(`.dial[data-key="${key}"]`);
  row.classList.toggle('changed', !same(v, orig));
  const num = row.querySelector('input[type=number]'), range = row.querySelector('input[type=range]');
  if (document.activeElement !== num) num.value = fmt(v, d.step);
  if (+range.value !== v) range.value = v;
  redraw();
}
$('left').addEventListener('input', (e) => {
  const row = e.target.closest('.dial');
  if (row && e.target.type === 'range') setValue(row.dataset.key, +e.target.value);
});
$('left').addEventListener('change', (e) => {
  const row = e.target.closest('.dial');
  if (row && e.target.type === 'number' && e.target.value !== '') setValue(row.dataset.key, +e.target.value);
});
$('left').addEventListener('click', (e) => {
  const row = e.target.closest('.dial');
  if (row && e.target.classList.contains('was')) {
    setValue(row.dataset.key, view() === 'shared' ? DEFAULTS[row.dataset.key] : ORIG[sel][row.dataset.key]);
    left();
  }
});

// ----------------------------------------------------------------------------------------------- one animal's numbers
function tiles() {
  const m = now[sel], b = base[sel], stale = pending.has(sel);
  $('numbersTitle').innerHTML = `${esc(nameOf(sel))} <span class="note">${stale ? 'working out…' : ''}</span>`;
  if (!m) { $('tiles').innerHTML = '<span class="note">working out…</span>'; return; }
  const score = (x) => (days(x.some) - 1) * x.cycle * x.mult;
  const T = [
    [`${oneIn(SKILLS[0])} missed`, (x) => x.next.chance[0], pct, '', 'next'],
    [`${oneIn(SKILLS[1])} missed`, (x) => x.next.chance[1], pct, '', 'next'],
    [`${oneIn(SKILLS[2])} missed`, (x) => x.next.chance[2], pct, '', 'next'],
    ['Half get it, missing', (x) => x.next.half, (v) => oneIn(v), '', 'next'],
    ['Lost by being caught', (x) => x.next.lost.caught, pct, '(the rest: tired)', 'next'],
    ['Time to the den', (x) => x.next.secs, (v) => `${Math.round(v)} s`, '', 'next'],
    ['Score at the den', (x) => x.next.score, (v) => Math.round(v).toLocaleString('en'), '', 'next'],
    ['Lasts, eating all', (x) => x.all, (v) => (v == null ? '12+ days' : `day ${v.toFixed(1)}`), 'harder'],
    ['Lasts, eating 4 in 5', (x) => x.some, (v) => (v == null ? '12+ days' : `day ${v.toFixed(1)}`), 'harder'],
    ['Score then (4 in 5)', score, (v) => Math.round(v).toLocaleString('en')],
    ['Jump height', (x) => x.jumpH, (v) => `${v.toFixed(1)} px`],
    ['Time in the air', (x) => x.air, (v) => `${v.toFixed(2)} s`],
    ['Speed, day 1', (x) => x.days[0].speed, (v) => `${Math.round(v)} px/s`],
    ['Warning, day 1', (x) => x.days[0].sees, (v) => `${v.toFixed(2)} s`],
    ['Head start', () => KINDS.indexOf(sel) * sharedOf('HEAD'), (v) => `${v.toFixed(2)} days`],
  ];
  const tile = ([t, f, show]) => {
    const v = f(m), w = b ? f(b) : v;
    const diff = !(v == null && w == null) && (v == null || w == null || Math.abs(v - w) > 1e-6);
    const dir = diff && v != null && w != null ? (v > w ? 'up' : 'down') : '';
    return `<div class="tile" style="${stale ? 'opacity:.5' : ''}"><div class="t">${t}</div><div class="n">${show(v)}</div><div class="d ${dir}">${diff ? `was ${show(w)}` : '&nbsp;'}</div></div>`;
  };
  $('tiles').innerHTML = `<div class="sub">Getting the ${esc(nameOf(chaserOf(sel)))}: away from it till the first dawn, running into…</div>${T.filter((t) => t[4]).map(tile).join('')}
    <div class="sub">The whole run, never running into anything</div>${T.filter((t) => !t[4]).map(tile).join('')}`;
}

// a small line chart over days 1-8: series [{ name, color, now: [], base: [] }]; the day energy runs out marked
function chart(title, unit, series, out) {
  const Wd = 300, H = 150, L = 34, R = 8, T = 22, B = 20, n = 8;
  const all = series.flatMap((s) => [...(s.now || []), ...(s.base || [])]).filter((v) => v != null);
  const max = niceMax(Math.max(1e-6, ...all) * 1.05);
  const x = (d) => L + ((d - 1) / (n - 1)) * (Wd - L - R), y = (v) => T + (H - T - B) * (1 - v / max);
  let s = `<text class="title" x="0" y="12">${esc(title)}</text><text x="${Wd}" y="12" text-anchor="end">${esc(unit)}</text>`;
  for (let t = 0; t <= 4; t++) {
    const v = (max * t) / 4;
    s += `<line x1="${L}" x2="${Wd - R}" y1="${y(v)}" y2="${y(v)}" stroke="var(--grid)"/><text x="${L - 4}" y="${y(v) + 3}" text-anchor="end">${+v.toFixed(max < 2 ? 2 : max < 20 ? 1 : 0)}</text>`;
  }
  for (let d = 1; d <= n; d++) s += `<text x="${x(d)}" y="${H - 5}" text-anchor="middle">${d}</text>`;
  if (out != null && out <= n) s += `<line x1="${x(out)}" x2="${x(out)}" y1="${T - 4}" y2="${H - B}" stroke="var(--bad)" stroke-width="1.5"><title>out of energy on day ${out.toFixed(1)}, eating all the food</title></line>`;
  const path = (vals) => vals.map((v, i) => `${x(i + 1)},${y(v)}`).join(' ');
  for (const sr of series) {
    if (sr.base) s += `<polyline points="${path(sr.base)}" fill="none" stroke="${sr.color}" stroke-width="1.2" stroke-dasharray="4 3" opacity="0.6"/>`;
    if (sr.now) s += `<polyline points="${path(sr.now)}" fill="none" stroke="${sr.color}" stroke-width="2" stroke-linejoin="round"/>`
      + sr.now.map((v, i) => `<circle cx="${x(i + 1)}" cy="${y(v)}" r="2.5" fill="${sr.color}"><title>${esc(sr.name)}, day ${i + 1}: ${v.toFixed(2)}</title></circle>`).join('');
  }
  if (series.length > 1) s += series.map((sr, i) => `<text x="${L + 6 + i * 70}" y="${T + 8}" style="fill:${sr.color}">${esc(sr.name)}</text>`).join('');
  return `<svg viewBox="0 0 ${Wd} ${H}">${s}</svg>`;
}

function charts() {
  const m = now[sel], b = base[sel];
  if (!m) { $('charts').innerHTML = ''; return; }
  const col = (x, f) => x && x.days.map(f);
  $('charts').style.opacity = pending.has(sel) ? 0.5 : 1;
  $('charts').innerHTML = [
    chart('Energy a second', 'of 100', [{ name: 'from food', color: 'var(--good)', now: col(m, (d) => d.food), base: col(b, (d) => d.food) },
      { name: 'used', color: 'var(--bad)', now: col(m, (d) => d.drain), base: col(b, (d) => d.drain) }], m.all),
    chart('Speed', 'px/s', [{ name: 'speed', color: 'var(--bar)', now: col(m, (d) => d.speed), base: col(b, (d) => d.speed) }], m.all),
    chart('Warning before an obstacle', 's', [{ name: 'warning', color: 'var(--bar)', now: col(m, (d) => d.sees), base: col(b, (d) => d.sees) }], m.all),
    chart('An obstacle every', 's', [{ name: 'every', color: 'var(--bar)', now: col(m, (d) => d.every), base: col(b, (d) => d.every) }], m.all),
  ].join('');
}

// --------------------------------------------------------------------------------------------------- the changes
function changesList() {
  const items = [];
  for (const k of KINDS) for (const d of DIALS) if (edits.dials[k]?.[d.key] != null) items.push({ what: `${nameOf(k)} · ${d.label}`, from: fmt(ORIG[k][d.key], d.step), to: fmt(edits.dials[k][d.key], d.step), k, key: d.key });
  for (const g of SHARED) for (const d of g.items) if (edits.shared[d.key] != null) items.push({ what: `shared · ${d.label} (${d.key})`, from: fmt(DEFAULTS[d.key], d.step), to: fmt(edits.shared[d.key], d.step), key: d.key });
  $('changes').innerHTML = `<h2>Changes <span class="note">kept in this browser; not written to the files yet</span></h2>${items.length
    ? `<ul>${items.map((c, i) => `<li><span class="what">${esc(c.what)}</span><span>${c.from} → <b>${c.to}</b></span><button data-i="${i}" title="back to ${c.from}">↺</button></li>`).join('')}</ul>`
    : '<span class="note">None: everything as in the files.</span>'}${error ? `<p class="err">${esc(error)}</p>` : ''}`;
  $('changes').querySelectorAll('button[data-i]').forEach((btn) => {
    btn.onclick = () => {
      const c = items[+btn.dataset.i];
      if (c.k) { delete edits.dials[c.k][c.key]; if (!Object.keys(edits.dials[c.k]).length) delete edits.dials[c.k]; recompute([c.k]); }
      else { delete edits.shared[c.key]; recompute(KINDS); }
      keep(); left(); redraw();
    };
  });
}

// ------------------------------------------------------------------------------------------------------ your runs
// the runs played (see the runs in game.js): those the game sent the dev server (data/runs.jsonl), and any shared from
// the game (its credits: SHARE) dropped here; for each animal, how it went
const real = new Map(); // id → run
function addRuns(list) { for (const r of list) if (r && typeof r.id === 'string' && ANIMALS[r.kind]) real.set(r.id, r); yourRuns(); }
const parseRuns = (t) => { t = t.trim(); if (!t) return []; if (t[0] === '{' && t.includes('"runs"')) return JSON.parse(t).runs || []; return t.split('\n').filter(Boolean).map((l) => JSON.parse(l)); };
fetch(new URL('../data/runs.jsonl', import.meta.url)).then((r) => (r.ok ? r.text() : '')).then((t) => addRuns(parseRuns(t))).catch(() => yourRuns());
const clock = (secs) => { const m = Math.round(secs / 60); return m < 60 ? `${m} min` : `${Math.floor(m / 60)} h ${m % 60} min`; };
const rate = ([n, hit]) => (n ? (hit ? `1 in ${Math.round(n / hit)}` : `0 of ${n}`) : '–');
function yourRuns() {
  const box = $('real'), runs = [...real.values()].sort((a, b) => (a.at < b.at ? -1 : 1));
  const sum = (rs, f) => rs.reduce((t, r) => t + (f(r) || 0), 0), pair = (rs, key) => [sum(rs, (r) => r[key]?.[0]), sum(rs, (r) => r[key]?.[1])];
  const both = (rs) => { const j = pair(rs, 'jump'), d = pair(rs, 'duck'); return [j[0] + d[0], j[1] + d[1]]; };
  const head = `<h2>Your runs <span class="note">${runs.length ? `${runs.length} runs, ${clock(sum(runs, (r) => r.secs))} running; obstacles run into: ${rate(both(runs))} (the model’s players: ${SKILLS.map(oneIn).join(', ')})` : 'none yet'}</span>
    <span class="right"><label class="pick">Add shared runs… <input type="file" id="runFiles" accept=".json,.jsonl,application/json" multiple hidden></label></span></h2>`;
  if (!runs.length) {
    box.innerHTML = `${head}<p class="note">Played from the dev server (npm run dev, on this computer or an iPad in the house), the runs come in by themselves (data/runs.jsonl). From the app: the credits’ SHARE, then drop the file here.</p>`;
  } else {
    const rows = KINDS.filter((k) => runs.some((r) => r.kind === k)).map((k) => {
      const rs = runs.filter((r) => r.kind === k), c = chaserOf(k), got = rs.findIndex((r) => r.unlocked?.includes(c));
      const ends = ['dawn', 'tired', 'bumped', 'caught', 'home'].map((e) => [e, rs.filter((r) => r.end === e).length]).filter(([, n]) => n).map(([e, n]) => `${e} ${n}`).join(', ');
      const reached = (d) => `${Math.round((rs.filter((r) => (r.dawns || 0) >= d).length / rs.length) * 100)}%`;
      const food = pair(rs, 'food');
      return `<tr class="${k === sel ? 'on' : ''}" data-k="${k}"><td>${esc(nameOf(k))}</td><td>${rs.length}</td><td>${clock(sum(rs, (r) => r.secs))}</td><td>${Math.round(sum(rs, (r) => r.secs) / rs.length)} s</td>
        <td>${reached(1)}</td><td>${got < 0 ? '–' : `${got + 1} (${clock(sum(rs.slice(0, got + 1), (r) => r.secs))})`}</td>
        <td>${rate(pair(rs, 'jump'))}</td><td>${rate(pair(rs, 'duck'))}</td><td>${food[0] + food[1] ? `${Math.round((food[0] / (food[0] + food[1])) * 100)}%` : '–'}</td><td class="note">${ends}</td></tr>`;
    }).join('');
    box.innerHTML = `${head}<div class="scroll"><table><thead><tr><th>animal</th><th>runs</th><th>time</th><th>a run</th><th>got home</th><th>tries to get the ${'next'}</th><th>jumps missed</th><th>ducks missed</th><th>food eaten</th><th>ended</th></tr></thead><tbody>${rows}</tbody></table></div>`;
  }
  $('runFiles').onchange = async (e) => { for (const f of e.target.files) { try { addRuns(parseRuns(await f.text())); } catch { /* not runs */ } } };
}
$('real').addEventListener('click', (e) => { const tr = e.target.closest('tr[data-k]'); if (tr) select(tr.dataset.k); });
$('real').addEventListener('dragover', (e) => e.preventDefault());
$('real').addEventListener('drop', async (e) => { e.preventDefault(); for (const f of e.dataTransfer.files) { try { addRuns(parseRuns(await f.text())); } catch { /* not runs */ } } });

// ------------------------------------------------------------------------------------------------------- the page
function redraw() { status(); ladder(); tiles(); charts(); changesList(); }
function select(k) {
  if (!k || k === sel) return;
  sel = k;
  localStorage.setItem(`${STORE}.kind`, k);
  if (real.size) yourRuns();
  if (pending.has(k) && !mirror) recompute([]); // (it first)
  left(); redraw();
}
function route() {
  $('tabAnimals').classList.toggle('on', view() === 'animals');
  $('tabShared').classList.toggle('on', view() === 'shared');
  left(); redraw();
}
addEventListener('hashchange', route);
addEventListener('keydown', (e) => {
  if (e.target.closest('input, select, textarea') || e.metaKey || e.ctrlKey || e.altKey) return;
  const i = KINDS.indexOf(sel);
  if (e.key === 'ArrowLeft') select(KINDS[i - 1]);
  if (e.key === 'ArrowRight') select(KINDS[i + 1]);
});
$('resetAll').onclick = () => {
  if (!confirm(`Throw away all ${changes()} changes?`)) return;
  const shared = Object.keys(edits.shared).length, kinds = Object.keys(edits.dials);
  edits = { dials: {}, shared: {} };
  keep();
  recompute(shared ? KINDS : kinds);
  left(); redraw();
};
route();
if (!mirror) recompute(KINDS);
