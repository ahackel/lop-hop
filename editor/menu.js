// A menu (see lists.js, stage.js): what can be done to what was right-clicked, or what a + can add. Each entry a
// [text, what it does, { key: its shortcut, on: a tick (true, false: a switch), off: why it can't (shown as its
// tooltip), tip }]; '-' a line between. Gone again on a pick, a click elsewhere, Esc, a scroll
import { el } from './dom.js';

const box = el('div', { className: 'menu', hidden: true, role: 'menu' });
document.body.append(box);
export const menuOpen = () => !box.hidden;
export function unmenu() { box.hidden = true; box.textContent = ''; }
// shown at a point (x, y: on the page); a right-click's: there (none of its entries: the browser's own)
export function menuAt(x, y, items) {
  const list = items.filter((x, i, all) => (x === '-' ? i > 0 && all[i - 1] !== '-' && i < all.length - 1 : x)); // (no line first, last, or twice)
  if (!list.length) return false;
  box.textContent = '';
  for (const it of list) {
    if (it === '-') { box.append(el('hr')); continue; }
    const [text, fn, { key = '', on, off, tip } = {}] = it;
    box.append(el('button', { type: 'button', role: on === undefined ? 'menuitem' : 'menuitemcheckbox', disabled: !!off, title: off || tip || '', onclick: () => { unmenu(); fn(); } },
      el('span', { className: 'tick', textContent: on ? '✓' : '' }), el('span', { textContent: text }), el('kbd', { textContent: key })));
  }
  box.hidden = false;
  const r = box.getBoundingClientRect();
  box.style.left = `${Math.max(4, Math.min(x, innerWidth - r.width - 4))}px`;
  box.style.top = `${Math.max(4, y + r.height > innerHeight - 4 ? y - r.height : y)}px`;
  return true;
}
export function contextMenu(e, items) {
  if (!menuAt(e.clientX, e.clientY, items)) return;
  e.preventDefault(); e.stopPropagation();
}
// below a button (a +: what it can add)
export function menuBelow(b, items) { const r = b.getBoundingClientRect(); menuAt(r.left, r.bottom + 2, items); }
addEventListener('pointerdown', (e) => { if (menuOpen() && !box.contains(e.target)) unmenu(); }, true);
addEventListener('keydown', (e) => { if (menuOpen() && e.key === 'Escape') { e.stopPropagation(); e.preventDefault(); unmenu(); } }, true);
for (const t of ['blur', 'resize']) addEventListener(t, unmenu);
addEventListener('scroll', (e) => { if (menuOpen() && !box.contains(e.target)) unmenu(); }, true);
