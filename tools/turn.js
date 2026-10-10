// The turn lab (npm run dev, then /tools/turn.html): ways an animal could turn round, the rabbit first, in two views,
// each drawing it one way at the game's resolution or at the screen's:
//   snap   what the game does now: the side, the front (its build's front, see art.js) for the middle of the turn, the
//          side mirrored
//   rays   the rig given depth (see turn3d.js, and its DEPTH), drawn on the GPU (turn-gl.js): any turn, and a tilt (from
//          above, from below); a ray stepping through its parts down every pixel, as turn3d.js's draw3d does on the CPU
//          (which the lab uses instead where there is no WebGL)
//   parts  the same drawn part by part: each part works out exactly where its pixels meet it, no steps; faster, but its
//          parts meet in creases (nothing melts)
//   mesh   the same made into a skinned, textured mesh (turn-mesh.js), as a model from Blender would be: triangles moved
//          by bones, the eyes, nose and dots painted in its texture (shown, below)
// Its ears and tail swing as in the game (its own moveBody: the move, a hop, running), and in 3D out to the side too as
// it turns (swingChains). A turntable of each view's way (every so many degrees, at rest), and a check: stepping rays
// turned 0° and 90° against the game's side and front, pixel by pixel.
import { PALETTES, COLOR, FOOT, ANIMALS, GRAVITY, animal, front, hasFront, rigParts, strides, stride, jumpFrame, moveBody } from '../art.js';
import { DEPTH, model, draw3d, chainPoints, swingChains, GX, GY, GW, GH } from '../turn3d.js';
import { createGL, createGLHi } from '../turn-gl.js';
import { buildMesh, bonesFor } from '../turn-mesh.js';

const deg = (d) => (d * Math.PI) / 180;
const pic = () => new Uint8Array(GW * GH);

// a game sprite into a picture: squeezed to `width` of itself about the middle of the box, mirrored (facing left)
export function fromSprite(s, width = 1, mirrored = false) {
  const out = pic();
  if (width <= 0.02) return out;
  for (let j = 0; j < GH; j++) for (let i = 0; i < GW; i++) {
    let u = 13 + (GX + i + 0.5 - 13) / width;
    if (mirrored) u = 26 - u;
    const x = Math.floor(u) - s.ox, y = GY + j - s.oy;
    if (x >= 0 && y >= 0 && x < s.w && y < s.h) out[j * GW + i] = s.px[y * s.w + x];
  }
  return out;
}

// the ways, at a turn (degrees) → a picture. pose: { kind, move, frame, blink }, o: the 3D one's settings, motion: how
// its chains swing ({ body: as moveBody leaves it, swing: see swingChains }; none: at rest)
const wrap = (d) => ((d % 360) + 360) % 360;
const side = (pose, motion = null) => animal(pose.kind, pose.move, pose.frame, { blink: pose.blink, body: motion?.body });
const facing = (pose) => (hasFront(pose.kind) ? front(pose.kind, { blink: pose.blink }) : side(pose));
const models = new Map();
export const WAYS = {
  snap: { name: 'Snap (the game now)', note: 'its side; its front from 60° to 120° (and 240° to 300°: it has no back); the side mirrored',
    draw: (pose, yaw, tilt, o, motion) => { const c = Math.cos(deg(yaw)); return Math.abs(c) < 0.5 ? fromSprite(facing(pose)) : fromSprite(side(pose, motion), 1, c < 0); } },
};
// the 3D one on the CPU (the lab's where there is no WebGL; node's)
export const CPU3D = { name: '3D on the CPU (no WebGL here)', note: 'worked out from the game\'s own pose and DEPTH (turn3d.js); turns every way and tilts, its ears swung out as it turns',
  draw: (pose, yaw, tilt, o, motion) => draw3d(modelFor(pose, o, motion), deg(yaw), deg(tilt), { gap: o.gap, blink: pose.blink }) };
