// The balance page (npm run dev, then /balance, balance/index.html): the animals in the order they unlock in, each
// place's difficulty, each animal's feel (assets/animals.js: see setAnimals in art.js), and the constants all the
// animals share (level.js; MEAL: game.js), changed with sliders, and what they come to, worked out by the game's own
// code (tools/course.mjs, in balance-worker.js): how hard it is to get the next animal (away from it till the first
// dawn, for a player who misses now and then), how long a run lasts for a player who never misses (eating all the
// food, or 4 in 5), the score it reaches, how fast it goes, how much warning an obstacle gives; for all the animals in
// a row (the ladder: is each harder than the one before? drag an animal to another place in it) and for one, day by
// day. What was there before shows faintly behind. The changes are kept in this browser till Save writes them into the
// files (POST /animals, /consts: see serve.mjs).
import { ANIMALS, ORDER, PALETTES, FOOD, JUMP, GRAVITY, animal, setAnimals } from '../art.js';
import animalsFile from '../assets/animals.js';
import { chaserOf } from '../level.js';
import { MAIN, SHARED, SHARED_BY_KEY, byFile, inFiles } from './shared.js';

const KINDS = ORDER; // (the animals in order, as the page has them now: see roster)
const $ = (id) => document.getElementById(id);
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => `&${{ '&': 'amp', '<': 'lt', '>': 'gt', '"': 'quot' }[c]};`);
const decimals = (step) => (String(step).split('.')[1] || '').length;
const fmt = (v, step) => (+v).toFixed(decimals(step));
const same = (a, b) => Math.abs(a - b) < 1e-9;
const round3 = (v) => +v.toFixed(3);
const nameOf = (k) => ANIMALS[k].name.toLowerCase();

// ------------------------------------------------------------------------------------------------------ the dials
// [name, label, min, max, step, what it does, unit]: a place's (the difficulty of the n-th animal: see tune in art.js),
// an animal's own (its feel: it takes them to any place), the shared ones (file: level.js unless said)
const dial = ([key, label, min, max, step, help, unit = '']) => ({ key, label, min, max, step, help, unit });
const PLACE = [
  ['mult', 'Score', 0.5, 5, 0.01, 'its points count this many times', '×'],
  ['speed', 'Speed', 0.8, 1.8, 0.005, 'start and top speed', '×'],
  ['drain', 'Drain', 0.6, 2.2, 0.005, 'energy lost a second', '×'],
  ['meals', 'Meals', 0.4, 1.3, 0.002, 'how often food comes', '×'],
  ['bump', 'Bump', 0.6, 2.2, 0.005, 'what a bump costs', '×'],
  ['early', 'Early', 0, 500, 25, 'crows and branches come this many points sooner', 'pts'],
  ['packs', 'Packs', 0.5, 3.5, 0.05, 'obstacles in groups, this many times as often', '×'],
  ['tight', 'Tight', 0.5, 1.2, 0.005, 'the gaps between obstacles (less: closer)', '×'],
].map(dial);
const FEEL = [
  ['jump', 'Jump', 0.8, 1.3, 0.01, 'how fast it leaves the ground', '×'],
  ['gravity', 'Gravity', 0.7, 1.5, 0.01, 'how fast it falls back', '×'],
].map(dial);
const DIFFICULTY = dial(['difficulty', 'Difficulty', 0, 120, 1, '', '%']);
const HEIGHT = dial(['height', 'Jump height', 20, 60, 0.5, 'how high its feet get, the jump held', 'px']);
const AIR = dial(['air', 'Air time', 0.25, 0.75, 0.005, 'how long a held jump keeps it off the ground', 's']);

