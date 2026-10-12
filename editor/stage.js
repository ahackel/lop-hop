// The stage (see editor.js): the animal as the game draws it, its bones and its parts' handles over it; picking and
// dragging them
import { COLOR, FOOT, PALETTES, animal, colorOf, rgb, rigParts } from '../art.js';
import { $, css, el } from './dom.js';
import { faceEdit } from './face.js';
import { inspect } from './inspector.js';
import { hover, isPicked, listParts, togglePick } from './lists.js';
import { castHit, drawCast, setHue } from './palette.js';
import { current, isOwn, minus, parts, plus, same, setStep, setAlt } from './parts.js';
import * as sandbox from './play.js';
import { G, P, also, build, changed, drag, editable, hist, isProp, kind, nice, place, propSprite, reach, remember, restPoints, sel, snapshot, status, toWorld, view, setAlso, setSel, setDrag } from './state.js';
import { frames, kindOf, markFrames, setPlay, timeline } from './timeline.js';

// the stage shows art pixels from (X0, Y0), VW × VH of them (the 26×20 box and room around it; a prop: its box and a
// little room), Z screen pixels each
let X0 = -12, Y0 = -9, VW = 50, VH = 31;
const frameView = () => { if (isProp()) { const [w, h] = build.size, m = 3; [X0, Y0, VW, VH] = [-m, -m, w + 2 * m, h + 2 * m]; } else [X0, Y0, VW, VH] = [-12, -9, 50, 31]; };
export let Z = 16;

const toScreen = ([x, y]) => { const [g, [dx, dy]] = G; return [(x * g + dx - X0) * Z, (y * g + dy - Y0) * Z]; };
const toArt = (e) => { const r = $('stage').getBoundingClientRect(), k = $('stage').width / r.width, [g, [dx, dy]] = G; return [((e.clientX - r.left) * k / Z + X0 - dx) / g, ((e.clientY - r.top) * k / Z + Y0 - dy) / g]; };
export const editing = () => editable() && (view.move === 'edit' || kindOf(view.move) === 'clip'); // (handles: the build's, or a clip's at the frame shown)

// (the build: standing, its face as the frames being drawn have it, else open and shut)
const setupLook = () => ({ eye: faceEdit.part === 'eye' ? faceEdit.name : 'open', mouth: faceEdit.part === 'mouth' ? faceEdit.name : 'shut' });
// (screen pixels: the build drawn Z times finer, a screen pixel a pixel, by the game's own code (as the giant dino is
// drawn bigger; a prop: see prop); half as fine while a handle is dragged, to keep up)
const fine = () => view.mode === 'setup' && view.move === 'edit' && $('fine').checked;
const fineness = () => (fine() ? (drag ? Math.max(2, Math.round(Z / 2)) : Z) : 1);
function sprite(S = 1) { return isProp() ? { ox: 0, ...propSprite(S), oy: 0 } : view.move === 'edit' ? animal(kind, 'hurt', 0, { look: setupLook(), scale: S }) : animal(kind, view.move, view.frame); }

// a handle of a part not picked: shown (and grabbed) as Handles says (picked: none; joints: a joint's; all: every one)
const shows = (h) => h.anchor && ($('handles').value === 'all' || (h.joint && $('handles').value === 'joints'));

