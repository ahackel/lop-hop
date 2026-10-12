// Pixel art for Lop Hop. Sprites are small grids of palette indices, filled from shapes (ellipses, capsules,
// triangles) and outlined. Each sprite comes with a collision mask. The animals are rigs (assets/*.js; see the rigs
// below): their tails and ears swing to any angle, and never count in a collision.
import { toBuild } from './asset.js';
import palette from './assets/palette.js';
import rabbit from './assets/rabbit.js';
import cat from './assets/cat.js';
import dog from './assets/dog.js';
import fox from './assets/fox.js';
import hedgehog from './assets/hedgehog.js';
import squirrel from './assets/squirrel.js';
import otter from './assets/otter.js';
import skunk from './assets/skunk.js';
import wolf from './assets/wolf.js';
import boar from './assets/boar.js';
import bear from './assets/bear.js';
import cheetah from './assets/cheetah.js';
import rhino from './assets/rhino.js';
import elephant from './assets/elephant.js';
import dino from './assets/dino.js';
import guineapig from './assets/guineapig.js';
import pig from './assets/pig.js';
import yak from './assets/yak.js';
import ostrich from './assets/ostrich.js';
import dromedary from './assets/dromedary.js';
import gorilla from './assets/gorilla.js';
import foods from './assets/food/index.js';
import obstacles from './assets/obstacles/index.js';

export const W = 300, H = 90, GROUND = 78; // the world in art pixels; GROUND: the y of the ground line

// a color's red, green, blue (0-255), from '#rrggbb'; how light it looks (0-255)
export const rgb = (hex) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
export const luma = (hex) => { const [r, g, b] = rgb(hex); return 0.3 * r + 0.59 * g + 0.11 * b; };

// the palette (assets/palette.js): its colors by index (0: nothing), its roles first; by name (NAMED: what the assets
// name). At most 63 (a sprite's tones are 64 on for each: see TONES)
let PAL = palette;
const NAMED = {}, numbered = () => { for (const k of [...Object.keys(PAL.roles), ...Object.keys(PAL.colors)]) NAMED[k] ||= Object.keys(NAMED).length + 1; };
numbered();
const { outline: OUT, ink: INK, background: BG, faint: FAINT, dim: DIM, white: WHITE, beige: BEIGE, pink: PINK, red: RED,
  orange: ORANGE, rust: RUST, tan: TAN, brown: BROWN, darkBrown: DARK_BROWN, sand: SAND, yellow: YELLOW, lightGreen: LIGHT_GREEN,
  green: GREEN, darkGreen: DARK_GREEN, deepGreen: DEEP_GREEN, blue: BLUE, purple: PURPLE } = NAMED;
export const COLOR = { INK, DIM, FAINT, WHITE, RED, YELLOW, GREEN, BLUE, ORANGE, RUST };

// a palette by day and by night: { bg, index: color }; by night, the colors as palette.night has them (the roles: their own)
export const nightOf = (hex) => '#' + rgb(hex).map((v) => Math.round(Math.max(0, Math.min(255, v * PAL.night.contrast + PAL.night.lift))).toString(16).padStart(2, '0')).join('');
const paletteBy = (time) => {
  const pal = { bg: PAL.roles.background[time] };
  for (const k in PAL.roles) pal[NAMED[k]] = PAL.roles[k][time];
  for (const k in PAL.colors) pal[NAMED[k]] = time === 'day' ? PAL.colors[k] : nightOf(PAL.colors[k]);
  return pal;
};
export const PALETTES = { day: paletteBy('day'), night: paletteBy('night') };
// the editor's: the palette as it is being edited (a new color: the next index), drawn again in it from now on (the
// palettes as they were, changed in place; every sprite's canvases made again: see draw)
let painted = 0;
export function setPalette(p) {
  PAL = p; numbered();
  for (const time in PALETTES) { const pal = PALETTES[time]; for (const k in pal) delete pal[k]; Object.assign(pal, paletteBy(time)); }
  painted++; words.clear();
  for (const cache of [golds, reds, shades]) for (const k in cache) delete cache[k];
}

const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
const ellipse = (cx, cy, rx, ry) => (x, y) => ((x + 0.5 - cx) / rx) ** 2 + ((y + 0.5 - cy) / ry) ** 2 <= 1;
const capsule = (x1, y1, x2, y2, r) => (x, y) => {
  const px = x + 0.5, py = y + 0.5, dx = x2 - x1, dy = y2 - y1;
  const t = clamp(((px - x1) * dx + (py - y1) * dy) / (dx * dx + dy * dy || 1), 0, 1);
  return (px - x1 - t * dx) ** 2 + (py - y1 - t * dy) ** 2 <= r * r;
};
const triangle = (ax, ay, bx, by, cx, cy) => (x, y) => {
  const px = x + 0.5, py = y + 0.5;
  const d1 = (px - bx) * (ay - by) - (ax - bx) * (py - by), d2 = (px - cx) * (by - cy) - (bx - cx) * (py - cy), d3 = (px - ax) * (cy - ay) - (cx - ax) * (py - ay);
  return !((d1 < 0 || d2 < 0 || d3 < 0) && (d1 > 0 || d2 > 0 || d3 > 0));
};

// whether (x, y) is in any of the shapes (tests: (x, y) → true inside). (A loop: shapes.some would make a closure for
// every pixel)
function inAny(shapes, x, y) { for (let i = 0; i < shapes.length; i++) if (shapes[i](x, y)) return true; return false; }
class Grid {
  constructor(w, h) { this.w = w; this.h = h; this.px = new Uint8Array(w * h); }
  // fill the shapes with a color; outline: the pixels around them (4-neighbours) in that color. → the filled mask. (at:
  // [x0, y0, x1, y1], where the shapes can be: only there is looked at)
  layer(shapes, color, outline = 0, at = null) {
    const { w, h, px } = this, m = new Uint8Array(w * h), [x0, y0, x1, y1] = this.clip(at);
    for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) if (inAny(shapes, x, y)) { m[y * w + x] = 1; px[y * w + x] = color; }
    if (outline) {
      for (let y = Math.max(0, y0 - 1); y < Math.min(h, y1 + 1); y++) for (let x = Math.max(0, x0 - 1); x < Math.min(w, x1 + 1); x++) {
        const i = y * w + x;
        if (!m[i] && ((x > 0 && m[i - 1]) || (x < w - 1 && m[i + 1]) || (y > 0 && m[i - w]) || (y < h - 1 && m[i + w]))) px[i] = outline;
      }
    }
    return m;
  }
  // color the shapes, only where `within` (a mask) is set (at: as for layer)
  paint(shapes, color, within, at = null) {
    const [x0, y0, x1, y1] = this.clip(at);
    for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) if (within[y * this.w + x] && inAny(shapes, x, y)) this.px[y * this.w + x] = color;
  }
  clip(at) { return at ? [Math.max(0, at[0]), Math.max(0, at[1]), Math.min(this.w, at[2]), Math.min(this.h, at[3])] : [0, 0, this.w, this.h]; }
  dot(x, y, c) { x = Math.round(x); y = Math.round(y); if (x >= 0 && y >= 0 && x < this.w && y < this.h) this.px[y * this.w + x] = c; }
  get(x, y) { return x >= 0 && y >= 0 && x < this.w && y < this.h ? this.px[y * this.w + x] : 0; }
}
const union = (...masks) => { const out = new Uint8Array(masks[0].length); for (const m of masks) for (let i = 0; i < m.length; i++) out[i] |= m[i]; return out; };

// the screen pixels per art pixel: things move in screen pixels (smoothly), while the art keeps its big pixels
let S = 1;
export const setScale = (s) => { S = s; };
export const snap = (v) => Math.round(v * S) / S; // (to the nearest screen pixel)

// a palette as 32-bit pixels (RGBA in memory: the bytes of a little-endian word), by index
const words = new Map();
function wordsOf(pal) {
  let out = words.get(pal);
  if (!out) {
    out = new Uint32Array(64 * TONES.length);
    const put = (i, hex) => { const v = parseInt(hex.slice(1, 7), 16); out[i] = 0xff000000 | ((v & 0xff) << 16) | (v & 0xff00) | (v >> 16); };
    for (const k in pal) if (/^\d+$/.test(k)) { put(k, pal[k]); if (STYLE === 'between') for (let t = 1; t < TONES.length; t++) put(+k + 64 * t, pal.flat ? pal[k] : toned(pal[k], t)); } // (flat: one color, no tones: see shadow)
    words.set(pal, out);
  }
  return out;
}

// the look (?style in game.js, the editor's Style): 'between' (as the game is drawn): outlines in a dark tone of the
// color inside them, a shade on the underside, far legs (behind the body) in a cooler, darker tone; 'outlined': as the
// sprites are, outlined in black. Worked out by rule from a sprite's palette indices as it is first drawn (see styled),
// into the tones' indices: 64 on for each (see TONES)
let STYLE = 'between';
export const STYLES = ['between', 'outlined'];
export function setStyle(s) { STYLE = STYLES.includes(s) ? s : 'between'; words.clear(); }
// (shade, line, far: a color times this, each channel: always darker, and cooler; a white as if mixed toward the tint
// by how much)
const TONES = [null, ['#4b5687', 0.24], ['#2b2541', 0.55], ['#6c7398', 0.38]].map((t) => t && rgb(t[0]).map((v) => 1 - t[1] * (1 - v / 255)));
const SHADE = 64, LINE = 128, FAR = 192;
const toned = (hex, t) => '#' + rgb(hex).map((v, i) => Math.round(v * TONES[t][i]).toString(16).padStart(2, '0')).join('');
// a styled pixel's color (k: as styled has it), in a palette
export const colorOf = (pal, k) => (k < 64 ? pal[k] : toned(pal[k % 64], k >> 6));
// a sprite's pixels in the look. The outline's pixels (OUT): next to nothing (the silhouette's), joined to it or in a
// line longer than 6 (lines), or small marks (eyes: as they are; marks: a mask of them, a rig's face). The silhouette
// and lines in the line tone of the color they border. Each part (the pixels of a color between lines, 4 round) shaded
// on its underside (the lowest third of it, down each column, if 3 or more tall). A far leg (far: a mask) in the far tone
function styled({ w, h, px }, far, marks) {
  // (on a grid a pixel bigger all round, empty there: a neighbour is an offset, 4 round first, then the corners)
  const W = w + 2, n = W * (h + 2), v = new Uint8Array(n), N = [1, -1, W, -W, W + 1, W - 1, 1 - W, -1 - W];
  const kind = new Uint8Array(n), seen = new Uint8Array(n), reg = new Int32Array(n).fill(-1), q = new Int32Array(n), tone = new Uint16Array(n);
  for (let y = 0; y < h; y++) v.set(px.subarray(y * w, (y + 1) * w), (y + 1) * W + 1);
  const part = (i) => { for (let k = 0; k < 8; k++) if (reg[i + N[k]] >= 0) return i + N[k]; return -1; };
  if (marks) for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const i = (y + 1) * W + x + 1; if (marks[y * w + x] && v[i] === OUT) { kind[i] = 3; seen[i] = 1; } } // (marks: the face, as drawn: see drawRig)
  for (let i = 0; i < n; i++) if (v[i] === OUT && !kind[i] && (!v[i + 1] || !v[i - 1] || !v[i + W] || !v[i - W])) kind[i] = 1; // (1: the silhouette's)
  for (let i = 0, r = 0; i < n; i++) { // the parts
    if (!v[i] || v[i] === OUT || reg[i] >= 0) continue;
    let len = 1; q[0] = i; reg[i] = r;
    for (let c = 0; c < len; c++) for (let k = 0; k < 4; k++) { const j = q[c] + N[k]; if (v[j] && v[j] !== OUT && reg[j] < 0) { reg[j] = r; q[len++] = j; } }
    r++;
  }
  for (let i = 0; i < n; i++) { // the outline's other pixels, by the line they are in (8 round): 2 a line, 3 a mark (inside one part)
    if (v[i] !== OUT || seen[i]) continue;
    let len = 1, edge = false, inside = -1; q[0] = i; seen[i] = 1;
    for (let c = 0; c < len; c++) {
      if (kind[q[c]] === 1) edge = true;
      for (let k = 0; k < 8; k++) {
        const j = q[c] + N[k];
        if (v[j] === OUT && !seen[j]) { seen[j] = 1; q[len++] = j; } else if (reg[j] >= 0 && k < 4) { if (inside === -1) inside = reg[j]; else if (inside !== reg[j]) edge = true; }
      }
    }
    for (let c = 0; c < len; c++) if (!kind[q[c]]) kind[q[c]] = edge || len > 6 ? 2 : 3;
  }
  for (let i = 0; i < n; i++) {
    if (v[i] !== OUT) continue;
    const j = kind[i] === 3 ? -1 : part(i);
    tone[i] = j < 0 ? OUT : LINE + v[j];
  }
  for (let pass = 0; pass < 2; pass++) for (let i = 0; i < n; i++) { // (bordering no part: as the outline next to it)
    if (tone[i] !== OUT || kind[i] === 3) continue;
    for (let k = 0; k < 8; k++) { const j = i + N[k]; if (v[j] === OUT && tone[j] !== OUT) { tone[i] = tone[j]; break; } }
  }
  const out = new Uint16Array(w * h);
  for (let x = 0; x < w; x++) for (let y = 0; y < h;) { // down each column: the outline's tones, and a part's run at a time
    const i = (y + 1) * W + x + 1, r = reg[i];
    if (r < 0) { out[y * w + x] = tone[i]; y++; continue; }
    let end = y + 1;
    while (end < h && reg[(end + 1) * W + x + 1] === r) end++;
    const tall = end - y, shade = tall >= 3 ? Math.max(1, Math.round(tall * 0.3)) : 0;
    for (; y < end; y++) { const o = y * w + x; out[o] = (far && far[o] ? FAR : end - 1 - y < shade ? SHADE : 0) + px[o]; }
  }
  return out;
}
// canvases given back by sprites no longer kept, by size (a rig's frames come and go, one a frame while its ears and tail
// swing). A canvas is made a little bigger than its sprite (to the next 16 pixels) and never resized, so one given back
// takes the next frame as it is: no canvas made or thrown away for each, nor, without OffscreenCanvas (Safari before
// 16.4), a new element each time
const spare = new Map();
export const made = { sprites: 0, canvases: 0 }; // (how many sprites have been drawn into canvases, and canvases made: see ?log in game.js)
const roomy = (n) => Math.ceil(n / 16) * 16;
// the pixels a sprite is put into its canvas with: one, kept and grown to the biggest sprite yet (its corner is put: not
// one made a frame)
let image = null;
function imageFor(cx, w, h) {
  if (!image || image.img.width < w || image.img.height < h) {
    const img = cx.createImageData(Math.max(w, image?.img.width || 0), Math.max(h, image?.img.height || 0));
    image = { img, out: new Uint32Array(img.data.buffer) };
  }
  return image;
}
// a sprite: { w, h, px (palette indices), mask, draw(ctx, x, y, palette), free() }; drawn into a canvas per palette, on
// first use (free: its canvases given back). ox, oy (in extra): where its grid starts from where it is placed (a rig's
// frame, bigger than the box: see the rigs)
function sprite(g, mask, extra) {
  let canvases = {};
  const looks = {}, look = () => (STYLE === 'between' ? looks[STYLE] || (looks[STYLE] = styled(g, extra?.far, extra?.marks)) : g.px);
  const ox = extra?.ox || 0, oy = extra?.oy || 0, W = roomy(g.w), H = roomy(g.h), size = `${W} ${H}`;
  return {
    w: g.w, h: g.h, px: g.px, mask, ...extra, look, // (look: its pixels in the look, see styled)
    free() {
      let list = spare.get(size);
      if (!list) spare.set(size, (list = []));
      for (const k in canvases) if (list.length < 64) list.push(canvases[k]);
      canvases = {};
    },
    draw(ctx, x, y, pal) {
      const key = STYLE + pal.bg + painted;
      let c = canvases[key];
      if (!c) {
        c = canvases[key] = spare.get(size)?.pop();
        if (!c) {
          c = canvases[key] = typeof OffscreenCanvas === 'function' ? new OffscreenCanvas(W, H) : Object.assign(document.createElement('canvas'), { width: W, height: H }); // (Safari before 16.4: none)
          made.canvases++;
        }
        made.sprites++;
        const cx = c.getContext('2d'), { img, out } = imageFor(cx, g.w, g.h), rw = img.width, word = wordsOf(pal), px = look();
        for (let y = 0, i = 0; y < g.h; y++) for (let x = 0, o = y * rw; x < g.w; x++, i++, o++) out[o] = px[i] ? word[px[i]] : 0;
        cx.putImageData(img, 0, 0, 0, 0, g.w, g.h); // (its corner, the clear pixels too: what was there before is gone)
      }
      ctx.drawImage(c, 0, 0, g.w, g.h, snap(x + ox), snap(y + oy), g.w, g.h); // (its corner of the canvas)
    },
  };
}

