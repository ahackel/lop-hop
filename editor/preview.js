// The preview (see editor.js): the animal in the game's scene, running, jumping, ducking; the editor's clock (tick)
import { ANIMALS, COLOR, FOOT, GRAVITY, GROUND, H, JUMP, PALETTES, W, animal, cactus, golden, hill, idleFrame, jumpFrame, moveBody, stride, strides } from '../art.js';
import { $ } from './dom.js';
import * as sandbox from './play.js';
import { draw } from './stage.js';
import { kind, view } from './state.js';
import { stepPlay } from './timeline.js';

export const pv = { phase: 0, alt: 0, vAlt: 0, body: {}, t: 0, scroll: 0, wait: 0.6, cacti: [] };
{ let seed = 7; const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647); for (let i = 0; i < 3; i++) pv.cacti.push({ x: 140 + i * 110, s: cactus(rnd, i === 1) }); }
let last = 0;
export function tick(now) {
  const dt = Math.min(0.05, (now - last) / 1000 || 0.016); last = now;
  if (kind && view.mode === 'play') { sandbox.step(dt); draw(); }
  if (kind) { stepPlay(dt); stepPreview(dt); drawPreview(); }
  requestAnimationFrame(tick);
}
function stepPreview(dt) {
  const act = $('act').value, t = ANIMALS[kind], moving = ['run', 'jump', 'duck'].includes(act), speed = moving ? +$('speed').value : 0;
  pv.t += dt; pv.scroll += speed * dt;
  pv.phase = (pv.phase + dt * strides(kind, speed, act === 'duck' ? 1 : undefined)) % 1;
  if (act === 'jump') {
    if (pv.alt > 0 || pv.vAlt > 0) { pv.vAlt -= GRAVITY * t.gravity * dt; pv.alt = Math.max(0, pv.alt + pv.vAlt * dt); if (!pv.alt) { pv.vAlt = 0; pv.wait = 0.5; } }
    else if ((pv.wait -= dt) < 0) pv.vAlt = JUMP * t.jump;
  } else { pv.alt = 0; pv.vAlt = 0; }
  const [pose, frame, lift] = pvPose(act);
  moveBody(pv.body, kind, pose, frame, 30, GROUND - FOOT - pv.alt - lift, speed, dt);
}
function pvPose(act) {
  if (act === 'jump' && pv.alt > 0) return ['jump', jumpFrame(kind, pv.vAlt / (JUMP * ANIMALS[kind].jump)), 0];
  if (act === 'run' || act === 'jump') { const s = stride(kind, pv.phase); return ['run', s.frame, s.lift]; }
  if (act === 'duck') return ['duck', stride(kind, pv.phase, 'duck').frame, 0];
  if (act === 'idle') return ['idle', idleFrame(kind, pv.t), 0];
  return [act, 0, 0];
}
function drawPreview() {
  // (twice as big as it was: K screen pixels an art pixel, as much of the scene's width as the card has room for)
  const c = $('preview'), K = Math.max(2, Math.round((2 * Math.min(innerHeight * 0.15, 170)) / H)), shown = Math.min(W, Math.floor((c.parentElement.clientWidth - 16) / K) || W), ctx = c.getContext('2d');
  if (c.width !== shown * K || c.height !== H * K) { c.width = shown * K; c.height = H * K; c.style.width = `${shown * K}px`; c.style.height = `${H * K}px`; }
  ctx.setTransform(K, 0, 0, K, 0, 0); ctx.imageSmoothingEnabled = false;
  const light = $('light').value, base = PALETTES[light === 'night' ? 'night' : 'day'], pal = light === 'golden' ? golden(base) : base;
  ctx.fillStyle = base.bg; ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = base[COLOR.FAINT];
  const from = Math.floor(pv.scroll * 0.08);
  for (let x = 0; x <= W; x++) { const h = hill(x + from); ctx.fillRect(x, Math.round(GROUND - h), 1, Math.round(h)); }
  ctx.fillStyle = base[COLOR.INK]; ctx.fillRect(0, GROUND, W, 1);
  for (const k of pv.cacti) { const x = ((k.x - pv.scroll) % 330 + 330) % 330 - 30; k.s.draw(ctx, Math.round(x), GROUND - k.s.h + 1, base); }
  const act = $('act').value, [pose, frame, lift] = pvPose(act), s = $('giant').checked ? 2 : 1;
  const sp = animal(kind, pose, frame, { blink: pv.t % 3.2 < 0.12, body: pv.body, scale: s }), y = GROUND - FOOT - pv.alt - lift;
  sp.draw(ctx, 30 - 4 * (s - 1), Math.round(y + FOOT * (1 - s)), pal);
}

