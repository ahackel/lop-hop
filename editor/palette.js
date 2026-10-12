// Game (see editor.js): the game's palette, its colors listed, everything the game draws on the stage; a color picked
// anywhere (colorPick)
import { PALETTES, animal, colorOf, heart, prop, rgb, setPalette, star } from '../art.js';
import { $, el, iconBtn } from './dom.js';
import { field, inspect, numIn } from './inspector.js';
import { listParts } from './lists.js';
import { Z, draw, playAt, setZ } from './stage.js';
import { KINDS, NAMED, builds, changed, commit, files, isProp, nice, paints, palette, refresh, remember, status, swatch } from './state.js';

// Game: the game's own, for every animal (as yet its palette). The list: its colors (and how they go by night); the
// stage: everything the game draws, by day above, by night below, the color picked standing out (a click on a pixel:
// its color); the inspector: the color picked
export let hue = 'white'; // (the color picked, by name; 'night': how the colors go by night)
const ROLE_ABOUT = {
  outline: 'Every outline (shaded: each in a dark tone of what it goes round). Small dark marks are black, not this.', ink: 'The words, a crow; light by night.',
  background: 'The sky, and what is drawn in it (a cloud, a rock’s light side).', faint: 'The far hills, the ground, a star not won yet.',
  dim: 'What is not yet: an animal still to unlock, words said quietly.',
};
const TONE_NAMES = ['color', 'underside', 'outline', 'far leg']; // (its tones: see TONES in art.js)
const MOST = 63; // (colors a palette can have: see art.js)
const isRole = (c) => c in palette.roles;
const nameAt = (i) => Object.keys(NAMED).find((k) => NAMED[k] === i);
// everything the game draws, each with its name: every animal standing, the food, the obstacles
export let cast = null;
export function castOf() {
  const out = KINDS.filter((k) => !isProp(k)).map((k) => ({ name: k, s: animal(k, 'hurt', 0) }));
  for (const k of KINDS.filter((x) => isProp(x))) out.push({ name: files[k].name, s: prop({ ...builds[k], up: 0 }) }); // (the food, the obstacles, as edited; a branch: not its trunk on up)
  out.push({ name: 'star', s: star }, { name: 'heart', s: heart });
  return out;
}
let castAt = null; // (what is drawn at each art pixel: its color's index, its thing)
const fade = (hex, bg) => { const a = rgb(hex), b = rgb(bg); return `rgb(${a.map((v, i) => Math.round(v + (b[i] - v) * 0.78)).join(',')})`; };
// everything in rows (each so wide), day and night one above the other, or side by side: as big as the stage fits
function castLayout(width, side, bw, bh) {
  const rows = [[]]; let x = 0;
  for (const it of cast) { const w = it.s.w + 3; if (x + w > width && rows[rows.length - 1].length) { rows.push([]); x = 0; } rows[rows.length - 1].push({ ...it, x }); x += w; }
  const tall = rows.map((r) => Math.max(...r.map((it) => it.s.h)) + 3), half = tall.reduce((a, b) => a + b, 0) + 2;
  const AW = (width + 4) * (side ? 2 : 1), AH = half * (side ? 1 : 2), z = Math.min(bw / AW, bh / AH);
  return { rows, tall, half, side, AW, AH, z };
}
export function drawCast(c) {
  cast ||= castOf();
  const box = $('stageBox'), bw = box.clientWidth || 600, bh = box.clientHeight || 300;
  let L = null;
  for (let width = 90; width <= 480; width += 10) for (const side of [false, true]) { const l = castLayout(width, side, bw, bh); if (!L || l.z > L.z) L = l; }
  const { rows, tall, half, side, AW, AH } = L;
  setZ(1); // (drawn an art pixel a pixel, shown as big as fits: pixelated)
  if (c.width !== AW || c.height !== AH) { c.width = AW; c.height = AH; }
  c.style.width = `${Math.floor(AW * L.z)}px`; c.style.height = `${Math.floor(AH * L.z)}px`;
  const ctx = c.getContext('2d'), pick = hue === 'night' ? 0 : NAMED[hue];
  castAt = { w: AW, h: AH, px: new Uint8Array(AW * AH), who: [] };
  ['day', 'night'].forEach((time, n) => {
    const pal = PALETTES[time], ox = side ? n * AW / 2 : 0, oy = side ? 0 : n * half;
    ctx.fillStyle = pal.bg; ctx.fillRect(ox * Z, oy * Z, (side ? AW / 2 : AW) * Z, half * Z);
    let y = oy + 1;
    rows.forEach((row, r) => {
      for (const it of row) {
        const sp = it.s, L = sp.look(), top = y + tall[r] - 1 - sp.h; // (each on the row's floor)
        for (let j = 0; j < sp.h; j++) for (let i = 0; i < sp.w; i++) {
          const k = L[j * sp.w + i];
          if (!k) continue;
          const X = ox + it.x + 2 + i, Y = top + j, own = k % 64, col = colorOf(pal, k);
          ctx.fillStyle = pick && own !== pick ? fade(col, pal.bg) : col; ctx.fillRect(X * Z, Y * Z, Z, Z);
          castAt.px[Y * AW + X] = own; castAt.who[Y * AW + X] = it.name;
        }
      }
      y += tall[r];
    });
  });
}
export const castHit = (e) => { const [x, y] = playAt(e).map(Math.floor), i = castAt && x >= 0 && y >= 0 && x < castAt.w && y < castAt.h ? y * castAt.w + x : -1; return i >= 0 && castAt.px[i] ? { color: nameAt(castAt.px[i]), thing: castAt.who[i] } : null; };
export function listPalette(box) {
  const row = (name, label, what = '') => {
    const r = el('div', { className: `row${hue === name ? ' on' : ''}` }, ...['day', 'night'].map((t) => el('span', { className: 'sw', style: `background:${name === 'night' ? PALETTES[t].bg : PALETTES[t][NAMED[name]]}` })),
      el('span', { textContent: label }), el('span', { className: 'what', textContent: what }));
    r.onclick = () => { hue = name; listParts(); inspect(); draw(); };
    return r;
  };
  box.append(row('night', 'night', 'the colors by night'), el('div', { className: 'group' }, el('span', { textContent: 'Roles' })));
  for (const r in palette.roles) box.append(row(r, nice(r)));
  box.append(el('div', { className: 'group' }, el('span', { textContent: `Colors · ${Object.keys(palette.colors).length}` }),
    iconBtn('plus', '', { title: 'A new color', onclick: () => {
      const n = prompt('A name for the new color, by how it looks (lightBlue, darkRed)')?.trim(), bad = n && badName(n);
      if (!n) return; if (bad) { alert(bad); return; }
      commit(() => { palette.colors[n] = PALETTES.day[NAMED[hue]] || '#8a8a8a'; hue = n; }); refresh();
    } })));
  for (const c in palette.colors) box.append(row(c, nice(c)));
}
// a new color's name: by how it looks, letters, a small one first (lightBlue); not taken; room for it
function badName(n) {
  if (!/^[a-z][a-zA-Z]*$/.test(n)) return 'Letters only, a small one first: lightBlue.';
  if (n in NAMED) return `There is a ${nice(n)} already.`;
  if (Object.keys(NAMED).length >= MOST) return `The palette is full (${MOST} colors).`;
  return null;
}
export function inspectPalette(box) {
  if (hue === 'night') {
    box.append(el('h2', { textContent: 'Night', title: 'By night each color is worked out from its day color, each channel: day × contrast + lift. The dark ones lighter, the light ones darker, so they show against the night sky. The roles have their own.' }));
    box.append(field('contrast', numIn(palette.night.contrast, (x) => { palette.night.contrast = x; }, { min: 0.5, max: 1.2, step: 0.01 }), 'less: all nearer the middle'));
    box.append(field('lift', numIn(palette.night.lift, (x) => { palette.night.lift = x; }, { min: -40, max: 80, step: 1, whole: true }), 'more: all lighter'));
    return;
  }
  const role = isRole(hue), i = NAMED[hue];
  box.append(el('h2', { title: role ? ROLE_ABOUT[hue] || '' : '' }, el('span', { className: 'sw', style: `width:12px;height:12px;border-radius:3px;background:${PALETTES.day[i]}` }), el('span', { textContent: nice(hue) }), ...(role ? [el('span', { className: 'note', textContent: 'a role' })] : [])));
  // a color to set: picked (live while picking: one undo), or written
  const hexIn = (get, put) => {
    const pick = el('input', { type: 'color', value: get() }), text = el('input', { type: 'text', value: get(), size: 8 });
    let live = false;
    const set = (v) => { if (!live) { remember(); live = true; } put(v); changed(); };
    pick.oninput = () => { text.value = pick.value; set(pick.value); };
    pick.onchange = () => { live = false; inspect(); };
    text.onchange = () => { const v = text.value.trim().toLowerCase(); if (!/^#[0-9a-f]{6}$/.test(v)) { text.style.borderColor = 'red'; return; } set(v); live = false; inspect(); };
    return el('span', { className: 'nums' }, pick, text);
  };
  if (role) for (const t of ['day', 'night']) box.append(field(t, hexIn(() => palette.roles[hue][t], (v) => { palette.roles[hue][t] = v; })));
  else {
    box.append(field('day', hexIn(() => palette.colors[hue], (v) => { palette.colors[hue] = v; })));
    box.append(field('night', el('span', { className: 'nums' }, el('span', { className: 'sw big', style: `background:${PALETTES.night[i]}` }), el('span', { className: 'note', textContent: PALETTES.night[i] })), 'worked out: see night'));
  }
  // its tones, as the shaded look works them out
  const tones = el('div', { className: 'tones' }, el('span'), ...TONE_NAMES.map((t) => el('span', { className: 'note', textContent: t })));
  for (const t of ['day', 'night']) tones.append(el('span', { className: 'note', textContent: t }), ...TONE_NAMES.map((_, k) => el('span', { className: 'sw big', title: colorOf(PALETTES[t], i + 64 * k), style: `background:${colorOf(PALETTES[t], i + 64 * k)}` })));
  box.append(el('div', { className: 'group', title: 'Worked out by the shaded look: the color times a cool tint, so always darker than it' }, el('span', { textContent: 'Tones' })), tones);
  // where it is
  const named = KINDS.filter((k) => JSON.stringify(builds[k]).includes(`"${hue}"`)), drawn = (cast ||= castOf()).filter((it) => it.s.look().some((k) => k && k % 64 === i)).map((it) => it.name);
  box.append(el('div', { className: 'group' }, el('span', { textContent: 'Where' })),
    field('in files', el('span', { className: 'note', textContent: named.join(', ') || 'none' })), field('drawn in', el('span', { className: 'note', textContent: drawn.join(', ') || 'nothing on the stage' })));
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

export function setCast(v) { return (cast = v); }
export function setHue(v) { return (hue = v); }
