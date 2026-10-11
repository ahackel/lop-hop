// The face's frames (see editor.js): its eye's and its mouth's pictures, drawn pixel by pixel
import { FACE_FRAMES, FACE_INKS, PALETTES, animal, colorOf } from '../art.js';
import { css, el, iconBtn } from './dom.js';
import { field, inspect } from './inspector.js';
import { draw } from './stage.js';
import { NAMED, build, changed, commit, hist, kind, nice, paints, remember, snapshot, status } from './state.js';

// its eye's and its mouth's pictures, drawn pixel by pixel (see FACE_FRAMES in art.js): a frame picked, drawn on a grid
// over the animal's own pixels around it (faded), its anchor (the face's point) in the middle; what is drawn goes into
// its file (as the usual one again: gone from it). The stage shows the frame on the animal as it is drawn. Inks: any
// color of the palette (one not among FACE_INKS: one of the face's own inks, by a letter given it when it is first drawn
// with; one no frame uses: gone)
export const faceEdit = { part: 'eye', name: 'open', ink: 'outline' }; // (ink: a color by its name; '.': erasing)
const CELLS = 9, MID = 4, CELL = 22;
export const frameNames = (part) => [...new Set([...Object.keys(FACE_FRAMES[part]), ...Object.keys(build.face?.frames?.[part] || {})])];
const frameNow = (part = faceEdit.part, name = faceEdit.name) => build.face?.frames?.[part]?.[name] || FACE_FRAMES[part][name] || { at: [0, 0], rows: ['.'] };
const ownFrame = (part, name) => !!build.face?.frames?.[part]?.[name];
// a frame on the grid (CELLS × CELLS of ink characters, its anchor on the middle), and back (trimmed to what is drawn)
function toCells(f) {
  const cells = Array.from({ length: CELLS }, () => Array(CELLS).fill('.'));
  f.rows.forEach((row, r) => [...row].forEach((ch, c) => { const x = MID - f.at[0] + c, y = MID - f.at[1] + r; if (x >= 0 && y >= 0 && x < CELLS && y < CELLS) cells[y][x] = ch; }));
  return cells;
}
function fromCells(cells) {
  let x0 = CELLS, y0 = CELLS, x1 = -1, y1 = -1;
  cells.forEach((row, y) => row.forEach((ch, x) => { if (ch !== '.') { x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); } }));
  if (x1 < 0) return { at: [0, 0], rows: ['.'] }; // (nothing: none drawn)
  return { at: [MID - x0, MID - y0], rows: cells.slice(y0, y1 + 1).map((row) => row.slice(x0, x1 + 1).join('')) };
}
function setFrame(part, name, f) { // (f: null, gone)
  const face = build.face, usual = FACE_FRAMES[part][name];
  if (!f || (usual && JSON.stringify(f) === JSON.stringify(usual))) delete face.frames?.[part]?.[name];
  else ((face.frames ||= {})[part] ||= {})[name] = f;
  if (face.frames?.[part] && !Object.keys(face.frames[part]).length) delete face.frames[part];
  if (face.frames && !Object.keys(face.frames).length) delete face.frames;
  if (face.inks) { // (the face's inks no frame uses: gone)
    const used = new Set(Object.values(face.frames || {}).flatMap((fs) => Object.values(fs)).flatMap((fr) => [...fr.rows.join('')]));
    for (const ch in face.inks) if (!used.has(ch)) delete face.inks[ch];
    if (!Object.keys(face.inks).length) delete face.inks;
  }
}
const inkOf = (ch) => build.face?.inks?.[ch] || FACE_INKS[ch];
const inkColor = (ch) => PALETTES.day[NAMED[inkOf(ch)]];
// the letter a color is drawn with: FACE_INKS', the face's own, else a new one of its own
function charOf(color) {
  const face = build.face, has = (o) => Object.keys(o || {}).find((ch) => o[ch] === color);
  const ch = has(FACE_INKS) || has(face.inks);
  if (ch) return ch;
  const free = [...'abcdefghijlmnoqstuvyz'].find((c) => !(c in FACE_INKS) && !(c in (face.inks || {})));
  (face.inks ||= {})[free] = color;
  return free;
}
export function faceFrames(box) {
  const face = build.face, { part } = faceEdit;
  if (!frameNames(part).includes(faceEdit.name)) faceEdit.name = part === 'eye' ? 'open' : 'shut';
  const redo = () => { inspect(); draw(); };
  const head = el('div', { className: 'group' }, el('span', { textContent: 'Frames' }));
  box.append(head);
  const parts = el('span', { className: 'modes' });
  for (const p of ['eye', 'mouth']) parts.append(el('button', { textContent: p, className: p === part ? 'on' : '', onclick: () => { faceEdit.part = p; faceEdit.name = p === 'eye' ? 'open' : 'shut'; redo(); } }));
  box.append(field('part', parts));
  if (part === 'mouth' && !face.mouth) {
    box.append(el('p', { className: 'note', textContent: 'It has no mouth: none is drawn.' }),
      iconBtn('plus', 'Add a mouth', { onclick: () => { commit(() => { const n = face.nose || face.eye; face.mouth = [+(n[0] - 0.5).toFixed(3), +(n[1] + 2).toFixed(3)]; }); redo(); } }));
    return;
  }
  // the frames, each small; the one picked
  const strip = el('div', { className: 'faceStrip' });
  for (const n of frameNames(part)) {
    const c = el('canvas', { width: 28, height: 28 }), ctx = c.getContext('2d'), f = frameNow(part, n);
    ctx.fillStyle = PALETTES.day.bg; ctx.fillRect(0, 0, 28, 28);
    f.rows.forEach((row, r) => [...row].forEach((ch, x) => { if (ch !== '.') { ctx.fillStyle = inkColor(ch); ctx.fillRect((MID - f.at[0] + x - 1) * 4, (MID - f.at[1] + r - 1) * 4, 4, 4); } }));
    strip.append(el('button', { className: `${n === faceEdit.name ? 'on' : ''}${ownFrame(part, n) ? ' own' : ''}`, title: ownFrame(part, n) ? `${n}: its own` : `${n}: the usual`, onclick: () => { faceEdit.name = n; redo(); } }, c, el('span', { textContent: n })));
  }
  box.append(strip);
  // the grid: the animal's pixels around it (faded), the frame, its anchor
  const grid = el('canvas', { className: 'faceGrid', width: CELLS * CELL, height: CELLS * CELL, title: 'Draw with the ink picked; right-click: erase' });
  const paint = () => {
    const ctx = grid.getContext('2d'), sp = animal(kind, 'hurt', 0, { look: { eye: '-', mouth: '-' } }), at = sp.faceAt?.[part], px = sp.look(), cells = toCells(frameNow());
    ctx.fillStyle = PALETTES.day.bg; ctx.fillRect(0, 0, grid.width, grid.height);
    for (let y = 0; y < CELLS; y++) for (let x = 0; x < CELLS; x++) {
      const X = at ? at[0] + x - MID : -1, Y = at ? at[1] + y - MID : -1, k = X >= 0 && Y >= 0 && X < sp.w && Y < sp.h ? px[Y * sp.w + X] : 0;
      if (k) { ctx.globalAlpha = 0.45; ctx.fillStyle = colorOf(PALETTES.day, k); ctx.fillRect(x * CELL, y * CELL, CELL, CELL); ctx.globalAlpha = 1; }
      if (cells[y][x] !== '.') { ctx.fillStyle = inkColor(cells[y][x]); ctx.fillRect(x * CELL, y * CELL, CELL, CELL); }
    }
    ctx.fillStyle = 'rgba(128,128,128,0.25)';
    for (let i = 1; i < CELLS; i++) { ctx.fillRect(i * CELL, 0, 1, grid.height); ctx.fillRect(0, i * CELL, grid.width, 1); }
    ctx.strokeStyle = css('--sel'); ctx.lineWidth = 2; ctx.strokeRect(MID * CELL + 1, MID * CELL + 1, CELL - 2, CELL - 2); // (the anchor: on the face's point)
  };
  let drawing = null;
  const cellAt = (e) => { const r = grid.getBoundingClientRect(); return [Math.floor(((e.clientX - r.left) / r.width) * CELLS), Math.floor(((e.clientY - r.top) / r.height) * CELLS)]; };
  const put = (e) => {
    const [x, y] = cellAt(e);
    if (x < 0 || y < 0 || x >= CELLS || y >= CELLS || drawing.cells[y][x] === drawing.ink) return;
    drawing.cells[y][x] = drawing.ink;
    setFrame(part, faceEdit.name, fromCells(drawing.cells)); changed(); paint();
  };
  grid.oncontextmenu = (e) => e.preventDefault();
  grid.onpointerdown = (e) => { remember(); drawing = { cells: toCells(frameNow()), ink: e.button === 2 || faceEdit.ink === '.' ? '.' : charOf(faceEdit.ink) }; put(e); try { grid.setPointerCapture(e.pointerId); } catch { /* (no such pointer) */ } };
  grid.onpointermove = (e) => { if (drawing) put(e); };
  grid.onpointerup = () => { if (!drawing) return; drawing = null; const h = hist(); if (h.past[h.past.length - 1] === snapshot()) h.past.pop(); redo(); status(); };
  paint();
  box.append(grid);
  // the inks (the usual ones first, then every color of the palette), and what can be done with the frame
  const inks = el('div', { className: 'keys inks' }), usualInks = Object.values(FACE_INKS);
  for (const c of [...usualInks, ...paints().filter((c) => !usualInks.includes(c)), '.']) {
    inks.append(el('button', { className: `ink${c === faceEdit.ink ? ' on' : ''}${usualInks.includes(c) || c === '.' ? '' : ' more'}`, title: c === '.' ? 'erase' : nice(c), style: c === '.' ? '' : `background:${PALETTES.day[NAMED[c]]}`, textContent: c === '.' ? '⌫' : '', onclick: () => { faceEdit.ink = c; redo(); } }));
  }
  box.append(inks);
  const acts = el('div', { className: 'keys' }), name = faceEdit.name, usual = !!FACE_FRAMES[part][name];
  acts.append(iconBtn('revert', 'usual', { title: 'The usual frame, as every animal has it', disabled: !usual || !ownFrame(part, name), onclick: () => { commit(() => setFrame(part, name, FACE_FRAMES[part][name])); redo(); } }));
  acts.append(iconBtn('plus', 'New', { title: 'A new frame, a copy of this one (a key can show it)', onclick: () => {
    const n = prompt('A name for the new frame', `${name}2`)?.trim();
    if (!n || frameNames(part).includes(n) || !/^[\w-]+$/.test(n)) return;
    commit(() => setFrame(part, n, JSON.parse(JSON.stringify(frameNow())))); faceEdit.name = n; redo();
  } }));
  acts.append(iconBtn('trash', '', { title: 'Delete this frame (only one of its own, not a usual one)', disabled: usual, onclick: () => { commit(() => setFrame(part, name, null)); faceEdit.name = part === 'eye' ? 'open' : 'shut'; redo(); } }));
  if (part === 'mouth') acts.append(el('button', { textContent: 'No mouth', title: 'No mouth drawn (its frames stay)', onclick: () => { commit(() => { delete face.mouth; }); redo(); } }));
  box.append(acts);
  head.title = `${usual ? (ownFrame(part, name) ? 'This frame: its own, in its file.' : 'This frame: the usual one, as every animal has it; drawing makes it its own.') : 'This frame: one of its own.'} In Animate a key picks which frame shows.`;
}

