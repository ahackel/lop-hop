// The settings page (npm run dev, then /settings, settings/index.html): the game's own, for every animal. Its colors
// (assets/palette.js: the roles, each its own by day and by night; the colors, by day: by night worked out from them by
// the night's contrast and lift), and the numbers all the animals share (tools/shared.js: level.js, game.js,
// tools/course.mjs; how they play out: the balance page). Each number as the editor's inspector has it (editor/num.js);
// the page's templates lit-html's, as the editor's lists. Changed here, written into the files by Save (POST /palette,
// /consts: see serve.mjs)
import { setPalette } from '../art.js';
import paletteFile from '../assets/palette.js';
import { html, nothing, render } from '../editor/lit/lit-html.js';
import { numField } from '../editor/num.js';
import { SHARED, SHARED_BY_KEY, byFile, inFiles } from './shared.js';

const $ = (id) => document.getElementById(id);
const nice = (c) => c.replace(/[A-Z]/g, (m) => ` ${m.toLowerCase()}`); // (lightGrey: light grey)
const same = (a, b) => Math.abs(a - b) < 1e-9;
const isHex = (v) => /^#[0-9a-f]{6}$/.test(v);
const MOST = 63; // (colors a palette can have: see art.js)
const ROLE_ABOUT = {
  outline: 'Every outline (shaded: each in a dark tone of what it goes round). Small dark marks are black, not this.', ink: 'The words, a crow; light by night.',
  background: 'The sky, and what is drawn in it (a cloud, a rock’s light side).', faint: 'The far hills, the ground, a star not won yet.',
  dim: 'What is not yet: an animal still to unlock, words said quietly.',
};

// --------------------------------------------------------------------------------------------------------- the state
// as edited, and as the files have it (saved: what Save last wrote)
let pal = JSON.parse(JSON.stringify(paletteFile)), savedPal = JSON.stringify(pal);
let savedNums = await inFiles(), nums = { ...savedNums };
const KEYS = Object.keys(SHARED_BY_KEY).filter((k) => Number.isFinite(savedNums[k])); // (one the files lack: not shown)
const palChanged = () => JSON.stringify(pal) !== savedPal;
const numsChanged = () => KEYS.filter((k) => !same(nums[k], savedNums[k]));
const changes = () => (palChanged() ? 1 : 0) + numsChanged().length;

// undo: what it was before each change (a drag, a color picked: one)
const past = [], future = [];
const snapshot = () => JSON.stringify({ pal, nums });
function remember() { past.push(snapshot()); if (past.length > 300) past.shift(); future.length = 0; }
function restore(json) { ({ pal, nums } = JSON.parse(json)); setPalette(pal); show(); }
const undo = () => { if (past.length) { future.push(snapshot()); restore(past.pop()); } };
const redo = () => { if (future.length) { past.push(snapshot()); restore(future.pop()); } };
let said = null; // (what the last save said, till the next change)
const changed = () => { said = null; setPalette(pal); show(); };

async function save() {
  const post = async (url, body) => { const r = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }); if (!r.ok) throw new Error(await r.text()); return r.text(); };
  try {
    const out = [], to = Object.fromEntries(numsChanged().map((k) => [k, nums[k]]));
    if (palChanged()) { out.push(await post('/palette', pal)); savedPal = JSON.stringify(pal); }
    if (Object.keys(to).length) { out.push(await post('/consts', byFile(to))); savedNums = { ...nums }; }
    said = { text: out.join(' · ') };
  } catch (e) {
    said = { text: `not saved: ${e.message === 'Failed to fetch' ? 'is the dev server running? (npm run dev)' : e.message}`, bad: true };
  }
  show();
}
function discard() { remember(); pal = JSON.parse(savedPal); nums = { ...savedNums }; changed(); }

// ------------------------------------------------------------------------------------------------------ a number
// each made once (the same field on every render: a drag goes on through them), its value shown as it is now
const fields = {};
function num(key, get, put, opts) {
  let live = false;
  const f = fields[key] ||= numField(get(), { ...opts, range: false,
    live: (x) => { if (!live) { remember(); live = true; } put(x); changed(); },
    done: () => { live = false; },
    set: (x) => { remember(); put(x); changed(); } });
  f.show(get());
  return f;
}
// a setting's row: its name (dragged: its value), its value in its box, back to as in the files; what it is for: its tooltip
const row = (key, d, get, put, was) => {
  const f = num(key, get, put, { step: d.step, min: d.min, max: d.max, unit: d.unit, tip: d.help });
  const off = !same(get(), was);
  return html`<div class=${`row${off ? ' changed' : ''}`} title=${`${d.label}: ${d.help}${d.key ? ` (${d.key}, in ${d.files.join(', ')})` : ''}`}>
    <span class="name scrub" @pointerdown=${(e) => f.scrub(e)}>${d.label}</span>${f}
    <button class="icon undo" title=${`Back to as in the files: ${+was.toFixed(3)}`} @click=${() => { remember(); put(was); changed(); }}>↺</button>
  </div>`;
};

// -------------------------------------------------------------------------------------------------------- a color
// its swatch to pick from (live while picking: one undo), its hex to type
const pickingAt = new Set();
const hexPick = (get, put, title) => html`<input type="color" class="swatch" title=${title} .value=${get()}
  @input=${(e) => { if (!pickingAt.has(title)) { remember(); pickingAt.add(title); } put(e.target.value); changed(); }}
  @change=${() => pickingAt.delete(title)}>`;