// as in the files: the animals (in order, each its feel), the places (each its dials), the shared constants
const FILE = JSON.parse(JSON.stringify(animalsFile)), FILE_ORDER = FILE.animals.map((a) => a.kind), N = FILE.places.length;
const ORIG_FEEL = Object.fromEntries(FILE.animals.map((a) => [a.kind, { jump: a.jump, gravity: a.gravity }]));
const DEFAULTS = await inFiles();
const SKILLS = [0.03, 0.06, 0.12]; // (the miss rates the worker tries: see unlocking in balance-worker.js)
const pct = (v) => `${(v * 100).toFixed(v < 0.1 ? 1 : 0)}%`;
const oneIn = (q) => (q > 0 ? `1 in ${Math.round(1 / q)}` : 'none');

// the changes, kept in this browser: { order: the kinds (null: as in the file), feel: { kind: { key: v } },
// places: { n: { key: v } }, shared: { NAME: v } } (kept before as dials by animal: each its feel, its place's)
const STORE = 'lop.balance';
const none = () => ({ order: null, feel: {}, places: {}, shared: {} });
let edits = none();
try {
  const e = JSON.parse(localStorage.getItem(STORE)) || {}, isFeel = (key) => FEEL.some((d) => d.key === key);
  if (Array.isArray(e.order) && e.order.length === N && FILE_ORDER.every((k) => e.order.includes(k))) edits.order = e.order;
  const order = edits.order || FILE_ORDER;
  for (const k in e.dials || {}) for (const key in e.dials[k]) (isFeel(key) ? ((edits.feel[k] ||= {})[key] = +e.dials[k][key]) : order.includes(k) && ((edits.places[order.indexOf(k)] ||= {})[key] = +e.dials[k][key]));
  for (const k in e.feel || {}) if (ORIG_FEEL[k]) for (const key in e.feel[k]) if (isFeel(key)) (edits.feel[k] ||= {})[key] = +e.feel[k][key];
  for (const i in e.places || {}) if (FILE.places[i]) for (const key in e.places[i]) if (PLACE.some((d) => d.key === key)) (edits.places[i] ||= {})[key] = +e.places[i][key];
  for (const n in e.shared || {}) if (SHARED_BY_KEY[n] && !same(e.shared[n], DEFAULTS[n])) edits.shared[n] = +e.shared[n];
} catch { /* none */ }
const keep = () => { try { localStorage.setItem(STORE, JSON.stringify(edits)); } catch { /* no storage */ } };
const feelOf = (k) => ({ ...ORIG_FEEL[k], ...edits.feel[k] });
const placeOf = (i) => ({ ...FILE.places[i], ...edits.places[i] });
const sharedOf = (n) => edits.shared[n] ?? DEFAULTS[n];
// the animals as the page has them (the file's, as changed): what the game's code is given (setAnimals; the worker's too)
const roster = () => ({ animals: (edits.order || FILE_ORDER).map((k) => ({ ...FILE.animals.find((a) => a.kind === k), ...feelOf(k) })), places: FILE.places.map((_, i) => placeOf(i)) });
const count = (o) => Object.values(o).reduce((t, d) => t + Object.keys(d).length, 0);
const changes = () => (edits.order ? 1 : 0) + count(edits.feel) + count(edits.places) + Object.keys(edits.shared).length;
setAnimals(roster());

// a place's difficulty: where its dials are between the first place's and the last's (as in the file), on average (0:
// the first's, 1: the last's); set: every dial put there on that line
const linear = PLACE.filter((d) => !same(FILE.places[0][d.key], FILE.places[N - 1][d.key]));
const levelOf = (p) => linear.reduce((t, d) => t + (p[d.key] - FILE.places[0][d.key]) / (FILE.places[N - 1][d.key] - FILE.places[0][d.key]), 0) / linear.length;
// an animal's feel as a player sees it: how high a held jump gets it (px), how long it is up (s); and back
const heightOf = (f) => (JUMP * f.jump) ** 2 / (2 * GRAVITY * f.gravity);
const airOf = (f) => (2 * JUMP * f.jump) / (GRAVITY * f.gravity);
const feelFrom = (h, t) => ({ jump: round3((4 * h) / (t * JUMP)), gravity: round3((8 * h) / (t * t * GRAVITY)) });