// a sprite from rows of characters: '.' is empty, the rest name palette entries in `keys`
function fromRows(rows, keys) {
  const g = new Grid(rows[0].length, rows.length), mask = new Uint8Array(g.w * g.h);
  rows.forEach((r, y) => [...r].forEach((ch, x) => { if (ch !== '.') { g.px[y * g.w + x] = keys[ch]; mask[y * g.w + x] = 1; } }));
  return sprite(g, mask);
}

// ----------------------------------------------------------------------------------------------------------- animals
// Every animal faces right in a 26×20 box, its feet on row FOOT, and is a rig (see the rigs below). Moves: run (see
// stride), jump (see jumpFrame), duck, idle (see idleFrame), hurt, ko; the hedgehog's ball (0-3), drawn on its own.
export const FOOT = 19;
// In the order they are unlocked: each is chased by the next, and getting away from it till dawn unlocks it (see
// level.js, chaserOf; game.js). The rabbit is the easy start; each after it is clearly harder than the one before, the
// dino the hardest, and its score counts more (mult). The dials belong to the place, the jump and gravity to the animal. As factors: speed (start and top speed), jump (its speed off the ground),
// gravity, drain (energy), meals (how often food comes), bump (what a bump costs), early (crows and branches come that
// many points sooner), packs (obstacles in groups), tight (the gaps between obstacles).
const tune = (mult, speed, jump, gravity, drain, meals, bump, early, packs, tight) => ({ mult, speed, jump, gravity, drain, meals, bump, early, packs, tight });
// a jump: how fast it leaves the ground, how fast it falls back (art pixels per second, per second), for every animal
// (times its dials); → how high it gets (its feet)
export const JUMP = 330, GRAVITY = 1500;
export const jumpHeight = (kind) => (JUMP * ANIMALS[kind].jump) ** 2 / (2 * GRAVITY * ANIMALS[kind].gravity);
export const ANIMALS = {
  rabbit: { name: 'RABBIT', food: 'carrot', ...tune(1.0, 1.0, 1.08, 1, 1, 1, 1, 0, 1, 1) },
  guineapig: { name: 'GUINEA PIG', food: 'cucumber', ...tune(1.1, 1.03, 1.04, 1, 1.048, 0.982, 1.02, 0, 1.05, 0.99) },
  cat: { name: 'CAT', food: 'fish', ...tune(1.21, 1.04, 1, 1, 1.05, 0.98, 1.04, 0, 1.1, 0.98) },
  dog: { name: 'DOG', food: 'bone', ...tune(1.43, 1.07, 1, 1.05, 1.09, 0.96, 1.09, 50, 1.3, 0.97) },
  pig: { name: 'PIG', food: 'truffle', ...tune(1.53, 1.09, 0.98, 1.05, 1.115, 0.95, 1.11, 75, 1.35, 0.96) },
  cheetah: { name: 'CHEETAH', food: 'drumstick', ...tune(1.64, 1.11, 1.08, 1.1, 1.14, 0.94, 1.13, 100, 1.4, 0.95) },
  fox: { name: 'FOX', food: 'grapes', ...tune(1.86, 1.13, 1, 1.05, 1.18, 0.935, 1.17, 100, 1.4, 0.94) },
  hedgehog: { name: 'HEDGEHOG', food: 'apple', ...tune(2.07, 1.18, 0.98, 1, 1.23, 0.91, 1.21, 100, 1.6, 0.91) },
  squirrel: { name: 'SQUIRREL', food: 'acorn', ...tune(2.29, 1.21, 1, 0.85, 1.28, 0.89, 1.26, 150, 1.8, 0.9) }, // floaty
  otter: { name: 'OTTER', food: 'shell', ...tune(2.5, 1.25, 0.97, 1.1, 1.32, 0.87, 1.3, 200, 1.9, 0.88) },
  skunk: { name: 'SKUNK', food: 'beetle', ...tune(2.71, 1.29, 1.05, 1.1, 1.37, 0.85, 1.34, 200, 2.0, 0.86) },
  gorilla: { name: 'GORILLA', food: 'fig', ...tune(2.93, 1.32, 1, 1.2, 1.42, 0.83, 1.39, 250, 2.2, 0.85) },
  wolf: { name: 'WOLF', food: 'sausage', ...tune(3.14, 1.36, 1, 1.15, 1.45, 0.815, 1.43, 250, 2.3, 0.83) },
  boar: { name: 'BOAR', food: 'mushroom', ...tune(3.21, 1.37, 0.95, 1.2, 1.47, 0.807, 1.44, 250, 2.33, 0.827) }, // heavy, low jumps
  bear: { name: 'BEAR', food: 'berries', ...tune(3.29, 1.38, 0.95, 1.2, 1.49, 0.803, 1.455, 275, 2.37, 0.82) },
  yak: { name: 'YAK', food: 'hay', ...tune(3.36, 1.39, 0.95, 1.2, 1.51, 0.8, 1.47, 300, 2.4, 0.81) }, // heavy
  ostrich: { name: 'OSTRICH', food: 'melon', ...tune(3.46, 1.41, 1.06, 1.1, 1.535, 0.79, 1.49, 300, 2.45, 0.8) }, // long legs: high jumps
  elephant: { name: 'ELEPHANT', food: 'peanut', ...tune(3.57, 1.43, 1, 1.2, 1.56, 0.78, 1.51, 300, 2.5, 0.79) },
  dromedary: { name: 'DROMEDARY', food: 'date', ...tune(3.68, 1.445, 1, 1.15, 1.58, 0.77, 1.535, 300, 2.6, 0.785) },
  rhino: { name: 'RHINO', food: 'leaf', ...tune(3.79, 1.46, 0.95, 1.15, 1.6, 0.76, 1.56, 300, 2.7, 0.78) },
  dino: { name: 'DINO', food: 'roast', ...tune(4.0, 1.5, 1, 1.25, 1.65, 0.74, 1.6, 300, 2.8, 0.76) }, // the hardest (the last)
};

// where a run is in its stride (phase 0…1) → { frame, lift }: a gait's frame, and how high a leap has the body (a
// gallop bobs itself); a move of keyframes, four to a stride
export function stride(kind, phase, move = 'run') {
  const g = RIGS[kind].poses[move]?.gait;
  return g ? { frame: Math.floor(phase * g.frames) % g.frames, lift: g.leap ? leapLift(g, phase) : 0 } : { frame: Math.floor(phase * 4) % 4, lift: 0 };
}

// how fast a run's strides go, for an animal (1: the usual; less: longer strides, as a rig's gait says)
export const strideRate = (kind) => RIGS[kind].poses.run?.gait?.rate || 1;
// how many strides a second, running at a speed (art pixels a second); rate: its own (see strideRate)
export const strides = (kind, speed, rate = strideRate(kind)) => (1.6 + speed / 90) * rate;
// does it run in leaps (the rabbit, the squirrel: landing with a puff of dust)?
export const leaps = (kind) => !!RIGS[kind].poses.run?.gait?.leap;

// sitting (on the title), t seconds in → its frame: a rig's own loop (breathing, looking about), or two frames
export function idleFrame(kind, t) {
  const m = RIGS[kind].poses.idle;
  return m?.fps ? Math.floor(t * m.fps) % m.frames : Math.floor(t * 5) % 2;
}

// jumping, rise: how fast it goes up (1: as it takes off, 0: at the top, -1: falling as fast) → its frame: a rig's jump
// keyframes, spread over the arc (two: rising, falling)
export function jumpFrame(kind, rise) {
  const m = RIGS[kind].poses.jump, n = m?.keys ? m.frames : 2;
  return clamp(Math.floor(((1 - rise) / 2) * n), 0, n - 1);
}

// an animal in a move's frame: blinking or not; body: its moving parts (its chains), as moveBody left them (none: at
// rest); scale: drawn bigger (the giant dino, see drawRig)
export function animal(kind, pose, frame = 0, { blink = false, body = null, scale = 1, look = null } = {}) {
  return pose === 'ball' ? balls[frame % 4] : rigFrame(kind, pose, frame, blink, body, scale, look);
}


// the face's frames: small pixel pictures for its eye and its mouth, each by name, drawn with its anchor (at: a column
// and row of it) on the face's point (the eye's, the mouth's). Rows of characters: '.' nothing, the rest an ink (see
// FACE_INKS, or one of the face's own: face.inks, any color of the palette by a letter). Which frame a pose shows: its eye and mouth (a clip's keys set them: hurt, ko; petted and eating: happy),
// else open (blinking: blink) and shut. An animal's file can draw its own, or more (face.frames: see asset.js); what it
// doesn't have is as here. A mouth is drawn only where the face has one (face.mouth)
export const FACE_FRAMES = {
  eye: {
    open: { at: [0, 0], rows: ['x', 'x'] },
    blink: { at: [0, 0], rows: ['.', 'x'] },
    hurt: { at: [1, 1], rows: ['x.', '.x', 'x.'] }, // >
    ko: { at: [1, 1], rows: ['x.x', '.x.', 'x.x'] },
    happy: { at: [1, 0], rows: ['.x.', 'x.x'] }, // ^ (shut, smiling: being petted)
  },
  mouth: {
    shut: { at: [0, 0], rows: ['x'] },
    open: { at: [0, 0], rows: ['x', 'x'] },
    happy: { at: [0, 0], rows: ['x.', '.x'] },
  },
};
export const FACE_INKS = { x: 'black', w: 'white', p: 'pink', r: 'red', k: 'ink' };
const faceFrame = (head, part, name) => head.frames?.[part]?.[name] || FACE_FRAMES[part][name];
// (put: a pixel of the sprite's grid; at: the one the anchor goes on; n: how big a pixel of the frame is there)
function faceDraw(put, frame, [X, Y], n, inks) {
  if (!frame) return;
  const [ax, ay] = frame.at;
  frame.rows.forEach((row, r) => {
    for (let c = 0; c < row.length; c++) if (row[c] !== '.') for (let a = 0; a < n; a++) for (let b = 0; b < n; b++) put(X + (c - ax) * n + a, Y + (r - ay) * n + b, NAMED[inks?.[row[c]] || FACE_INKS[row[c]]] || OUT);
  });
}

// ------------------------------------------------------------------------------------------------- the hedgehog's ball

// spikes (a hedgehog) or bristles (a boar): ticks out of the outline where `where` holds, every so often (phase turns
// them); a texture of lighter specks inside
function spikes(g, mask, where, phase = 0, speck = 0) {
  const ticks = [];
  for (let y = 1; y < g.h - 1; y++) for (let x = 1; x < g.w - 1; x++) {
    const i = y * g.w + x;
    if (mask[i] || g.px[i] !== OUT || !where(x, y) || (x + y * 2 + phase) % 3) continue;
    for (const [dx, dy] of [[0, 1], [0, -1], [1, 0], [-1, 0]]) if (mask[(y + dy) * g.w + x + dx]) ticks.push([x - dx, y - dy]);
  }
  for (const [x, y] of ticks) if (!g.get(x, y)) g.dot(x, y, OUT);
  if (speck) for (let i = 0; i < mask.length; i++) if (mask[i] && where(i % g.w, Math.floor(i / g.w)) && ((i * 37 + phase * 11) % 17) % 5 === 0) g.px[i] = speck;
}

// its super power rolls it up: a spiky ball, its face turning with it (frames 0-3)
const balls = [0, 1, 2, 3].map((f) => {
  const g = new Grid(26, 20), m = g.layer([ellipse(12, 12.5, 6.5, 6.5)], BROWN, OUT);
  spikes(g, m, () => true, f, TAN);
  g.paint([ellipse(13 + [0, 1, 0, -1][f], 13.5 + [0, 0, 1, 0][f], 2.6, 2.2)], BEIGE, m);
  return sprite(g, m, { head: [12, 4] });
});

