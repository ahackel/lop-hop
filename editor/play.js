// Play mode (see editor.js): the animal on its own on the home screen's ground, handled as the game handles it there, by
// the game's own code (art.js: swing, hung, petted, reaching, moveBody), its numbers from its file (handling): pressed and
// pulled up, picked up by the middle of its back and carried about (it hangs, tips as it is moved, squirms); let go, it
// drops, rights itself and lands with a squash; rubbed sideways, petted (pressed down: it ducks); the treat over it taken
// and held out, it reaches for it, eats it at its mouth (dropped: it falls, caught passing its mouth, else eaten where it
// lands near it; held over it, now and then it hops after it, as high as fed.hop lets it); a double click, a hop. What
// the game does around it (the row of animals, how many treats it has, its tries for one held out) is left out. Slow:
// everything at a quarter speed.
import { ANIMALS, FOOD, FOOT, PALETTES, COLOR, GRAVITY, JUMP, animal, idleFrame, jumpFrame, moveBody, holdUp, swing, moveHung, hung, hangDepth,
  heldAt, petted, reaching, moveReaching, handling, heart, hill } from '../art.js';

export const PW = 100, PH = 62; // the world shown, in art pixels
const G = 54, HOME = 37; // the ground's row; where the animal sits (its box's left)
const LIFT = 3, TREAT_FALL = 420;
let s = null, world = null;
export const play = { slow: false };

export function reset(kind) {
  s = { kind, bx: HOME, t: 0, body: {}, grip: null, held: null, dropped: null, pet: null, feed: null, loose: null, chew: 0, chewFor: 1,
    reach: { amount: 0, t: 0, alt: 0, v: 0, wait: 1 }, hop: null, faceL: false, tapped: null, parts: [], floats: [] };
}
const meal = () => FOOD[ANIMALS[s.kind].food];
const blinking = (t) => t % 3.2 < 0.12;

// ------------------------------------------------------------------------------------------------------- the treat
const treatSpot = () => [s.bx + 13, G - 25 - meal().h]; // (its middle, its top: over the animal)
const showTreat = () => !s.feed && !s.loose && !s.chew && !s.held && !s.dropped;
const onTreat = (x, y) => { const [cx, cy] = treatSpot(), m = meal(); return showTreat() && Math.abs(x - cx) <= m.w / 2 + 6 && y >= cy - 4 && y <= cy + m.h + 3; };
const treatAt = () => (s.feed ? [s.feed.x, s.feed.y] : s.loose ? [s.loose.x + meal().w / 2, s.loose.y + meal().h / 2] : null);
function reachTo([tx, ty]) { // (in its box, as it faces: turned round for one behind it)
  if (tx < s.bx + 10) s.faceL = true; else if (tx > s.bx + 16) s.faceL = false;
  return [s.faceL ? s.bx + 26 - tx : tx - s.bx, ty - (G - FOOT - s.reach.alt)]; // (hopping after it: from up there)
}
const amount = () => s.reach.amount * (0.92 + 0.08 * Math.cos(s.reach.t * 4.4)); // (straining after it)
const reachFor = (at, eating = false) => reaching(s.kind, ...reachTo(at), eating, amount(), 1, s.body);
const mouthOf = (sp) => { const [mx, my] = sp.mouth || [sp.head[0] + 4, sp.head[1] + 8]; return [s.faceL ? s.bx + 26 - mx : s.bx + mx, G - FOOT - s.reach.alt + my]; };
function chewPose() {
  const u = 1 - s.chew / s.chewFor, { chews, nod } = handling(s.kind).fed;
  return [30, FOOT - 6, 0.35, 1, nod * Math.sin(u * chews * Math.PI * 2)];
}
const chewing = () => { const [tx, ty, a, look, nod] = chewPose(); return reaching(s.kind, tx, ty, true, a, look, s.body, nod); };
function eat([mx, my]) {
  s.chew = s.chewFor = handling(s.kind).fed.chewFor;
  s.pet = { joy: 1, t: 0, strokes: 0 };
  s.feed = s.loose = null; s.reach.amount = 0;
  for (let i = 0; i < 5; i++) crumb([mx, my]);
}
function crumb([mx, my]) {
  const colors = [...new Set(meal().px)].filter(Boolean), dir = (s.faceL ? -1 : 1) * (Math.random() < 0.75 ? 1 : -0.6);
  s.parts.push({ x: mx, y: my, vx: dir * (10 + Math.random() * 40), vy: -25 - Math.random() * 45, life: 0.35 + Math.random() * 0.3, color: colors[Math.floor(Math.random() * colors.length)] });
}
// held over its mouth: a hop after it, a little short of it, at most fed.hop high (as the game's: see hopAfter there)
const HOP_TRIES = 0.6, HOP_OVER = 4;
function hopAfter() {
  const gap = mouthOf(reachFor(treatAt()))[1] - s.feed.y, most = handling(s.kind).fed.hop;
  if (s.reach.alt || !(most > 0) || gap <= HOP_OVER || Math.random() >= HOP_TRIES) return;
  s.reach.v = Math.sqrt(2 * GRAVITY * ANIMALS[s.kind].gravity * Math.min(most, gap * 0.7));
}
function stepHop(dt) {
  const r = s.reach;
  if (!r.v && !r.alt) return;
  r.v -= GRAVITY * ANIMALS[s.kind].gravity * dt; r.alt += r.v * dt;
  if (r.alt <= 0) { r.alt = r.v = 0; dust(s.bx + 13, 4, 8); }
}
function dropTreat() {
  const mouth = mouthOf(reachFor(treatAt()));
  if (Math.hypot(s.feed.x - mouth[0], s.feed.y - mouth[1]) < 8) eat(mouth);
  else { s.loose = { x: s.feed.x - meal().w / 2, y: s.feed.y - meal().h / 2, vy: 0, down: false, t: 0 }; s.feed = null; }
}
function stepTreat(dt) {
  stepHop(dt); // (caught in the air: chewing on the way down)
  if (s.chew > 0) {
    if (Math.random() < dt * 12) crumb(mouthOf(chewing()));
    if ((s.chew -= dt) <= 0) { s.chew = 0; hearts(); }
    return;
  }
  if (!treatAt()) { s.reach.amount = 0; s.reach.t = 0; return; }
  s.reach.amount = Math.min(1, s.reach.amount + 3 * dt); s.reach.t += dt;
  if (s.feed && (s.reach.wait -= dt) <= 0) { s.reach.wait = 1 + Math.random() * 1.2; hopAfter(); }
  const L = s.loose;
  if (!L) return;
  if (!L.down) {
    L.vy += TREAT_FALL * dt; L.y += L.vy * dt;
    const mouth = mouthOf(reachFor(treatAt()));
    if (Math.hypot(L.x + meal().w / 2 - mouth[0], L.y + meal().h / 2 - mouth[1]) < 7) { eat(mouth); return; } // caught
    if (L.y >= G + 1 - meal().h) { L.y = G + 1 - meal().h; L.down = true; }
    return;
  }
  const mouth = mouthOf(reachFor(treatAt(), true)), near = Math.abs(L.x + meal().w / 2 - mouth[0]) < 10; // (near enough: eaten there, else gone)
  if ((L.t += dt) > 0.6) { if (near) eat(mouth); else { dust(L.x + meal().w / 2, 4, 10); s.loose = null; } }
}