let sel = KINDS.includes(localStorage.getItem(`${STORE}.kind`)) ? localStorage.getItem(`${STORE}.kind`) : 'rabbit';
let metric = localStorage.getItem(`${STORE}.metric`) || 'difficulty';
let fine = localStorage.getItem(`${STORE}.fine`) === '1'; // (⚙: the raw dials too)
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
baseWorker.postMessage({ roster: FILE, shared: {}, kinds: firstSel(KINDS) });

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
    live.postMessage({ roster: roster(), shared: edits.shared, kinds: firstSel(pending) });
  }, 120);
}

function status() {
  const s = $('status'), n = pending.size;
  s.textContent = n ? `working out ${n === 1 ? nameOf([...pending][0]) : `${KINDS.length - n} of ${KINDS.length}`}…` : changes() ? `${changes()} change${changes() > 1 ? 's' : ''}, not saved yet` : 'as in the files';
  s.classList.toggle('busy', !!n);
  $('resetAll').disabled = $('save').disabled = !changes();
}

// ------------------------------------------------------------------------------------------------ the changes made
// each through here: kept, the game's code given the animals as they are now, worked out again for those it touches
function changed(kinds) { keep(); setAnimals(roster()); recompute(kinds); }
function setPlace(i, key, v, again = true) {
  const e = (edits.places[i] ||= {});
  if (same(v, FILE.places[i][key])) delete e[key]; else e[key] = v;
  if (!Object.keys(e).length) delete edits.places[i];
  if (again) changed([KINDS[i]]);
}
function setLevel(i, h) {
  for (const d of PLACE) {
    const a = FILE.places[0][d.key], z = FILE.places[N - 1][d.key];
    if (!same(a, z)) setPlace(i, d.key, snap(d, a + (z - a) * h), false);
  }
  changed([KINDS[i]]);
}
function setFeel(k, f) {
  const e = {};
  for (const d of FEEL) if (!same(f[d.key], ORIG_FEEL[k][d.key])) e[d.key] = f[d.key];
  if (Object.keys(e).length) edits.feel[k] = e; else delete edits.feel[k];
  changed([k]);
}
// k moved to before the one at place `to` (KINDS.length: the end); each keeps its feel, the places their dials
function moveTo(k, to) {
  const list = [...KINDS], from = list.indexOf(k);
  if (to === from || to === from + 1) return;
  list.splice(from, 1); list.splice(to > from ? to - 1 : to, 0, k);
  edits.order = list.every((x, i) => x === FILE_ORDER[i]) ? null : list;
  changed(KINDS);
  left();
}
const snap = (d, v) => +Math.min(d.max, Math.max(d.min, Math.round(v / d.step) * d.step)).toFixed(decimals(d.step));