// ------------------------------------------------------------------------------------------------------------ rigs
// An animal is a rig (its file, assets/<kind>.js: see asset.js): joints, shapes on them, legs that
// bend to reach their paws, chains (a tail, ears) that the body's motion swings, and its moves: a pose for each move and
// frame (see poseOf). Its shapes are distances (how far a point lies outside them), so they join smoothly. Each frame is
// drawn into a grid just big enough for it, with its offset (ox, oy) from the 26×20 box the game places every animal by:
// a tail can reach out of the box. One made from another (of: the wolf, the fox's) is that one's, with its own over it
const FILES = { rabbit, guineapig, cat, dog, pig, fox, hedgehog, squirrel, otter, skunk, wolf, boar, bear, yak, ostrich, cheetah, dromedary, rhino, gorilla, elephant, dino };
const rawRig = (asset, of = FILES[asset.of]) => { const b = toBuild(asset); return of ? { ...rawRig(of), ...b } : { ...b, poses: b.moves || {} }; };
export const rigOf = (asset, of = FILES[asset.of]) => onLayers(rawRig(asset, of));
// its look (see asset.js): one list of groups, back to front, each drawn as one, and 'face' (where the face is drawn).
// The body: the first group that hits (not the far side), whose own shapes, paint and spikes a pose changes (see
// layersAt). The torso: the first shape on the spine (a move's torso: thicker, longer)
const defined = (o) => { for (const k in o) if (o[k] === undefined) delete o[k]; return o; };
const isGroup = (g) => !!g && typeof g === 'object';
const bodyOf = (layers) => layers.find((g) => isGroup(g) && g.hits && !g.far);
// (the vectors: here, as a rig is made while this file loads, see RIGS)
const plus = (a, b) => [a[0] + b[0], a[1] + b[1]], minus = (a, b) => [a[0] - b[0], a[1] - b[1]], times = (a, k) => [a[0] * k, a[1] * k];
const turn = ([x, y], t) => [x * Math.cos(t) - y * Math.sin(t), x * Math.sin(t) + y * Math.cos(t)]; // (+: clockwise on screen)
const unit = (a) => times(a, 1 / (Math.hypot(a[0], a[1]) || 1)), mix = (a, b, t) => plus(a, times(minus(b, a), t));
function onLayers(b) {
  const bones = {}, r = { ...b, layers: (b.layers || []).map((g, i) => swungGroup(g, i, bones)), torso: { r: 0, none: true } };
  if (Object.keys(bones).length) r.chains = { ...b.chains, ...bones };
  const spine = r.layers.filter(isGroup).flatMap((g) => g.shapes).find((s) => s.bone === 'spine');
  if (spine) r.torso = defined({ r: spine.r, ends: spine.ends });
  return r;
}
// a group that swings (swing: see asset.js): about its pivot, on a bone of its own (named ~ and its name), from its pivot
// to the middle of its shapes (or below the pivot), as an ear swings; drawn turned as much as its bone is (see drawRig)
const pointsOf = (s) => (s.triangle || (s.capsule ? [s.capsule.slice(0, 2), s.capsule.slice(2, 4)] : s.box ? [s.box.slice(0, 2), s.box.slice(2, 4)] : s.ellipse ? [s.ellipse.slice(0, 2)] : []));
const GROUP_SWING = { stiffness: 600, damping: 12, weight: 60 };
function swungGroup(g, i, bones) { // (its bone into bones)
  const on = isGroup(g) && g.swing && g.shapes.length && !g.shapes.some((s) => s.bone) && g.shapes[0].on;
  if (!on) return g;
  const at = g.at || [0, 0], pts = g.shapes.flatMap(pointsOf), m = times(pts.reduce(plus, [0, 0]), 1 / pts.length);
  const mid = plus(at, turn(m, g.angle || 0)), tip = Math.hypot(...minus(mid, at)) > 0.5 ? mid : [at[0], at[1] + 2], n = `~${g.name || i}`;
  bones[n] = { on, ear: true, at, tip, ...GROUP_SWING, ...g.swing };
  return { ...g, swung: n };
}
// a body's shapes in a pose: its own (on no bone), then the pose's (ownShapes: the pose's alone, in their place); those
// on bones where they are
function withPose(list, p) {
  if (!p.shapes && !p.ownShapes) return list;
  const out = [], last = list.reduce((a, s, i) => (s.bone ? a : i), -1);
  list.forEach((s, i) => { if (s.bone || !p.ownShapes) out.push(s); if (i === last) out.push(...(p.shapes || [])); });
  if (last < 0) out.push(...(p.shapes || []));
  return out;
}
const bodyShapes = (rig, p) => withPose(bodyOf(rig.layers)?.shapes || [], p);
// the groups as a pose has them: the body's shapes, paint and spikes; the pose's own groups (top) after the body and the
// groups on no bone that follow it
function layersAt(rig, p) {
  const body = bodyOf(rig.layers);
  let out = rig.layers.map((g) => (g === body ? { ...g, shapes: withPose(g.shapes, p), paint: p.paint || g.paint, spikes: p.spikes || g.spikes, body: true } : g));
  if (p.top?.length) {
    let at = out.findIndex((g) => g.body);
    out.forEach((g, i) => { if (i > at && isGroup(g) && !g.shapes.some((s) => s.bone)) at = i; });
    out = [...out.slice(0, at + 1), ...p.top, ...out.slice(at + 1)];
  }
  return out;
}
const RIGS = Object.fromEntries(Object.entries(FILES).map(([k, a]) => [k, rigOf(a)]));

// distances: negative inside. (Called for every pixel of every frame drawn: they read their shapes by index and make
// nothing, no arrays, no iterators)
const sdEllipse = (x, y, e) => (Math.hypot((x - e[0]) / e[2], (y - e[1]) / e[3]) - 1) * Math.min(e[2], e[3]);
function sdCapsule(x, y, c) {
  const ax = c[0], ay = c[1], dx = c[2] - ax, dy = c[3] - ay, t = clamp(((x - ax) * dx + (y - ay) * dy) / (dx * dx + dy * dy || 1), 0, 1);
  return Math.hypot(x - ax - t * dx, y - ay - t * dy) - c[4];
}
function sdTriangle(x, y, tri) { // (Inigo Quilez's)
  const a = tri[0], b = tri[1], c = tri[2], s = Math.sign((b[0] - a[0]) * (a[1] - c[1]) - (b[1] - a[1]) * (a[0] - c[0]));
  let d = Infinity, w = Infinity;
  for (let i = 0; i < 3; i++) { // (each edge: from its corner to the next)
    const p = tri[i], q = tri[(i + 1) % 3], ex = q[0] - p[0], ey = q[1] - p[1], vx = x - p[0], vy = y - p[1];
    const t = clamp((vx * ex + vy * ey) / (ex * ex + ey * ey), 0, 1);
    d = Math.min(d, (vx - ex * t) ** 2 + (vy - ey * t) ** 2); w = Math.min(w, s * (vx * ey - vy * ex));
  }
  return -Math.sqrt(d) * Math.sign(w);
}
function sdBox(x, y, b) { // (b[4]: its corners rounded)
  const x0 = b[0], y0 = b[1], x1 = b[2], y1 = b[3], r = b[4] ?? 0;
  const qx = Math.max(x0 + r - x, x - x1 + r), qy = Math.max(y0 + r - y, y - y1 + r);
  return Math.hypot(Math.max(qx, 0), Math.max(qy, 0)) + Math.min(Math.max(qx, qy), 0) - r;
}
const sdShape = (s, x, y) => (s.ellipse ? sdEllipse(x, y, s.ellipse) : s.capsule ? sdCapsule(x, y, s.capsule) : s.box ? sdBox(x, y, s.box) : sdTriangle(x, y, s.triangle));
const smin = (a, b, k) => { if (k <= 0) return Math.min(a, b); const h = Math.max(k - Math.abs(a - b), 0) / k; return Math.min(a, b) - h * h * k * 0.25; };
// a shape's box, in its own coordinates
const extent = (s) => (s.ellipse ? [s.ellipse[0] - s.ellipse[2], s.ellipse[1] - s.ellipse[3], s.ellipse[0] + s.ellipse[2], s.ellipse[1] + s.ellipse[3]]
  : s.box ? s.box.slice(0, 4)
  : s.capsule ? [Math.min(s.capsule[0], s.capsule[2]) - s.capsule[4], Math.min(s.capsule[1], s.capsule[3]) - s.capsule[4], Math.max(s.capsule[0], s.capsule[2]) + s.capsule[4], Math.max(s.capsule[1], s.capsule[3]) + s.capsule[4]]
  : [Math.min(...s.triangle.map((p) => p[0])), Math.min(...s.triangle.map((p) => p[1])), Math.max(...s.triangle.map((p) => p[0])), Math.max(...s.triangle.map((p) => p[1]))]);

// an ellipse or a box turned (angle: about its middle, + clockwise): as one in the middle of a frame turned so, in f
function turned(s, f) {
  if (!s.angle || !(s.ellipse || s.box)) return [s, f];
  const v = s.ellipse || s.box, c = s.ellipse ? [v[0], v[1]] : [(v[0] + v[2]) / 2, (v[1] + v[3]) / 2], b = f || { o: [0, 0], a: 0, flip: 1 };
  const t = { o: toWorld(b, c), a: b.a + s.angle * b.flip, flip: b.flip };
  return [s.ellipse ? { ...s, ellipse: [0, 0, v[2], v[3]] } : { ...s, box: [v[0] - c[0], v[1] - c[1], v[2] - c[0], v[3] - c[1], v[4]] }, t];
}
// a joint's frame: its place, its angle, flipped (on its back); points from it (local) and back (world)
const jointFrame = (o, a, flip) => ({ o, a, flip: flip ? -1 : 1 });
// the head's: turned by a about its pivot (from the head joint, as it is at rest; none: the joint itself)
const headFrame = (o, a, pv) => jointFrame(pv ? plus(o, minus(pv, turn(pv, a))) : o, a);
const toLocal = (f, x, y) => { const dx = x - f.o[0], dy = y - f.o[1], c = Math.cos(f.a), s = Math.sin(f.a); return [dx * c + dy * s, (-dx * s + dy * c) * f.flip]; };
const toWorld = (f, [x, y]) => (f ? plus(f.o, turn([x, y * f.flip], f.a)) : [x, y]);

// two bones from a root toward a target (lengths a, b) → [knee, end]; bend 1 puts the knee behind, -1 in front
function reach(root, target, a, b, bend) {
  const d = minus(target, root), dist = clamp(Math.hypot(d[0], d[1]), Math.abs(a - b) + 0.01, a + b - 0.01), dir = unit(d);
  const knee = plus(root, times(turn(dir, bend * Math.acos(clamp((a * a + dist * dist - b * b) / (2 * a * dist), -1, 1))), a));
  return [knee, plus(knee, times(unit(minus(target, knee)), b))];
}
// a bone from a root to an end, len long, as an arc through both (bend 1: bowed to the left of the way it goes, as seen
// on the screen; -1: to the right; 0, or as far apart as it is long: straight, stretched) → its points, links + 1
export function arcPoints(a, b, len, bend, links = 2) {
  const d = minus(b, a), dist = Math.hypot(d[0], d[1]), n = Math.max(1, links);
  if (!bend || !(len > dist + 0.001) || dist < 0.001) return [...Array(n + 1).keys()].map((i) => mix(a, b, i / n));
  let lo = 0, hi = 2 * Math.PI; // (the arc's angle θ: sin(θ/2) / (θ/2) = dist / len, found by halving)
  for (let i = 0; i < 24; i++) { const t = (lo + hi) / 2; if (Math.sin(t / 2) / (t / 2) > dist / len) lo = t; else hi = t; }
  const t = (lo + hi) / 2, R = len / t, u = times(d, 1 / dist), nm = times([u[1], -u[0]], Math.sign(bend));
  const c = minus(mix(a, b, 0.5), times(nm, R * Math.cos(t / 2))), s = u[0] * nm[1] - u[1] * nm[0] > 0 ? -1 : 1; // (its middle; which way round)
  return [...Array(n + 1).keys()].map((i) => plus(c, turn(minus(a, c), (s * t * i) / n)));
}

// a frame of a gait (a move worked out from the stride: the run, the crawl): where the stride is (frame / frames) → the
// joints bobbing (beat times a stride; the head following the chest), each paw on the ground pushing back (the stance)
// or swinging forward in an arc. m: the move, its settings over the rig's
function gaitPose(rig, m, f) {
  const g = m.gait, p = f / g.frames, J = { ...rig.joints, ...m.joints }, bob = (o) => [0, g.bob * Math.sin(Math.PI * 2 * ((g.beat || 1) * p + o))];
  const chest = bob(-0.15), paws = {};
  for (const name in g.legs) {
    const [o, ahead] = g.legs[name], L = rig.legs[name], x = toWorld(jointFrame(J[L.on], 0), L.at)[0] + ahead, q = (((p - o) % 1) + 1) % 1;
    if (q < g.stance) paws[name] = [x + g.reach * (0.5 - q / g.stance), g.ground];
    else { const u = (q - g.stance) / (1 - g.stance); paws[name] = [x - g.reach / 2 + g.reach * u * u * (3 - 2 * u), g.ground - g.lift * Math.sin(Math.PI * u)]; }
  }
  return { ...m, joints: { hip: plus(J.hip, bob(0.1)), chest: plus(J.chest, chest), head: plus(J.head, times(chest, g.head ?? 0.7)) }, paws };
}

// a frame of a leap (a gait of bounds: the rabbit, the squirrel): on the ground for `land` of the stride, gathering
// (gather: the hip forward) and crouching, then off into the air (how high: height, see stride), stretched out (the hip
// back), the nose up as it rises and down as it falls (pitch). Each leg: when its paw is down (down: [touches, leaves],
// in the stride), where (at: from its root, as it touches and as it leaves; it slides back between), and the point it
// swings toward in the air (air: from its root, and from the ground)
function leapPose(rig, m, f) {
  const g = m.gait, p = f / g.frames, J = { ...rig.joints, ...m.joints }, down = p < g.land, paws = {};
  const crouch = down ? Math.sin((Math.PI * p) / g.land) : 0, air = down ? 0 : Math.sin((Math.PI * (p - g.land)) / (1 - g.land)), tilt = down ? 0 : Math.cos((Math.PI * (p - g.land)) / (1 - g.land));
  const hip = plus(J.hip, [g.gather * crouch - g.stretch * air, g.crouch * crouch + g.pitch * tilt]), chest = plus(J.chest, [0, 0.4 * g.crouch * crouch - g.pitch * tilt]);
  const wrap = (x) => ((x % 1) + 1) % 1;
  for (const name in g.legs) {
    const { down: [td, lo], at: [xt, xl], air: [cx, cy] } = g.legs[name], L = rig.legs[name], x0 = toWorld(jointFrame(J[L.on], 0), L.at)[0];
    const into = wrap(p - td), span = wrap(lo - td) || 1;
    if (into < span) { paws[name] = [x0 + xt + ((xl - xt) * into) / span, g.ground]; continue; }
    const u = (into - span) / (1 - span), a = [x0 + xl, g.ground], c = [x0 + cx, g.ground + cy], b = [x0 + xt, g.ground]; // (a curve from a to b, pulled toward c)
    paws[name] = plus(plus(times(a, (1 - u) ** 2), times(c, 2 * u * (1 - u))), times(b, u * u));
  }
  return { ...m, joints: { hip, chest, head: plus(J.head, times(minus(chest, J.chest), g.head ?? 0.8)) }, paws };
}
// how high a leap has the body, where the stride is
const leapLift = (g, phase) => (phase < g.land ? 0 : g.height * Math.sin((Math.PI * (phase - g.land)) / (1 - g.land)));

