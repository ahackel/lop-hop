// The library (see editor.js): every asset of the game, full screen (the header's button shows the one open and opens
// it; ⌘O): found by name, shown by kind (the filter buttons: animals, skins, food, obstacles, or all), each a card with
// its picture; a click (Enter: the first found) opens one. New ones from here: an animal or a skin (a copy of the animal
// shown), a food or an obstacle (a copy of the one shown, if it is one)
import { ANIMALS, PALETTES, animal, colorOf, prop } from '../art.js';
import { $, el, iconBtn, svg } from './dom.js';
import { unpop } from './palette.js';
import { KINDS, base, builds, choose, dirty, files, folderOf, inGame, isProp, kind, newAnimal, newProp, newSkin } from './state.js';

// the kinds of asset, as the filter buttons have them: its key, its name, what is in it
const TYPES = [
  ['animal', 'Animals', 'The animals: rigs that run, jump and duck (assets/<name>.js)'],
  ['skin', 'Skins', 'An animal’s colors swapped: made from it, edited with it (assets/<name>.js)'],
  ['food', 'Food', 'What the animals eat (assets/food)'],
  ['obstacles', 'Obstacles', 'What the animals run into, each land’s, picked at random among a kind’s variants (a number after the name): assets/obstacles'],
];
const typeOf = (k) => (isProp(k) ? folderOf(k) : files[k].of ? 'skin' : 'animal');
const nameOf = (k) => (isProp(k) ? files[k].name : files[k].of ? k : ANIMALS[k]?.name.toLowerCase() || k);
let query = '', only = 'all'; // (what is looked for, which kind: kept while the editor is open)

// an asset's picture: a pixel a pixel, as the game draws it by day (an animal standing; a branch: not its trunk on up),
// shown bigger, as sharp (fit: as big as a card has room for)
function picture(k, fit = false) {
  const c = el('canvas', { className: 'pic' });
  try {
    const sp = isProp(k) ? prop({ ...builds[k], up: 0 }) : animal(k, 'idle', 0), px = sp.look(), img = new ImageData(sp.w, sp.h), pal = PALETTES.day;
    for (let i = 0; i < px.length; i++) {
      if (!px[i]) continue;
      const n = parseInt(colorOf(pal, px[i]).slice(1), 16);
      img.data.set([n >> 16, (n >> 8) & 255, n & 255, 255], i * 4);
    }
    c.width = sp.w; c.height = sp.h;
    c.getContext('2d').putImageData(img, 0, 0);
    if (fit) { const s = Math.max(1, Math.min(Math.floor(104 / sp.w), Math.floor(76 / sp.h))); c.style.width = `${sp.w * s}px`; c.style.height = `${sp.h * s}px`; }
  } catch { c.width = c.height = 1; } // (one that can't be drawn: none)
  return c;
}
const marks = (k) => [...(dirty(k) ? [el('span', { className: 'dot', title: 'Unsaved changes' })] : []), ...(inGame(k) || isProp(k) ? [] : [el('span', { className: 'tag', textContent: 'new', title: 'Not in the game yet' })])];

// the header's button: the asset open (an animal's skin: after it), its picture
export function fileLabel() {
  const b = $('files');
  b.textContent = '';
  b.append(picture(kind), el('span', { textContent: nameOf(base) }), ...(kind !== base ? [el('span', { className: 'dim', textContent: `· ${kind}` })] : []), el('span', { className: 'chev', innerHTML: svg('grid') }));
}

// the library itself: made once, filled as it opens and as it is searched (the pictures: drawn once an opening)
const search = el('input', { type: 'search', placeholder: 'Find by name', spellcheck: false, autocomplete: 'off' });
const filters = el('span', { className: 'modes', role: 'group' });
const items = el('div', { className: 'libItems' });
const acts = el('span', { className: 'libActs' });
const lib = el('div', { className: 'library', hidden: true, role: 'dialog' },
  el('div', { className: 'libTop' }, el('b', { className: 'libTitle', textContent: 'Assets' }), el('label', { className: 'libSearch', innerHTML: svg('search') }, search), filters, el('span', { className: 'grow' }), acts,
    iconBtn('x', '', { title: 'Close (Esc)', onclick: () => close() })),
  items);
