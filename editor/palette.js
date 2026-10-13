// A color picked (see inspector.js): a button, its swatch and name; clicked, the palette to pick from, a new color to add
// (the game's palette itself, every color by day and night: the settings page, tools/settings.js)
import { setPalette } from '../art.js';
import { el, iconBtn } from './dom.js';
import { NAMED, nice, paints, palette, status, swatch } from './state.js';

const MOST = 63; // (colors a palette can have: see art.js)
// a new color's name: by how it looks, letters, a small one first (lightBlue); not taken; room for it
function badName(n) {
  if (!/^[a-z][a-zA-Z]*$/.test(n)) return 'Letters only, a small one first: lightBlue.';
  if (n in NAMED) return `There is a ${nice(n)} already.`;
  if (Object.keys(NAMED).length >= MOST) return `The palette is full (${MOST} colors).`;
  return null;
}
// a color to set: a button, its swatch and name; clicked, the palette by it to pick from, and a new color to add (into
// the palette: saved with it, assets/palette.js)
export function colorPick(value, on) {
  const b = el('button', { type: 'button', className: 'colorPick', title: 'Pick from the palette' }, el('span', { className: 'sw', style: `background:${swatch(value)}` }), el('span', { textContent: nice(value) }));
  b.onclick = (e) => { e.preventDefault(); if (popup?.anchor === b) unpop(); else popPalette(b, value, on); };
  return b;
}
export let popup = null;
export function unpop() { popup?.remove(); popup = null; }
export function setPopup(p) { return (popup = p); } // (one of another's: see browser.js)
function popPalette(anchor, value, on) {
  unpop();
  const name = el('div', { className: 'popName', textContent: nice(value) }), grid = el('div', { className: 'popGrid' });
  for (const c of paints()) {
    const sw = el('button', { type: 'button', className: `popSw${c === value ? ' on' : ''}`, title: nice(c), style: `background:${swatch(c)}` });
    sw.onmouseenter = () => { name.textContent = nice(c); }; sw.onmouseleave = () => { name.textContent = nice(value); };
    sw.onclick = () => { unpop(); on(c); };
    grid.append(sw);
  }
  const hex = el('input', { type: 'color', value: /^#/.test(swatch(value)) ? swatch(value) : '#8a8a8a' }), text = el('input', { type: 'text', placeholder: 'its name: lightBlue' }), err = el('div', { className: 'note' });
  const addIt = () => { const n = text.value.trim(), bad = badName(n); if (bad) { err.textContent = bad; return; } palette.colors[n] = hex.value; setPalette(palette); unpop(); on(n); status(); };
  text.onkeydown = (e) => { if (e.key === 'Enter') addIt(); };
  popup = el('div', { className: 'pop' }, grid, name, el('div', { className: 'popNew' }, hex, text, iconBtn('plus', 'Add', { type: 'button', title: 'A new color in the palette', onclick: addIt })), err);
  popup.anchor = anchor;
  document.body.append(popup);
  const r = anchor.getBoundingClientRect(), w = popup.offsetWidth, h = popup.offsetHeight;
  popup.style.left = `${Math.max(8, Math.min(innerWidth - w - 8, r.left))}px`;
  popup.style.top = `${r.bottom + 4 + h > innerHeight - 8 ? Math.max(8, r.top - h - 4) : r.bottom + 4}px`;
}
document.addEventListener('pointerdown', (e) => { if (popup && !popup.contains(e.target) && !popup.anchor.contains(e.target)) unpop(); });