// ------------------------------------------------------------------------------------------- picked up, dropped
function letGo() {
  const [sx] = heldAt(s.kind), h = s.held.h;
  s.bx = Math.max(2, Math.min(PW - 28, s.held.x - sx));
  h.falling = true;
  s.dropped = { h, y: s.held.y, vy: 0, squash: 0, squashFor: 1, landed: false };
  s.held = null;
}
function stepHeld(dt) {
  const k = s.kind, [sx, sy] = heldAt(k);
  if (s.held) { // following the hand (quickly: it has some weight), never so low it would touch the ground
    const H = s.held, py = Math.min(H.py, G - hangDepth(k) - 2);
    H.x += (H.px - H.x) * Math.min(1, dt * 30); H.y += (py - H.y) * Math.min(1, dt * 30);
    swing(H.h, [H.x, H.y], dt); moveHung(s.body, H.h, H.x, H.y, dt);
    return true;
  }
  const d = s.dropped;
  if (!d) return false;
  const floor = G - FOOT + sy;
  if (!d.landed) { // falling, righting itself on the way; landing with a squash and a puff of dust
    d.vy += GRAVITY * dt; d.y = Math.min(floor, d.y + d.vy * dt);
    swing(d.h, [s.bx + sx, d.y], dt); moveHung(s.body, d.h, s.bx + sx, d.y, dt);
    if (d.y >= floor && Math.abs(d.h.ang) < 0.12) {
      d.landed = true; d.squash = d.squashFor = handling(k).dropped.squashFor; d.hard = Math.min(1, 0.3 + d.vy / 600);
      dust(s.bx + 13, 8, 12);
    }
    return true;
  }
  if ((d.squash -= dt) <= 0) { s.dropped = null; return false; }
  moveBody(s.body, k, 'idle', 0, s.bx, G - FOOT, 0, dt);
  return true;
}
function dust(x, n, spread) {
  for (let i = 0; i < n; i++) { const side = i % 2 ? 1 : -1; s.parts.push({ x: x + side * (spread / 2 + Math.random() * spread / 2), y: G - 1, vx: side * (25 + Math.random() * 35), vy: -15 - Math.random() * 30, life: 0.35, color: COLOR.FAINT }); }
}