// a rig's pose for a move and a frame. A move is a gait (gait: its settings, see gaitPose and leapPose; with what else of
// the pose it changes: lying low's joints, torso, shapes) or a clip: keys over its frames (frames; fps: a loop, played
// over time: the idle), each key at a frame setting what of the pose it changes (a joint, a paw, the torso, the head's
// turn, a tail's angle, the shapes), each of those going from a key that sets it to the next by the first's ease (see
// EASES; linear if none), a loop's last key on round to its first. A move it has none of: the run. (Worked-out poses
// are kept.)
const worked = new Map();
function poseOf(rig, name, frame) {
  const m = rig.poses[name] || rig.poses.run;
  let list = worked.get(m);
  if (!list) worked.set(m, (list = []));
  const n = m.gait ? m.gait.frames : m.frames, i = frame % n;
  return list[i] || (list[i] = using(rig, m.gait ? (m.gait.leap ? leapPose : gaitPose)(rig, m, i) : clipPose(m, i)));
}
// how a thing goes from one key to the next (u: 0…1 of the way): at once at the next (step), evenly, easing in and out
// (smooth), or as a swing does (sine: a breath, a wave)
const EASES = { step: () => 0, linear: (u) => u, smooth: (u) => u * u * (3 - 2 * u), sine: (u) => (1 - Math.cos(Math.PI * u)) / 2 };
// a value part way to another: numbers, and lists and objects of them alike; what differs in kind: the first
const between = (a, b, u) => {
  if (u <= 0 || a === b) return a;
  if (typeof a === 'number' && typeof b === 'number') return a + (b - a) * u;
  if (Array.isArray(a) && Array.isArray(b) && a.length === b.length) return a.map((x, i) => between(x, b[i], u));
  if (a && b && typeof a === 'object' && typeof b === 'object' && !Array.isArray(a) && !Array.isArray(b)) {
    const ka = Object.keys(a);
    if (ka.length === Object.keys(b).length && ka.every((k) => k in b)) { const o = {}; for (const k of ka) o[k] = between(a[k], b[k], u); return o; }
  }
  return a;
};
// a clip's keys, by what they set (a path: 'joints.chest', 'chains.tail.angle', 'shapes'): [{ at, v, ease }] in order
const tracksOf = new Map();
function tracks(m) {
  let t = tracksOf.get(m);
  if (t) return t;
  t = new Map();
  const walk = (o, pre, key) => {
    for (const k in o) {
      if (!pre && (k === 'at' || k === 'ease')) continue;
      const v = o[k], path = pre ? `${pre}.${k}` : k;
      if (v && typeof v === 'object' && !Array.isArray(v)) walk(v, path, key);
      else { if (!t.has(path)) t.set(path, []); t.get(path).push({ at: key.at, v, ease: key.ease }); }
    }
  };
  for (const key of m.keys) walk(key, '', key);
  for (const list of t.values()) list.sort((a, b) => a.at - b.at);
  tracksOf.set(m, t);
  return t;
}
// a clip's pose at a frame (a value of null: not set, as if no key had it)
function clipPose(m, f) {
  const pose = {}, n = m.frames, loop = !!m.fps;
  for (const [path, ks] of tracks(m)) {
    let i = ks.length - 1;
    while (i > 0 && ks[i].at > f) i--;
    let a = ks[i], b = ks[i + 1], from = a.at, to = b?.at;
    if (a.at > f) { if (loop) { b = a; to = a.at; a = ks[ks.length - 1]; from = a.at - n; } else b = null; } // (before the first)
    else if (!b && loop && ks.length > 1) { b = ks[0]; to = b.at + n; } // (after the last: on round to the first)
    const v = b ? between(a.v, b.v, (EASES[a.ease] || EASES.linear)((f - from) / (to - from))) : a.v;
    if (v === null) continue;
    const keys = path.split('.');
    let o = pose;
    for (let j = 0; j < keys.length - 1; j++) o = o[keys[j]] ||= {};
    o[keys[keys.length - 1]] = v;
  }
  return pose;
}
// a pose's shapes, paint and top, with the build's own put in where one is used by name ({ use: its name, move: [dx, dy]
// (all of it moved), and what of it is other}): the build's as it is now (shapes: the body's own, paint: the body's,
// top: its groups)
const SHIFT = { ellipse: [0], capsule: [0, 2], box: [0, 2] };
const shifted = (s, [dx, dy]) => {
  const o = { ...s };
  for (const g in SHIFT) if (s[g]) { o[g] = s[g].slice(); for (const i of SHIFT[g]) { o[g][i] += dx; o[g][i + 1] += dy; } }
  if (s.triangle) o.triangle = s.triangle.map(([x, y]) => [x + dx, y + dy]);
  if (s.shapes) o.shapes = s.shapes.map((x) => shifted(x, [dx, dy]));
  return o;
};
function using(rig, p) {
  let out = p;
  for (const list of ['shapes', 'paint', 'top']) {
    if (!p[list]?.some((x) => x.use)) continue;
    const body = bodyOf(rig.layers), own = list === 'shapes' ? (body?.shapes || []).filter((s) => !s.bone) : list === 'paint' ? body?.paint || [] : rig.layers.filter(isGroup);
    out = { ...out, [list]: p[list].map((x) => {
      if (!x.use) return x;
      const { use, move, ...other } = x, s = { ...own.find((y) => y.name === use), ...other };
      return move ? shifted(s, move) : s;
    }) };
  }
  return out;
}
// a rig in a pose: the pose's settings over the rig's, the joints' frames
const posed = (rig, name, frame) => posedAs(rig, poseOf(rig, name, frame));
function posedAs(rig, p) {
  const J = { ...rig.joints, ...p.joints }, a = Math.atan2(J.chest[1] - J.hip[1], J.chest[0] - J.hip[0]);
  const F = { spine: jointFrame(J.hip, a, p.flip), hip: jointFrame(J.hip, a, p.flip), chest: jointFrame(J.chest, a, p.flip), head: headFrame(J.head, p.headAngle || 0, rig.headPivot),
    box: p.turn ? jointFrame(plus(minus(p.turn.pivot, turn(p.turn.pivot, p.turn.angle)), p.turn.by || [0, 0]), p.turn.angle) : null }; // (box: what is on no joint, turned with the whole body, moved by: see hung)
  bonesOn(rig, p, F);
  for (const n in rig.legs) { // (a leg's thigh and shin: from where each starts, along it, as the pose bends it)
    const L = rig.legs[n], b = F[L.on], paw = p.paws?.[n];
    if (!b || !paw) continue;
    const root = p.roots?.[n] || toWorld(b, L.at), [knee, end] = reach(root, paw, L.thigh, L.shin, L.bend);
    F[`${n}.thigh`] = { o: root, a: Math.atan2(knee[1] - root[1], knee[0] - root[0]), flip: b.flip };
    F[`${n}.shin`] = { o: knee, a: Math.atan2(end[1] - knee[1], end[0] - knee[0]), flip: b.flip };
  }
  bonesOn(rig, p, F); // (those on a leg's thigh or shin)
  return { p, J, F, a, torso: rig.torso?.none ? { r: 0 } : torsoBy(rig.torso, p.torso) }; // (none: no shape on the spine)
}
// the bones (see asset.js): each a frame, from where it is on what it is on (a joint, a leg's part, a bone; none: the box),
// turned by its angle as the pose has it; one that reaches (to: a joint or a bone) from there to its end on it (end, in
// its frame), bowed as an arc as long as it is (bend, links; its points: pts, its turn: its first link's). One on (or
// reaching) what has no frame yet: left for later (on a leg's part, see posedAs)
function bonesOn(rig, p, F) {
  const B = rig.bones;
  if (!B) return;
  const need = (k, n, seen) => !k || F[k] || (B[k] && !seen?.has(k) && put(k, (seen || new Set()).add(n))); // (seen: those it is on, below it: made when one is on a bone not put yet)
  const put = (n, seen) => {
    if (F[n]) return true;
    const b = p.bones?.[n] ? { ...B[n], ...p.bones[n] } : B[n];
    if (!need(b.on, n, seen) || !need(b.to, n, seen)) return false;
    const f = b.on ? F[b.on] : F.box, base = f || { a: 0, flip: 1 }, o = toWorld(f, b.at || [0, 0]);
    if (b.to) {
      const pts = arcPoints(o, toWorld(F[b.to], b.end || [0, 0]), b.length || 0, (b.bend || 0) * base.flip, b.links || 2), d = minus(pts[1], o);
      F[n] = { o, a: Math.atan2(d[1], d[0]), flip: base.flip, pts };
    } else F[n] = { o, a: base.a + (b.angle || 0) * base.flip, flip: base.flip };
    return true;
  };
  for (const n in B) put(n);
}
// a torso (the first shape on the spine, see onLayers) as a pose has it: its r and ends, thicker and longer by the
// pose's (-: thinner, shorter)
const plusBy = (v, dv, none) => (!dv ? v : Array.isArray(v) ? v.map((x) => x + dv) : (v ?? none) + dv);
const torsoBy = (t, d) => (d ? { ...t, r: plusBy(t.r, d.thicker, 1), ends: plusBy(t.ends, d.longer, 0) } : t);
// a pose between two (u: 0 the first, 1 the second): the joints, the paws, the head's turn, the torso and the chains' rest
// part way; what cannot be part way (the shapes of a pose of its own, flipped, pads), the nearer one's
function mixPose(rig, a, b, u) {
  const m = u < 0.5 ? a : b, lerp = (x, y) => x + (y - x) * u, part = (x, y) => (x && y ? mix(x, y, u) : u < 0.5 ? x : y);
  const ja = { ...rig.joints, ...a.joints }, jb = { ...rig.joints, ...b.joints }, ta = a.torso || {}, tb = b.torso || {};
  const out = { ...m, eye: b.eye, mouth: b.mouth, joints: {}, paws: {}, chains: {}, headAngle: lerp(a.headAngle || 0, b.headAngle || 0), torso: { thicker: lerp(ta.thicker || 0, tb.thicker || 0), longer: lerp(ta.longer || 0, tb.longer || 0) } };
  for (const k in ja) out.joints[k] = mix(ja[k], jb[k], u);
  for (const k in rig.legs) out.paws[k] = part(a.paws?.[k], b.paws?.[k]);
  if (rig.bones) { out.bones = {}; for (const k in rig.bones) { const ba = { angle: 0, at: [0, 0], ...rig.bones[k], ...a.bones?.[k] }, bb = { angle: 0, at: [0, 0], ...rig.bones[k], ...b.bones?.[k] }; out.bones[k] = { angle: lerp(ba.angle, bb.angle), at: mix(ba.at, bb.at, u) }; } }
  for (const k in rig.chains) {
    const ca = { curl: 0, ...rig.chains[k], ...a.chains?.[k] }, cb = { curl: 0, ...rig.chains[k], ...b.chains?.[k] };
    out.chains[k] = ca.ear ? { tip: mix(ca.tip, cb.tip, u) } : { ...(u < 0.5 ? a : b).chains?.[k], angle: lerp(ca.angle, cb.angle), curl: lerp(ca.curl, cb.curl), at: mix(ca.at, cb.at, u), root: part(ca.root, cb.root) };
  }
  return out;
}
// landing (s: how hard, 1…0): the body lower (the legs bend to keep their paws down), the torso flatter and longer
function squashPose(rig, p, s) {
  const J = { ...rig.joints, ...p.joints }, t = p.torso || {}, down = (q, k) => [q[0], q[1] + k * 1.5 * s];
  return { ...p, joints: { hip: down(J.hip, 1), chest: down(J.chest, 0.8), head: down(J.head, 0.5) }, torso: (rig.torso?.r || 0) + (t.thicker || 0) > 0 ? { thicker: (t.thicker || 0) - 0.35 * s, longer: (t.longer || 0) + 0.4 * s } : p.torso };
}

// a chain at rest in a pose: its root, its direction, its links (an ear: one, from its root to its tip)
function chainRest(rig, P, name) {
  const c = { links: 1, curl: 0, ...rig.chains[name], ...P.p.chains?.[name] }, f = P.F[c.on];
  if (c.ear) {
    const root = toWorld(f, c.at), to = minus(toWorld(f, c.tip), root);
    return { ...c, root, dir: unit(to), length: Math.hypot(to[0], to[1]) };
  }
  return { ...c, root: c.root || toWorld(f, c.at), dir: turn([0, -1], f.a - c.angle) };
}
function restPoints(c) {
  const pts = [c.root];
  for (let i = 0, d = c.dir; i < c.links; i++, d = turn(d, c.curl)) pts.push(plus(pts[i], times(d, c.length / c.links)));
  return pts;
}
// a shape on a bone (bone, along: see asset.js) as the pose has the bone, in the box: its parts (each a shape, in a frame
// if it has one), and what it has more on a leg (a paw lying flat, unless far; its sock) or as a triangle (its tip).
// chains: where each chain's points are; first: the torso (the first shape on the spine: a move's torso makes it thicker,
// longer)
function onBone(rig, P, chains, s, far = false, first = false) {
  const { p, F, J } = P, n = s.bone, L = rig.legs?.[n], c = rig.chains?.[n];
  let pts, rf, at = [0, 0]; // (its points from its root; a triangle's base about its root, in rf)
  if (n === 'spine') { pts = [J.hip, J.chest]; rf = F.spine; }
  else if (L) {
    const root = p.roots?.[n] || toWorld(F[L.on], L.at);
    pts = [root, ...reach(root, p.paws[n], L.thigh, L.shin, L.bend)]; rf = { ...F[L.on], o: root };
  } else if (c && chains[n]) {
    pts = chains[n];
    if (c.ear) { rf = F[c.on]; at = c.at; } else rf = { ...F[c.on], o: pts[0] };
  } else if (rig.bones?.[n] && F[n]) { pts = F[n].pts || [F[n].o, toWorld(F[n], [rig.bones[n].length || 0, 0])]; rf = F[n]; } // (a bone: from where it is on, as long as it is; one that reaches: its arc)
  else return null;
  const t = n === 'spine' ? (first ? { ...s, r: P.torso.r, ends: P.torso.ends } : torsoBy(s, p.torso)) : s; // (another on the spine: changed as much)
  const kind = s.along || (n === 'spine' ? (s.round ? 'capsule' : 'ellipse') : c?.ear ? 'triangle' : 'capsule'); // (none: as its bone had it)
  const a = pts[0], b = pts[pts.length - 1], ends = t.ends || 0;
  const r = (i) => (Array.isArray(t.r) ? t.r[0] + ((t.r[1] - t.r[0]) * i) / Math.max(1, pts.length - 2) : t.r ?? 1);
  const along = (u) => { // (a point u along it: past its end, on along its last part)
    const k = pts.length - 1, v = clamp(u * k, 0, k), i = Math.min(k - 1, Math.floor(v));
    return mix(pts[i], pts[i + 1], v - i);
  };
  const out = { parts: [], marks: (s.marks || []).map(([u, mc, mr]) => [along(u), NAMED[mc], mr]), grows: s.grows, start: [...a, Number(r(0)) || 1], line: { pts, rf, at } }; // (start: its root, how thick; line: its bone's points, its root's frame)
  if (kind === 'triangle') { // from its base (two points about its root) to its end
    const base = (s.base || [[0, 0], [0, 0]]).map((q) => toWorld(rf, plus(at, q))), tri = [base[0], b, base[1]];
    out.parts.push({ s: { triangle: tri } });
    return { ...out, tri, tip: b, tipColor: s.tipColor, tipSize: s.tipSize };
  }
  if (!(r(0) > 0)) return null;
  if (kind === 'ellipse' || kind === 'box') { // from its root to its end, reaching past both (ends), r thick
    const len = Math.hypot(b[0] - a[0], b[1] - a[1]), f = n === 'spine' ? F.spine : { o: a, a: Math.atan2(b[1] - a[1], b[0] - a[0]), flip: 1 };
    out.parts.push({ s: kind === 'ellipse' ? { ellipse: [len / 2, 0, len / 2 + ends, r(0)] } : { box: [-ends, -r(0), len + ends, r(0), t.round || 0] }, f });
    return out;
  }
  // a capsule: through its points (r: or at the root and at the end), reaching past both (ends), a round end; on a leg
  // a paw flat on the ground (lying low; a foot: always) and its sock
  const q = pts.slice();
  if (n === 'spine') { const len = Math.hypot(b[0] - a[0], b[1] - a[1]); out.parts.push({ s: { capsule: [-ends, 0, len + ends, 0, r(0)] }, f: F.spine }); q.length = 0; } // (in its frame, as a torso was)
  else if (ends) { const d0 = unit(minus(pts[1], a)), d1 = unit(minus(b, pts[pts.length - 2])); q[0] = minus(a, times(d0, ends)); q[q.length - 1] = plus(b, times(d1, ends)); }
  for (let i = 1; i < q.length; i++) out.parts.push({ s: { capsule: [...q[i - 1], ...q[i], r(i - 1)] } });
  if (s.end) out.parts.push({ s: { capsule: [...b, ...b, s.end] } }); // (a lop ear's spoon, a cotton tail)
  const pad = L && p.pad && !far ? [b[0], b[1] + 0.3, ...p.pad] : s.foot ? [b[0] + s.foot[0] - 0.8, b[1] + 0.3, ...s.foot] : null;
  if (pad) out.parts.push({ s: { ellipse: pad } });
  return L ? { ...out, pad, sock: [...mix(pts[pts.length - 2], b, 0.35), ...b, r(pts.length - 2)] } : out;
}
// a body's chains stepped (two steps a frame), their roots slid to where the pose has them, the box at x, y
function stepChains(body, rig, P, x, y, dt, wind) {
  for (const name in rig.chains) {
    const c = chainRest(rig, P, name);
    let pts = body.chains[name];
    if (!pts || pts.length !== c.links + 1) pts = body.chains[name] = restPoints(c).map((q) => ({ p: plus(q, [x, y]), v: [0, 0] }));
    const fx = pts[0].p[0], fy = pts[0].p[1], tx = c.root[0] + x, ty = c.root[1] + y, n = Math.ceil(dt * 120);
    for (let i = 1; i <= n; i++) { const t = i / n; stepChain(pts, c, fx + (tx - fx) * t, fy + (ty - fy) * t, dt / n, wind); }
  }
}
// the chains to draw, in the box, to a quarter pixel (frames are kept by them): where the body has them, or at rest
const quarter = (v) => Math.round(v * 4) / 4;
function chainsAt(rig, P, body) {
  const chains = {}, at = body?.at;
  for (const name in rig.chains) {
    const pts = body?.chains[name];
    chains[name] = pts ? pts.map((q) => [quarter(q.p[0] - at[0]), quarter(q.p[1] - at[1])]) : restPoints(chainRest(rig, P, name)).map((q) => [quarter(q[0]), quarter(q[1])]);
  }
  return chains;
}