// written into the files (the animals; the shared constants, each into the files it is in), then the page anew
async function save() {
  const post = async (url, body) => { const r = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }); if (!r.ok) throw new Error(await r.text()); return r.text(); };
  try {
    const said = [];
    if (edits.order || count(edits.feel) || count(edits.places)) said.push(await post('/animals', roster()));
    const into = byFile(edits.shared);
    if (Object.keys(into).length) said.push(await post('/consts', into));
    edits = none(); keep();
    $('status').textContent = `${said.join(' · ')}: reloading…`;
    setTimeout(() => location.reload(), 500);
  } catch (e) {
    $('status').textContent = `not saved: ${e.message === 'Failed to fetch' ? 'is the dev server running? (npm run dev)' : e.message}`;
  }
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
// what the ladder shows: the bar, and a dot (if any), from an animal's numbers (place: from its place's dials, as
// now and as in the file); up / down: which way it should go from one animal to the next (harder), so one that goes
// the other way is marked
const days = (v) => v ?? 12; // (null: not within 12 days)
const daysText = (v) => (v == null ? '12+' : v.toFixed(1));
const METRICS = {
  difficulty: { label: 'Difficulty', place: true, text: (v) => `${Math.round(v)}%`, expect: 'up',
    note: 'each place’s difficulty (0: the first’s dials, 100%: the last’s). Drag a bar up or down to set it; drag an animal sideways to another place' },
  next: { label: 'Getting the next one', bar: (m) => m.next.half * 100, text: (v) => `${v.toFixed(1)}%`, expect: 'down',
    note: 'how many obstacles a player can run into (at the rabbit’s first speed; more when faster) and still get home at dawn (away from the next animal), half the time' },
  nextChance: { label: 'Chance to get home', bar: (m) => m.next.chance[1] * 100, dot: (m) => m.next.chance[0] * 100, text: (v) => `${Math.round(v)}%`, expect: 'down',
    note: `bars: the chance to get home (and the next animal), running into ${oneIn(SKILLS[1])} obstacles; dots: ${oneIn(SKILLS[0])}` },
  days: { label: 'Days lasted', bar: (m) => days(m.all), dot: (m) => days(m.some), text: daysText, raw: (m) => m.all, expect: 'down',
    note: 'bars: days a player who never misses lasts, eating all the food; dots: eating 4 in 5' },
  score: { label: 'Score reached', bar: (m) => (days(m.some) - 1) * m.cycle * m.mult, text: (v) => Math.round(v / 100) / 10 + 'k', expect: null,
    note: 'the score where energy runs out, eating 4 in 5 (distance × the animal’s score multiplier)' },
  speed: { label: 'Speed, day 1', bar: (m) => m.days[0].speed, text: (v) => `${Math.round(v)} px/s`, expect: 'up', note: 'how fast the world goes on the first day, on average' },
  sees: { label: 'Warning, day 2', bar: (m) => m.days[1].sees, text: (v) => `${v.toFixed(2)} s`, expect: 'down', note: 'how long an obstacle is on the screen before it reaches the animal, on day 2' },
  every: { label: 'Obstacles, day 2', bar: (m) => m.days[1].every, text: (v) => `${v.toFixed(2)} s`, expect: 'down', note: 'an obstacle every so many seconds on day 2' },
  jump: { label: 'Jump height', bar: (m) => m.jumpH, text: (v) => `${Math.round(v)} px`, expect: null, note: 'how high its feet get, the jump held' },
};
const metricSel = $('metric');
metricSel.innerHTML = Object.entries(METRICS).map(([k, m]) => `<option value="${k}">${m.label}</option>`).join('');
if (!METRICS[metric]) metric = 'difficulty';
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