// ------------------------------------------------------------------------------------------------------- petted
function pet(g, x) {
  const p = s.pet || (s.pet = { joy: 0, t: 0, strokes: 0 });
  if (!g.pet) { g.pet = true; g.lastX = g.from = g.x; g.dir = 0; }
  const d = Math.sign(x - g.lastX);
  if (d) { p.lean = d; p.still = 0; }
  if (d && d !== g.dir) { // the hand turns: a stroke
    if (g.dir && Math.abs(g.lastX - g.from) >= 3 && ++p.strokes % 2 === 0 && p.joy >= handling(s.kind).petted.happy) heartUp();
    g.dir = d; g.from = g.lastX;
  }
  p.joy = Math.min(1, p.joy + Math.abs(x - g.lastX) / 60);
  p.petting = true;
  g.lastX = x;
}
function stepPet(dt) {
  const p = s.pet;
  if (!p) return;
  p.t += dt;
  if ((p.still = (p.still || 0) + dt) > 0.12) p.lean = 0;
  if (!s.grip?.pet) p.petting = false;
  if (!p.petting && !s.chew && (p.joy -= dt * 0.5) <= 0) s.pet = null;
}
const pettedNow = () => petted(s.kind, idleFrame(s.kind, s.t), s.pet.joy, s.pet.t, s.pet.lean);
function heartUp() { const sp = pettedNow(); s.floats.push({ x: s.bx + sp.head[0] + Math.random() * 4 - 4, y: G - FOOT + sp.head[1] - 2, life: 0.9 }); }
function hearts() { const [mx, my] = mouthOf(animal(s.kind, 'idle', 0)); for (let i = 0; i < 3; i++) s.floats.push({ x: mx - 8 + i * 5, y: my - 10 - i * 3, life: 0.9 + i * 0.15 }); }

// ------------------------------------------------------------------------------------------------- the pointer
// (x, y: in the world's art pixels)
export function down(x, y) {
  if (!s) return '';
  if (onTreat(x, y)) { s.feed = { x, y }; s.faceL = false; return 'grabbing'; }
  if (s.tapped && performance.now() - s.tapped.t < 350 && Math.hypot(x - s.tapped.x, y - s.tapped.y) < 12) { hopUp(); s.tapped = null; return ''; }
  if (!s.held && !s.dropped && !s.hop && x >= s.bx - 2 && x < s.bx + 28 && y >= G - 26 && y <= G + 2) { s.grip = { x, y }; return 'grab'; }
  return '';
}
export function move(x, y) {
  if (!s) return null;
  if (s.feed) { s.feed.x = x; s.feed.y = y; return null; }
  const g = s.grip;
  if (!g) return null;
  if (s.held) { s.held.px = x; s.held.py = y; return null; }
  const pushed = !g.pet && y >= g.y + LIFT; // (pushed down: it ducks)
  if (pushed || g.duck) { g.duck = pushed; g.moved = true; if (pushed || y > g.y - LIFT) return null; }
  const on = x >= s.bx - 2 && x < s.bx + 28 && y >= G - 24 && y <= G + 2;
  if (on && y > g.y - (g.pet ? 6 : LIFT)) { if (g.pet || Math.abs(x - g.x) >= LIFT) pet(g, x); return g.pet ? 'grab' : null; }
  const [sx, sy] = heldAt(s.kind);
  g.moved = true; s.pet = null;
  s.held = { px: x, py: y, x: s.bx + sx, y: G - FOOT + sy, h: holdUp(s.kind) };
  return 'grabbing';
}
export function up() {
  if (!s) return;
  if (s.feed) dropTreat();
  if (s.grip) {
    if (s.held) letGo();
    else if (!s.grip.pet && !s.grip.moved) s.tapped = { x: s.grip.x, y: s.grip.y, t: performance.now() };
    s.grip = null;
  }
}
function hopUp() { s.hop = { alt: 0, v: JUMP * ANIMALS[s.kind].jump }; s.pet = null; }

// ------------------------------------------------------------------------------------------------- each frame
export function step(dt) {
  if (!s) return;
  dt *= play.slow ? 0.25 : 1;
  s.t += dt;
  stepPet(dt);
  stepTreat(dt);
  for (const p of s.parts) { p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 300 * dt; p.life -= dt; }
  s.parts = s.parts.filter((p) => p.life > 0);
  for (const f of s.floats) { f.y -= 16 * dt; f.life -= dt; }
  s.floats = s.floats.filter((f) => f.life > 0);
  if (stepHeld(dt)) return;
  const k = s.kind, j = s.hop;
  if (j) { // a hop: up, and down again with a puff of dust
    j.v -= GRAVITY * ANIMALS[k].gravity * dt; j.alt += j.v * dt;
    if (j.alt <= 0) { s.hop = null; dust(s.bx + 13, 6, 10); }
    else { moveBody(s.body, k, 'jump', jumpFrame(k, j.v / (JUMP * ANIMALS[k].jump)), s.bx, G - FOOT - j.alt, 0, dt); return; }
  }
  if (s.chew > 0) { const [tx, ty, a, look, nod] = chewPose(); moveReaching(s.body, k, tx, ty, a, look, s.bx, G - FOOT - s.reach.alt, dt, nod); }
  else if (treatAt()) moveReaching(s.body, k, ...reachTo(treatAt()), amount(), 1, s.bx, G - FOOT - s.reach.alt, dt);
  else moveBody(s.body, k, 'idle', idleFrame(k, s.t), s.bx, G - FOOT, 0, dt);
}

