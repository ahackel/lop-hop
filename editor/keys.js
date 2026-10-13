// The keyboard (see editor.js): what each key does, shown with ?
import { $, el } from './dom.js';
import { inspect } from './inspector.js';
import { itemDo, many, placeOf } from './layers.js';
import { listParts, startRename } from './lists.js';
import { popup, unpop } from './palette.js';
import { isOpen as libraryOpen, libraryKeys, show as showLibrary } from './browser.js';
import { current, parts, plus, same, times } from './parts.js';
import { draw, editing, withIt } from './stage.js';
import { changed, gameToggle, hidden, hide, kind, picked, place, rebuild, redo, remember, save, sel, setMode, undo, view, setAlso, setSel } from './state.js';
import { frames, setPlay, timeline } from './timeline.js';
import { deleteBone } from './bones.js';

// the keyboard: what each key does (shown with ?), by when it works
const KEYS = [
  ['Everywhere', [['⌘Z', 'Undo'], ['⇧⌘Z', 'Redo'], ['⌘S', 'Save'], ['1 2 3', 'Setup, Animate, Play'], ['4', 'Game settings (the palette), and back'], ['⌘O', 'Every asset (the library), to open one'], ['?', 'These shortcuts'], ['Esc', 'Pick nothing (close a popup)']]],
  ['Parts', [['Tab  ⇧Tab', 'The next part in the lists, the one before'], ['← → ↑ ↓', 'Move the part picked a tenth of a pixel (in a move: its key at the frame)'], ['⇧ + arrows', 'A whole pixel'],
    ['⌘ click  ⇧ click', 'Pick more shapes, markings, dots or groups (⇧: the rows between too)'], ['⌘A', 'Pick all in the list of the one picked'],
    ['⌘D', 'Copy what is picked'], ['⌫', 'Delete what is picked'], ['[  ]', 'Drawn earlier, later'], ['H', 'Hide or show what is picked'], ['Enter', 'Rename the shape or group picked (or double-click it)'], ['⌥H', 'Show everything hidden'], ['Right-click', 'What can be done to a part (in the lists, on the stage)']]],
  ['Animate', [['Space', 'Play the move, stop'], [',  .', 'A frame back, on'], ['← →', 'A frame back, on (nothing picked)'], ['Home  End', 'The first frame, the last']]],
  ['The stage', [['B', 'Bones'], ['W', 'Swings’ bones'], ['A', 'All handles'], ['O', 'Onion skin'], ['P', 'Screen pixels (Setup)'], ['S', 'Shading']]],
];
{
  const box = el('div');
  for (const [title, rows] of KEYS) box.append(el('h3', { textContent: title }), el('table', {}, ...rows.map(([k, what]) => el('tr', {}, el('td', {}, ...k.split(/\s{2}/).flatMap((x, i) => [i ? ' ' : '', el('kbd', { textContent: x })])), el('td', { textContent: what })))));
  $('keys').append(box);
  $('keys').onclick = (e) => { if (e.target === $('keys')) $('keys').hidden = true; };
  $('keysButton').onclick = () => { $('keys').hidden = !$('keys').hidden; };
}
const LISTED = ['item', 'paint', 'dot', 'group']; // (in the shapes' list: copied, deleted, moved up or down, renamed)
const flip = (id) => { const b = $(id); b.checked = !b.checked; b.dispatchEvent(new Event('change')); };
const nextHandles = () => { const h = $('handles'), on = [...h.options].filter((o) => getComputedStyle(o).display !== 'none'); h.value = on[(on.findIndex((o) => o.value === h.value) + 1) % on.length].value; h.dispatchEvent(new Event('change')); }; // (a prop: no joints)
// the part picked moved by d (in the world: as the screen shows it): its middle (a shape), else its handle (a joint, a
// leg's root, a dot; in a move: a key at the frame); those picked with it, their middles. Keys held down: one undo for
// the lot
let nudged = 0;
function nudge(d) {
  const p = current();
  if (!p || !editing() || p.off) return false;
  const movers = p.handles.filter((h) => h.move), hs = [...(movers.length ? movers : p.handles.filter((h) => h.anchor).slice(0, 1)), ...withIt(parts()).map(([h]) => h)];
  if (!hs.length) return false;
  const now = performance.now();
  if (now - nudged > 700) remember();
  nudged = now;
  for (const h of hs) h.set(plus(h.at, d));
  changed(); inspect();
  if (view.move !== 'edit') timeline();
  return true;
}
// every one in the list of the one picked (its group's shapes, its markings, the dots, the groups) picked
function pickAll() {
  const { arr } = placeOf(sel), sels = parts().map((p) => p.sel).filter((s) => s.type === sel.type && placeOf(s)?.arr === arr);
  setAlso(sels.filter((s) => !same(s, sel))); setSel(sel, true);
  listParts(); inspect(); draw();
}
function frameBy(f) { setPlay(false); const n = frames(view.move); view.frame = ((f % n) + n) % n; place(); listParts(); inspect(); timeline(); draw(); }
function nextPart(by) {
  const rows = [...document.querySelectorAll('#bones .row, #shapes .row')].filter((r) => r.sel && r.sel.type !== 'section');
  if (!rows.length) return;
  const i = rows.findIndex((r) => r.classList.contains('on')), r = rows[(i + by + rows.length) % rows.length];
  setSel(r.sel); listParts(); inspect(); draw();
  document.querySelector('#bones .row.on, #shapes .row.on')?.scrollIntoView({ block: 'nearest' });
}
document.addEventListener('keydown', (e) => {
  const typing = /INPUT|SELECT|TEXTAREA/.test(document.activeElement?.tagName) && !['checkbox', 'range', 'button'].includes(document.activeElement.type);
  const cmd = e.metaKey || e.ctrlKey, k = e.key, low = k.length === 1 ? k.toLowerCase() : k;
  const take = () => { e.preventDefault(); return true; };
  if (libraryKeys(e)) return; // (the library open: its own)
  if (cmd && low === 'o' && view.mode !== 'game' && kind) { take(); showLibrary(); return; }
  if (k === 'Escape' && popup) { unpop(); return; }
  if (k === 'Escape' && !$('keys').hidden) { $('keys').hidden = true; return; }
  if (cmd && low === 'z' && !typing) { take(); e.shiftKey ? redo() : undo(); return; }
  if (cmd && low === 's') { take(); save(); return; }
  if (typing || e.altKey && low !== 'h' && k !== 'Dead' && e.code !== 'KeyH') return;
  if (cmd) {
    if (low === 'd' && LISTED.includes(sel.type) && view.move === 'edit' && view.mode === 'setup') { take(); itemDo('copy'); }
    if (low === 'a' && many(sel) && view.move === 'edit') { take(); pickAll(); }
    return;
  }
  if (k === '?') { take(); $('keysButton').click(); return; }
  if (['1', '2', '3'].includes(k)) { take(); setMode(['setup', 'animate', 'play'][k - 1]); return; }
  if (k === '4') { take(); gameToggle(); return; }
  if (low === 's') { take(); flip('shading'); return; }
  if (view.mode === 'play' || view.mode === 'game') return;
  if (low === 'b') { take(); flip('showBones'); return; }
  if (low === 'w') { take(); flip('showSwings'); return; }
  if (low === 'a') { take(); nextHandles(); return; }
  if (low === 'o' && view.mode === 'animate') { take(); flip('onion'); return; }
  if (low === 'p' && view.mode === 'setup') { take(); flip('fine'); return; }
  if (e.code === 'KeyH' && e.altKey) { take(); hidden.clear(); rebuild(); listParts(); draw(); return; }
  if (low === 'h' && [...LISTED, 'spikes'].includes(sel.type) && view.move === 'edit') { take(); hide(...parts().filter((p) => picked().some((s) => same(s, p.sel))).map((p) => p.obj)); return; }
  if (k === 'Tab') { take(); nextPart(e.shiftKey ? -1 : 1); return; }
  if (k === 'Enter' && LISTED.includes(sel.type) && view.move === 'edit' && view.mode === 'setup') { take(); startRename(sel); return; }
  if ((k === 'Delete' || k === 'Backspace') && LISTED.includes(sel.type)) { take(); itemDo('delete'); return; }
  if ((k === 'Delete' || k === 'Backspace') && sel.type === 'bone' && view.move === 'edit' && view.mode === 'setup') { take(); deleteBone(sel.name); return; }
  if ((k === '[' || k === ']') && [...LISTED, 'face'].includes(sel.type)) { take(); itemDo('move', k === '[' ? -1 : 1); return; }
  if (k === 'Escape') { setSel({ type: view.move === 'edit' ? 'rig' : 'frame' }); listParts(); inspect(); draw(); return; }
  if (view.mode === 'animate') {
    if (k === ' ') { take(); $('play').click(); return; }
    if (k === ',' || k === '.') { take(); frameBy(view.frame + (k === ',' ? -1 : 1)); return; }
    if (k === 'Home' || k === 'End') { take(); frameBy(k === 'Home' ? 0 : frames(view.move) - 1); return; }
  }
  const arrow = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] }[k];
  if (arrow) {
    take();
    if (nudge(times(arrow, e.shiftKey ? 1 : 0.1))) return;
    if (arrow[0] && view.move !== 'edit') frameBy(view.frame + arrow[0]); // (nothing to move: a frame back or on)
  }
});
