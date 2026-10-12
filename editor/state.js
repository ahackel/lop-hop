// What the editor edits (see editor.js): every animal's file and build, the game's palette; the animal shown, the mode,
// the part picked; undo, saving, the toolbar. The other modules read it from here; what they change of it, by its
// setter (setSel, setDrag, setLastMove)
import { ANIMALS, PALETTES, rigOf, rigParts, setPalette, setRig } from '../art.js';
import { toAsset } from '../asset.js';
import paletteFile from '../assets/palette.js';
import { fileLabel } from './browser.js';
import { $ } from './dom.js';
import { inspect } from './inspector.js';
import { listParts } from './lists.js';
import { castOf, setCast } from './palette.js';
import { current } from './parts.js';
import * as sandbox from './play.js';
import { pv } from './preview.js';
import { draw } from './stage.js';
import { fillMoves, frames, setPlay, show, timeline } from './timeline.js';

export const GAME_ANIMALS = { ...ANIMALS }; // (the game's animals: the others are made here, see the end)

export const { toWorld, toLocal, sdShape, NAMED, reach, restPoints, GROUP_SWING } = rigParts;
export const KINDS = []; // (every animal with a file: the game's, and any made here, not in the game yet)
// the game's palette (assets/palette.js) as edited: a color by its name (outline: the one role painted with)
export const palette = JSON.parse(JSON.stringify(paletteFile));
let savedPalette = JSON.stringify(palette);
export const paints = () => ['outline', ...Object.keys(palette.colors)];
export const nice = (c) => (c ? c.replace(/[A-Z]/g, (m) => ` ${m.toLowerCase()}`) : 'none'); // (lightGrey: light grey)
export const paletteDirty = () => JSON.stringify(palette) !== savedPalette;
export const COLOR_KEYS = ['color', 'fur', 'tipColor', 'noseColor', 'socks'];
export const GEOMS = ['ellipse', 'capsule', 'box', 'triangle'];
export const swatch = (name) => PALETTES.day[NAMED[name]] || 'transparent';
export const files = {}, builds = {}, saved = {}, histories = {}; // (each animal's file as loaded, its build as edited; saved: as in its file, null: no file yet)
const fileOf = (k) => `assets/${k}.js`; // (an animal's build: its file, see asset.js)
// kind: the animal shown; base: the one it is made from, if it is a skin (the wolf: the fox), else itself. build: the
// base's build (its bones, shapes, moves, handling: what Setup, Animate and Play edit, for its skins too); skin: the
// skin's own (its colors swapped), or null
export let kind, base, build, skin = null, P, G = [1, [0, 0]], sel = { type: 'rig' }, drag = null;
// picked with it (⌘- or ⇧-clicked in the shapes' list or on the stage: shapes, markings, dots, groups): copied, deleted,
// moved, hidden, dragged with it; the inspector shows the one picked last (sel)
export let also = [];
export const picked = () => [sel, ...also];
export const baseOf = (k) => files[k].of || k;
export const skinsOf = (k) => KINDS.filter((o) => files[o].of === k);
export const inGame = (k) => k in GAME_ANIMALS;
export const view = { mode: 'setup', move: 'edit', frame: 0, play: false, t: 0 }; // (play: a move playing, in Animate)
export let lastMove = 'idle'; // (the move Animate shows)

export const editable = () => !!build.joints;
export const hist = () => (histories[view.mode === 'game' ? '' : kind] ||= { past: [], future: [] }); // (Game: one of its own)
export const snapshot = () => JSON.stringify(view.mode === 'game' ? palette : { build, skin });
export const dirty = (k) => JSON.stringify(builds[k]) !== saved[k];
const touched = () => [base, ...(skin ? [kind] : [])].filter(dirty); // (the files the one shown is made from, changed)