const hexText = (get, put, title) => html`<input type="text" class="hex" spellcheck="false" title=${title} .value=${get()}
  @keydown=${(e) => { if (e.key === 'Enter') e.target.blur(); }}
  @change=${(e) => { const v = e.target.value.trim().toLowerCase(); if (!isHex(v)) { e.target.value = get(); return; } remember(); put(v); changed(); }}>`;
function badName(n) {
  if (!/^[a-z][a-zA-Z]*$/.test(n)) return 'Letters only, a small one first: lightBlue.';
  if (n in pal.colors || n in pal.roles) return `There is a ${nice(n)} already.`;
  if (Object.keys(pal.roles).length + Object.keys(pal.colors).length >= MOST) return `The palette is full (${MOST} colors).`;
  return null;
}
function newColor() {
  const n = prompt('A name for the new color, by how it looks (lightBlue, darkRed)')?.trim();
  if (!n) return;
  const bad = badName(n);
  if (bad) { alert(bad); return; }
  remember(); pal.colors[n] = '#8a8a8a'; changed();
}

// --------------------------------------------------------------------------------------------------------- the page
const idOf = (group) => group.toLowerCase().replace(/\W+/g, '-');
function page() {
  const night = (k, label, help, step, min, max, unit) => row(`night.${k}`, { label, help, step, min, max, unit }, () => pal.night[k], (v) => { pal.night[k] = v; }, JSON.parse(savedPal).night[k]);
  const dot = (on) => (on ? html`<span class="n" title="changed">●</span>` : nothing);
  const toc = html`<div class="head">Colors</div><a href="#palette">Palette ${dot(palChanged())}</a>
    <div class="head">Game</div>${SHARED.map((g) => html`<a href=${`#${idOf(g.group)}`}>${g.group} ${dot(g.items.some((d) => !same(nums[d.key], savedNums[d.key])))}</a>`)}`;
  const roles = Object.keys(pal.roles).map((r) => html`<div class="chip role" title=${ROLE_ABOUT[r] || ''}>
    ${hexPick(() => pal.roles[r].day, (v) => { pal.roles[r].day = v; }, `The ${nice(r)} by day`)}${hexPick(() => pal.roles[r].night, (v) => { pal.roles[r].night = v; }, `The ${nice(r)} by night`)}
    <span class="cname">${nice(r)}</span></div>`);
  const colors = Object.keys(pal.colors).map((c) => html`<div class="chip">
    ${hexPick(() => pal.colors[c], (v) => { pal.colors[c] = v; }, `The ${nice(c)}`)}
    <span class="cname">${nice(c)}</span>${hexText(() => pal.colors[c], (v) => { pal.colors[c] = v; }, `The ${nice(c)}: its hex (#rrggbb)`)}</div>`);
  const content = html`
    <section id="palette">
      <h2>Palette</h2>
      <p class="note">The game’s colors: everything is drawn in them (assets/palette.js). Click a swatch to change it.</p>
      <div class="card">
        <h3 title="Colors with a job: what the game draws its sky, words and outlines in, each its own by night">Roles <span class="when">day · night</span></h3>
        <div class="chips">${roles}</div>
      </div>
      <div class="card">
        <h3 title="The colors the animals, the food and the obstacles are painted in, by name; by night each worked out (see Night)">Colors <span class="when">${Object.keys(pal.colors).length}</span>
          <span class="right"><button title="A new color in the palette" @click=${newColor}>＋ New color</button></span></h3>
        <div class="chips">${colors}</div>
      </div>
      <div class="card narrow">
        <h3 title="By night every color is worked out from its day color, each channel: day × contrast + lift. The dark ones lighter, the light ones darker, so they show against the night sky. The roles have their own.">Night</h3>
        ${night('contrast', 'Contrast', 'by night every color is day × contrast + lift: less, all nearer the middle', 0.01, 0.5, 1.2, '×')}
        ${night('lift', 'Lift', 'by night every color is day × contrast + lift: more, all lighter', 1, -40, 80, '')}
      </div>
    </section>
    <section>
      <h2>Game</h2>
      <p class="note">Shared by every animal (each place makes them harder or easier). How they play out, animal by animal: try them on the <a href="../balance/#shared">Balance page</a>. Drag a name to change it; hover it for what it does.</p>
      <div class="cards">${SHARED.map((g) => html`<div class="card" id=${idOf(g.group)}><h3>${g.group}</h3>
        ${g.items.filter((d) => Number.isFinite(savedNums[d.key])).map((d) => row(d.key, d, () => nums[d.key], (v) => { nums[d.key] = v; }, savedNums[d.key]))}</div>`)}</div>
    </section>`;
  return { toc, content };
}

function show() {
  const { toc, content } = page();
  render(toc, $('toc')); render(content, $('content'));
  const n = changes(), s = $('status');
  s.className = said?.bad ? 'bad' : n ? 'dirty' : '';
  s.textContent = said?.text || (n ? `${n} unsaved change${n > 1 ? 's' : ''}` : 'as in the files');
  $('save').disabled = !n; $('discard').disabled = !n;
}

addEventListener('keydown', (e) => {
  const cmd = e.metaKey || e.ctrlKey, low = e.key.toLowerCase(), typing = e.target.closest('input[type=text]');
  if (cmd && low === 's') { e.preventDefault(); if (changes()) { document.activeElement?.blur(); save(); } return; }
  if (cmd && low === 'z' && !typing) { e.preventDefault(); if (e.shiftKey) redo(); else undo(); }
});
$('save').onclick = save; $('discard').onclick = discard;
addEventListener('beforeunload', (e) => { if (changes()) e.preventDefault(); });
show();
if (location.hash) document.querySelector(location.hash)?.scrollIntoView();