lib.setAttribute('aria-label', 'Assets');
document.body.append(lib);
let pics = new Map();
const pic = (k) => { if (!pics.has(k)) pics.set(k, picture(k, true)); return pics.get(k); };

function fill() {
  const q = query.trim().toLowerCase(), has = (k) => !q || nameOf(k).includes(q) || k.includes(q) || (files[k].of || '').includes(q);
  const found = Object.fromEntries(TYPES.map(([t]) => [t, KINDS.filter((k) => typeOf(k) === t && has(k)).sort((a, b) => nameOf(a).localeCompare(nameOf(b), 'en', { numeric: true }))]));
  filters.textContent = '';
  for (const [t, label, tip] of [['all', 'All', 'Every asset'], ...TYPES]) {
    const n = t === 'all' ? Object.values(found).reduce((m, l) => m + l.length, 0) : found[t].length;
    filters.append(el('button', { className: only === t ? 'on' : '', title: tip, onclick: () => { only = t; fill(); search.focus(); } }, label, el('span', { className: 'count', textContent: String(n) })));
  }
  items.textContent = '';
  for (const [t, label] of TYPES) {
    if ((only !== 'all' && only !== t) || !found[t].length) continue;
    if (only === 'all') items.append(el('div', { className: 'libHead', textContent: label }));
    items.append(el('div', { className: 'libGrid' }, ...found[t].map((k) => el('button', { className: `libCard${k === kind ? ' on' : k === base ? ' base' : ''}`, title: `assets/${k}.js`, onclick: () => open(k) },
      el('span', { className: 'libPic' }, pic(k)),
      el('span', { className: 'name' }, el('span', { className: 'nm', textContent: nameOf(k) }), ...marks(k)),
      ...(t === 'skin' ? [el('small', { textContent: `of the ${nameOf(files[k].of)}` })] : isProp(k) ? [el('small', { textContent: files[k].size.join(' × ') })] : [])))));
  }
  if (!items.children.length) items.append(el('p', { className: 'note', textContent: q ? `Nothing called “${query.trim()}”${only === 'all' ? '' : ' here'}.` : 'None.' }));
}
function open(k) { close(); if (k !== kind) choose(k); }
export const isOpen = () => !lib.hidden;
export function show() {
  unpop();
  pics = new Map(); // (drawn anew: as edited since)
  const animalShown = !isProp();
  acts.textContent = '';
  acts.append(
    iconBtn('plus', 'Animal', { disabled: !animalShown, title: animalShown ? `A new animal: a copy of the ${nameOf(base)}, skin and all` : 'A new animal: open the one to copy first', onclick: () => { close(); newAnimal(); } }),
    iconBtn('plus', 'Skin', { disabled: !animalShown, title: animalShown ? `A new skin of the ${nameOf(base)}: its colors swapped` : 'A new skin: open its animal first', onclick: () => { close(); newSkin(); } }),
    ...[['food', 'Food', 'carrot'], ['obstacles', 'Obstacle', 'rock']].map(([folder, what, first]) => iconBtn('plus', what, {
      title: `A new ${what.toLowerCase()}: a copy of the ${isProp() && folderOf() === folder ? nameOf(base) : first}`, onclick: () => { close(); newProp(folder); } })));
  lib.hidden = false;
  search.value = query; fill();
  search.focus(); search.select();
  items.querySelector('.libCard.on')?.scrollIntoView({ block: 'center' });
}
export function close() { lib.hidden = true; }
search.oninput = () => { query = search.value; fill(); };
// its keys (see keys.js: before the editor's, which it keeps to itself while open): Esc clears the search, else closes
// it; Enter in the search opens the first found
export function libraryKeys(e) {
  if (!isOpen()) return false;
  if (e.key === 'Escape') { e.preventDefault(); if (search.value && document.activeElement === search) { search.value = query = ''; fill(); } else close(); }
  else if (e.key === 'Enter' && document.activeElement === search) { e.preventDefault(); items.querySelector('.libCard')?.click(); }
  else if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'o') { e.preventDefault(); close(); }
  return true;
}
$('files').onclick = () => { if (kind) { if (isOpen()) close(); else show(); } }; // (none open yet: still loading)