export function draw() {
  const c = $('stage'), ctx = c.getContext('2d');
  const box = $('stageBox'); // (as big as fits in what the window leaves it)
  if (view.mode === 'game') { drawCast(c); return; }
  if (view.mode === 'play') {
    Z = Math.max(2, Math.floor(Math.min(box.clientWidth / sandbox.PW, box.clientHeight / sandbox.PH))) || 8;
    if (c.width !== sandbox.PW * Z || c.height !== sandbox.PH * Z) { c.width = sandbox.PW * Z; c.height = sandbox.PH * Z; c.style.width = `${c.width}px`; c.style.height = `${c.height}px`; }
    sandbox.draw(c, Z);
    return;
  }
  frameView();
  Z = Math.max(4, Math.floor(Math.min(box.clientWidth / VW, box.clientHeight / VH))) || 16;
  if (c.width !== VW * Z || c.height !== VH * Z) { c.width = VW * Z; c.height = VH * Z; c.style.width = `${VW * Z}px`; c.style.height = `${VH * Z}px`; }
  ctx.fillStyle = PALETTES.day.bg; ctx.fillRect(0, 0, c.width, c.height); // (the game's day: its outlines show)
  const grid = (alpha) => {
    ctx.fillStyle = `rgba(128,128,128,${alpha})`;
    for (let x = 1; x < VW; x++) ctx.fillRect(x * Z, 0, 1, c.height);
    for (let y = 1; y < VH; y++) ctx.fillRect(0, y * Z, c.width, 1);
  };
  grid(0.08);
  const pal = PALETTES.day;
  if (!isProp()) { ctx.fillStyle = pal[COLOR.FAINT]; ctx.fillRect(0, (FOOT - Y0) * Z, c.width, Z); } // the ground's row
  place();
  const S = fineness(), s = sprite(S), n = view.move === 'edit' ? 1 : frames(view.move);
  const pixels = (sp, color) => {
    const px = color ? sp.px : sp.look(); // (in the look: see Style)
    for (let y = 0; y < sp.h; y++) for (let x = 0; x < sp.w; x++) {
      const k = px[y * sp.w + x];
      if (!k) continue;
      ctx.fillStyle = color || colorOf(pal, k); ctx.fillRect((x + sp.ox - X0) * Z, (y + sp.oy - Y0) * Z, Z, Z);
    }
  };
  if ($('onion').checked && n > 1 && !view.play) { // (the frames before and after: faded, under it)
    pixels(animal(kind, view.move, (view.frame + n - 1) % n), 'rgba(43,123,217,0.28)');
    if (n > 2) pixels(animal(kind, view.move, (view.frame + 1) % n), 'rgba(217,99,43,0.28)');
  }
  if (S > 1) { // (an image of it, a pixel a screen pixel; the grid over it: the game's pixels)
    const px = s.look(), img = ctx.createImageData(s.w, s.h), d = img.data, cols = {};
    for (let i = 0; i < px.length; i++) {
      const k = px[i];
      if (!k) continue;
      const q = cols[k] || (cols[k] = rgb(colorOf(pal, k)));
      d[i * 4] = q[0]; d[i * 4 + 1] = q[1]; d[i * 4 + 2] = q[2]; d[i * 4 + 3] = 255;
    }
    const off = el('canvas', { width: s.w, height: s.h });
    off.getContext('2d').putImageData(img, 0, 0);
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(off, (s.ox / S - X0) * Z, (s.oy / S - Y0) * Z, (s.w / S) * Z, (s.h / S) * Z);
    grid(0.16);
  } else pixels(s);
  // the box every animal is placed by (dashed), the frame's own bounds (dotted)
  ctx.lineWidth = 1.5; ctx.setLineDash([6, 4]); ctx.strokeStyle = css('--dim');
  ctx.strokeRect(-X0 * Z, -Y0 * Z, (isProp() ? build.size[0] : 26) * Z, (isProp() ? build.size[1] : 20) * Z);
  ctx.setLineDash([2, 3]); ctx.strokeStyle = css('--accent');
  ctx.strokeRect((s.ox / S - X0) * Z, (s.oy / S - Y0) * Z, (s.w / S) * Z, (s.h / S) * Z);
  ctx.setLineDash([]);
  if ($('showBones').checked && editable() && view.mode !== 'play' && !isProp()) drawBones(ctx);
  if ($('showSwings').checked && editable() && view.mode !== 'play' && !isProp()) drawSwings(ctx);
  if (editing() && !view.play) drawHandles(ctx);
  markFrames();
}