// the moving parts of an animal on screen (body: kept by the game, one per animal it draws): its chains, stepped by how
// the animal moves. x, y: where its box is now; wind: how fast the world goes by (the air streams past the runner)
export function moveBody(body, kind, pose, frame, x, y, wind, dt, P = null) { // (P: posed already, as no move has it: see moveReaching)
  const rig = RIGS[kind], was = body.at || [x, y];
  if (body.kind !== kind || dt > 0.2 || Math.hypot(x - was[0], y - was[1]) > 40) { body.kind = kind; body.chains = {}; body.move = null; body.landed = Infinity; } // (a new start)
  ease(body, rig, pose, frame, dt);
  stepChains(body, rig, P || bodyPosed(rig, kind, pose, frame, body)[0], x, y, dt, wind);
  body.at = [x, y];
}
// a move eased into from the one before (from: that move and its frame; since: how long ago), and from one keyframe to
// the next; a landing (landed: how long ago, after a jump). Not into or out of sitting or being knocked out: they snap.
// Both in steps (a few a move, as the frames go), so the frames drawn are few.
const BLEND = 0.12, SQUASH = 0.2, STEPS = 3, SNAPS = ['idle', 'ko', 'ball', 'reach'];
function ease(body, rig, pose, frame, dt) {
  const was = body.move, m = rig.poses[pose], keys = !!m && !m.gait && !m.fps; // (a frame of its own: eased into)
  body.since = (body.since ?? Infinity) + dt; body.landed = (body.landed ?? Infinity) + dt;
  if (was && (was.pose !== pose || (keys && was.frame !== frame))) {
    body.from = SNAPS.includes(was.pose) || SNAPS.includes(pose) ? null : was; body.since = 0;
    if (was.pose === 'jump' && pose !== 'jump' && !SNAPS.includes(pose)) body.landed = 0;
  }
  body.move = { pose, frame };
}
// a rig as an animal on screen has it (body: see moveBody; it eases and lands only in the move it is in) → [its pose
// placed, a key for the frame drawn from it]
function bodyPosed(rig, kind, pose, frame, body) {
  const on = body?.kind === kind && body.move?.pose === pose && body.move.frame === frame;
  const u = on && body.from && body.since < BLEND ? (Math.floor((body.since / BLEND) * STEPS) + 1) / (STEPS + 1) : 1;
  const s = on && body.landed < SQUASH ? 1 - Math.floor((body.landed / SQUASH) * STEPS) / STEPS : 0;
  if (u === 1 && !s) return [posed(rig, pose, frame), ''];
  let p = poseOf(rig, pose, frame);
  if (u < 1) p = mixPose(rig, poseOf(rig, body.from.pose, body.from.frame), p, u);
  if (s) p = squashPose(rig, p, s);
  return [posedAs(rig, p), u < 1 ? `${body.from.pose}${body.from.frame} ${u} ${s}` : `${s}`];
}

// one step of a chain: each link springs toward its rest angle as the body holds it (a quarter of it following the link
// before, so the chain bends as one), stiffest at the root; damping (against bending) keeps it from ringing; the air drags
// on every point (still as the animal rises or falls, so a tail droops as it takes off and floats as it falls); its weight
const DRAG = 9, WIND = 0.15;
// (In x and y, each point's p and v changed where they are: two steps a frame, every link, nothing made. The sums are
// plus, minus, times, turn, unit and mix written out, in their order: the same numbers to the last bit)
function stepChain(pts, c, rx, ry, h, wind) {
  const p0 = pts[0], cos = Math.cos(c.curl), sin = Math.sin(c.curl), ih = 1 / h;
  p0.v[0] = (rx - p0.p[0]) * ih; p0.v[1] = (ry - p0.p[1]) * ih; p0.p[0] = rx; p0.p[1] = ry;
  const seg = c.length / c.links, airX = -wind * WIND;
  let restX = c.dir[0], restY = c.dir[1], prevX = 0, prevY = 0;
  for (let i = 1; i < pts.length; i++) {
    const q = pts[i], up = pts[i - 1], qp = q.p, qv = q.v, upP = up.p, upV = up.v;
    let dX = restX, dY = restY;
    if (i > 1) { // (the link before: a quarter of its turn on to this one)
      const tX = prevX * cos - prevY * sin, tY = prevX * sin + prevY * cos, mX = restX + (tX - restX) * 0.25, mY = restY + (tY - restY) * 0.25;
      const mInv = 1 / (Math.hypot(mX, mY) || 1);
      dX = mX * mInv; dY = mY * mInv;
    }
    const k = c.stiffness * (1 - (0.45 * (i - 1)) / Math.max(1, c.links - 1)), wantX = upP[0] + dX * seg, wantY = upP[1] + dY * seg;
    const accX = (wantX - qp[0]) * k + (upV[0] - qv[0]) * c.damping + (airX - qv[0]) * DRAG + 0;
    const accY = (wantY - qp[1]) * k + (upV[1] - qv[1]) * c.damping + (0 - qv[1]) * DRAG + c.weight;
    qv[0] = qv[0] + accX * h; qv[1] = qv[1] + accY * h;
    const nX = qp[0] + qv[0] * h - upP[0], nY = qp[1] + qv[1] * h - upP[1], inv = 1 / (Math.hypot(nX, nY) || 1);
    const pX = upP[0] + nX * inv * seg, pY = upP[1] + nY * inv * seg; // moved, then kept at the link's length
    qv[0] = (pX - qp[0]) * ih; qv[1] = (pY - qp[1]) * ih; qp[0] = pX; qp[1] = pY;
    const lX = pX - upP[0], lY = pY - upP[1], lInv = 1 / (Math.hypot(lX, lY) || 1);
    prevX = lX * lInv; prevY = lY * lInv;
    const r = restX * cos - restY * sin; restY = restX * sin + restY * cos; restX = r;
  }
}

// a frame of a rigged animal: its chains where the body has them (in the box: to a quarter pixel), or at rest. Kept for
// a while (the most recent few hundred).
const rigFrames = new Map();
// how much bigger each animal is drawn than its rig: n more rows in its 20-row box (it is drawn (20 + n) / 20 as big), so
// the bigger ones by nature stand taller, up to about 3 pixels. It grows from its feet, in the middle of its box; ducking,
// no more than still goes under a branch (see ducked). (The dino's even: drawn half as big again as a giant, still whole)
const SIZE = { rabbit: 0, guineapig: 0, cat: 1, dog: 2, pig: 2, fox: 1, hedgehog: 0, squirrel: 0, otter: 1, skunk: 0, wolf: 2, boar: 3, bear: 4, yak: 4, ostrich: 3,
  cheetah: 2, dromedary: 4, rhino: 4, gorilla: 4, elephant: 3, dino: 2, unicorn: 4 };
const ducks = {};
// how many frames a move has (a gait's, keyframes'; a loop's), for an animal
const framesOf = (kind, pose) => { const m = RIGS[kind].poses[pose]; return m?.gait ? m.gait.frames : m?.frames || 1; };
// the most it grows by, ducking: tried, every frame of the crawl, a frame at a time (see readying; ducked: all at once)
function* fitDuck(kind) {
  const top = (s) => { let t = Infinity; for (let i = 0; i < s.mask.length; i++) if (s.mask[i]) { t = Math.floor(i / s.w); break; } return t + s.oy; };
  let n = SIZE[kind] || 0;
  for (; n > 0; n--) {
    let low = true;
    for (let f = 0; low && f < framesOf(kind, 'duck'); f++) { low = FOOT - top(rigFrame(kind, 'duck', f, false, null, 1, null, n)) + 1 <= GROUND - DUCK_UNDER - 1; yield; }
    if (low) break;
  }
  ducks[kind] = n;
}
function ducked(kind) {
  if (ducks[kind] === undefined) for (const it = fitDuck(kind); !it.next().done;);
  return ducks[kind];
}
const grown = (kind, pose) => (pose === 'duck' ? ducked(kind) : SIZE[kind] || 0);

// what an animal runs into in a move's frame: the frame at rest (its mask, blinking or not), kept for good (the frames
// drawn come and go), so a jump or a duck never waits for one to be drawn
const hitboxes = new Map();
export function hitbox(kind, pose, frame) {
  if (pose === 'ball') return animal(kind, pose, frame);
  const key = `${kind} ${pose} ${frame}`;
  if (!hitboxes.has(key)) hitboxes.set(key, rigFrame(kind, pose, frame, false, null));
  return hitboxes.get(key);
}
// an animal made ready to run, a piece at a time (the game does one a frame, from the title on): how low it ducks, and
// every frame it can run into
export function* readying(kind) {
  if (ducks[kind] === undefined) yield* fitDuck(kind);
  for (const pose of ['run', 'jump', 'duck', 'hurt']) {
    for (let f = 0; f < framesOf(kind, pose); f++) if (!hitboxes.has(`${kind} ${pose} ${f}`)) { hitbox(kind, pose, f); yield; }
  }
}

// grown by n rows: how much bigger (k), and moved by how much (from its feet, the row above the ground's, in the middle:
// moved back, so they stay where they were)
function growth(n, scale = 1) {
  const k = (20 + n) / 20;
  return [k, [Math.round(13 * scale * (1 - k)), Math.round((FOOT - 0.5) * scale * (1 - k))]];
}
function rigFrame(kind, pose, frame, blink, body, scale = 1, look = null, n = grown(kind, pose)) { // (look: its face's frames, other than the pose's: { eye, mouth })
  const rig = RIGS[kind], [P, eased] = bodyPosed(rig, kind, pose, frame, body);
  const chains = chainsAt(rig, P, body?.kind === kind && body.chains && body.at ? body : null);
  const key = `${kind} ${pose} ${frame} ${eased} ${blink} ${scale} ${n} ${JSON.stringify(chains)}${look ? JSON.stringify(look) : ''}`;
  let s = rigFrames.get(key);
  if (s) { rigFrames.delete(key); rigFrames.set(key, s); return s; } // (the most recent last)
  const [k, d] = growth(n, scale);
  s = drawRig(rig, look ? { ...P, p: { ...P.p, ...look } } : P, blink, chains, scale * k, d, Math.round((FOOT + 1) * scale), n > 0 && pose !== 'jump');
  rigFrames.set(key, s);
  if (rigFrames.size > 400) { const old = rigFrames.keys().next().value; rigFrames.get(old).free(); rigFrames.delete(old); }
  return s;
}

