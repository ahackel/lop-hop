// The editor (npm run dev, then /editor). It edits an animal's build, its file assets/<kind>.js (see asset.js): handles
// on the joints, the shapes, the legs' roots, the chains and the face, drawn over the animal's own pixels; a list of its parts and an inspector for the one picked; a preview in
// the game's scene. Its moves on a timeline: keyframes set by hand (handles on the joints, paws, head, tail and ears of
// a frame), a gait's settings, a loop to look at; the frames before and after faded (onion skin). After every change the
// animal is made again from its build (as the game makes it) and drawn by the game's own code; Save writes the build back into its
// file (POST /save, see serve.mjs and rig-format.js). Three modes: Setup (the build), Animate (its moves), Play (handled
// as on the home screen, see play.js: its handling's numbers, its chains' physics). And Game: the game's own, for every
// animal (its palette, assets/palette.js).
// Its parts, each a module beside it: state.js (what is edited, the toolbar), parts.js, stage.js, lists.js,
// inspector.js, timeline.js, face.js, handling.js, palette.js (Game), preview.js, keys.js; dom.js; lit/ (lit-html: the
// lists' templates). This one starts it: the animals loaded, the panels as they were left
import { ANIMALS, setRig } from '../art.js';
import { toBuild } from '../asset.js';
import { $ } from './dom.js';
import { tick } from './preview.js';
import { draw } from './stage.js';
import './keys.js'; // (the keyboard: its own)
import { GAME_ANIMALS, KINDS, baseOf, builds, choose, dirty, files, kind, paletteDirty, rigFor, saved, setMode } from './state.js';

// the panels, folded away or not (as they were left: kept in this browser); the inspector folds sideways
const FOLDED = 'lophop.editor.folded';
let folded = []; try { folded = JSON.parse(localStorage.getItem(FOLDED)) || []; } catch { /* (none kept) */ }
const sideways = () => document.querySelector('main').classList.toggle('rightFolded', $('inspectorCard').classList.contains('collapsed'));
for (const t of document.querySelectorAll('.card > .title')) {
  const card = t.parentElement;
  card.classList.toggle('collapsed', folded.includes(card.id));
  t.onclick = () => {
    card.classList.toggle('collapsed'); sideways();
    folded = [...document.querySelectorAll('.card.collapsed')].map((c) => c.id);
    try { localStorage.setItem(FOLDED, JSON.stringify(folded)); } catch { /* (not kept) */ }
  };
}
sideways();
// the side panels' widths: dragged by the gaps beside them (kept in this browser); a double-click: as they were
const WIDTHS = 'lophop.editor.widths', WIDE = { left: 290, right: 320 }, main = document.querySelector('main');
const widths = { ...WIDE }; try { Object.assign(widths, JSON.parse(localStorage.getItem(WIDTHS))); } catch { /* (none kept) */ }
const fit = (w) => Math.round(Math.max(200, Math.min(Math.max(200, innerWidth * 0.4), +w || 0)));
const setWidths = () => { for (const k in WIDE) main.style.setProperty(`--${k}`, `${(widths[k] = fit(widths[k]))}px`); };
const keepWidths = () => { try { localStorage.setItem(WIDTHS, JSON.stringify(widths)); } catch { /* (not kept) */ } };
for (const [id, side] of [['splitLeft', 'left'], ['splitRight', 'right']]) {
  const bar = $(id);
  bar.onpointerdown = (e) => {
    if (e.button) return;
    e.preventDefault(); bar.setPointerCapture(e.pointerId); bar.classList.add('on'); document.body.classList.add('resizing');
    const x0 = e.clientX, from = widths[side];
    bar.onpointermove = (m) => { widths[side] = from + (side === 'left' ? 1 : -1) * (m.clientX - x0); setWidths(); };
    bar.onpointerup = bar.onpointercancel = () => { bar.onpointermove = null; bar.classList.remove('on'); document.body.classList.remove('resizing'); keepWidths(); };
  };
  bar.ondblclick = () => { widths[side] = WIDE[side]; setWidths(); keepWidths(); };
}
setWidths();
window.addEventListener('beforeunload', (e) => { if (KINDS.some((k) => builds[k] && dirty(k)) || paletteDirty()) e.preventDefault(); });
new ResizeObserver(() => kind && draw()).observe($('stageBox')); // (the window, or the timeline under it, changing)

// every file in assets/ (as the dev server lists them; without it, the game's), the game's first; one not in the game
// yet is given what the game knows of the one it is made from
const listed = await fetch('/assets.json').then((r) => r.json()).catch(() => Object.keys(GAME_ANIMALS));
for (const k of [...Object.keys(GAME_ANIMALS), ...listed.filter((k) => !(k in GAME_ANIMALS)).sort()]) {
  files[k] = (await import(`../assets/${k}.js`)).default;
  builds[k] = JSON.parse(JSON.stringify(toBuild(files[k]))); // (its own copy: the game's stays as loaded till it is made again)
  saved[k] = JSON.stringify(builds[k]);
  KINDS.push(k);
}
for (const k of KINDS) if (!ANIMALS[k]) { ANIMALS[k] = { ...ANIMALS[baseOf(k)] || ANIMALS.cat, name: k.toUpperCase() }; setRig(k, rigFor(k)); }
const asked = new URLSearchParams(location.search).get('animal');
await choose(KINDS.includes(asked) ? asked : 'cat');
setMode(['setup', 'animate', 'play', 'game'].includes(new URLSearchParams(location.search).get('mode')) ? new URLSearchParams(location.search).get('mode') : 'setup');
requestAnimationFrame(tick);