// the bones as lines, as the pose has them: down the spine (the hip to the chest, the chest to the head, the head's turn),
// each leg (its root to its knee to its paw) and each chain not a shape's own (a tail's links at rest; an ear: its base to its tip), each
// as a long thin diamond from where it starts to where it ends; dashed: from the joint a leg or a chain hangs from to
// its root
function drawBones(ctx) {
  const J = P.J, F = P.F, legs = build.legs || {}, chains = build.chains || {};
  const bone = (a, b) => {
    const [ax, ay] = toScreen(a), [bx, by] = toScreen(b), len = Math.hypot(bx - ax, by - ay);
    if (len < 1) return;
    const ux = (bx - ax) / len, uy = (by - ay) / len, w = Math.min(5, len * 0.12), mx = ax + ux * len * 0.18, my = ay + uy * len * 0.18;
    ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(mx - uy * w, my + ux * w); ctx.lineTo(bx, by); ctx.lineTo(mx + uy * w, my - ux * w); ctx.closePath();
    ctx.fill(); ctx.stroke();
  };
  const hang = (a, b) => { const [ax, ay] = toScreen(a), [bx, by] = toScreen(b); ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(bx, by); ctx.stroke(); };
  ctx.save();
  ctx.lineWidth = 1; ctx.lineJoin = 'round'; ctx.fillStyle = 'rgba(255,255,255,0.55)'; ctx.strokeStyle = 'rgba(40,40,56,0.75)';
  if (J.hip && J.chest) bone(J.hip, J.chest);
  if (J.chest && J.head) bone(J.chest, J.head);
  if (F.head) bone(J.head, toWorld(F.head, [3, 0]));
  const hangs = [];
  for (const n in legs) {
    const L = legs[n], f = F[L.on], root = P.p.roots?.[n] || toWorld(f, L.at), paw = P.p.paws?.[n];
    if (!paw) continue;
    const [knee, end] = reach(root, paw, L.thigh, L.shin, L.bend);
    bone(root, knee); bone(knee, end);
    if (f) hangs.push([f.o, root]);
  }
  for (const n in chains) {
    if (isOwn(n)) continue; // (a shape's own: its handles, picked)
    const r = rigParts.chainRest(kind, P, n), f = F[r.on];
    const pts = restPoints(r); // (an ear: one link, to its tip)
    for (let i = 1; i < pts.length; i++) bone(pts[i - 1], pts[i]);
    if (f) hangs.push([f.o, r.root]);
  }
  for (const n in build.bones || {}) { // (a bone: from its root, as long as it is (none long: a little way, its turn); one that reaches: along its arc)
    const f = F[n], up = F[build.bones[n].on];
    if (!f) continue;
    if (f.pts) for (let i = 1; i < f.pts.length; i++) bone(f.pts[i - 1], f.pts[i]);
    else bone(f.o, toWorld(f, [Math.max(build.bones[n].length || 0, 1.5), 0]));
    if (up) hangs.push([up.o, f.o]);
  }
  ctx.setLineDash([3, 3]); ctx.strokeStyle = 'rgba(40,40,56,0.45)';
  for (const [a, b] of hangs) hang(a, b);
  ctx.restore();
}

// the swings' bones (a shape's own, a group's), as the pose has them at rest: cyan lines edged white (no fur is cyan), a
// dot where each link starts, a ring at the root (dashed: from the joint it hangs from)
function drawSwings(ctx) {
  const F = P.F, CYAN = 'rgba(0,175,215,0.95)', EDGE = 'rgba(255,255,255,0.85)';
  ctx.save();
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  const both = (fn) => { ctx.strokeStyle = EDGE; ctx.lineWidth = 3.5; fn(); ctx.strokeStyle = CYAN; ctx.lineWidth = 1.5; fn(); };
  for (const n of rigParts.chains(kind)) {
    if (!n.startsWith('~') && !isOwn(n)) continue; // (a chain of the list's: drawn with the bones)
    const r = rigParts.chainRest(kind, P, n), f = F[r.on], pts = restPoints(r), sc = pts.map(toScreen);
    if (f) { const [ax, ay] = toScreen(f.o); ctx.setLineDash([2, 3]); ctx.strokeStyle = CYAN; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(...sc[0]); ctx.stroke(); ctx.setLineDash([]); }
    both(() => { ctx.beginPath(); sc.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y))); ctx.stroke(); });
    for (const [x, y] of sc.slice(1, -1)) { ctx.beginPath(); ctx.arc(x, y, 2.5, 0, Math.PI * 2); ctx.fillStyle = CYAN; ctx.fill(); ctx.lineWidth = 1; ctx.strokeStyle = EDGE; ctx.stroke(); }
    both(() => { ctx.beginPath(); ctx.arc(...sc[0], 3, 0, Math.PI * 2); ctx.stroke(); });
  }
  ctx.restore();
}

function drawHandles(ctx) {
  const all = parts(), on = current(), accent = css('--sel');
  const dot = (p, r, fill, ring) => { const [x, y] = toScreen(p); ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fillStyle = fill; ctx.fill(); ctx.lineWidth = 1.5; ctx.strokeStyle = ring; ctx.stroke(); };
  const stroke = (line) => { ctx.beginPath(); line.forEach((p, i) => { const [x, y] = toScreen(p); i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }); ctx.stroke(); };
  if (hover) { // (pointed at in the lists: a row's part, or a layer's)
    ctx.save(); ctx.strokeStyle = accent; ctx.globalAlpha = 0.85; ctx.lineWidth = 1.5; ctx.setLineDash([4, 3]);
    for (const p of all) if (p !== on && !p.off && hover.sels.some((s) => same(s, p.sel))) p.lines.forEach(stroke);
    ctx.restore();
  }
  if (on) { ctx.strokeStyle = accent; ctx.lineWidth = 2; on.lines.forEach(stroke); }
  if (also.length) { ctx.save(); ctx.strokeStyle = accent; ctx.lineWidth = 1.5; for (const p of all) if (p !== on && !p.off && isPicked(p.sel)) p.lines.forEach(stroke); ctx.restore(); }
  for (const p of all) {
    if (p === on || p.off) continue;
    for (const h of p.handles) if (shows(h)) dot(h.at, h.joint ? 6 : 4, h.joint ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.6)', h.joint ? '#333' : 'rgba(60,60,60,0.6)');
  }
  if (on) for (const h of on.handles) dot(h.at, h.joint || h.move ? 6 : 5, h.size ? '#fff' : accent, h.size ? accent : '#fff');
}