// draw a rig in a pose: its groups back to front (see layersAt), each as one: its shapes filled in its color (a shape's
// own color where it is), joined smoothly into one (join) or not, outlined round all of it (outline: false, not), its
// paint on it (clipped to it), a chain's marks, an ear's tip. The body's: its spikes, the legs' socks (wherever the
// legs show), then the paws lying low (over: outlined over it). A chain that grows out of the body: no outline over the
// body where it starts. At 'face': the single pixels (dots), the face, everything before it recolored (recolor: one
// palette name for another: the wolf is a grey fox). The collision mask: the groups that hit, and the paws lying low; the
// far tone: the far groups where nothing nearer that hits covers them
function drawRig(rig, P, blink, chains, S = 1, [dx, dy] = [0, 0], floor = Math.round((FOOT + 1) * S), settle = false) {
  const { p, F } = P, k = rig.smooth ?? 1, fur = NAMED[rig.fur];
  // a shape with its frame (its turn worked out once), its box in the box's coordinates, and how much nearer than its
  // distance that box may be (an ellipse's distance is short of the true one off its long axis): see near
  const placedIn = (s, group) => placed(s, group ? groupFrame(group, s) : s.on ? F[s.on] : F.box); // (group: one with a pivot it is in, see groupFrame)
  const placed = (s0, f0) => {
    const [s, f] = turned(s0, f0), [a, b, c, d] = extent(s), q = [[a, b], [c, b], [a, d], [c, d]].map((v) => toWorld(f, v));
    const e = s.ellipse && Math.min(s.ellipse[2], s.ellipse[3]) / Math.max(s.ellipse[2], s.ellipse[3]);
    return { s, f, cos: f ? Math.cos(f.a) : 1, sin: f ? Math.sin(f.a) : 0, k: e || 1,
      box: [Math.min(...q.map((v) => v[0])), Math.min(...q.map((v) => v[1])), Math.max(...q.map((v) => v[0])), Math.max(...q.map((v) => v[1]))] };
  };
  const sd = (b, x, y) => { // (as toLocal does it)
    if (!b.f) return sdShape(b.s, x, y);
    const dx = x - b.f.o[0], dy = y - b.f.o[1];
    return sdShape(b.s, dx * b.cos + dy * b.sin, (-dx * b.sin + dy * b.cos) * b.f.flip);
  };
  const boxOf = (caps) => [Math.min(...caps.map((c) => Math.min(c[0], c[2]) - c[4])), Math.min(...caps.map((c) => Math.min(c[1], c[3]) - c[4])),
    Math.max(...caps.map((c) => Math.max(c[0], c[2]) + c[4])), Math.max(...caps.map((c) => Math.max(c[1], c[3]) + c[4]))];
  const join = (...boxes) => (boxes.length ? [Math.min(...boxes.map((b) => b[0])), Math.min(...boxes.map((b) => b[1])), Math.max(...boxes.map((b) => b[2])), Math.max(...boxes.map((b) => b[3]))] : [0, 0, 0, 0]);
  const ovalBox = (ellipse) => extent({ ellipse }), triBox = (triangle) => extent({ triangle });
  const groupFrame = (t, s) => { // a group's frame for one of its shapes: its pivot (at) in the shape's joint's frame, turned by its angle
    const b = (s.on ? F[s.on] : F.box) || { o: [0, 0], a: 0, flip: 1 };
    return { o: toWorld(b, t.at || [0, 0]), a: b.a + (t.angle || 0) * b.flip, flip: b.flip };
  };
  // each shape as it is drawn: its distance (d), its box, how near that box may be (near), how smoothly it joins (smooth)
  // and its color; what one on a bone has more (see onBone: its marks, a leg's pad and sock, a triangle's tip)
  let firstSpine = true;
  const itemOf = (s, G) => {
    const grp = G.at || G.angle ? G : null, color = s.color && NAMED[s.color];
    if (s.bone) { // drawn along its bone (see onBone)
      const first = s.bone === 'spine' && firstSpine;
      if (s.bone === 'spine') firstSpine = false;
      const o = onBone(rig, P, chains, s, !!G.far, first);
      if (!o) return null;
      const bs = o.parts.map((q) => placed(q.s, q.f || null));
      return { ...o, d: (x, y) => { let d = Infinity; for (let i = 0; i < bs.length; i++) d = Math.min(d, sd(bs[i], x, y)); return d; },
        box: join(...bs.map((q) => q.box)), near: Math.min(...bs.map((q) => q.k)), smooth: s.smooth ?? 1, color };
    }
    const b = placedIn(s, grp);
    return { d: (x, y) => sd(b, x, y), box: b.box, near: b.k, smooth: s.smooth ?? 1, color };
  };
  const swungBy = (G) => { // (a group that swings: turned about its pivot as much as its bone is from its rest, both to a quarter pixel)
    const now = G.swung && chains[G.swung];
    const f = now && F[rig.chains[G.swung].on];
    if (!f) return G;
    const rest = restPoints(chainRest(rig, P, G.swung)).map((q) => [quarter(q[0]), quarter(q[1])]), dir = (q) => Math.atan2(q[1][1] - q[0][1], q[1][0] - q[0][0]);
    const d = Math.atan2(Math.sin(dir(now) - dir(rest)), Math.cos(dir(now) - dir(rest)));
    return d ? { ...G, angle: (G.angle || 0) + d * f.flip } : G;
  };
  const layers = layersAt(rig, p).map((G) => (isGroup(G) ? ((G = swungBy(G)), { G, items: G.shapes.map((s) => itemOf(s, G)).filter(Boolean) }) : G));
  const groups = layers.filter(isGroup), legs = groups.flatMap((l) => l.items.filter((it) => it.sock));
  const over = p.over ? legs.filter((it) => it.pad) : []; // (the paws drawn over the body, outlined: where they would hide in it)
  const dots = (p.dots || rig.dots || []).map((d) => [toWorld(d.on ? F[d.on] : F.box, d.at), NAMED[d.color] || OUT]);

  // the frame's bounds: every shape's box (turned with its frame), one more pixel for the outline
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  const fit = ([x, y], r = 0) => { x0 = Math.min(x0, x - r); y0 = Math.min(y0, y - r); x1 = Math.max(x1, x + r); y1 = Math.max(y1, y + r); };
  for (const l of groups) for (const it of l.items) { fit([it.box[0], it.box[1]]); fit([it.box[2], it.box[3]]); }
  for (const [q] of dots) fit(q);
  // drawn S times bigger (the giant dino: its shapes finer, its outline still one pixel); nothing below the feet's row
  // (the ground). (ox, oy: in the bigger pixels)
  const ox = Math.floor(x0 * S) - 1, oy = Math.floor(y0 * S) - 1;
  let g = new Grid(Math.ceil(x1 * S) + 1 - ox, Math.min(Math.ceil(y1 * S) + 1, floor - dy) - oy); // (floor: the row under its feet, once moved)
  const inside = (d) => [(x, y) => d((x + ox + 0.5) / S, (y + oy + 0.5) / S) <= 0]; // (tested at the pixel's middle)
  const at = (b) => [Math.floor(b[0] * S) - ox - 1, Math.floor(b[1] * S) - oy - 1, Math.ceil(b[2] * S) - ox + 2, Math.ceil(b[3] * S) - oy + 2]; // (a box: its pixels)
  const any = (list, d) => (x, y) => { for (let i = 0; i < list.length; i++) if (d(list[i], x, y) <= 0) return 0; return 1; }; // (inside any of them)
  const n = Math.round(S), pixel = { dot: (x, y, c) => { for (let a = 0; a < n; a++) for (let b = 0; b < n; b++) g.dot(Math.round(x) * S - ox + a, Math.round(y) * S - oy + b, c); } }; // (a dot: S by S)
  const marks = new Uint8Array(g.w * g.h), face = { dot: (x, y, c) => { // (the face's dark pixels: kept as they are in any look, see styled)
    pixel.dot(x, y, c);
    for (let a = 0; a < n; a++) for (let b = 0; b < n; b++) { const X = Math.round(x) * S - ox + a, Y = Math.round(y) * S - oy + b; if (X >= 0 && Y >= 0 && X < g.w && Y < g.h) marks[Math.round(Y) * g.w + Math.round(X)] = 1; }
  } };
  const head = rig.face, eye = toWorld(F.head, head.eye);
  // its eyes' and mouth's frames: each pixel of one a pixel of the sprite (n by n, drawn bigger), from where its anchor goes
  const pin = ([x, y]) => [Math.round(Math.round(x) * S - ox), Math.round(Math.round(y) * S - oy)];
  const put = (X, Y, c) => { if (X >= 0 && Y >= 0 && X < g.w && Y < g.h) { g.px[Y * g.w + X] = c; marks[Y * g.w + X] = 1; } };
  const mouth = head.mouth && toWorld(F.head, head.mouth);
  const drawFace = () => {
    for (const [[x, y], c] of dots) face.dot(x, y, c);
    if (rig.recolor) { const to = {}; for (const a in rig.recolor) to[NAMED[a]] = NAMED[rig.recolor[a]]; for (let i = 0; i < g.px.length; i++) g.px[i] = to[g.px[i]] ?? g.px[i]; }
    const look = p.eye || 'open', eyeFrame = faceFrame(head, 'eye', blink && look === 'open' ? 'blink' : look);
    faceDraw(put, eyeFrame, pin(eye), n, head.inks);
    if (head.nose) { const nose = toWorld(F.head, head.nose); face.dot(nose[0], nose[1], NAMED[head.noseColor] || OUT); }
    if (mouth) faceDraw(put, faceFrame(head, 'mouth', p.mouth || 'shut'), pin(mouth), n, head.inks);
  };

  const hits = [], fars = [], nearHits = [];
  let bodyMask = null, overMask = null, faced = false;
  for (const l of layers) {
    if (l === 'face') { drawFace(); faced = true; continue; }
    if (!isGroup(l) || !l.items.length) continue;
    const { G, items } = l, color = NAMED[G.color] || fur, line = G.outline === false ? 0 : OUT;
    const under = items.some((it) => it.grows) ? g.px.slice() : null;
    let m;
    if (G.join) { // joined smoothly, one after another. A part too far off to change it is passed over (smin leaves it as it is
      // when the part is at least its smoothing further), and once a point is inside, it stays so (smin only ever takes away)
      const joined = items.map((it) => ({ d: it.d, box: it.box, near: it.near, k: k * it.smooth }));
      m = g.layer(inside((x, y) => {
        let d = Infinity;
        for (let i = 0; i < joined.length; i++) {
          const j = joined[i], b = j.box, ddx = b[0] > x ? b[0] - x : x > b[2] ? x - b[2] : 0, ddy = b[1] > y ? b[1] - y : y > b[3] ? y - b[3] : 0, far = d + j.k;
          if ((ddx * ddx + ddy * ddy) * j.near * j.near >= far * far) continue; // (at most this near: its box's distance, see placed)
          d = smin(d, j.d(x, y), j.k);
          if (d <= 0) return d;
        }
        return d;
      }), color, line);
    } else m = g.layer(inside(any(items, (it, x, y) => it.d(x, y))), color, line, at(join(...items.map((it) => it.box))));
    for (const it of items) {
      if (it.color) g.paint(inside(it.d), it.color, m, at(it.box)); // (a shape of its own color)
      for (const [[mx, my], mc, mr] of it.marks || []) {
        if (mr) g.paint(inside((x, y) => Math.hypot(x - mx, y - my) - mr), mc, m, at([mx - mr, my - mr, mx + mr, my + mr]));
        else pixel.dot(mx, my, mc);
      }
    }
    for (const s of G.paint || []) { const q = placedIn(s, G.at || G.angle ? G : null); g.paint(inside((x, y) => sd(q, x, y)), NAMED[s.color], m, at(q.box)); }
    if (G.hits) hits.push(m);
    if (G.far) fars.push(m); else if (G.hits) nearHits.push(m);
    if (G.body) {
      bodyMask = m;
      const spk = G.spikes; // spikes or bristles where the region holds, specks inside
      if (spk) { // (as spikes() does, but placed by the box, not the frame's grid: they stay put as frames change size)
        const region = placedIn(spk, null), where = (x, y) => sd(region, (x + ox + 0.5) / S, (y + oy + 0.5) / S) <= 0, ticks = [], { w } = g;
        for (let y = 1; y < g.h - 1; y++) for (let x = 1; x < w - 1; x++) {
          const i = y * w + x;
          if (m[i] || g.px[i] !== OUT || !where(x, y) || (((x + ox + (y + oy) * 2) % 3) + 3) % 3) continue;
          for (const [ddx, ddy] of [[0, 1], [0, -1], [1, 0], [-1, 0]]) if (m[(y + ddy) * w + x + ddx]) ticks.push([x - ddx, y - ddy]);
        }
        for (const [x, y] of ticks) if (!g.get(x, y)) g.dot(x, y, OUT);
        if (spk.speck) for (let i = 0; i < m.length; i++) {
          const x = i % w, y = Math.floor(i / w), X = x + ox, Y = y + oy;
          if (m[i] && where(x, y) && (((((Y * 26 + X) * 37) % 17) + 17) % 17) % 5 === 0) g.px[i] = NAMED[spk.speck]; // (as in the 26 wide box)
        }
      }
      if (rig.socks && legs.length) { const socks = legs.map((it) => it.sock); g.paint(inside(any(socks, (c, x, y) => sdCapsule(x, y, c))), NAMED[rig.socks], union(m, ...hits), at(boxOf(socks))); }
    }
    for (const it of items) if (it.tipColor) g.paint(inside((x, y) => Math.max(sdTriangle(x, y, it.tri), Math.hypot(x - it.tip[0], y - it.tip[1]) - (it.tipSize || 2))), NAMED[it.tipColor], m, at(triBox(it.tri)));
    if (G.body && over.length) overMask = g.layer(inside(any(over, (it, x, y) => sdEllipse(x, y, it.pad))), fur, OUT, at(join(...over.map((it) => ovalBox(it.pad)))));
    // a shape on a bone that grows out of the body (the elephant's trunk): no outline over the body where it starts
    if (under && bodyMask) for (const it of items.filter((x) => x.grows)) {
      const [ax, ay, r] = it.start, cx = ax * S - ox, cy = ay * S - oy, R = (r + 2) * S;
      for (let y = Math.max(0, Math.floor(cy - R)); y < Math.min(g.h, cy + R); y++) for (let x = Math.max(0, Math.floor(cx - R)); x < Math.min(g.w, cx + R); x++) {
        const i = y * g.w + x;
        if (bodyMask[i] && g.px[i] === OUT && under[i] !== OUT && Math.hypot(x + 0.5 - cx, y + 0.5 - cy) < R) g.px[i] = under[i];
      }
    }
  }
  if (!faced) drawFace();
  const faceAt = { eye: pin(eye), ...(mouth && { mouth: pin(mouth) }) }; // (where its frames go, in the sprite: for the editor)
  overMask ||= new Uint8Array(g.w * g.h);
  // (dx, dy: moved, grown from where its feet touch the ground: see rigFrame. settle: grown, a row short of the ground
  // only by rounding, it is set down on it)
  let mask = union(overMask, ...hits), down = 0;
  let far = fars.length ? union(...fars).map((v, i) => (v && !overMask[i] && !nearHits.some((h) => h[i]) ? 1 : 0)) : null; // (the far legs where they show: see styled)
  if (settle && g.h > 1 && oy + dy + g.h === floor && !g.px.subarray((g.h - 1) * g.w).some(Boolean) && g.px.subarray((g.h - 2) * g.w, (g.h - 1) * g.w).some(Boolean)) {
    down = 1;
    const cut = new Grid(g.w, g.h - 1); cut.px.set(g.px.subarray(0, cut.px.length));
    mask = mask.slice(0, cut.px.length); far = far && far.slice(0, cut.px.length); g = cut;
  }
  return sprite(g, mask, { far, marks: marks.subarray(0, g.px.length), faceAt, ox: ox + dx, oy: oy + dy + down, head: [(eye[0] - 1) * S + dx, (eye[1] - 6) * S + dy + down] });
}

