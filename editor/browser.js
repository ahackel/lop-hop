// The files (see editor.js): the animal shown and its skin, picked from every file there is, as pictures (the header's
// button opens them): each animal, its skins under it; found by name; a new animal (a copy of the one shown) or skin
import { ANIMALS, PALETTES, animal, colorOf } from '../art.js';
import { $, el, iconBtn, svg } from './dom.js';
import { setPopup, unpop, popup } from './palette.js';
import { KINDS, base, choose, dirty, files, inGame, kind, newAnimal, newSkin, skinsOf } from './state.js';

// an animal's picture: standing, a pixel a pixel (shown bigger, as sharp)
function picture(k) {
  const c = el('canvas', { className: 'pic' });
  try {
    const sp = animal(k, 'idle', 0), px = sp.look(), img = new ImageData(sp.w, sp.h), pal = PALETTES.day;
    for (let i = 0; i < px.length; i++) {
      if (!px[i]) continue;
      const hex = colorOf(pal, px[i]), n = parseInt(hex.slice(1), 16);
      img.data.set([n >> 16, (n >> 8) & 255, n & 255, 255], i * 4);
    }
    c.width = sp.w; c.height = sp.h;
    c.getContext('2d').putImageData(img, 0, 0);
  } catch { c.width = c.height = 1; } // (one that can't be drawn: none)
  return c;
}
const nameOf = (k) => (files[k].of ? k : ANIMALS[k]?.name.toLowerCase() || k);
const marks = (k) => [...(dirty(k) ? [el('span', { className: 'dot', title: 'Unsaved changes' })] : []), ...(inGame(k) ? [] : [el('span', { className: 'tag', textContent: 'new', title: 'Not in the game yet' })])];

// the header's button: the animal shown (its skin), its picture
export function fileLabel() {
  const b = $('files');
  b.textContent = '';
  b.append(picture(kind), el('span', { textContent: nameOf(base) }), ...(kind !== base ? [el('span', { className: 'dim', textContent: `· ${kind}` })] : []), el('span', { className: 'chev', innerHTML: svg('chevron') }));
}
// the files, by name (what is typed: in an animal's name or a skin's)
function open() {
  unpop();
  const find = el('input', { type: 'search', placeholder: 'Find an animal or a skin', spellcheck: false });
  const list = el('div', { className: 'filesList' });
  const fill = () => {
    const q = find.value.trim().toLowerCase(), has = (k) => !q || nameOf(k).includes(q) || k.includes(q);
    list.textContent = '';
    for (const a of KINDS.filter((k) => !files[k].of)) {
      const skins = skinsOf(a).filter(has);
      if (!has(a) && !skins.length) continue;
      const card = el('div', { className: `fileCard${a === base ? ' on' : ''}` },
        el('button', { className: `file${a === kind ? ' on' : ''}${q && has(a) ? ' hit' : ''}`, title: `assets/${a}.js`, onclick: () => go(a) }, picture(a), el('span', { className: 'name' }, nameOf(a), ...marks(a))));
      if (skins.length) card.append(el('div', { className: 'skins' }, ...skins.map((k) => el('button', { className: `skin${k === kind ? ' on' : ''}${q ? ' hit' : ''}`, title: `assets/${k}.js: a skin of the ${nameOf(a)}`, onclick: () => go(k) }, picture(k), el('span', {}, k, ...marks(k))))));
      list.append(card);
    }
    if (!list.children.length) list.append(el('p', { className: 'note', textContent: 'none' }));
  };
  const go = (k) => { unpop(); if (k !== kind) choose(k); };
  find.oninput = fill;
  find.onkeydown = (e) => { if (e.key === 'Enter') (list.querySelector('button.hit') || list.querySelector('button'))?.click(); }; // (the first found)
  const acts = el('div', { className: 'filesActs' },
    iconBtn('plus', 'Animal', { title: `A new animal: a copy of the ${nameOf(base)}, skin and all`, onclick: () => { unpop(); newAnimal(); } }),
    iconBtn('plus', 'Skin', { title: `A new skin of the ${nameOf(base)}: its colors swapped`, onclick: () => { unpop(); newSkin(); } }));
  const box = el('div', { className: 'pop files' }, find, list, acts);
  box.anchor = $('files');
  document.body.append(box);
  setPopup(box);
  const r = $('files').getBoundingClientRect();
  box.style.left = `${Math.max(8, Math.min(innerWidth - box.offsetWidth - 8, r.left))}px`; box.style.top = `${r.bottom + 4}px`;
  fill(); find.focus();
  list.querySelector('.file.on, .skin.on')?.scrollIntoView({ block: 'nearest' });
}
$('files').onclick = () => { if (popup?.anchor === $('files')) unpop(); else open(); };