// made again from its build, as the game makes it (rigOf): drawn anew, and the frames its parts are placed in (standing:
// the pose the build's handles edit; a move's frame: the one its handles edit). One another is made from (the fox: the
// wolf's) makes that one again too
const assetOf = (k) => toAsset(k, k === base ? shown(builds[k]) : builds[k], files[k]); // (hidden: left out of the build, as its shapes are)
export const rigFor = (k) => rigOf(assetOf(k), files[k].of && assetOf(files[k].of));
// what is hidden (its row's eye: the editor's only, never saved) left out of what is drawn: a group, a shape (one on a
// bone: the bone not drawn), a marking, spikes, a dot. By what it is (dragged elsewhere, still hidden); an undo finds
// it again where it was (see restore)
export const isGroup = (G) => !!G && typeof G === 'object';
export function eachIn(o, f) { if (!o || typeof o !== 'object') return; f(o); for (const v of Object.values(o)) eachIn(v, f); } // (every object in o, o too)
export const hidden = new Set();
function shown(b) {
  if (!hidden.size) return b;
  const r = { ...b }, keep = (list) => list.filter((x) => !hidden.has(x));
  if (r.layers) r.layers = keep(r.layers).map((G) => (isGroup(G) ? { ...G, shapes: keep(G.shapes), ...(G.paint && { paint: keep(G.paint) }), ...(hidden.has(G.spikes) && { spikes: undefined }) } : G));
  if (r.dots) r.dots = keep(r.dots);
  return r;
}
// where a hidden thing is in the build, and what is there now
function pathOf(o) {
  if (build.dots?.includes(o)) return ['dots', build.dots.indexOf(o)];
  for (const [g, G] of (build.layers || []).entries()) {
    if (!isGroup(G)) continue;
    if (G === o) return [g];
    if (G.spikes === o) return [g, 'spikes'];
    for (const k of ['shapes', 'paint']) if (G[k]?.includes(o)) return [g, k, G[k].indexOf(o)];
  }
  return null;
}
const atPath = (q) => (q[0] === 'dots' ? build.dots?.[q[1]] : q.reduce((o, k) => o?.[k], build.layers));
export function hide(...os) { for (const o of os) if (!hidden.delete(o)) hidden.add(o); rebuild(); listParts(); draw(); }
export function rebuild() {
  setRig(base, rigFor(base));
  for (const k of skinsOf(base)) setRig(k, rigFor(k));
  place();
}
export function place() {
  if (view.move !== 'edit') view.frame = Math.min(view.frame, frames(view.move) - 1);
  P = view.move === 'edit' ? rigParts.posed(kind, 'hurt', 0) : rigParts.posed(kind, view.move, view.frame);
  G = rigParts.growth(kind, view.move === 'edit' ? 'hurt' : view.move); // (the bigger animals: drawn grown, their handles with them)
}
export function changed() { if (view.mode === 'game') { setPalette(palette); draw(); listParts(); status(); return; } rebuild(); draw(); status(); }
export function refresh() { listParts(); inspect(); timeline(); draw(); }
export function commit(fn) { remember(); fn(); changed(); timeline(); }
export function remember() { const h = hist(); h.past.push(snapshot()); if (h.past.length > 300) h.past.shift(); h.future = []; }
function restore(json) {
  const was = JSON.parse(json), into = (o, v) => { for (const k of Object.keys(o)) delete o[k]; Object.assign(o, v); };
  if (view.mode === 'game') { into(palette, was); setPalette(palette); refresh(); status(); return; }
  const keep = [...hidden].map(pathOf).filter(Boolean);
  into(build, was.build);
  if (skin && was.skin) into(skin, was.skin);
  hidden.clear(); also = [];
  for (const q of keep) { const o = atPath(q); if (o) hidden.add(o); }
  changed();
  if (!current()) sel = { type: view.move === 'edit' ? 'rig' : 'frame' }; // (the part picked: gone with what was undone)
  refresh();
}
export function undo() { const h = hist(); if (h.past.length) { h.future.push(snapshot()); restore(h.past.pop()); } }
export function redo() { const h = hist(); if (h.future.length) { h.past.push(snapshot()); restore(h.future.pop()); } }

export function choose(k) {
  if (baseOf(k) !== base) hidden.clear();
  kind = k; base = baseOf(k); build = builds[base]; skin = k === base ? null : builds[k]; also = []; sel = { type: view.move === 'edit' ? 'rig' : 'frame' };
  pv.body = {};
  const url = new URL(location.href); url.searchParams.set('animal', k); window.history.replaceState(null, '', url);
  fillMoves(); rebuild(); sandbox.reset(k); refresh(); status(); fileLabel();
}
// the mode: Setup (the build: what every move is made from), Animate (a move), Play (see play.js); Game (the game's own)
let before = 'setup'; // (the mode Game was opened from: back to it)
export function setMode(m) {
  if (m === 'game' && view.mode !== 'game') { before = view.mode || 'setup'; $('leaveGame').querySelector('span').textContent = `Back to the ${kind}`; }
  view.mode = m; document.body.className = m;
  for (const b of $('modes').children) b.classList.toggle('on', b.dataset.mode === m);
  $('gameMode').classList.toggle('on', m === 'game');
  setPlay(false);
  if (m === 'game') { view.move = 'edit'; setCast(castOf()); place(); refresh(); status(); return; }
  if (m === 'play') { view.move = 'edit'; sandbox.reset(kind); also = []; sel = { type: 'rig' }; place(); refresh(); status(); return; }
  show(m === 'setup' ? 'edit' : animated());
  status();
}
export const animated = () => (rigParts.move(kind, lastMove) ? lastMove : rigParts.moves(kind)[0]);
for (const b of $('modes').children) b.onclick = () => setMode(b.dataset.mode);