// ------------------------------------------------------------------------------------------------------ held up
// An animal picked up by the middle of its back (on the title, see the game): it hangs from the hand about level, its
// head and its hips drooping a little; the hand moving tips it (it swings back level: a short pendulum, its weight
// under the hand); it squirms now and then; its legs dangle (each paw a weight on a spring, paddling), its ears and tail
// swing (moveHung). Dropped (falling), it rights itself on the way down. h: the state of the one held (holdUp), stepped
// by swing, drawn by hung.
// How each is handled is in its file (handling: see asset.js), what it doesn't say as here: carried (where the hand holds
// it, from the middle of its back; how much it sags; how much the hand moving tips it; how far under the hand it seems
// to hang: longer, slower swings; how fast its swinging settles; the most it tips), squirming (how quick its fits come,
// how hard, its legs paddling, its head nodding), dropped (how hard it rights itself, how much that wobbles; how flat it
// lands, for how long), petted (how far it leans with the hand, ducks its head into it and turns it down, lays its ears
// back, wags its tail and how fast; how much it must like it to shut its eyes happily), fed (how far its head stretches
// for a treat, how far up it turns for one, how far up on its hind legs it gets (0…1; none: as its legs let it), the
// highest it hops after one held over it (art pixels, 0: never); as it eats: how many nods, how big, for how long)
export const HANDLING = {
  held: { at: [0, 0], sag: 1, tip: 1, hang: 10, settle: 3.5, most: 0.9 },
  squirm: { fits: 1.9, strength: 1, paddle: 1, nod: 0.12 },
  dropped: { righting: 600, damping: 45, squash: 0.3, squashFor: 0.2 },
  petted: { lean: 0.07, duck: 0.8, nuzzle: 0.2, ears: 1, wag: 0.6, wagRate: 16, happy: 0.5 },
  fed: { stretch: 3, upright: 1.35, rears: null, hop: 12, chews: 3, nod: 4, chewFor: 0.8 }, // (rears: none, by its legs)
};
const handled = new WeakMap(); // (rig → its handling)
function handlingOf(rig) {
  let o = handled.get(rig);
  if (!o) { o = {}; for (const g in HANDLING) o[g] = { ...HANDLING[g], ...rig.handling?.[g] }; handled.set(rig, o); }
  return o;
}
export const handling = (kind) => handlingOf(RIGS[kind]);
const trunkOf = (rig) => Object.keys(rig.chains || {}).find((n) => rig.chains[n].role === 'trunk'); // (its trunk's name: the chain it reaches with)
const HANG_G = 900, HANG_TIP = 80; // (its weight; how little the hand tips it)
const pivotOf = (rig) => plus(plus(mix(rig.joints.hip, rig.joints.chest, 0.5), [0, -Math.max(2, (rig.torso?.r || 0) * 0.8)]), handlingOf(rig).held.at); // (the middle of its back, and where its file says from there)
export const heldAt = (kind) => pivotOf(RIGS[kind]); // (in its box)
export const holdUp = (kind) => ({ kind, ang: 0, angV: 0, t: 0, sag: 0, paws: {}, at: null, v: null, falling: false });
// the pose it hangs in: the hips and the head drooping (sag), the head nodding, all turned about the hand; the paws
// where they swing to
function hangPose(rig, h) {
  const piv = pivotOf(rig), J = rig.joints, a = Math.round(h.ang * 50) / 50, sag = handlingOf(rig).held.sag * (Math.round(h.sag * 8) / 8); // (to a few steps: frames drawn are kept)
  const rot = (q) => plus(piv, turn(minus(q, piv), a));
  const paws = {};
  for (const name in rig.legs) paws[name] = (h.paws[name]?.p || [0, 0]).map((v) => Math.round(v * 4) / 4);
  return { joints: { hip: rot(plus(J.hip, [0, 1.5 * sag])), chest: rot(plus(J.chest, [0, 0.5 * sag])), head: rot(plus(J.head, [0, 2.5 * sag])) },
    headAngle: Math.round((a + 0.6 * sag + (h.nod || 0)) * 50) / 50, paws, turn: { pivot: piv, angle: a } };
}
// one step, the hand at x, y on the screen
export function swing(h, [x, y], dt) {
  const rig = RIGS[h.kind], piv = pivotOf(rig), v = h.at ? times(minus([x, y], h.at), 1 / dt) : [0, 0], dv = h.v ? minus(v, h.v) : [0, 0];
  const { held: H, squirm: Q, dropped: D } = handlingOf(rig);
  h.at = [x, y]; h.v = v; h.t += dt;
  const t = h.t, squirm = h.falling ? 0 : 0.55 + 0.45 * Math.sin(t * Q.fits); // (in fits)
  h.sag += ((h.falling ? 0 : 1) - h.sag) * Math.min(1, dt * 8);
  if (h.falling) h.angV += (-h.ang * D.righting - h.angV * D.damping) * dt; // righting itself
  else { // tipped by the hand moving (its weight left behind), swinging back level
    const a = h.ang;
    h.angV += (dv[0] * Math.cos(a) + dv[1] * Math.sin(a)) / (HANG_TIP / H.tip);
    h.angV += ((-HANG_G * Math.sin(a)) / H.hang + squirm * Q.strength * (3 * Math.sin(t * 3.7) + 2 * Math.sin(t * 5.9 + 2))) * dt;
    h.angV *= Math.exp(-H.settle * dt);
  }
  h.ang += h.angV * dt;
  if (Math.abs(h.ang) > H.most) { h.ang = Math.sign(h.ang) * H.most; if (h.angV * h.ang > 0) h.angV *= -0.3; } // (no further: it is held)
  h.nod = squirm * Q.nod * Math.sin(t * 6.1);
  // the paws: each a weight on a spring, hanging under its leg's root (standing, when falling), paddling
  const P = posedAs(rig, hangPose(rig, h)), stand = poseOf(rig, 'hurt', 0).paws || {};
  Object.keys(rig.legs).forEach((name, i) => {
    const L = rig.legs[name], root = toWorld(P.F[L.on], L.at), len = L.thigh + L.shin;
    const rest = h.falling ? plus(piv, turn(minus(stand[name] || plus(root, [0, len * 0.9]), piv), h.ang))
      : plus(root, [squirm * 1.3 * Q.paddle * Math.sin(t * 11 + i * 1.7), len * 0.95 + squirm * 0.8 * Q.paddle * Math.cos(t * 11 + i * 1.7)]);
    const q = h.paws[name] || (h.paws[name] = { p: rest, v: [0, 0] });
    q.v = minus(q.v, dv); // (left behind as the hand moves)
    q.v = plus(q.v, times(minus(times(minus(rest, q.p), 500), times(q.v, 28)), dt));
    q.p = plus(q.p, times(q.v, dt));
    const d = minus(q.p, root), m = Math.hypot(d[0], d[1]); // (no further than the leg reaches)
    if (m > len) { q.p = plus(root, times(d, len / m)); q.v = times(q.v, 0.5); }
  });
}
// its ears and tail, swung as the hand moves (as moveBody does for an animal standing or running)
export function moveHung(body, h, x, y, dt) {
  const rig = RIGS[h.kind], P = posedAs(rig, hangPose(rig, h)), at = minus([x, y], pivotOf(rig));
  if (body.kind !== h.kind || dt > 0.2) { body.kind = h.kind; body.chains = {}; body.move = null; }
  stepChains(body, rig, P, at[0], at[1], dt, 0);
  body.at = at;
}
// the animal held, as it hangs → [its sprite, where the hand holds it] (to draw it at the hand less that)
export function hung(h, { blink = false, body = null } = {}) {
  const rig = RIGS[h.kind], pose = hangPose(rig, h), P = posedAs(rig, pose);
  const chains = chainsAt(rig, P, body?.kind === h.kind && body.chains && body.at ? body : null);
  const [k, d] = growth(SIZE[h.kind] || 0), key = `${h.kind} hung ${blink} ${JSON.stringify([pose.joints, pose.headAngle, pose.paws, chains])}`;
  let s = rigFrames.get(key);
  if (!s) {
    s = drawRig(rig, P, blink, chains, k, d, 1e6);
    rigFrames.set(key, s);
    if (rigFrames.size > 400) { const old = rigFrames.keys().next().value; rigFrames.get(old).free(); rigFrames.delete(old); }
  }
  return [s, plus(times(pivotOf(rig), k), d)];
}
// how far an animal hanging still reaches below the hand (so the hand keeps it off the ground)
const depths = {};
export function hangDepth(kind) {
  if (depths[kind] === undefined) {
    const h = holdUp(kind);
    for (let i = 0; i < 60; i++) swing(h, [0, 0], 1 / 60);
    const [s, pin] = hung(h);
    depths[kind] = Math.ceil(s.oy + s.h - pin[1]);
  }
  return depths[kind];
}

// -------------------------------------------------------------------------------------------------------- petted
// An animal being petted (on the title): sitting as it does (its idle frame), its head ducked into the hand, its ears
// laid back, its tail wagging, its eyes shut happily once it likes it enough, leaning (a pixel or so, its paws where
// they are) the way the hand goes. joy: how much it likes it (0…1), t: the time (the wag), lean: -1, 0, 1. Kept as
// rigFrame keeps frames (joy and the wag in a few steps)
export function petted(kind, frame, joy, t, lean = 0) {
  const rig = RIGS[kind], base = poseOf(rig, 'idle', frame), J = { ...rig.joints, ...base.joints }, E = handlingOf(rig).petted;
  const j = Math.round(joy * 4) / 4, wag = Math.round(Math.sin(t * E.wagRate) * j * (E.wag * 10)) / 10;
  const key = `${kind} petted ${frame} ${j} ${wag} ${lean}`;
  let s = rigFrames.get(key);
  if (s) { rigFrames.delete(key); rigFrames.set(key, s); return s; }
  const chains = { ...base.chains };
  for (const name in rig.chains) {
    const c = { ...rig.chains[name], ...base.chains?.[name] };
    if (c.role === 'ear' && c.ear) chains[name] = { ...base.chains?.[name], tip: [c.tip[0] - 2 * E.ears * j, c.tip[1] + 1.5 * E.ears * j] }; // (laid back)
    else if (c.role === 'tail') chains[name] = { ...base.chains?.[name], angle: (c.angle || 0) + wag }; // (wagged)
  }
  const piv = [13, FOOT], a = lean * E.lean, rot = (q) => plus(piv, turn(minus(q, piv), a)); // (about its feet)
  const P = posedAs(rig, { ...base, joints: { hip: rot(J.hip), chest: rot(J.chest), head: rot([J.head[0], J.head[1] + E.duck * j]) },
    headAngle: (base.headAngle || 0) + E.nuzzle * j + a, chains, turn: { pivot: piv, angle: a }, ...(j >= E.happy && { eye: 'happy' }) });
  const rest = chainsAt(rig, P), n = SIZE[kind] || 0, [k, d] = growth(n);
  s = drawRig(rig, P, false, rest, k, d, FOOT + 1, n > 0);
  rigFrames.set(key, s);
  if (rigFrames.size > 400) { const old = rigFrames.keys().next().value; rigFrames.get(old).free(); rigFrames.delete(old); }
  return s;
}

// An animal reaching for something (on the title: a treat held out, falling, lying on the ground; tx, ty from the corner
// of its box, in front of it: the game turns it round for one behind): sitting or standing as it does, its body turned
// about its hip toward it (from where its head is, as seen from its hip: for one above it, up on its hind legs, as near
// upright as it gets, the hind legs straightened under it (its hip up as far as they reach), the front paws reaching
// out for it, the head kept over the chest; one on two legs already only leaning back; for one low in front, leaning
// down to it), its head turned to it (up, down: as far as a head turns) and stretched toward it, a few pixels the
// further it is, lower still for one low and near, but never further from its chest than it is at rest and a pixel (so
// it stays on its body; one with a neck (on its chest) keeps its head at the neck's end, turned with it, give or take).
// One with a trunk (the elephant) reaches with it instead: leaning back only a little, the trunk aimed at it, straighter
// and longer the further into reaching. amount (0…1): how far it is into reaching (0: as it rests), look: how far its
// head is turned to it, sniff (0…1): its head lifted a little (sniffing at it). → the posed rig, its
// growth, a key for the pose (in a few steps: few frames)
function reachPosed(kind, tx, ty, amount = 1, look = 1, sniff = 0) {
  const rig = RIGS[kind], { upright: UPRIGHT, stretch, rears } = handlingOf(rig).fed, base = poseOf(rig, 'idle', 0), J = { ...rig.joints, ...base.joints }, n = SIZE[kind] || 0, [k, d] = growth(n);
  const x = (tx - d[0]) / k, y = (ty - d[1]) / k; // (in the rig's own pixels)
  const legs = Object.keys(rig.legs || {}), hinds = legs.filter((l) => rig.legs[l].on === 'hip'), fronts = legs.filter((l) => rig.legs[l].on !== 'hip');
  const tn = trunkOf(rig), trunk = tn && { ...rig.chains[tn], ...base.chains?.[tn] };
  const piv = J.hip, now = Math.atan2(J.head[1] - piv[1], J.head[0] - piv[0]), want = Math.atan2(y - piv[1], x - piv[0]); // (as seen from its hip)
  // how far up it gets: by its hind legs against its body (a round one on short legs, the guinea pig's, the hedgehog's,
  // the boar's, only leans back a little: up on them it would be a ball in the air), or as its file says (rears: see HANDLING)
  const legLen = (l) => rig.legs[l].thigh + rig.legs[l].shin, tr = rig.torso?.r || 0;
  const stands = !fronts.length || trunk ? 0 : rears ?? (hinds.length && tr ? clamp((Math.min(...hinds.map(legLen)) / tr - 0.5) / 0.6, 0, 1) : 1);
  const a = Math.round(clamp(1.1 * (want - now), -Math.min(UPRIGHT, Math.max(0.3, UPRIGHT * stands)), 0.35) * amount * 10) / 10, up = UPRIGHT > 0 ? clamp(-a / UPRIGHT, 0, 1) : 0; // (upright 0: never up)
  // its hip up: as far as the hind legs reach (straightened, to their paws where they are), at most 3
  const P0 = posedAs(rig, base), rootOf = (l) => base.roots?.[l] || toWorld(P0.F[rig.legs[l].on], rig.legs[l].at);
  const reachLeft = Math.min(3, ...hinds.filter((l) => base.paws[l]).map((l) => rig.legs[l].thigh + rig.legs[l].shin - 0.4 - Math.hypot(...minus(base.paws[l], rootOf(l)))));
  const lift = Math.round(Math.max(0, reachLeft) * up * stands * 2) / 2, by = [0, -lift];
  const rot = (q) => plus(plus(piv, turn(minus(q, piv), a)), by), q2 = (q) => q.map((v) => Math.round(v * 2) / 2);
  const hip = q2(rot(J.hip)), body = rot(J.chest), neck = minus(J.head, J.chest), rest = Math.hypot(neck[0], neck[1]);
  const necked = bodyShapes(rig, base).some((x) => x.role === 'neck' && x.on === 'chest');
  const near = necked ? rot(J.head) : plus(body, turn(neck, -0.6 * a)); // (the head kept over the chest as it turns up; one on a neck, at its end)
  const low = trunk ? 0 : Math.round(clamp((y - near[1]) / 8, 0, 1) * clamp(1 - (x - near[0] - 6) / 20, 0, 1) * amount * 4) / 4; // (low and near: bending down)
  const chest = q2(plus(body, [0.5 * low, 1.5 * low]));
  let head = plus(near, [0.8 * low, 2.5 * low]);
  const to = minus([x, y], head), ha = Math.round((clamp(Math.atan2(to[1], Math.max(to[0], 3)), trunk ? -0.5 : -1, trunk ? 0.4 : 1.1) * look - 0.1 * sniff) * 10) / 10; // (behind it, it looks up; not straight up: its face would be gone)
  head = plus(head, times(unit(to), Math.min(trunk ? 1 : stretch, Math.hypot(to[0], to[1]) / 5) * amount));
  head = plus(head, [0, -0.5 * sniff]);
  const nk = minus(head, chest), len = Math.hypot(nk[0], nk[1]); // (no further from its chest than at rest, and a pixel; on a neck, from its end)
  if (len > rest + 1) head = plus(chest, times(nk, (rest + 1) / len));
  const off = minus(head, near), far = Math.hypot(off[0], off[1]);
  head = q2(necked && far > 1.5 ? plus(near, times(off, 1.5 / far)) : head);
  const paws = { ...base.paws };
  const belly = turn([0, 1], a); // (out of its front, as it is turned up)
  for (const l of fronts) { // up, its front paws held out in front of its belly, a little down, a little toward it (along its body, or up in front of its head, they would be lost in them; no lower than they stand)
    if (!base.paws[l] || !up) continue;
    const root = rot(rootOf(l)), out = plus(root, times(unit(plus(plus(belly, [0, 0.5]), times(unit(minus([x, y], root)), 0.3))), 0.98 * legLen(l))); // (straight out: bent, the knee folds it back against the body)
    const p = mix(base.paws[l], out, Math.min(1, 1.5 * up));
    paws[l] = q2([p[0], Math.min(p[1], base.paws[l][1])]);
  }
  const roots = base.roots && Object.fromEntries(Object.entries(base.roots).map(([l, q]) => [l, q2(rot(q))])); // (a sitting one's legs, on no joint)
  // its floppy ears (chains on its head, not pointed ones: the rabbit's, the dog's, the pig's) not turned up with its head:
  // hanging as they did, and further down the further up it is (the chains then swing them there)
  const chains = { ...base.chains }, near2pi = (v, to) => v + 2 * Math.PI * Math.round((to - v) / (2 * Math.PI));
  for (const name in rig.chains) {
    const c = { ...rig.chains[name], ...base.chains?.[name] };
    if (c.role !== 'ear' || c.ear || c.on !== 'head' || c.angle === undefined) continue; // (a lop ear)
    const kept = c.angle + ha - (base.headAngle || 0), down = near2pi(ha - Math.PI, kept); // (its turn as at rest; straight down)
    chains[name] = { ...base.chains?.[name], angle: Math.round((kept + (down - kept) * 0.5 * up) * 10) / 10 };
  }
  let pose = { ...base, joints: { hip, chest, head }, headAngle: ha, paws, ...(roots && { roots }), chains, turn: { pivot: piv, angle: a, by } }, aim = null;
  if (trunk) { // its trunk at it: its links' middle way (it curls: curl a link) along the line from its root, the rest's turn nearest
    const f = posedAs(rig, pose).F[trunk.on], root = toWorld(f, trunk.at), dist = Math.hypot(...minus([x, y], root));
    const curl = trunk.curl + (0.04 - trunk.curl) * amount, links = trunk.links || 1;
    const at = clamp(Math.atan2(y - root[1], x - root[0]), -1.75, 1.3) - (curl * (links - 1)) / 2, aimed = f.a - at - Math.PI / 2; // (up at most: not back over its head)
    const angle = near2pi(aimed, trunk.angle);
    aim = [Math.round((trunk.angle + (angle - trunk.angle) * amount) * 10) / 10, Math.round(curl * 50) / 50, Math.round((trunk.length + (clamp(dist, trunk.length, trunk.length * 1.35) - trunk.length) * amount) * 2) / 2];
    pose = { ...pose, chains: { ...chains, [tn]: { ...base.chains?.[tn], angle: aim[0], curl: aim[1], length: aim[2] } } };
  }
  return { rig, P: posedAs(rig, pose), n, k, d, key: `${kind} reach ${JSON.stringify([hip, chest, head, ha, paws, roots, aim, chains])}` };
}
// the reaching animal drawn (see reachPosed): its chains as body has them (see moveReaching), or at rest. eating: its
// eyes shut happily. Its mouth (for the game: where it eats from, in its box): the tip of its trunk, for one with one.
// (Kept as rigFrame keeps frames)
export function reaching(kind, tx, ty, eating = false, amount = 1, look = 1, body = null, sniff = 0) {
  const { rig, P, n, k, d, key } = reachPosed(kind, tx, ty, amount, look, sniff);
  const chains = chainsAt(rig, P, body?.kind === kind && body.chains && body.at ? body : null), full = `${key} ${eating} ${JSON.stringify(chains)}`;
  let s = rigFrames.get(full);
  if (s) { rigFrames.delete(full); rigFrames.set(full, s); return s; }
  s = drawRig(rig, eating ? { ...P, p: { ...P.p, eye: 'happy' } } : P, false, chains, k, d, FOOT + 1, n > 0);
  const tn = trunkOf(RIGS[kind]);
  if (tn && chains[tn]) { const tip = chains[tn][chains[tn].length - 1]; s.mouth = [tip[0] * k + d[0], tip[1] * k + d[1]]; }
  rigFrames.set(full, s);
  if (rigFrames.size > 400) { const old = rigFrames.keys().next().value; rigFrames.get(old).free(); rigFrames.delete(old); }
  return s;
}
// its moving parts (ears, tail, trunk) swung as it reaches (as moveBody does for a move)
export function moveReaching(body, kind, tx, ty, amount, look, x, y, dt, sniff = 0) { moveBody(body, kind, 'reach', 0, x, y, 0, dt, reachPosed(kind, tx, ty, amount, look, sniff).P); }