// pick and drag: a handle of the picked part, a joint or another part's handle, or (a click) the part under the pointer
// (with ⌘ or ⇧: added to what is picked, or taken from it). A part's middle dragged: those picked with it move too
export const playAt = (e) => { const r = $('stage').getBoundingClientRect(), k = $('stage').width / r.width; return [((e.clientX - r.left) * k) / Z, ((e.clientY - r.top) * k) / Z]; };
const hand = (c) => { $('stage').style.cursor = c || ''; };
$('stage').addEventListener('pointerdown', (e) => {
  if (view.mode === 'game') { const h = castHit(e); if (h) { setHue(h.color); listParts(); inspect(); draw(); } return; }
  if (view.mode === 'play') { $('stage').setPointerCapture(e.pointerId); hand(sandbox.down(...playAt(e))); return; }
  if (!editing()) return;
  if (view.play) setPlay(false);
  const p = toArt(e), near = (h) => Math.hypot(...minus(toScreen(h.at), toScreen(p))) < 9;
  const all = parts(), on = current();
  let hit = on?.handles.find(near), owner = on;
  if (!hit) for (const q of all) { if (q.off) continue; const h = q.handles.find((x) => shows(x) && near(x)); if (h) { hit = h; owner = q; break; } }
  if (hit) {
    if (owner !== on && isPicked(owner.sel)) { setAlso([...also.filter((x) => !same(x, owner.sel)), sel]); setSel(owner.sel, true); listParts(); inspect(); }
    else if (owner !== on) { setSel(owner.sel); listParts(); inspect(); }
    remember(); setDrag({ sel: owner.sel, index: owner.handles.indexOf(hit), from: hit.at, with: hit.move ? withIt(all) : [] });
    $('stage').setPointerCapture(e.pointerId);
    return;
  }
  const picked = [...all].reverse().find((q) => !q.off && q.hit?.(p)); // (the one drawn last: on top; not one hidden)
  if (picked && (e.metaKey || e.ctrlKey || e.shiftKey)) togglePick(picked.sel);
  else setSel(picked ? picked.sel : { type: 'rig' });
  listParts(); inspect(); draw();
});
$('stage').addEventListener('pointermove', (e) => {
  if (view.mode === 'game') { const h = castHit(e); $('stage').title = h ? `${nice(h.color)} · ${h.thing}` : ''; return; }
  if (view.mode === 'play') { const c = sandbox.move(...playAt(e)); if (c !== null) hand(c); return; }
  if (!drag) return;
  setStep(e.shiftKey ? 0.5 : 0.1); setAlt(e.altKey);
  const q = parts().find((x) => same(x.sel, drag.sel));
  q?.handles[drag.index]?.set(toArt(e));
  if (drag.with.length) { // (those picked with it: moved as far as it, each from where it was)
    const d = minus(parts().find((x) => same(x.sel, drag.sel)).handles[drag.index].at, drag.from);
    for (const [h, at] of drag.with) h.set(plus(at, d));
  }
  changed();
});
for (const type of ['pointerup', 'pointercancel']) $('stage').addEventListener(type, () => { if (view.mode === 'play') { sandbox.up(); hand(''); } });
$('stage').addEventListener('pointerup', () => {
  if (!drag) return;
  setDrag(null); setStep(0.1);
  if (fine()) draw(); // (drawn finer, let go: see draw)
  if (view.move !== 'edit') timeline(); // (a key set)
  const h = hist();
  if (h.past[h.past.length - 1] === snapshot()) h.past.pop(); // (a click, no change)
  listParts(); inspect(); status();
});

// the middles of those picked with the one picked (not a shape whose group is picked: it moves with it), where each was
export function withIt(all) {
  const groups = also.concat(sel).filter((s) => s.type === 'group').map((s) => s.g);
  return all.filter((p) => !same(p.sel, sel) && !p.off && also.some((s) => same(s, p.sel)) && !(p.sel.type !== 'group' && groups.includes(p.sel.g) && p.sel.type !== 'dot'))
    .flatMap((p) => p.handles.filter((h) => h.move).map((h) => [h, h.at]));
}
export function setZ(v) { return (Z = v); }