let lad = {}, grab = null; // (the ladder as last drawn: where its columns are, its scale; grab: an animal being dragged)
function ladder() {
  const M = METRICS[metric], CW = 44, L = 40, TOP = 16, CH = 170, H = TOP + CH + 48, Wd = L + KINDS.length * CW + 4;
  const val = (src, f) => KINDS.map((k) => (src[k] && f ? f(src[k]) : null));
  const bars = M.place ? KINDS.map((_, i) => levelOf(placeOf(i)) * 100) : val(now, M.bar), dots = M.place ? [] : val(now, M.dot);
  const baseBars = M.place ? KINDS.map((_, i) => levelOf(FILE.places[i]) * 100) : val(base, M.bar), baseDots = M.place ? [] : val(base, M.dot);
  const max = grab?.max ?? niceMax(Math.max(1e-6, ...[...bars, ...dots, ...baseBars, ...baseDots].filter((v) => v != null)) * 1.08);
  const y = (v) => TOP + CH - (v / max) * CH, cx = (i) => L + i * CW + CW / 2;
  lad = { L, CW, TOP, CH, max };
  const warn = new Set(outOfOrder(M, bars));
  let s = '';
  for (let t = 0; t <= 4; t++) {
    const v = (max * t) / 4;
    s += `<line x1="${L}" x2="${Wd}" y1="${y(v)}" y2="${y(v)}" stroke="var(--grid)"/><text x="${L - 4}" y="${y(v) + 3}" text-anchor="end">${M.text(v)}</text>`;
  }
  KINDS.forEach((k, i) => {
    const x = L + i * CW, b = bars[i], bb = baseBars[i], stale = !M.place && pending.has(k);
    const title = `${nameOf(k)}: ${b == null ? '…' : M.text(b)}${bb != null && b != null && Math.abs(b - bb) > 1e-6 ? ` (was ${M.text(bb)})` : ''} · drag it sideways to another place${M.place ? ', its bar up or down' : ''}`;
    s += `<g class="col${grab?.k === k && grab.how === 'move' ? ' dragging' : ''}" data-k="${k}"><title>${esc(title)}</title><rect class="hl" x="${x}" y="0" width="${CW}" height="${H}" fill="${k === sel ? 'var(--sel)' : 'transparent'}"/>`;
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
  if (grab?.how === 'move' && grab.to != null) s += `<line x1="${L + grab.to * CW}" x2="${L + grab.to * CW}" y1="0" y2="${H}" stroke="var(--accent)" stroke-width="3" pointer-events="none"/>`;
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
// on the ladder: a click picks an animal; dragged sideways it goes to another place (where the line is), its bar
// dragged up or down (Difficulty) sets its place's difficulty
const ladderAt = (e) => { const svg = $('ladder'), r = svg.getBoundingClientRect(), vb = svg.viewBox.baseVal; return [((e.clientX - r.left) * vb.width) / r.width, ((e.clientY - r.top) * vb.height) / r.height]; };
$('ladder').addEventListener('pointerdown', (e) => {
  const g = e.target.closest('[data-k]');
  if (!g || e.button) return;
  const [x, y] = ladderAt(e);
  grab = { k: g.dataset.k, x, y, how: null, max: lad.max };
  $('ladder').setPointerCapture(e.pointerId);
});
$('ladder').addEventListener('pointermove', (e) => {
  if (!grab) return;
  const [x, y] = ladderAt(e);
  if (!grab.how && Math.hypot(x - grab.x, y - grab.y) > 5) grab.how = METRICS[metric].place && grab.y < lad.TOP + lad.CH && Math.abs(y - grab.y) > Math.abs(x - grab.x) ? 'level' : 'move';
  if (grab.how === 'move') { grab.to = Math.max(0, Math.min(KINDS.length, Math.round((x - lad.L) / lad.CW))); ladder(); }
  if (grab.how === 'level') { setLevel(KINDS.indexOf(grab.k), snap(DIFFICULTY, ((lad.TOP + lad.CH - y) / lad.CH) * grab.max) / 100); if (grab.k === sel) syncRows(); ladder(); }
});
$('ladder').addEventListener('pointerup', () => {
  if (!grab) return;
  const g = grab;
  grab = null;
  if (!g.how) select(g.k);
  else if (g.how === 'move' && g.to != null) moveTo(g.k, g.to);
  redraw();
});
$('ladder').addEventListener('pointercancel', () => { grab = null; redraw(); });
$('ladderNote').addEventListener('click', (e) => { const b = e.target.closest('button[data-k]'); if (b) select(b.dataset.k); });

// ---------------------------------------------------------------------------------------------------- the sliders
// a dial: its slider over a strip with where every animal has it (the ones before and after marked), and where it was;
// its number in a box, its unit in it
function dialRow(d, value, orig, strip) {
  const pos = (v) => `${((Math.min(d.max, Math.max(d.min, v)) - d.min) / (d.max - d.min)) * 100}%`;
  let marks = '';
  for (const m of strip) marks += `<line x1="${pos(m.v)}" x2="${pos(m.v)}" y1="${m.c ? 3 : 7}" y2="${m.c ? 23 : 19}" stroke="${m.c || 'var(--dim)'}" stroke-width="${m.c ? 2 : 1}" opacity="${m.c ? 1 : 0.55}"><title>${esc(m.t)}</title></line>`;
  marks += `<circle cx="${pos(orig)}" cy="13" r="5" fill="none" stroke="var(--dim)" stroke-width="1.5"><title>as it was: ${fmt(orig, d.step)} ${d.unit}</title></circle>`;
  return `<div class="dial${same(value, orig) ? '' : ' changed'}" data-key="${d.key}" title="${esc(`${d.label}: ${d.help}`)}">
    <div class="top"><span class="label">${esc(d.label)}</span><span class="help">${esc(d.help)}${d.file ? ` <span class="file">${d.key} · ${d.files.join(', ')}</span>` : ''}</span>
      <span class="was" title="back to as it was">was ${fmt(orig, d.step)} ↺</span>
      <label class="numBox"><input type="number" min="${d.min}" max="${d.max}" step="${d.step}" value="${fmt(value, d.step)}">${d.unit ? `<span class="unit">${esc(d.unit)}</span>` : ''}</label></div>
    <div class="track"><svg>${marks}</svg><input type="range" min="${d.min}" max="${d.max}" step="${d.step}" value="${value}"></div>
  </div>`;
}

// the rows shown, by their dial's key: { d, now(), was(), set(v) }
let rows = {};
const row = (d, now, was, set, strip = []) => { rows[d.key] = { d, now, was, set }; return dialRow(d, now(), was(), strip); };
// the others' values on a row's strip: the animal before and after marked
const stripOf = (d, f) => {
  const i = KINDS.indexOf(sel);
  return KINDS.map((k, j) => ({ k, j })).filter(({ k }) => k !== sel).map(({ k, j }) => ({ v: f(k, j), t: `${nameOf(k)}: ${fmt(f(k, j), d.step)} ${d.unit}`, c: j === i - 1 ? 'var(--prev)' : j === i + 1 ? 'var(--next)' : null })).sort((a, b) => !!a.c - !!b.c);
};
const gear = (on) => `<button class="gear${on ? ' on' : ''}" id="fine" title="${on ? 'Hide' : 'Show'} the raw numbers these are made from">⚙</button>`;

function left() {
  const box = $('left');
  rows = {};
  if (view() === 'shared') {
    const items = SHARED.flatMap((g) => g.items), rest = SHARED.map((g) => ({ ...g, items: g.items.filter((d) => !MAIN.includes(d.key)) })).filter((g) => g.items.length);
    const shared = (d) => row(d, () => sharedOf(d.key), () => DEFAULTS[d.key], (v) => { if (same(v, DEFAULTS[d.key])) delete edits.shared[d.key]; else edits.shared[d.key] = v; changed(KINDS); });
    box.innerHTML = `<h2>Shared by all the animals <span class="note">every animal is worked out again (a few seconds) · also on <a href="../settings/#speed">Settings</a></span><span class="right">${gear(fine)}</span></h2>
      <div class="legend"><span><span class="ring"></span> as it was</span></div>
      <div class="group">Main</div>${MAIN.map((n) => shared(items.find((d) => d.key === n))).join('')}
      ${fine ? rest.map((g) => `<div class="group">${esc(g.group)}</div>${g.items.map(shared).join('')}`).join('') : `<p class="note more">${rest.reduce((t, g) => t + g.items.length, 0)} more behind ⚙</p>`}`;
  } else {
    const i = KINDS.indexOf(sel), prev = KINDS[i - 1], next = KINDS[i + 1];
    const place = (d) => row(d, () => placeOf(i)[d.key], () => FILE.places[i][d.key], (v) => setPlace(i, d.key, v), stripOf(d, (k, j) => placeOf(j)[d.key]));
    const feel = (d) => row(d, () => feelOf(sel)[d.key], () => ORIG_FEEL[sel][d.key], (v) => setFeel(sel, { ...feelOf(sel), [d.key]: v }), stripOf(d, (k) => feelOf(k)[d.key]));
    const diff = { ...DIFFICULTY, help: `of place ${i + 1}: 0 the first place’s dials, 100% the last’s; sets them all along the line between` };
    box.innerHTML = `<div id="who"><canvas width="44" height="30"></canvas>
        <div><div class="name">#${String(i + 1).padStart(2, '0')} ${esc(nameOf(sel))}</div><div class="food"><span class="fp"></span>${esc(ANIMALS[sel].food)}</div></div>
        <div class="nav"><button id="prev" ${prev ? '' : 'disabled'} title="the animal before (←)">‹</button><button id="next" ${next ? '' : 'disabled'} title="the animal after (→)">›</button></div></div>
      <div class="legend"><span><span class="tick" style="background:var(--prev)"></span> ${prev ? esc(nameOf(prev)) : '—'} (before)</span>
        <span><span class="tick" style="background:var(--next)"></span> ${next ? esc(nameOf(next)) : '—'} (after)</span>
        <span><span class="tick" style="background:var(--line)"></span> the others</span><span><span class="ring"></span> as it was</span></div>
      <div class="group" title="What the place it unlocks at makes it: another animal moved here gets the same">Place ${i + 1} <span class="right">${gear(fine)}</span></div>
      ${row(diff, () => levelOf(placeOf(i)) * 100, () => levelOf(FILE.places[i]) * 100, (v) => setLevel(i, v / 100), stripOf(diff, (k, j) => levelOf(placeOf(j)) * 100))}
      ${fine ? PLACE.map(place).join('') : ''}
      <div class="group" title="Its own: it takes them to any place">The ${esc(nameOf(sel))}’s feel</div>
      ${row(HEIGHT, () => heightOf(feelOf(sel)), () => heightOf(ORIG_FEEL[sel]), (v) => setFeel(sel, feelFrom(v, airOf(feelOf(sel)))), stripOf(HEIGHT, (k) => heightOf(feelOf(k))))}
      ${row(AIR, () => airOf(feelOf(sel)), () => airOf(ORIG_FEEL[sel]), (v) => setFeel(sel, feelFrom(heightOf(feelOf(sel)), v)), stripOf(AIR, (k) => airOf(feelOf(k))))}
      ${fine ? FEEL.map(feel).join('') : ''}
      <div style="margin-top:8px"><button id="resetAnimal" ${edits.feel[sel] || edits.places[i] ? '' : 'disabled'} title="Its feel and its place’s dials as in the files">Reset ${esc(nameOf(sel))}</button></div>`;
    box.querySelector('#who canvas').getContext('2d').drawImage(pic(sel), 0, 0);
    box.querySelector('.fp').append(foodPic(sel));
    $('prev').onclick = () => select(prev);
    $('next').onclick = () => select(next);
    $('resetAnimal').onclick = () => { delete edits.feel[sel]; delete edits.places[i]; changed([sel]); left(); redraw(); };
  }
  $('fine').onclick = () => { fine = !fine; localStorage.setItem(`${STORE}.fine`, fine ? '1' : '0'); left(); };
}
// every row shown as its value is now (one change moves others: a difficulty its dials, a jump height its jump)
function syncRows() {
  for (const [key, r] of Object.entries(rows)) {
    const el = $('left').querySelector(`.dial[data-key="${key}"]`), v = r.now(), o = r.was();
    if (!el) continue;
    el.classList.toggle('changed', !same(+fmt(v, r.d.step), +fmt(o, r.d.step)));
    const num = el.querySelector('input[type=number]'), range = el.querySelector('input[type=range]');
    if (document.activeElement !== num) num.value = fmt(v, r.d.step);
    if (document.activeElement !== range) range.value = v;
  }
  const r = $('resetAnimal'); if (r) r.disabled = !(edits.feel[sel] || edits.places[KINDS.indexOf(sel)]);
}
function setValue(key, v) { const r = rows[key]; if (!r) return; r.set(snap(r.d, v)); syncRows(); redraw(); }
$('left').addEventListener('input', (e) => {
  const el = e.target.closest('.dial');
  if (el && e.target.type === 'range') setValue(el.dataset.key, +e.target.value);
});
$('left').addEventListener('change', (e) => {
  const el = e.target.closest('.dial');
  if (el && e.target.type === 'number' && e.target.value !== '') setValue(el.dataset.key, +e.target.value);
});
$('left').addEventListener('click', (e) => {
  const el = e.target.closest('.dial');
  if (el && e.target.classList.contains('was')) { setValue(el.dataset.key, rows[el.dataset.key].was()); left(); }
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
  if (edits.order) items.push({ what: `the order: ${KINDS.filter((k, i) => FILE_ORDER[i] !== k).map(nameOf).join(', ')} moved`, from: '', to: '', undo: () => { edits.order = null; changed(KINDS); } });
  for (const k of KINDS) for (const d of FEEL) if (edits.feel[k]?.[d.key] != null) items.push({ what: `${nameOf(k)} · ${d.label}`, from: fmt(ORIG_FEEL[k][d.key], d.step), to: fmt(edits.feel[k][d.key], d.step), undo: () => setFeel(k, { ...feelOf(k), [d.key]: ORIG_FEEL[k][d.key] }) });
  for (let i = 0; i < N; i++) for (const d of PLACE) if (edits.places[i]?.[d.key] != null) items.push({ what: `place ${i + 1} (the ${nameOf(KINDS[i])}) · ${d.label}`, from: fmt(FILE.places[i][d.key], d.step), to: fmt(edits.places[i][d.key], d.step), undo: () => setPlace(i, d.key, FILE.places[i][d.key]) });
  for (const g of SHARED) for (const d of g.items) if (edits.shared[d.key] != null) items.push({ what: `shared · ${d.label} (${d.key})`, from: fmt(DEFAULTS[d.key], d.step), to: fmt(edits.shared[d.key], d.step), undo: () => { delete edits.shared[d.key]; changed(KINDS); } });
  $('changes').innerHTML = `<h2>Changes <span class="note">kept in this browser till saved</span>${items.length ? '<span class="right"><button class="primary" id="saveToo" title="Write them into the files (assets/animals.js, level.js, game.js)">Save</button></span>' : ''}</h2>${items.length
    ? `<ul>${items.map((c, i) => `<li><span class="what">${esc(c.what)}</span>${c.from !== '' ? `<span>${c.from} → <b>${c.to}</b></span>` : ''}<button data-i="${i}" title="back to as in the files${c.from !== '' ? `: ${c.from}` : ''}">↺</button></li>`).join('')}</ul>`
    : '<span class="note">None: everything as in the files.</span>'}${error ? `<p class="err">${esc(error)}</p>` : ''}`;
  $('changes').querySelectorAll('button[data-i]').forEach((btn) => { btn.onclick = () => { items[+btn.dataset.i].undo(); left(); redraw(); }; });
  if ($('saveToo')) $('saveToo').onclick = save;
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
  if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 's') { e.preventDefault(); if (changes()) save(); return; }
  if (e.target.closest('input, select, textarea') || e.metaKey || e.ctrlKey || e.altKey) return;
  const i = KINDS.indexOf(sel);
  if (e.key === 'ArrowLeft') select(KINDS[i - 1]);
  if (e.key === 'ArrowRight') select(KINDS[i + 1]);
});
$('resetAll').onclick = () => {
  if (!confirm(`Throw away all ${changes()} changes?`)) return;
  edits = none();
  changed(KINDS);
  left(); redraw();
};
$('save').onclick = save;
route();
if (!mirror) recompute(KINDS);