// drawn into the world (1×), and that onto the stage, Z screen pixels to an art pixel
export function draw(stage, Z) {
  if (!s) return;
  world ||= document.createElement('canvas');
  world.width = PW; world.height = PH;
  const ctx = world.getContext('2d'), pal = PALETTES.day, k = s.kind;
  ctx.fillStyle = pal.bg; ctx.fillRect(0, 0, PW, PH);
  ctx.fillStyle = pal[COLOR.FAINT];
  for (let x = 0; x < PW; x++) { const h = hill(x + 40); ctx.fillRect(x, Math.round(G - h), 1, Math.round(h)); }
  ctx.fillStyle = pal[COLOR.INK]; ctx.fillRect(0, G, PW, 1);
  const facing = (sp, x, y) => { // (turned round: mirrored about it, on a whole pixel, or its pixels blur)
    if (!s.faceL) return sp.draw(ctx, x, y, pal);
    const X = Math.round(x);
    ctx.save(); ctx.translate(2 * X + 26, 0); ctx.scale(-1, 1); sp.draw(ctx, X, y, pal); ctx.restore();
  };
  const blink = blinking(s.t), d = s.dropped, g = s.held || d;
  if (d?.landed) { // flat as it lands, then up again
    const q = handling(k).dropped.squash * d.hard * Math.max(0, d.squash / d.squashFor);
    ctx.save(); ctx.translate(s.bx + 13, G); ctx.scale(1 + q, 1 - q);
    animal(k, 'idle', 0, { blink, body: s.body }).draw(ctx, -13, -FOOT, pal);
    ctx.restore();
  } else if (g) { // hanging from the hand (its shadow under it), or falling
    const x = s.held ? s.held.x : s.bx + heldAt(k)[0], [sp, pin] = hung(g.h, { blink, body: s.body }), above = G - (g.y - pin[1] + sp.oy + sp.h);
    if (above > 1) { const w = Math.max(4, Math.round(16 - above / 4)); ctx.globalAlpha = 0.25; ctx.fillStyle = pal[COLOR.INK]; ctx.fillRect(Math.round(x - w / 2), G - 1, w, 1); ctx.globalAlpha = 1; }
    sp.draw(ctx, Math.round(x - pin[0]), Math.round(g.y - pin[1]), pal);
  } else if (s.hop) animal(k, 'jump', jumpFrame(k, s.hop.v / (JUMP * ANIMALS[k].jump)), { body: s.body }).draw(ctx, s.bx, Math.round(G - FOOT - s.hop.alt), pal);
  else if (s.grip?.duck) animal(k, 'duck', 0).draw(ctx, s.bx, G - FOOT, pal); // pushed down
  else if (s.chew > 0) facing(chewing(), s.bx, G - FOOT - Math.round(s.reach.alt));
  else if (treatAt()) facing(reachFor(treatAt(), !!s.loose?.down), s.bx, G - FOOT - Math.round(s.reach.alt));
  else if (s.pet) pettedNow().draw(ctx, s.bx, G - FOOT, pal);
  else animal(k, 'idle', idleFrame(k, s.t), { blink, body: s.body }).draw(ctx, s.bx, G - FOOT, pal);
  const m = meal();
  if (showTreat()) { const [cx, cy] = treatSpot(); m.draw(ctx, Math.round(cx - m.w / 2), cy, pal); }
  else if (s.feed) m.draw(ctx, Math.round(s.feed.x - m.w / 2), Math.round(s.feed.y - m.h / 2), pal);
  else if (s.loose) m.draw(ctx, Math.round(s.loose.x), Math.round(s.loose.y), pal);
  for (const p of s.parts) { ctx.fillStyle = pal[p.color]; ctx.fillRect(Math.round(p.x), Math.round(p.y), 1, 1); }
  for (const f of s.floats) heart.draw(ctx, Math.round(f.x), Math.round(f.y), pal);
  const out = stage.getContext('2d');
  out.imageSmoothingEnabled = false;
  out.drawImage(world, 0, 0, PW * Z, PH * Z);
}