// for the editor (editor/): an edited rig swapped in (its frames drawn again), and what places its parts
export function setRig(kind, rig) { RIGS[kind] = rig; rigFrames.clear(); worked.clear(); tracksOf.clear(); hitboxes.clear(); delete ducks[kind]; delete depths[kind]; }
export const rigParts = { posed: (kind, move, frame) => posed(RIGS[kind], move, frame), pose: (kind, move, frame) => poseOf(RIGS[kind], move, frame), move: (kind, name) => RIGS[kind].poses[name], moves: (kind) => Object.keys(RIGS[kind].poses), clip: (m, frame) => clipPose(m, frame), chainRest: (kind, P, name) => chainRest(RIGS[kind], P, name), onBone: (kind, P, s, first) => { const rig = RIGS[kind]; return onBone(rig, P, rig.chains?.[s.bone] ? { [s.bone]: restPoints(chainRest(rig, P, s.bone)) } : {}, s, false, first); }, chains: (kind) => Object.keys(RIGS[kind].chains || {}), growth: (kind, pose) => growth(grown(kind, pose)), reach, restPoints, toWorld, toLocal, sdShape, NAMED, faceFrame, GROUP_SWING };

// the birds that circle a knocked-out head: two frames
const birds = [0, 1].map((f) => {
  const g = new Grid(9, 7);
  g.layer([ellipse(3.5, 4, 2.6, 1.8), ellipse(5.5, 2.8, 1.6, 1.6), f ? capsule(3, 4, 1.5, 5.5, 0.8) : capsule(3, 3.5, 1.5, 1.2, 0.8)], YELLOW, OUT);
  g.dot(8, 3, ORANGE); g.dot(5, 2, NAMED.black);
  return sprite(g, new Uint8Array(g.w * g.h));
});
export const bird = (f) => birds[f];

// ------------------------------------------------------------------------------------------------------------ props
// a prop (see asset.js: food, an obstacle; size [w, h]) as a sprite: its layers in order, each its shapes filled in its
// color (only where clip, [x0, y0, x1, y1], lets a pixel's middle be), outlined round them (outline: a color, else the
// outline's; false: not), its paint inside it, its dots. A shape is tested at a pixel's middle (a turned one, or a box,
// by its distance). The collision mask: the layers that hit (all but hits: false), filled. up: its top row drawn on up,
// so many rows more (a branch's trunk, up into the sky: the sprite starts that far above where it is put). S: drawn S
// times finer (the editor's screen pixels: its outlines still one pixel, a dot S by S)
const propShape = (s) => (s.angle || s.box ? (x, y) => { const [t, f] = turned(s, null), q = f ? toLocal(f, x + 0.5, y + 0.5) : [x + 0.5, y + 0.5]; return sdShape(t, q[0], q[1]) <= 0; }
  : s.ellipse ? ellipse(...s.ellipse) : s.capsule ? capsule(...s.capsule) : triangle(...s.triangle.flat()));
export function prop(a, S = 1) {
  const [w, h] = a.size, up = (a.up || 0) * S, g = new Grid(w * S, h * S), mask = new Uint8Array(g.w * g.h);
  const fine = (t) => (S === 1 ? t : (x, y) => t((x + 0.5) / S - 0.5, (y + 0.5) / S - 0.5)); // (a pixel's middle, in the prop's)
  for (const G of a.layers) {
    if (!isGroup(G)) continue;
    const shapes = G.shapes.map((s) => fine(propShape(s))), c = G.clip, inClip = c && ((x, y) => x + 0.5 > c[0] * S && y + 0.5 > c[1] * S && x + 0.5 < c[2] * S && y + 0.5 < c[3] * S);
    const m = g.layer(inClip ? [(x, y) => inClip(x, y) && inAny(shapes, x, y)] : shapes, NAMED[G.color] || OUT, G.outline === false ? 0 : NAMED[G.outline] || OUT);
    for (const s of G.paint || []) g.paint([fine(propShape(s))], NAMED[s.color], m);
    for (const d of G.dots || []) for (let i = 0; i < S * S; i++) g.dot(Math.round(d.at[0]) * S + (i % S), Math.round(d.at[1]) * S + Math.floor(i / S), NAMED[d.color]);
    if (G.hits !== false) for (let i = 0; i < m.length; i++) mask[i] |= m[i];
  }
  if (!up) return sprite(g, mask);
  const t = new Grid(g.w, g.h + up), tm = new Uint8Array(t.w * t.h); // (the top row, on up)
  for (let y = 0; y < up; y++) { t.px.set(g.px.subarray(0, g.w), y * g.w); tm.set(mask.subarray(0, g.w), y * g.w); }
  t.px.set(g.px, up * g.w); tm.set(mask, up * g.w);
  return sprite(t, tm, { oy: -up });
}

// ------------------------------------------------------------------------------------------------------- obstacles
// low obstacles (jump them): cacti, rocks, logs; high ones (duck under them): branches, crows at head height.
// A high obstacle's mask ends on row DUCK_UNDER (above the ground): every animal stands taller, ducks lower.
export const DUCK_UNDER = GROUND - 11;
export const TRUNK = 160; // (how far a branch's trunk goes on above the world's top, into the sky a tall screen adds: see its up)

// every obstacle (an asset of its own: assets/obstacles/<name>.js, see asset.js: a prop), drawn once, by name (the
// editor's: as edited)
export const OBSTACLES = Object.fromEntries(obstacles.map((a) => [a.name, prop(a)]));
// one of these kinds at random, any of each kind's variants (rock: rock, rock2, rock3)
const oneOf = (...kinds) => {
  const names = Object.keys(OBSTACLES).filter((n) => kinds.includes(n.replace(/\d+$/, ''))).sort();
  return (rnd) => OBSTACLES[names[Math.floor(rnd() * names.length)]];
};

// a crow flying left; frame 0 wings up, 1 down
export const crow = (f) => OBSTACLES[f ? 'crowdown' : 'crowup'];
// the lowest row of a crow's mask, in either frame
export const CROW_BOTTOM = Math.max(...[0, 1].map(crow).map((c) => Math.max(...[...c.mask.keys()].filter((i) => c.mask[i]).map((i) => Math.floor(i / c.w)))));

// The lands a run goes through, a day each (then round again), each with obstacles of its own: what is jumped (big:
// tall; small: low, in packs at speed; other: the rest, now and then) and the branches ducked under
export const LANDS = [
  { name: 'THE MEADOW', big: oneOf('sunflower'), small: oneOf('bush'), other: oneOf('rock', 'log'), branch: oneOf('branch') },
  { name: 'THE DESERT', big: oneOf('saguaro'), small: oneOf('barrel', 'pear', 'sprout'), other: oneOf('sandrock', 'tumbleweed'), branch: oneOf('cactusbranch') },
  { name: 'THE FOREST', big: oneOf('pine'), small: oneOf('toadstool'), other: oneOf('stump', 'log'), branch: oneOf('pinebranch') },
  { name: 'THE MOUNTAINS', big: oneOf('boulders'), small: oneOf('rock'), other: oneOf('snowyrock', 'log'), branch: oneOf('branch') },
  { name: 'THE CANYON', big: oneOf('spire'), small: oneOf('tumbleweed', 'redrock'), other: oneOf('sandrock'), branch: oneOf('autumnbranch') },
  { name: 'THE SNOW', big: oneOf('snowman', 'snowypine'), small: oneOf('ice'), other: oneOf('snowyrock', 'snowylog'), branch: oneOf('snowybranch') },
];

// each animal's face, for the high scores: its whole head as it runs (the ears too), cut out of the animal drawn smaller
// (FACE_S: from its shapes, outlined as ever); FACE_W × FACE_H, its eye at EYE_AT (FACE_AT moves one's cut by [dx, dy]),
// cut round (no body behind it) and outlined where it is cut
export const FACE_W = 10;
const FACE_H = 7; // (a high score's row)
const FACE_S = 0.6, EYE_AT = [5, 4], FACE_AT = {}, faces = {};
export function face(kind) {
  if (faces[kind] || !ANIMALS[kind]) return faces[kind];
  const s = rigFrame(kind, 'run', 0, false, null, FACE_S, null, 0), [dx, dy] = FACE_AT[kind] || [0, 0]; // (s.head: the eye, less [1, 6], drawn bigger by FACE_S)
  const x0 = Math.round(s.head[0] + FACE_S - (s.ox || 0)) - EYE_AT[0] + dx, y0 = Math.round(s.head[1] + 6 * FACE_S - (s.oy || 0)) - EYE_AT[1] + dy;
  const g = new Grid(FACE_W, FACE_H), round = ellipse(FACE_W / 2, FACE_H / 2, FACE_W / 2 + 0.3, FACE_H / 2 + 0.3);
  const src = (x, y) => (x0 + x >= 0 && y0 + y >= 0 && x0 + x < s.w && y0 + y < s.h ? s.px[(y0 + y) * s.w + x0 + x] : 0); // (the animal, in the face's place)
  for (let y = 0; y < FACE_H; y++) for (let x = 0; x < FACE_W; x++) {
    const v = round(x, y) ? src(x, y) : 0, cut = [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([u, w]) => !round(x + u, y + w) && src(x + u, y + w));
    g.px[y * FACE_W + x] = v && cut ? OUT : v; // (outlined where the round cut goes through it)
  }
  return (faces[kind] = sprite(g, new Uint8Array(FACE_W * FACE_H)));
}

// ------------------------------------------------------------------------------------------------------------- food
// each animal's food: an asset of its own (assets/food/<name>.js, see asset.js: a prop), drawn as a prop is (see prop)
export const FOOD = Object.fromEntries(foods.map((a) => [a.name, prop(a)]));

// ---------------------------------------------------------------------------------------------------------- the sky
// the far hills: how high they are at u (art pixels along them)
export const hill = (u) => 7 + 4 * Math.sin(u * 0.021) + 3 * Math.sin(u * 0.057 + 1.3);

export const cloud = fromRows([
  '......ffff......',
  '...fff....ff....',
  '.ff.........fff.',
  'f..............f',
  'ffffffffffffffff',
], { f: FAINT });

export const moon = fromRows([
  '..mmm.',
  '.mm...',
  'mm....',
  'mm....',
  'mm....',
  '.mm...',
  '..mmm.',
], { m: INK });

// a full moon (a night a special one comes: see the game), its craters faint
export const fullMoon = fromRows([
  '..ooooo..',
  '.owwwwwo.',
  'owwwcwwwo',
  'owwwwwwwo',
  'owcwwwwwo',
  'owwwwwcwo',
  'owwwwwwwo',
  '.owwwwwo.',
  '..ooooo..',
], { o: OUT, w: WHITE, c: BEIGE });

// the golden look of a super power (golden food, the animal flashing): every color but the outlines turned to gold
const golds = {};
export function golden(pal) {
  return (golds[pal.bg] ||= { ...Object.fromEntries(Object.entries(pal).map(([k, hex]) => {
    if (k === 'bg' || +k === OUT || +k === INK) return [k, hex];
    const l = luma(hex) / 255;
    return [k, l > 0.8 ? '#fff4b8' : l > 0.5 ? '#ffd23f' : '#e3a21a'];
  })), bg: `${pal.bg} gold` });
}

// a palette that draws anything flushed red, as golden does golden (an animal almost out of energy, a flash now and then)
const reds = {};
export function flushed(pal) {
  return (reds[pal.bg] ||= { ...Object.fromEntries(Object.entries(pal).map(([k, hex]) => {
    if (k === 'bg' || +k === OUT || +k === INK) return [k, hex];
    const l = luma(hex) / 255;
    return [k, l > 0.8 ? '#ffc8c8' : l > 0.5 ? '#f07078' : '#c8404a'];
  })), bg: `${pal.bg} red` });
}

// a palette that draws anything in one of its colors (a star not yet won: faint; an animal not yet unlocked: dim, so it
// stands out from the hills)
const shades = {};
export function shadow(pal, color = COLOR.FAINT) {
  return (shades[`${pal.bg} ${color}`] ||= { ...Object.fromEntries(Object.entries(pal).map(([k, hex]) => [k, k === 'bg' ? hex : pal[color]])), bg: `${pal.bg} shadow ${color}`, flat: true });
}
export const star = fromRows([
  '..y..',
  '.yyy.',
  'yyyyy',
  '.yyy.',
  '.y.y.',
], { y: YELLOW });

export const heart = fromRows([
  'rr.rr',
  'rrrrr',
  'rrrrr',
  '.rrr.',
  '..r..',
], { r: RED });

// do two sprites overlap, pixel for pixel (by their masks)?
export function hits(a, ax, ay, b, bx, by) {
  ax = Math.round(ax + (a.ox || 0)); ay = Math.round(ay + (a.oy || 0)); bx = Math.round(bx + (b.ox || 0)); by = Math.round(by + (b.oy || 0));
  const x0 = Math.max(ax, bx), x1 = Math.min(ax + a.w, bx + b.w), y0 = Math.max(ay, by), y1 = Math.min(ay + a.h, by + b.h);
  for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) if (a.mask[(y - ay) * a.w + x - ax] && b.mask[(y - by) * b.w + x - bx]) return true;
  return false;
}