// the 3D model for a pose (its chains where motion has them, swung out by turning), kept
export function modelFor(pose, o, motion) {
  const q = (v) => Math.round(v * 4) / 4, chains = chainPoints(motion?.body), swing = {};
  for (const name in motion?.swing || {}) swing[name] = { flare: q(motion.swing[name].flare), lag: q(motion.swing[name].lag) };
  const key = JSON.stringify([pose, o.smooth, o.depth, o.marks, chains, swing]);
  let m = models.get(key);
  if (!m) { m = model(pose.kind, pose.move, pose.frame, { ...o, chains, swing, blink: pose.blink }); models.set(key, m); if (models.size > 200) models.delete(models.keys().next().value); }
  return m;
}

// the skinned mesh for the 3D one's settings (its depth, how smoothly its parts join, its texture's size), kept
let meshKey = '', meshKept = null;
export function meshFor(o) {
  const key = JSON.stringify([o.depth, o.smooth, o.texSize]);
  if (key !== meshKey) { meshKey = key; meshKept = buildMesh('rabbit', { depth: o.depth, smooth: o.smooth, size: o.texSize || 64 }); }
  return meshKept;
}
const skinOf = (m, o, wire = false) => { const mesh = meshFor(o); return { mesh, bones: bonesFor(mesh, m), wire }; };

// how alike two pictures are: of the pixels either fills, how many both do; and how many differ in color
export function alike(a, b) {
  let both = 0, either = 0, colors = 0;
  for (let i = 0; i < a.length; i++) { if (a[i] || b[i]) either++; if (a[i] && b[i]) { both++; if (a[i] !== b[i]) colors++; } }
  return { overlap: either ? both / either : 1, differ: either - both, colors };
}