export function status() {
  if (view.mode === 'game') {
    const d = paletteDirty(), s = $('status');
    s.className = d ? 'dirty' : ''; s.textContent = d ? 'unsaved changes in assets/palette.js' : 'assets/palette.js';
    $('undo').disabled = !hist().past.length; $('redo').disabled = !hist().future.length; $('revert').disabled = $('save').disabled = !d;
    return;
  }
  const s = $('status'), mine = touched(), others = KINDS.filter((k) => k !== kind && k !== base && dirty(k)), files = [base, ...(skin ? [kind] : [])].map(fileOf).join(' + ');
  s.className = mine.length || others.length ? 'dirty' : '';
  if (paletteDirty()) others.push('the palette');
  s.textContent = (mine.length ? `unsaved changes in ${mine.map(fileOf).join(', ')}` : files) + (inGame(kind) ? '' : ' · not in the game yet') + (others.length ? ` · also unsaved: ${others.join(', ')}` : '');
  $('undo').disabled = !hist().past.length; $('redo').disabled = !hist().future.length;
  $('revert').disabled = !mine.length; $('save').disabled = !mine.length && !paletteDirty();
}

// saved into its files: the base's, the skin's (each only if changed; a new one: its file made); the palette, if changed
export async function save() {
  let said = [];
  const post = async (url, body) => {
    const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }).catch(() => null);
    if (!res?.ok) { $('status').className = 'dirty'; $('status').textContent = `not saved: ${res ? await res.text() : 'is the dev server running? (npm run dev)'}`; return false; }
    said.push(await res.text()); return true;
  };
  for (const k of view.mode === 'game' ? [] : touched()) {
    if (!await post('/save', { kind: k, build: builds[k], of: files[k].of })) return;
    saved[k] = JSON.stringify(builds[k]);
  }
  if (paletteDirty()) { if (!await post('/palette', palette)) return; savedPalette = JSON.stringify(palette); }
  status(); if (said.length) $('status').textContent = said.join(' · ');
}

// new ones (see browser.js): an animal (a copy of the one shown, skin and all), a skin of it (colors as they are)
const named = (what) => { // (a name for a new one: lower case letters, not taken)
  const n = prompt(`A name for the new ${what} (lower case letters)`)?.trim().toLowerCase();
  if (!n) return null;
  if (!/^[a-z]+$/.test(n) || files[n]) { alert(files[n] ? `There is a ${n} already.` : 'Only the letters a to z.'); return null; }
  return n;
};
function create(k, b, of) {
  files[k] = { format: 5, name: k, ...(of && { of }) }; builds[k] = b; saved[k] = null; KINDS.push(k);
  ANIMALS[k] = { ...ANIMALS[of || base], name: k.toUpperCase() };
  setRig(k, rigFor(k));
  choose(k); status();
}
export function newAnimal() {
  const n = named('animal');
  if (!n) return;
  const b = JSON.parse(JSON.stringify(build));
  if (skin?.recolor) b.recolor = { ...b.recolor, ...skin.recolor }; // (the skin shown: its colors its own)
  create(n, b);
}
export function newSkin() { const n = named('skin'); if (n) create(n, { recolor: {} }, base); }
$('undo').onclick = undo; $('redo').onclick = redo; $('save').onclick = save;
export const gameToggle = () => setMode(view.mode === 'game' ? before : 'game');
$('gameMode').onclick = gameToggle;
$('leaveGame').onclick = gameToggle;
$('revert').onclick = () => { remember(); if (view.mode === 'game') { restore(savedPalette); return; } restore(JSON.stringify({ build: saved[base] ? JSON.parse(saved[base]) : build, skin: skin && saved[kind] ? JSON.parse(saved[kind]) : skin })); };
export function setSel(v, keep = false) { if (!keep) also = []; return (sel = v); } // (keep: what is picked with it too)
export function setAlso(v) { return (also = v); }
export function setDrag(v) { return (drag = v); }
export function setLastMove(v) { return (lastMove = v); }