// ------------------------------------------------------------------------------------------------------------ page
if (typeof document !== 'undefined') {
  const $ = (id) => document.getElementById(id);
  const el = (tag, props = {}, ...kids) => { const e = Object.assign(document.createElement(tag), props); e.append(...kids); return e; };
  const MOVES = ['idle', 'run', 'jump', 'duck', 'hurt'];
  let gpu = null, gpuError = '', hi = null;
  try { gpu = createGL(); if (!gpu) gpuError = 'no WebGL here (or too few uniforms): the 3D ones on the CPU, stepping rays'; } catch (e) { gpuError = String(e.message || e); }
  try { hi = createGLHi(); } catch (e) { console.warn(e); }
  // the ways a view can draw it, and which this browser can
  const MODES = { snap: 'Snap (the game now)', rays: 'Stepping rays', parts: 'Part by part', mesh: 'Skinned mesh' };
  const can = { snap: true, rays: true, parts: !!gpu?.byParts, mesh: !!gpu?.skinned };
  const NOTES = {
    snap: 'the game\'s side; its front from 60° to 120° (and 240° to 300°: it has no back); the side mirrored',
    rays: 'the rig given depth (turn3d.js\'s DEPTH), worked out from the game\'s pose: a ray down every pixel stepping through its parts; they melt together',
    parts: 'each part drawn on its own, its pixels meeting it exactly (no steps): faster; parts meet in a crease',
    mesh: 'made into triangles at rest (turn-mesh.js), each vertex moved by up to four bones to the pose; the eyes, nose, cheeks and inner ears painted in its texture',
  };
  const VIEW = { look: 'cel', line: 0.5, smooth: false, wire: false };
  const state = { kind: 'rabbit', move: 'idle', frame: 0, play: false, yaw: 0, tilt: 0, steps: 0, spin: false, speed: 180, dur: 0.3, turning: null, blink: false,
    gap: 0.25, smooth: 1, swingGain: 0.4, marks: 'decals', texSize: 64, pal: 'day', depth: JSON.parse(JSON.stringify(DEPTH.rabbit)),
    views: [{ ...VIEW, mode: 'rays', res: 'game' }, { ...VIEW, mode: 'mesh', res: 'screen' }] };
  const motion = { body: {}, swing: {} }; // (its chains swinging: see tick)
  let hop = null; // (a hop: how high, how fast up)
  try {
    const kept = JSON.parse(localStorage.getItem('turn-lab') || '{}');
    if (kept.depthOf !== JSON.stringify(DEPTH.rabbit)) delete kept.depth; // (the file's DEPTH changed since: it, not the depth edited before)
    if (!Array.isArray(kept.views) || kept.views.length !== 2) delete kept.views;
    Object.assign(state, kept, { turning: null, play: false, spin: false });
  } catch { /* none kept */ }
  for (const v of state.views) if (!can[v.mode]) v.mode = 'rays';
  state.depthOf = JSON.stringify(DEPTH.rabbit);
  const keep = () => { try { const { turning, ...s } = state; localStorage.setItem('turn-lab', JSON.stringify(s)); } catch { /* no storage */ } };
  const frames = (move) => { const m = rigParts.move(state.kind, move); return m?.gait ? m.gait.frames : Array.isArray(m) ? m.length : m?.frames || 1; };
  const pal = () => PALETTES[state.pal];
  const shown = (yaw) => (state.steps ? Math.round(yaw / (360 / state.steps)) * (360 / state.steps) : yaw);
  const opts = () => ({ gap: state.gap, smooth: state.smooth, depth: state.depth, marks: state.marks, texSize: state.texSize });
  const pose = () => (hop ? { kind: state.kind, move: 'jump', frame: jumpFrame(state.kind, hop.v / HOP_V()), blink: state.blink }
    : { kind: state.kind, move: state.move, frame: state.frame % frames(state.move), blink: state.blink });
  const gravity = () => GRAVITY * ANIMALS[state.kind].gravity, HOP_V = () => Math.sqrt(2 * gravity() * 14); // (a hop 14 px high)
  // how high it is off the ground: a hop, or a run's leap (the game draws its frames that much higher)
  const up = () => (hop ? hop.alt : stride(state.kind, (state.frame % frames(state.move)) / frames(state.move), state.move).lift || 0);

  // the model a way draws (the mesh: its eyes in its texture, none stuck on), and the skinned mesh's bones for it
  const modelOf = (mode, p, o, mo) => modelFor(p, mode === 'mesh' ? { ...o, marks: 'none' } : o, mo);
  // a way at the game's resolution → a picture (palette indices)
  function pixels(mode, p, yaw, tilt, o, mo = null) {
    if (mode === 'snap') return WAYS.snap.draw(p, yaw, tilt, o, mo);
    const m = modelOf(mode, p, o, mo);
    if (!gpu) return draw3d(m, deg(yaw), deg(tilt), { gap: o.gap, blink: p.blink });
    return gpu.draw(m, deg(yaw), deg(tilt), { gap: o.gap, blink: p.blink, parts: mode === 'parts', skin: mode === 'mesh' ? skinOf(m, o) : null });
  }

  // a picture into a canvas (GW × GH), on the sky with the ground line; tint: { i: color } over it; lift: drawn that
  // many pixels higher
  function paint(cv, px, tint = null, lift = 0) {
    const P = pal(), cx = cv.getContext('2d'), img = cx.createImageData(GW, GH), n = Math.round(lift) * GW;
    const rgb = (h) => [1, 3, 5].map((k) => parseInt(h.slice(k, k + 2), 16));
    for (let i = 0; i < px.length; i++) {
      const row = Math.floor(i / GW) + GY, v = i + n < px.length ? px[i + n] : 0, c = tint?.[i] || (v ? P[v] : row === FOOT ? P[COLOR.INK] : P.bg), [r, g, b] = rgb(c);
      img.data.set([r, g, b, 255], i * 4);
    }
    cx.putImageData(img, 0, 0);
  }
  const canvas = (z) => el('canvas', { width: GW, height: GH, style: `width:${GW * z}px;height:${GH * z}px` });
  const label = (text, input) => el('label', { className: 'note', style: 'display:flex;gap:5px;align-items:center;margin:0' }, text, input);
  const select = (pairs, value, onInput) => { const e = el('select', {}, ...pairs.map(([v, t, off]) => el('option', { value: v, textContent: t, disabled: !!off }))); e.value = value; e.addEventListener('input', () => onInput(e.value)); return e; };

  // the two views: each its way and its resolution (the game's pixels, or the screen's: then how it looks), big and as
  // big as in the game
  const views = state.views.map((v, n) => {
    const big = el('canvas', { width: GW, height: GH, style: 'width:100%' }), small = el('canvas', { width: GW, height: GH, style: `width:${GW * 2}px;height:${GH * 2}px` });
    const note = el('p', { className: 'note' }), time = el('span', { className: 'note' });
    const look = select([['flat', 'flat'], ['cel', 'two tones'], ['lit', 'lit']], v.look, (x) => { v.look = x; keep(); });
    const line = el('input', { type: 'range', min: 0, max: 1.5, step: 0.05, value: v.line }), smooth = el('input', { type: 'checkbox', checked: v.smooth }), wire = el('input', { type: 'checkbox', checked: v.wire });
    line.addEventListener('input', () => { v.line = Number(line.value); keep(); });
    smooth.addEventListener('input', () => { v.smooth = smooth.checked; keep(); });
    wire.addEventListener('input', () => { v.wire = wire.checked; keep(); });
    const wireLabel = label('mesh lines', wire), lookLabel = label('look', look), screenOpts = el('div', { className: 'viewbar' }, lookLabel, label('outline', line), label('smooth edges', smooth), wireLabel);
    const sync = () => {
      note.textContent = NOTES[v.mode] + (v.res !== 'screen' ? '' : v.mode === 'snap' ? '; at the screen\'s resolution: the game\'s own 2D rig drawn that big (its shapes, outline and dots), not its pixels enlarged' : '; at the screen\'s resolution: a ray (or a triangle\'s pixel) for every screen pixel');
      screenOpts.style.display = v.res === 'screen' && (hi || v.mode === 'snap') ? '' : 'none';
      wireLabel.style.display = v.mode === 'mesh' ? '' : 'none';
      lookLabel.style.display = v.mode === 'snap' ? 'none' : '';
      big.style.imageRendering = small.style.imageRendering = v.res === 'screen' ? 'auto' : 'pixelated';
      if (v.res === 'game') { big.width = small.width = GW; big.height = small.height = GH; }
    };
    const mode = select(Object.entries(MODES).map(([k, t]) => [k, t, !can[k]]), v.mode, (x) => { v.mode = x; sync(); keep(); });
    const res = select([['game', 'game pixels'], ['screen', 'screen resolution']], v.res, (x) => { v.res = x; sync(); keep(); });
    $('live').append(el('div', { className: 'card view' }, el('div', { className: 'viewbar' }, el('h2', { textContent: `View ${n + 1}`, style: 'margin:0' }), mode, res), screenOpts, note, big,
      el('div', { className: 'small' }, small, el('span', { className: 'note', textContent: 'game size (×2)' }), time)));
    sync();
    return { v, big, small, time, ms: undefined };
  });
  // the snap at the screen's resolution: the game's own rig drawn that big (art.js's scale: at most 16 screen pixels an
  // art pixel, then stretched smoothly), its one-pixel lines thickened to line art pixels (its eyes, blocks, as they are)
  const big2d = el('canvas');
  function snapAt(cx, p, yaw, width, height, line) {
    const S = width / GW, s = Math.min(16, S), f = S / s, c = Math.cos(deg(yaw)), facing = Math.abs(c) < 0.5 && hasFront(p.kind);
    const sp = facing ? front(p.kind, { blink: p.blink, scale: s }) : animal(p.kind, p.move, p.frame, { blink: p.blink, body: motion.body, scale: s });
    const R = Math.max(0, Math.round((line * s) / 2 - 0.5)), w = sp.w + 2 * R, h = sp.h + 2 * R, px = new Uint8Array(w * h), OUT = 1;
    for (let y = 0; y < sp.h; y++) for (let x = 0; x < sp.w; x++) px[(y + R) * w + x + R] = sp.px[y * sp.w + x];
    if (R) {
      const at = (x, y) => (x >= 0 && y >= 0 && x < sp.w && y < sp.h ? sp.px[y * sp.w + x] : 0);
      for (let y = 0; y < sp.h; y++) for (let x = 0; x < sp.w; x++) {
        if (at(x, y) !== OUT) continue;
        const sq = (dx, dy) => at(x + dx, y + dy) === OUT && at(x + dx + 1, y + dy) === OUT && at(x + dx, y + dy + 1) === OUT && at(x + dx + 1, y + dy + 1) === OUT;
        if (sq(0, 0) || sq(-1, 0) || sq(0, -1) || sq(-1, -1)) continue; // (in a block: an eye; not a line)
        for (let dy = -R; dy <= R; dy++) for (let dx = -R; dx <= R; dx++) if (dx * dx + dy * dy <= R * R) px[(y + R + dy) * w + x + R + dx] = OUT;
      }
    }
    big2d.width = w; big2d.height = h;
    const bx = big2d.getContext('2d'), img = bx.createImageData(w, h), P = pal();
    for (let i = 0; i < px.length; i++) if (px[i]) { const x = parseInt(P[px[i]].slice(1, 7), 16); img.data.set([x >> 16, (x >> 8) & 255, x & 255, 255], i * 4); }
    bx.putImageData(img, 0, 0);
    cx.fillStyle = P.bg; cx.fillRect(0, 0, width, height);
    cx.fillStyle = P[COLOR.INK]; cx.fillRect(0, (FOOT - GY) * S, width, S);
    const ox = -GX * S, oy = (-GY - up()) * S; // (the box's corner)
    cx.save();
    if (!facing && c < 0) { cx.translate(2 * ox + 26 * S, 0); cx.scale(-1, 1); } // (facing left: mirrored, as the game does)
    cx.imageSmoothingEnabled = f > 1.01;
    cx.drawImage(big2d, ox + (sp.ox - R) * f, oy + (sp.oy - R) * f, w * f, h * f);
    cx.restore();
  }
  // a view drawn: at the game's resolution, painted; at the screen's, drawn that big (the snap: its pixels made big)
  function drawView(w, p, yaw, o) {
    const { v, big, small } = w, t0 = performance.now();
    if (v.res === 'game' || (!hi && v.mode !== 'snap')) {
      const px = pixels(v.mode, p, yaw, state.tilt, o, motion);
      paint(big, px, null, up()); paint(small, px, null, up());
    } else {
      const dpr = window.devicePixelRatio || 1, width = Math.max(GW, Math.round(big.clientWidth * dpr * (v.smooth ? 2 : 1))), height = Math.round((width * GH) / GW);
      if (big.width !== width || big.height !== height) { big.width = width; big.height = height; }
      const cx = big.getContext('2d');
      if (v.mode === 'snap') snapAt(cx, p, yaw, width, height, v.line);
      else {
        const m = modelOf(v.mode, p, o, motion);
        hi.draw(m, deg(yaw), deg(state.tilt), { width, height, lift: up(), gap: o.gap, line: v.line, look: v.look, blink: p.blink, pal: pal(), parts: v.mode === 'parts', skin: v.mode === 'mesh' ? skinOf(m, o, v.wire) : null });
        cx.drawImage(hi.canvas, 0, 0);
      }
      const sw = Math.round(GW * 2 * dpr), sh = Math.round(GH * 2 * dpr);
      if (small.width !== sw) { small.width = sw; small.height = sh; }
      const sx = small.getContext('2d');
      sx.imageSmoothingEnabled = true; sx.imageSmoothingQuality = 'high'; sx.drawImage(big, 0, 0, sw, sh);
    }
    const ms = performance.now() - t0;
    w.ms = w.ms === undefined ? ms : w.ms * 0.95 + ms * 0.05; // (on average, of late)
  }

  // the mesh's texture (open eyes), in the palette; and how big it is
  let texShown = null;
  const meshTex = el('canvas', { style: 'width:min(100%, 512px);image-rendering:pixelated;background:repeating-conic-gradient(#0002 0 25%,#0000 0 50%) 0 0/16px 16px' }), meshNote = el('p', { className: 'note' });
  if (can.mesh) $('texCard').append(meshNote, meshTex); else $('texCard').remove();
  const showTexture = (mesh) => {
    if (texShown === mesh && meshTex.dataset.pal === state.pal) return;
    texShown = mesh; meshTex.dataset.pal = state.pal;
    const { w, h, open, texels } = mesh.texture, P = pal();
    meshTex.width = w; meshTex.height = h;
    const cx = meshTex.getContext('2d'), img = cx.createImageData(w, h);
    for (let i = 0; i < open.length; i++) if (open[i]) { const x = parseInt(P[open[i]].slice(1, 7), 16); img.data.set([x >> 16, (x >> 8) & 255, x & 255, 255], i * 4); }
    cx.putImageData(img, 0, 0);
    meshNote.textContent = `${mesh.triangles} triangles, ${mesh.vertices} vertices, ${mesh.rest.length} bones; a texture ${w}×${h} (palette colors, ${texels.toFixed(1)} texels an art pixel), and one with the eyes shut. Each patch: a part seen from its near side or its far side.`;
  };

  // the turntable: each view's way every 360 / n degrees, at the game's resolution
  const STRIP = 16, strips = [0, 1].map((n) => {
    const row = el('div', { className: 'strip' }), title = el('h3'), cs = [];
    for (let k = 0; k < STRIP; k++) { const c = canvas(3); cs.push(c); row.append(el('figure', {}, c, el('figcaption', { textContent: `${(k * 360) / STRIP}°` }))); }
    $('table').append(title, row);
    return { title, cs };
  });
  // the check: stepping rays at 0° and 90° against the game's side and front (red: only the 3D one, blue: only the
  // game's, amber: both, another color)
  const checks = [['side', 0], ['front', 90]].map(([name, yaw]) => { const c = canvas(6), t = el('p', { className: 'note' }); $('check').append(el('div', { className: 'card' }, el('h2', { textContent: `3D at ${yaw}° against the game's ${name}` }), c, t)); return { name, yaw, c, t }; });

  let tableKey = '', checkKey = '', shownTimes = 0;
  function render() {
    const p = pose(), o = opts(), yaw = shown(state.yaw);
    for (const w of views) drawView(w, p, yaw, o);
    if (can.mesh && state.views.some((v) => v.mode === 'mesh')) showTexture(meshFor(o));
    if (++shownTimes % 15 === 0) {
      for (const w of views) w.time.textContent = `${w.ms < 1 ? w.ms.toFixed(2) : w.ms.toFixed(1)} ms a picture, of the page's time${w.v.res === 'game' && w.v.mode !== 'snap' && gpu ? ' (read back from the GPU)' : ''}`;
      $('times').textContent = gpu ? gpu.info : `WebGL: ${gpuError}.`;
    }
    $('angle').textContent = `${Math.round(wrap(yaw))}°${state.tilt ? `, tilted ${state.tilt}°` : ''}`;
    const tk = JSON.stringify([p, o, state.tilt, state.pal, state.views.map((v) => v.mode)]);
    if (tk !== tableKey) {
      tableKey = tk;
      strips.forEach((st, n) => { const mode = state.views[n].mode; st.title.textContent = `View ${n + 1}: ${MODES[mode]}`; st.cs.forEach((c, k) => paint(c, pixels(mode, p, (k * 360) / STRIP, state.tilt, o))); });
    }
    const ck = JSON.stringify([p, o, state.pal]);
    if (ck !== checkKey) {
      checkKey = ck;
      for (const c of checks) {
        const mine = pixels('rays', p, c.yaw, 0, o), game = c.name === 'side' ? fromSprite(side(p)) : fromSprite(facing(p)), tint = {};
        for (let i = 0; i < mine.length; i++) {
          if (mine[i] && !game[i]) tint[i] = '#e0473c'; else if (!mine[i] && game[i]) tint[i] = '#3c7be0'; else if (mine[i] && mine[i] !== game[i]) tint[i] = '#e8b04a';
        }
        paint(c.c, game.map((v, i) => v || mine[i]), tint);
        const a = alike(mine, game);
        c.t.textContent = `${Math.round(a.overlap * 100)}% of the pixels filled by either are filled by both; ${a.differ} filled by one only, ${a.colors} another color${c.name === 'front' && !hasFront(state.kind) ? ' (it has no front: its side)' : ''}`;
      }
    }
  }

  // controls
  const bind = (id, key, parse = Number, after = () => {}) => {
    const e = $(id);
    if (e.type === 'checkbox') e.checked = state[key]; else e.value = state[key];
    e.addEventListener('input', () => { state[key] = e.type === 'checkbox' ? e.checked : parse(e.value); after(); keep(); });
  };
  $('move').append(...MOVES.map((m) => el('option', { value: m, textContent: m })));
  const frameMax = () => { $('frame').max = frames(state.move) - 1; };
  bind('move', 'move', String, () => { state.frame = 0; $('frame').value = 0; frameMax(); });
  frameMax();
  bind('frame', 'frame'); bind('play', 'play'); bind('blink', 'blink');
  bind('yaw', 'yaw'); bind('tilt', 'tilt'); bind('steps', 'steps'); bind('spin', 'spin'); bind('speed', 'speed'); bind('dur', 'dur');
  bind('gap', 'gap'); bind('smooth', 'smooth'); bind('marks', 'marks', String); bind('texSize', 'texSize'); bind('swing', 'swingGain'); bind('pal', 'pal', String, () => { document.body.dataset.pal = state.pal; });
  document.body.dataset.pal = state.pal;
  $('turn').addEventListener('click', () => { state.turning = { from: state.yaw, to: state.yaw + 180, t: 0 }; });
  $('hop').addEventListener('click', () => { hop ||= { alt: 0, v: HOP_V() }; });
  for (const b of document.querySelectorAll('[data-yaw]')) b.addEventListener('click', () => { state.yaw = Number(b.dataset.yaw); state.turning = null; keep(); });
  // timing, on this device, of the pose as it is turned every 3° round: WebGL as a game would use it (copied onto a 2D
  // canvas, no waiting: the page's time each, and with the GPU's work: all of them, then waiting for the last), stepping
  // rays, part by part and the skinned mesh, at the game's resolution and at the screen's
  $('bench').addEventListener('click', () => {
    const p = pose(), o = opts(), m = modelFor(p, o, null), mm = modelOf('mesh', p, o, null), yaw = (i) => deg(i * 3), out = [];
    if (!gpu) { const N = 60, t0 = performance.now(); for (let i = 0; i < N; i++) draw3d(m, yaw(i), 0, { gap: o.gap }); out.push(`CPU 3D ${((performance.now() - t0) / N).toFixed(2)} ms a picture`); }
    const cx = el('canvas', { width: GW * 10, height: GH * 12 }).getContext('2d');
    const skin = can.mesh ? skinOf(mm, o) : null;
    const time = (r, how, N, big) => {
      const draw = (i) => r.draw(how === 'mesh' ? mm : m, yaw(i), 0, { gap: o.gap, parts: how === 'parts', skin: how === 'mesh' ? skin : null, read: false, width: 1316, height: 927, pal: pal() });
      const copy = (i) => (big ? cx.drawImage(r.canvas, 0, 0, 2, 2) : cx.drawImage(r.canvas, (i % 10) * GW, (Math.floor(i / 10) % 12) * GH));
      draw(0); copy(0); cx.getImageData(0, 0, 1, 1);
      let main = 0;
      const t0 = performance.now();
      for (let i = 0; i < N; i++) { const a = performance.now(); draw(i); copy(i); main += performance.now() - a; }
      cx.getImageData(0, 0, 1, 1);
      return `${(main / N).toFixed(2)} ms of the page's time, ${((performance.now() - t0) / N).toFixed(2)} with the GPU's`;
    };
    if (gpu) out.push(`at the game's size: stepping rays ${time(gpu, 'march', 120)}${gpu.byParts ? `; part by part ${time(gpu, 'parts', 120)}` : ''}${gpu.skinned ? `; skinned mesh ${time(gpu, 'mesh', 120)}` : ''}`);
    if (hi) out.push(`at 1316×927: stepping rays ${time(hi, 'march', 20, true)}${hi.byParts ? `; part by part ${time(hi, 'parts', 20, true)}` : ''}${hi.skinned ? `; skinned mesh ${time(hi, 'mesh', 20, true)}` : ''}`);
    $('benchOut').textContent = `${out.join('. ')} (${navigator.userAgent.match(/(iPad|iPhone|Mac OS X|Windows|Android|Linux)/)?.[0] || ''})`;
  });
  const depthBox = $('depth');
  depthBox.value = JSON.stringify(state.depth, null, 2);
  depthBox.addEventListener('input', () => { try { state.depth = JSON.parse(depthBox.value); depthBox.classList.remove('bad'); keep(); } catch { depthBox.classList.add('bad'); } });
  $('reset').addEventListener('click', () => { state.depth = JSON.parse(JSON.stringify(DEPTH[state.kind])); depthBox.value = JSON.stringify(state.depth, null, 2); depthBox.classList.remove('bad'); keep(); });

  // the clock: a turn of 180° eased over dur seconds; spinning; the move's frames; a hop; the chains swung by all that
  let last = performance.now(), ft = 0, was = state.yaw, w = 0;
  function tick(now) {
    const dt = Math.min(0.1, (now - last) / 1000);
    last = now;
    if (hop) { hop.v -= gravity() * dt; hop.alt += hop.v * dt; if (hop.alt <= 0) hop = null; }
    if (state.turning) {
      const u = Math.min(1, (state.turning.t += dt) / state.dur), e = u * u * (3 - 2 * u);
      state.yaw = wrap(state.turning.from + (state.turning.to - state.turning.from) * e);
      if (u >= 1) { state.turning = null; keep(); }
    } else if (state.spin) state.yaw = wrap(state.yaw + state.speed * dt);
    if (state.play) {
      const m = rigParts.move(state.kind, state.move), fps = m?.gait ? m.gait.frames * strides(state.kind, 120) : m?.fps || 8; // (a run: as fast as at 120 px a second)
      ft += dt * fps;
      if (ft >= 1) { state.frame = (state.frame + Math.floor(ft)) % frames(state.move); ft %= 1; }
    }
    const p = pose(), turned = ((((shown(state.yaw) - was) % 360) + 540) % 360) - 180, w1 = dt ? deg(turned) / dt : 0; // (how fast it turns, as drawn)
    was = shown(state.yaw);
    if (dt) { swingChains(motion.swing, state.kind, w1, (w1 - w) / dt, dt, state.swingGain, state.depth); w = w1; }
    moveBody(motion.body, state.kind, p.move, p.frame, 0, -up(), state.move === 'run' && state.play && !hop ? 120 : 0, dt);
    $('yaw').value = Math.round(state.yaw); $('frame').value = state.frame;
    render();
    requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
  window.turnLab = { state, motion, model, draw3d, pixels, views, gpu, hi };
}
