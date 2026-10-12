// Lop Hop: a rabbit (then a cat, a dog, a fox) runs, jumps cacti and ducks under branches and crows. A small game
// that drives the Stardrift engine the way a game would: one mood for each state of play, stingers for its events.
//
//   menu       the title                      go         a run starts
//   highscore  the high scores                jump       the animal jumps
//   relaxed    knocked out                    reward     food
//   exploring  the first stretch              bump       it runs into something
//   tension    once crows fly in (300)        smash      a super power smashes something
//   action     once the run is fast (700)     dusk, dawn night falls, and ends
//   wonder     as night falls                 chased     the next animal gives chase (each night)
//   danger     while the next animal chases   escape     … and is left behind at dawn
//              it (the fox: a wolf)           discovery  … the first time: it is unlocked
//   power      while a super power lasts      record     past the best score so far
//                                             alert      knocked out (fanfare: into the high scores)
//                                             power, powerdown   golden food gives one, and it wears off
import { StardriftPlayer, openSongZip } from './engine/src/index.js'; // (by path: Safari before 16.4 knows no import maps)
import { songFor } from './music.js';
import { W, H, GROUND, PALETTES, COLOR, FOOT, ANIMALS, TRUNK, animal, moveBody, stride, bird, crow,
  FOOD, face, FACE_W, cloud, moon, heart, reaching, moveReaching, star, golden, flushed, shadow, hits, snap, setScale, idleFrame, jumpFrame, leaps, hitbox, readying,
  JUMP, GRAVITY, hill, strides, rgb, luma, holdUp, swing, moveHung, hung, hangDepth, heldAt, petted, handling, made, setStyle } from './art.js';
import { GLYPHS, text, textWidth } from './font.js';
import { ICONS, PAD_ICONS } from './icons.js';
import { course, pace, topSpeed, drain, hardness, nightAt, random, seedOf, chaserOf, SCORE_PER_PX, CROWS_FROM, FAST_FROM, CHASE } from './level.js';
import { BUILT, APP_VERSION } from './version.js';
import { t } from './lang.js'; // (what it writes, in the player's language)

const view = document.getElementById('game'), vctx = view.getContext('2d');
let ctx = vctx; // (the screen, in art pixels scaled up, see fit; for a moment the second palette's canvas, see draw)

// ------------------------------------------------------------------------------------------------------------- tuning
// (what comes, how fast, how tiring: level.js)
const JUMP_CUT = 140; // a held jump rises to about 36 px (see JUMP in art.js), a tap to about 12
const BUFFER = 0.12; // seconds: a jump pressed this early (in the air, before it lands) jumps as it lands
let RUN_X = 30; // (where the animal runs: right of a notch, see fit)
// A run is a day and a night (see level.js: a day's run, a night's, where the chaser comes), getting dark over TWILIGHT
// seconds; the next animal chases the animal through the night. It runs at CRUISE_X; a bump brings it closer, and it
// falls back in RECOVER seconds; a second bump before it is back lets it catch the animal (at CATCH_X). Toward the
// night's end the sky pales and the sun comes up (level.js: PALE), and at dawn the run ends, home: nothing in the way for
// CLEAR before it, the world comes to a stop and the animal runs off to the right (back to the title), HOME worth that
// much more; the chaser, the first time, runs off after it (it is unlocked), else turns back. It all gets harder as the
// run goes on (level.js), and the chaser takes longer to fall back (DAY_RECOVER more seconds a day of hardness, up to
// the sixth).
const TWILIGHT = 10, CRUISE_X = -8, CATCH_X = 6, RECOVER = 5, DAY_RECOVER = 2, HOME = 100, CLEAR = W + 60;
const BUMP = 30, MEAL = 12, SAFE_SECS = 1.5; // energy (of 100): lost per bump; won per food; blinking after a bump
const FEAST = 4; // food eaten one after another (no bump, none missed) is worth 25 more each time, up to this many times 25
// golden food (the first after 250 points, then about every half minute) gives a super power for 8 seconds, each animal its
// own: what it does (its name: power.<kind> in lang/; smashes: what it runs into tumbles away; bounces: off it; passes: through it; clears:
// what is ahead is blown away; boost: runs that much faster; doubles: scores double; shakes off the chaser, saying so: power.<kind>.shaken).
// The rest, where it happens (the kind's own checks)
const POWER_SECS = 8; // (where golden food comes: level.js)
// so they are not missed, on the animal (the eye is on it, not on the bars): a power's last ENDING seconds (it
// flickers, faster and faster, its sparkles thinning, the seconds counted over its head, golden, outlined, big); energy under LOW (it sweats,
// the food glints), under VERY_LOW (it sweats more, and flushes red a moment every second)
const ENDING = 3, LOW = 30, VERY_LOW = 15;
// treats: food eaten with too little room for it in the energy (it would fill it past full) fills it and goes into the
// bag too, carried for the rest of the run (counted by the energy bar), banked at home (lop.treats: kind → how many), all lost in a knock-out; on the
// title the picked animal's treats are over it, to be dragged to its mouth (it reaches for one), and eaten (hearts)
const FLY_SECS = 0.5;
const MAX_TREATS = 5; // (an animal has at most this many: food then is only food)
const POWERS = {
  rabbit: {}, // jumps higher, and once more in the air
  guineapig: {}, // hops by itself (see autopilot), and for joy
  cat: { bounces: true }, // bumps cost nothing
  dog: { boost: 1.3, smashes: true },
  pig: {}, // what is ahead turns into truffles
  fox: { shakes: true }, // food comes to it
  hedgehog: { smashes: true }, // rolled up
  squirrel: {}, // falls slowly, and jumps again in the air
  otter: { smashes: true }, // slides under what hangs low
  skunk: { passes: true, shakes: true }, // obstacles fade, crows flee
  wolf: { clears: true },
  boar: { boost: 1.35, smashes: true }, // (worth double)
  bear: { doubles: true }, // and food fills it twice as much
  yak: { smashes: true, shakes: true }, // a herd runs by, trampling what is ahead
  ostrich: {}, // it keeps flying while the jump is held
  cheetah: { boost: 1.6, passes: true },
  dromedary: {}, // what flies or hangs is knocked away
  rhino: { clears: true }, // stomps: everything on the screen flies off
  gorilla: {}, // ducking drums: the next obstacle is knocked over
  elephant: { clears: true }, // sprays water from its trunk
  dino: { passes: true, doubles: true }, // twice as big: it tramples everything
};
const powered = () => (power > 0 ? POWERS[kind] : {}); // the super power on now (none: {})
const T = () => ANIMALS[kind]; // the animal's dials (see art.js)
// an animal's name, and with its article (THE RABBIT), in the player's language
const nameOf = (k) => t(`animal.${k}`), theOf = (k) => t(`animal.${k}.the`);
for (const p of document.querySelectorAll('#rotate p')) p.textContent = t('page.rotate'); // (the page's only words the player sees)
const ease = (u) => u * u * (3 - 2 * u); // (0…1 eased in and out)
const Q = new URLSearchParams(location.search); // (the address's switches: ?auto, ?fps, ?all, ?treats, ?scale, ?hz, ?log, ?reset, ?cheats, ?top)
// ?cheats: a row of buttons at the bottom of the screen, to get somewhere quickly (see CHEATS); its runs are not
// written down (they would not say how the game plays)
const CHEATING = Q.has('cheats');
// ?top=250: the world never faster than that (art pixels a second; from three quarters of it on, ever more slowly), for
// a visit, to try a top speed (see pace in level.js); its runs are not written down either
const TRY_TOP = +Q.get('top') || 0;
if (TRY_TOP) topSpeed(TRY_TOP);
// ?style=outlined: the sprites as they are, outlined in black, not in the look the game is drawn in (see setStyle in
// art.js)
if (Q.get('style')) setStyle(Q.get('style'));
const query = () => [...Q].map(([k, v]) => (v ? `${k}=${encodeURIComponent(v)}` : k)).join('&'); // (the switches as they were written: ?cheats, not ?cheats=)

// what this browser keeps (localStorage, lop.<name>; in a private window perhaps nothing): get, set (null: removed)
const kept = (k) => { try { return localStorage.getItem(`lop.${k}`); } catch { return null; } };
const keptJSON = (k) => { try { return JSON.parse(kept(k)); } catch { return null; } };
// ?reset: the game as the first time (nothing unlocked, no high scores, no treats, no name, the sound on), the runs
// written down for balancing kept (?reset=all: them too); then gone from the address, so a reload does not reset again
if (Q.has('reset')) {
  const runs = Q.get('reset') !== 'all' ? ['lop.runs', 'lop.runsSent', 'lop.runNow'] : [];
  try { for (const k of Object.keys(localStorage)) if (k.startsWith('lop.') && !runs.includes(k) && k !== 'lop.nocount') localStorage.removeItem(k); } catch { /* no storage */ }
  Q.delete('reset');
  history.replaceState(null, '', location.pathname + (query() ? `?${query()}` : '') + location.hash);
}
const CHEAT_TREATS = Q.has('treats'); // ?treats (=n): every animal n treats (as many as it can have), for this visit (nothing saved)
const treats = CHEAT_TREATS ? new Proxy({}, { get: (o, k) => (k in o ? o[k] : Math.min(MAX_TREATS, +Q.get('treats') || MAX_TREATS)) }) : keptJSON('treats') || {}; // (see FLY_SECS)
if (!CHEAT_TREATS) for (const k in treats) treats[k] = Math.min(MAX_TREATS, treats[k]); // (kept from before there was a most)
const keep = (k, v) => { if (CHEAT_TREATS && k === 'treats') return; try { if (v === null) localStorage.removeItem(`lop.${k}`); else localStorage.setItem(`lop.${k}`, v); } catch { /* no storage */ } };

// --------------------------------------------------------------------------------------------------------- the music
const music = new StardriftPlayer();
const song = fetch('song.zip').then((r) => r.arrayBuffer()); // the song and the recordings it plays (the editor's Export for a game)
let tunes = null, playing = null; // the song and its recordings, unzipped (each animal plays it its own way: music.js); whose plays
let audio = 'off'; // off | starting | on
let muted = kept('muted') === '1';
let mood = null;
const calls = []; // the last calls to the music, newest first, as game code would write them

function call(name, ...args) {
  note(name === 'sting' ? `sting ${args[0]}` : name);
  calls.unshift(`music.${name}(${args.map((a) => JSON.stringify(a).replace(/"/g, "'").replace(/'(\w+)':/g, '$1: ')).join(', ')})`);
  calls.length = Math.min(calls.length, 5);
  if (audio === 'on') music[name](...args);
  callsShown = false;
}

// the first key or tap starts the audio (browsers need a user gesture for it)
async function startAudio() {
  if (audio !== 'off' || state === 'run') return; // (not from a jump or a duck: a start that failed is tried again after the run)
  audio = 'starting';
  try {
    await music.init();
    const { song: base, read } = await openSongZip(await song);
    tunes = { base, read }; playing = kind;
    music.load(songFor(base, kind), { seed: Math.floor(Math.random() * 1e6), read });
    music.setVolume(muted ? 0 : 1, 0);
    await music.play();
    audio = 'on';
    music.setMood(mood || 'relaxed', { within: 0 });
    if (document.hidden) hide(); // (started out of sight: the app opened and left at once)
  } catch (err) {
    audio = 'off';
    status.textContent = `no music: ${err.message}`;
  }
}

// which mood the game is in: the music follows it
function wantedMood() {
  if (board) return board.credits || board.gate || board.shop ? 'menu' : 'highscore';
  if (state === 'title') return 'menu';
  if (state !== 'run') return 'relaxed';
  if (power) return 'power';
  if (chase) return 'danger';
  if (night) return 'wonder';
  return far() < CROWS_FROM ? 'exploring' : far() < FAST_FROM ? 'tension' : 'action';
}
function updateMood(options) {
  const m = wantedMood();
  if (m === mood) return;
  mood = m;
  if (options) call('setMood', m, options); else call('setMood', m);
  showMood();
}

// ----------------------------------------------------------------------------------------------------------- state
let state = 'title'; // title | run | ko | paused
let kind = 'rabbit'; // (the one picked last: see the high scores, which unlock the fox)
let speed, dist, bonus, alt, vAlt, ducking, phase, obstacles, food, parts, floats;
let track, ahead, chase, night, hunted, paling, dark, sunrise, homeAt, homeX, homeV, won, koT, streak, duckHeld, queued, jumpHeld, koWhy, blinkT, flash, hundreds, energy, safe, hurtT, slow, power, gold, airJumps, quake, shake = 0;
let bag, tossed; // the run's treats, and those flying into the bag (from where they were eaten)
let herd, herdT, spits, spitT, drumT; // the yak's stampede (the herd running by), the dromedary's spit (in flight), the gorilla's drumming
const CLOUDS = [{ x: 60, y: 14 }, { x: 170, y: 28 }, { x: 260, y: 10 }];
let clouds, sky, hillX, groundX; // the clouds, where the next comes from, how far the hills and the ground have gone (as they were, every run)
let fresh = null; // a knock-out's new entry in the high scores, to name
let rec = null; // the run being written down (see the runs)
let beat = 0; // the best score when the run started (0: passed, or none to pass)
const far = () => Math.floor(dist * SCORE_PER_PX); // how far the run went: when night, crows, the chase come
const score = () => Math.floor(dist * SCORE_PER_PX * T().mult + bonus); // what it scores: harder animals count more
const rnd = Math.random; // (for what only looks: sparks, dust; what comes is level.js's, the same every run)
const AUTO = Q.has('auto'); // ?auto: the animal runs by itself (to hear the moods)

function reset() {
  dist = 0; speed = pace(kind, 0); bonus = 0; alt = 0; vAlt = 0; phase = 0;
  ducking = duckHeld = jumpHeld = false; queued = 0; streak = 0;
  obstacles = []; food = []; parts = []; floats = [];
  track = course(kind); ahead = track.next(); chase = null; night = hunted = paling = won = false; dark = sunrise = 0; flash = 0; hundreds = 0;
  homeAt = nightAt(kind, 1).to / SCORE_PER_PX; homeX = homeV = 0; // (where it is home, px into the run; how far it has run off, how fast)
  energy = 100; safe = 0; hurtT = 0; slow = 0; koT = 0;
  power = 0; gold = null; airJumps = 0; quake = 0; bag = 0; tossed = [];
  herd = []; herdT = 0; spits = []; spitT = 0; drumT = 0;
  sky = random(seedOf(kind) ^ 0x5c1e5); hillX = groundX = 0; // (the clouds too: as they were)
  clouds = CLOUDS.map((c) => ({ ...c }));
}
reset();
blinkT = 0;

// starting from the title: the picked animal runs off to the right as the screen fades out (LAUNCH_SECS), then the
// run fades in (FADE_IN; run again: only that)
const LAUNCH_SECS = 0.45, FADE_IN = 0.35;
let launch = null, fadeIn = 0;
function launchRun() { if (!launch) launch = { t: 0, x: 0, v: 120, phase: 0 }; }
function start() {
  launch = null; fadeIn = FADE_IN;
  gained = null;
  rec = AUTO || CHEATING || TRY_TOP ? null : newRec();
  countRun();
  beat = best(); // the best so far: passing it plays a fanfare
  if (kind === newKind) { newKind = null; keep('new', null); } // (no longer new)
  reset();
  state = 'run';
  updateMood();
  call('sting', 'go');
  banner(t('run.day'), 24, 2, 0, 2);
}

function choose(k) {
  if (inRun() || launch || !ANIMALS[k] || !unlocked(k)) return;
  loose = null; // (a treat let go goes back)
  pick(k);
  if (state === 'ko') { gained = null; reset(); state = 'title'; }
}
const pick = (k) => { kind = k; chew = 0; keep('animal', k); songOf(k); }; // (kept for the next visit)
// the animal's own song (the same song, played its way: music.js), never abruptly: the one playing fades out over
// SONG_FADE seconds, then the new one starts from its beginning, in the mood the game is in. Picked again meanwhile:
// the last one picked (the one playing: it comes back)
const SONG_FADE = 1;
let wanted = null, switching = false;
function songOf(k) {
  wanted = k;
  if (!tunes || switching || playing === k) return;
  switching = true;
  if (!muted) music.setVolume(0, SONG_FADE * 0.7); // (a curve: all but silent by the end)
  setTimeout(() => {
    switching = false;
    if (wanted !== playing) {
      playing = wanted;
      music.load(songFor(tunes.base, playing), { read: tunes.read, restart: true });
      if (mood) music.setMood(mood, { within: 0 });
    }
    music.setVolume(muted ? 0 : 1, 0.05);
  }, muted ? 0 : SONG_FADE * 1000);
}
// bobbing (food, golden food, a screen's main button): a pixel up and back down, over and over (p: where in it, so food
// does not bob all at once)
const bob = (p = 0) => (Math.sin(blinkT * 5 + p) > 0 ? -1 : 0);
const inRun = () => state === 'run' || state === 'paused';
const KINDS = Object.keys(ANIMALS);
const renamed = (k) => (k === 'sabre' ? 'elephant' : k); // (kept in this browser under an animal's old name: the sabre-tooth became the elephant)
// the next animal one way or the other, from k, along the title's row
const nextKind = (k, d) => { const row = playable(); return row[(row.indexOf(k) + d + row.length) % row.length]; };
const chooseNext = (d) => choose(nextKind(kind, d));
// the order the player put the animals in, dragged about on the title (see grabbing; lop.order, in this browser)
let order = [];
{ const o = keptJSON('order'); if (Array.isArray(o)) order = o.map(renamed).filter((k, i, a) => ANIMALS[k] && a.indexOf(k) === i); }
// the ones on the title (the others stay a surprise), in that order; one not in it (unlocked since) after the one before
// it among the animals; the padlocked ones always last (see padlocked; nothing goes after them: see gapAt)
function playable() {
  const row = order.filter(unlocked);
  for (const k of KINDS) {
    if (!unlocked(k) || row.includes(k)) continue;
    const before = KINDS.slice(0, KINDS.indexOf(k)).reverse().find((b) => row.includes(b));
    row.splice(before ? row.indexOf(before) + 1 : 0, 0, k);
  }
  return [...row.filter((k) => !padlocked(k)), ...row.filter(padlocked)];
}

// The animals come one by one: a run starts with the rabbit, chased by the guinea pig at night; getting away from it
// till dawn unlocks it (lop.unlocked, in this browser; see chaserOf in level.js).
let open = ['rabbit'];
{ // (every one before the furthest unlocked: the newer animals came in between the others, and the special ones, once
  // brought by a full moon, are in the chase now)
  const u = (keptJSON('unlocked') || []).map(renamed).filter((k) => ANIMALS[k]);
  const far = Math.max(0, ...u.map((k) => KINDS.indexOf(k)));
  open = KINDS.filter((k, i) => i <= far);
}
const hunter = () => chaserOf(kind); // who chases the animal tonight
// the ones that have chased an animal (come into sight at night: lop.met): only such a one, not unlocked yet, stands
// behind the one it chases on the title, as a shadow (see coming); the others are a surprise
const met = (keptJSON('met') || []).map(renamed);
function meet(k) { if (!met.includes(k)) { met.push(k); keep('met', JSON.stringify(met)); } }
// the animal packs (in-app purchases, in the iOS app only; see the shop): the first FREE animals are free, the rest come
// in packs (PACKS: by the App Store's product id, the animals each has), still unlocked by playing, but padlocked till
// their pack is bought: on the title, a padlock over it (a tap on it opens its pack's shop, behind a parental gate); it
// can be picked (its song plays), not run with. Which packs are the player's (owned): as the App Store says at each
// start (see store), kept for a start without it (lop.packs). On the web every animal is free (?shop: as in the app)
const FREE = 3; // (the rabbit, the guinea pig, the cat)
const PACKS = { 'de.andreashackel.lophop.animals01': KINDS.slice(FREE, 21) }; // (a later pack: its animals after these)
const SHOP = !!window.Capacitor || Q.has('shop');
const owned = new Set((keptJSON('packs') || []).filter((id) => PACKS[id]));
function own(ids) { owned.clear(); for (const id of ids) if (PACKS[id]) owned.add(id); keep('packs', JSON.stringify([...owned])); }
const packOf = (k) => Object.keys(PACKS).find((id) => PACKS[id].includes(k));
const padlocked = (k) => SHOP && !ALL && !!packOf(k) && !owned.has(packOf(k));
const treatsOf = (k) => (padlocked(k) ? 0 : treats[k] || 0); // (a padlocked one: none shown, none to feed it)
const FPS = Q.has('fps'); // ?fps: frames a second, and the work of a frame (to check a device; ?hz=120: up to 120, see frame)
// ?log: each frame that came late or early, took other than a frame's steps (x2; ?hz=120: x1), or long, on the
// console (in the iOS app: Xcode's), with what happened just before it (see frame)
const LOG = Q.has('log'), notes = [];
const note = (what) => { if (LOG) notes.push(what); };
const ALL = Q.has('all'); // ?all: every animal open, for this visit (nothing saved)
function unlocked(k) { return ALL || open.includes(k); }
// the one unlocked last: in this run (gained: after the knock-out and the high scores, the title, to pick it there) and
// until played (newKind, twinkling on the title)
let gained = null, newKind = null;
const keptKind = (name) => { const k = renamed(kept(name)); return ANIMALS[k] && unlocked(k) ? k : null; };
newKind = keptKind('new');
kind = keptKind('animal') || kind;
function unlock(k) { // (said as the run ends: see hud)
  open.push(k);
  gained = newKind = k;
  if (rec) rec.unlocked.push(k);
  keep('unlocked', JSON.stringify(open)); keep('new', k);
  count(`unlocked/${k}`); // (unlocked/dog: the three free ones played through)
}
// words in the middle of the screen for a while, standing (rise: or rising; size 2: big, in the title's letters)
const banner = (text, y, life = 2, rise = 0, size = 1) => floats.push({ text, x: W / 2 - (textWidth(text) * size) / 2, y, life, rise, size });

// home: back to the title, from wherever (a run is given up)
function goHome() {
  if (inRun()) endRec('home'); // (given up)
  if (board) closeScores();
  if (state === 'title') return;
  if (state === 'paused' && audio === 'on') music.play();
  fresh = null;
  arriving = gained; // (it runs in, from the left)
  gained = null; // (the new one waits on the title, twinkling, to be picked)
  reset();
  state = 'title';
  fingers.clear();
  updateMood({ within: 0 });
}

// a bump costs energy and leaves the animal blinking (safe) for a moment; with none left it is knocked out
function bump(o) {
  if (powered().smashes) return smash(o);
  if (powered().bounces) { // nine lives: it bounces off, no harm done
    safe = 0.4; vAlt = Math.max(vAlt, 220);
    floats.push({ text: t('run.boing'), x: RUN_X, y: animalY() - 6, life: 0.6 });
    call('sting', 'jump');
    return;
  }
  if (!power) energy = Math.max(0, energy - BUMP * T().bump); // (a super power keeps the energy)
  if (rec) { if (o.piece) o.piece.hit = true; rec.bumps.push([+rec.secs.toFixed(1), far(), o.duck ? 'duck' : 'jump', chase && !chase.leaving ? 1 : 0, Math.round(energy)]); }
  streak = 0;
  safe = SAFE_SECS; hurtT = 0.35; slow = 1;
  if (chase && !chase.leaving) { if (chase.heat > 0.05) chase.catching = true; chase.heat = 1; } // the chaser closes in
  if (alt === 0) vAlt = 150; // knocked up a little
  const [hx, hy] = headAt();
  for (let i = 0; i < 7; i++) parts.push({ x: hx, y: hy, vx: (rnd() - 0.3) * 120, vy: -40 - rnd() * 80, life: 0.5, color: COLOR.YELLOW });
  if (energy <= 0) { speed = -70; return knockOut('bumped'); } // thrown back from what it ran into
  floats.push({ text: t('run.ouch'), x: hx - 8, y: hy - 6, life: 0.7 });
  call('sting', 'bump');
}

// zoomies: what the dog runs into tumbles away (and is worth 10)
function smash(o, quiet = false) {
  const worth = kind === 'boar' ? 20 : 10;
  o.smashed = true; o.vx = 90 + rnd() * 60; o.vy = -140 - rnd() * 60;
  bonus += worth;
  floats.push({ text: `+${worth}`, x: o.x, y: Math.max(8, o.y) - 4, life: 0.6 });
  for (let i = 0; i < 6; i++) parts.push({ x: o.x + o.sprite.w / 2, y: Math.max(o.y, GROUND - 12), vx: (rnd() - 0.2) * 120, vy: -40 - rnd() * 80, life: 0.4, color: kind === 'elephant' ? COLOR.BLUE : COLOR.YELLOW });
  if (!quiet) call('sting', 'smash');
}

// golden food: a super power, for a while
function startPower() {
  power = POWER_SECS; airJumps = 0;
  call('sting', 'power');
  updateMood({ within: 0 });
  banner(t(`power.${kind}`), 28, 1.6, 12);
  sparkle(16, 140);
  if (powered().shakes && chase?.seen && !chase.leaving) shaken();
}
// golden sparks around the animal
// a power shakes off the chaser (once it has been seen: see the chase), saying so
function shaken() {
  chase.leaving = true;
  floats.push({ text: t(`power.${kind}.shaken`), x: safeL + 4, y: GROUND - 32, life: 1.2 });
}
function sparkle(n, v = 40) {
  for (let i = 0; i < n; i++) {
    const a = rnd() * Math.PI * 2;
    parts.push({ x: RUN_X + 4 + rnd() * 16, y: animalY() + 4 + rnd() * 14, vx: Math.cos(a) * v * rnd(), vy: Math.sin(a) * v * rnd() - 20, life: 0.3 + rnd() * 0.3, color: rnd() < 0.5 ? COLOR.YELLOW : COLOR.WHITE });
  }
}

// dawn: home, the run is over, won. The animal runs off to the right (see update); the chaser, the first time (it joins:
// unlocked), runs up to the middle of the screen and stays there, else it turns back; into the high scores as from a knock-out
const newChase = () => ({ x: -40, heat: 0, catching: false, phase: 0, body: {} });
function arrive() {
  const c = hunter(), joins = !unlocked(c) && !AUTO;
  bonus += HOME;
  floats.push({ text: `+${HOME}`, x: RUN_X + 6, y: GROUND - 34, life: 1.2 });
  endRec('dawn');
  if (bag && !AUTO) { treats[kind] = Math.min(MAX_TREATS, (treats[kind] || 0) + bag); keep('treats', JSON.stringify(treats)); } // (banked)
  state = 'ko'; koT = 0; koWhy = t('end.home'); won = true; ducking = duckHeld = false; power = 0;
  if (joins) { unlock(c); chase ||= newChase(); Object.assign(chase, { leaving: false, catching: false, joining: true }); }
  else if (chase) chase.leaving = true;
  if (!AUTO) fresh = record(kind, score());
  if (fresh && TOUCH) stage.addEventListener('touchend', nameOnLift);
  call('sting', fresh ? 'fanfare' : joins ? 'discovery' : 'escape');
  updateMood({ within: 0 });
}
// the end of a run on show long enough to go on (home: once the animal has run off)
const settled = () => koT > (won ? 1.4 : 0.8);

function knockOut(why, said = t(`end.${why}`)) { // (why: tired, caught or bumped, for the run's record; said: what is written)
  endRec(why);
  state = 'ko'; koT = 0; koWhy = said; energy = 0; ducking = duckHeld = false; power = 0;
  if (chase && !chase.caught) chase.leaving = true; // (one that caught it stays)
  if (!AUTO) fresh = record(kind, score());
  if (fresh && TOUCH) stage.addEventListener('touchend', nameOnLift);
  call('sting', fresh ? 'fanfare' : 'alert'); // (into the high scores: a fanfare)
  updateMood({ within: 0 });
}

// ------------------------------------------------------------------------------------------------------------- input
function press() {
  startAudio();
  if (scoresOpen()) return;
  if (state === 'title') return padlocked(kind) ? undefined : launchRun();
  if (state === 'ko') { if (settled()) { if (fresh) { if (!TOUCH) nameIt(); } else if (gained) goHome(); else start(); } return; } // (a new high score is named first, on a phone as the tap ends: see touchend; one unlocked: to the title, to pick it)
  if (state === 'paused') return resume();
  jumpHeld = true;
  if (ducking) return; // (no jumping while ducking: let go first)
  if (alt === 0) jump();
  else if (power && kind === 'ostrich') vAlt = Math.max(vAlt, 120); // (flying again: a beat of its wings)
  else if ((superHop() && airJumps < 1) || (power && kind === 'squirrel')) { // once more in the air (gliding: again and again)
    airJumps++;
    vAlt = JUMP * (kind === 'squirrel' ? 0.6 : 1);
    sparkle(8, 60);
    call('sting', 'jump');
  } else queued = BUFFER; // too early: it jumps as it lands
}
// off the ground: not while ducking (or in a belly slide)
function jump() {
  if (ducking) return;
  note('jump');
  vAlt = JUMP * T().jump * (superHop() ? 1.25 : 1);
  call('sting', 'jump');
}
// ducking: held (a key, a finger; in the air: falling fast), or a belly slide
function duck(held = duckHeld) {
  if (held && !duckHeld && power > 0 && kind === 'gorilla') return drum(); // (its power: it drums instead)
  if (held !== duckHeld) note(held ? 'duck' : 'unduck');
  duckHeld = held;
  ducking = duckHeld || (power > 0 && kind === 'otter');
}
// chest drum: the gorilla stands up and beats its chest, and the next obstacle ahead is knocked over
function drum() {
  drumT = 0.35; shake = 0.2;
  const o = obstacles.filter((x) => !x.smashed && !x.over && x.x + x.sprite.w > RUN_X + 10).sort((a, b) => a.x - b.x)[0];
  floats.push({ text: t('run.boom'), x: RUN_X + 6, y: animalY() - 8, life: 0.5 });
  for (let i = 0; i < 10; i++) { const a = (i / 10) * Math.PI * 2; parts.push({ x: RUN_X + 14, y: animalY() + 8, vx: Math.cos(a) * 90, vy: Math.sin(a) * 90, life: 0.3, color: COLOR.DIM }); }
  if (o) smash(o); else call('sting', 'smash');
}
const superHop = () => power > 0 && kind === 'rabbit';
const flying = () => power > 0 && kind === 'ostrich' && jumpHeld && !ducking; // (the ostrich's power, while the jump is held)
const stinks = () => power > 0 && kind === 'skunk';
function release() {
  jumpHeld = false;
  if (vAlt > JUMP_CUT) vAlt = JUMP_CUT;
}

const JUMP_KEYS = ['Space', 'ArrowUp', 'KeyW'], DUCK_KEYS = ['ArrowDown', 'KeyS'];
addEventListener('keydown', (e) => {
  if (naming) return; // (the keys type the name: see openName)
  if (e.target.closest?.('button') && (e.code === 'Space' || e.code === 'Enter')) return; // the buttons take their own keys
  if (e.code === 'KeyM') return toggleMute();
  if (e.code === 'KeyF') return toggleFull();
  if (e.code === 'KeyH' && !inRun()) return ACTS.scores();
  if (e.code === 'KeyC' && !inRun()) return ACTS.credits();
  if (scoresOpen()) { // the high scores: Space or Enter runs (again), Esc goes back; the gate: the digits answer it
    if (e.code === 'Escape') leaveScores();
    else if (board.gate && /^(Digit|Numpad)\d$/.test(e.code)) gateDigit(+e.code.slice(-1));
    else if (board.gate || board.shop) return;
    else if (['Space', 'Enter'].includes(e.code)) { e.preventDefault(); closeScores(); press(); }
    return;
  }
  if (e.code === 'Escape') return goHome();
  if (e.code === 'KeyP' && inRun()) { e.preventDefault(); if (!e.repeat) { if (state === 'paused') resume(); else pause(); } return; } // (a run paused, and on again)
  if (JUMP_KEYS.includes(e.code)) { e.preventDefault(); if (!e.repeat) press(); }
  else if (DUCK_KEYS.includes(e.code)) { e.preventDefault(); startAudio(); if (!e.repeat) duck(true); }
  else if (e.code === 'ArrowLeft' || e.code === 'KeyA') { e.preventDefault(); chooseNext(1); } // (the row goes right to left)
  else if (e.code === 'ArrowRight' || e.code === 'KeyD') { e.preventDefault(); chooseNext(-1); }
});
addEventListener('keyup', (e) => {
  if (JUMP_KEYS.includes(e.code)) release();
  else if (DUCK_KEYS.includes(e.code)) duck(false);
});
// touch: a finger on the left half of the screen ducks while it is held, one on the right half jumps (not while ducking),
// anywhere but on the game's buttons (around the game too, where it does not fill the screen); a mouse click jumps. On
// the title, a tap on an animal picks it (a second tap runs).
const TOUCH = matchMedia('(pointer: coarse)').matches;
const fingers = new Map(); // pointer id → 'duck' | 'jump'
const stage = document.getElementById('stage');
// where a pointer is, in the game's pixels from the top left of the screen (outside it: below 0 or past W, VH)
let viewRect = view.getBoundingClientRect(); // (kept: see fit, and scrolling; reading it in a press could make the browser lay the page out)
addEventListener('scroll', () => { viewRect = view.getBoundingClientRect(); }, { passive: true });
const artAt = (e) => { const r = viewRect; return [viewL + ((e.clientX - r.left) / r.width) * (viewR - viewL), ((e.clientY - r.top) / r.height) * (view.height / SCALE)]; };
stage.addEventListener('pointerdown', (e) => {
  note('touch');
  const [x, y] = artAt(e);
  stage.setPointerCapture(e.pointerId);
  const btn = buttonAt(x, y) || padAt(e);
  if (btn) { pressedBtn = btn.id; return; }
  if (naming || scoresOpen()) { startAudio(); return; } // (only their buttons do something)
  if (state === 'title') { // a tap on an animal picks it, a second one (soon after, near it) makes it jump; pressed and moved it is grabbed (see grabbing; the start button runs)
    startAudio();
    const locked = lockAt(x, y - SKY);
    if (locked && !held && !launch) { openGate(packOf(locked)); return; } // (a padlock: its pack's shop, behind the gate)
    if (onTreat(x, y - SKY) && !held && !launch) { feed = { id: e.pointerId, x, y: y - SKY }; faceL = false; hand('grabbing'); return; } // (a treat taken)
    if (tapped && performance.now() - tapped.t < 350 && Math.abs(x - tapped.x) < 12 && Math.abs(y - tapped.y) < 12) { hop(tapped.k); tapped = null; return; }
    const k = y >= 0 && y < VH && !held && animalAt(x);
    if (k) grip = { k, id: e.pointerId, x, y };
    return;
  }
  if (e.pointerType === 'touch' && x < W / 2 && state === 'run') { startAudio(); duck(true); fingers.set(e.pointerId, 'duck'); }
  else { fingers.set(e.pointerId, 'jump'); press(); }
}, { passive: true });
stage.addEventListener('mousedown', (e) => e.preventDefault()); // (a mouse: nothing selected or focused as it presses)
stage.addEventListener('pointermove', (e) => {
  if (feed && e.pointerId === feed.id) { const [x, y] = artAt(e); feed.x = x; feed.y = y - SKY; return; } // (a treat carried)
  if (!grip || e.pointerId !== grip.id) return;
  const [x, y] = artAt(e);
  if (held) { held.px = x; held.py = y - SKY + held.below; return; } // (in the world: below the sky a tall screen adds)
  // pushed down: it ducks (while it is pushed; let go, or back up, it sits up again; petted no more this press)
  const down = !grip.pet && y >= grip.y + LIFT;
  if (down || grip.duck) { grip.duck = down; grip.moved = true; if (down || y > grip.y - LIFT) return; }
  // on the animal, moved sideways: it is petted (see pet); pulled up, or off it: picked up
  const bx = placeX(at[grip.k]), on = x >= bx - 2 && x < bx + 28 && y - SKY >= GROUND - 24 && y - SKY <= GROUND + 2;
  if (on && y > grip.y - (grip.pet ? 6 : LIFT)) { if (grip.pet || Math.abs(x - grip.x) >= LIFT) pet(grip, x); return; } // (petting, a hand may wander up a little)
  // (a finger: it hangs further below it, so as to be seen, and is lifted only once it would hang clear of the ground)
  const below = e.pointerType === 'touch' ? (FINGER * (viewR - viewL)) / viewRect.width : 0;
  grip.moved = true;
  if (padlocked(grip.k)) return; // (a padlocked one stays where it is)
  if (below && y - SKY + below > GROUND - hangDepth(grip.k) - 2) return;
  const [sx, sy] = heldAt(grip.k);
  delete jumps[grip.k]; // (caught in the air)
  held = { k: grip.k, px: x, py: y - SKY + below, below, x: placeX(at[grip.k]) + sx, y: GROUND - FOOT + sy, h: holdUp(grip.k) };
  hand('grabbing');
}, { passive: true });
const lift = (e) => {
  note('lift');
  if (feed && e.pointerId === feed.id) dropTreat();
  if (grip && e.pointerId === grip.id) { // let go: a grabbed animal drops; one only tapped is picked
    if (held) letGo();
    else if (e.type === 'pointerup' && !grip.pet && !grip.moved) { // a tap (not one pulled at, not yet lifted)
      tapped = { k: grip.k, x: grip.x, y: grip.y, t: performance.now() };
      if (grip.k !== kind) choose(grip.k);
    }
    grip = null;
    if (!held) hand('');
  }
  if (pressedBtn) {
    const btn = e.type === 'pointerup' && (buttonAt(...artAt(e)) || padAt(e));
    if (btn?.id === pressedBtn) { startAudio(); ACTS[btn.id](); }
    pressedBtn = null;
  } else if (naming && e.type === 'pointerup') nameField.focus(); // (the keyboard back, where it was put away)
  const what = fingers.get(e.pointerId);
  fingers.delete(e.pointerId);
  if (what === 'duck' && ![...fingers.values()].includes('duck')) duck(false);
  if (what === 'jump') release();
};
stage.addEventListener('pointerup', lift, { passive: true });
// after a knock-out with a new high score, a press (a key, a click; on a phone the tap, as it ends: a phone shows its
// keyboard only for a field focused then) asks for the name (see openName), then opens the high scores
function nameIt() {
  const entry = fresh;
  fresh = null;
  openName(entry);
}
// (listened to only while a name is due: a listener that may cancel a touch makes iOS wait for the page at each touch,
// and the frame after it comes late; the others are passive)
function nameOnLift(e) {
  if (state !== 'ko' || !fresh) return stage.removeEventListener('touchend', nameOnLift);
  if (!settled() || board) return;
  e.preventDefault();
  nameIt();
}
stage.addEventListener('pointercancel', lift, { passive: true });
// phones count a touch as a gesture (that may start audio) only when it ends: start (or resume) the audio there too
addEventListener('pointerup', () => { startAudio(); wake(); }, { passive: true });
// the audio again (not while paused) where the browser stopped it: suspended, or interrupted (iOS: by a call, Siri, a
// dialog of its own)
function wake() {
  if (music.ctx && music.ctx.state !== 'running' && state !== 'paused') music.ctx.resume().catch(() => {});
}

// a phone turned upright pauses the run (the page asks to turn it back)
const upright = matchMedia('(pointer: coarse) and (orientation: portrait)');
upright.addEventListener('change', () => { if (upright.matches) pause(); });

function pause() {
  if (state !== 'run') return;
  state = 'paused'; drawn = {}; sleepT = 0; // (asleep: see animalPose, sleepZs)
  fingers.clear(); duck(false); release();
  if (audio === 'on') music.pause(0.2);
}
function resume() {
  if (state !== 'paused') return;
  state = 'run'; drawn = {};
  if (audio === 'on') music.play();
}
// out of sight (another app, the home screen, the screen locked), the music stops on every screen, not only in a run: on
// an iPhone or iPad it plays as media (see the engine's playsMusic), which goes on in the background, and a second copy
// of the game (the home screen's and the App Store's) would play over it. Back in sight it comes back (a run: on a tap)
let away = false;
function hide() {
  if (rec) keep('runNow', JSON.stringify(recNow('left'))); // (the app may be closed while away: the run so far is kept)
  pause();
  if (audio === 'on' && state !== 'paused' && !away) { away = true; music.pause(); }
}
document.addEventListener('visibilitychange', () => {
  if (document.hidden) hide();
  else if (away) { away = false; if (audio === 'on') music.play().catch(() => {}); }
});

function toggleMute() {
  muted = !muted;
  keep('muted', muted ? '1' : '0');
  if (audio === 'on' && !switching) music.setVolume(muted ? 0 : 1, 0.1); // (while a song fades out: the next comes in so)
}

// full screen: only the game (Esc, F or its button leaves), sideways on a phone. Where the browser has none (iPhone), or
// its request fails or never answers (some embedded browsers), the game fills the window instead. Phones, tablets and
// the installed app show only the game anyway (the page's CSS).
const APP = matchMedia('(pointer: coarse), (display-mode: standalone), (display-mode: fullscreen)');
const isFull = () => !!document.fullscreenElement || stage.classList.contains('full');
// installed (or in the App Store app: window.Capacitor), the app is full screen already; on a phone without the API
// (iPhone) the game fills the screen anyway
const CAN_FULL = !window.Capacitor && !matchMedia('(display-mode: standalone), (display-mode: fullscreen)').matches && (document.fullscreenEnabled || !APP.matches);
function toggleFull() {
  if (isFull()) {
    stage.classList.remove('full');
    if (document.fullscreenElement) document.exitFullscreen();
    return;
  }
  if (!document.fullscreenEnabled) { if (!APP.matches) stage.classList.add('full'); return; }
  stage.requestFullscreen().then(() => screen.orientation?.lock?.('landscape')).catch(() => {});
  setTimeout(() => { if (!document.fullscreenElement && !APP.matches) stage.classList.add('full'); }, 500);
}
document.addEventListener('fullscreenchange', () => { if (document.fullscreenElement) stage.classList.remove('full'); });

// the game's buttons, in its own pixels from the top left of the screen: sound, the high scores, the credits, full
// screen, and after a knock-out, back to the animals; while running an arrow back (home) and pause (paused: on); on the high scores, the
// credits, the gate and the shop none (BACK in the middle: see buttons). A button acts when the press ends on it (a
// phone lets full screen start only then). Their icons: ICONS (icons.js).
const ACTS = {
  sound: toggleMute,
  scores: () => { if (board && !board.credits && !board.gate && !board.shop) leaveScores(); else { closeScores(); showScores(fresh); fresh = null; } },
  credits: () => { if (board?.credits) leaveScores(); else { closeScores(); board = { credits: true, runs: (keptJSON('runs') || []).length }; updateMood(); } },
  share: () => shareRuns(),
  full: toggleFull,
  home: goHome,
  pause: () => (state === 'paused' ? resume() : pause()),
  prev: () => chooseNext(1), // (the one to the left: the row goes right to left)
  next: () => chooseNext(-1),
  start: press,
  name: () => { if (fresh && !TOUCH) nameIt(); }, // (a phone: as the tap ends, see nameOnLift: its keyboard comes only then)
  buy: () => shopDo('buy'),
  restore: () => shopDo('restore'),
  back: () => leaveScores(),
  named: () => doneName(true),
  'cheat.win': () => { if (state === 'run') { floats = []; arrive(); } }, // (the day's words gone: dawn never comes with them)
  'cheat.power': () => { if (state === 'run') startPower(); },
  'cheat.energy': () => { if (state === 'run') energy = 100; },
  'cheat.unlock': () => { const k = KINDS.find((o) => !unlocked(o)); if (k && state === 'title') { unlock(k); gained = null; arriving = k; } },
  'cheat.buy': () => own(Object.keys(PACKS)),
  'cheat.food': () => { treats[kind] = MAX_TREATS; keep('treats', JSON.stringify(treats)); },
  'cheat.reset': () => { Q.set('reset', ''); location.search = query(); },
};
for (let d = 0; d < 10; d++) ACTS[`digit${d}`] = () => gateDigit(d); // (the parental gate's keys)
const BTN = 11; // a button: 11×11, an icon of 7×7 in a frame
let SKY = 0, VH = H; // the sky added above the world, where the screen is taller than it; the height of all (see fit)
let viewL = 0, viewR = W; // the world's x at the screen's left and right edges (see fit: a little less than all of it, or a little more)
let safeL = 0, safeR = 0, safeT = 0; // how much of the game a phone's notch (or its round corners), on the left and right, or a tablet's status bar, at the top, may cover (see fit)
function buttons() {
  if (naming) return [{ id: 'sound', x: safeL + 4, y: 2 }, { id: 'named', text: 'button.ok', x: W / 2 - 15, y: NAME_BOX.y + 25, w: 31, h: 13, main: true }]; // (see drawName)
  if (inRun()) return [{ id: 'home', icon: 'back', x: safeL + 4, y: 2 }, { id: 'pause', icon: state === 'paused' ? 'play' : 'pause', x: safeL + 4 + BTN + 2, y: 2 }, ...cheats()]; // (the way home, a pause; the bars: in the middle, see bar)
  // the row of buttons (not on the high scores, the credits, the gate and the shop); in the row of the pads, in the
  // middle (in the world, from the top of the screen), the screen's main button: on the title the one that runs, on the
  // high scores (the credits, the gate, the shop) the one back, after a run with a new high score the one to name it
  const ids = board ? [] : ['sound', 'scores', 'credits', ...(CAN_FULL ? ['full'] : []), ...(state !== 'title' ? ['home'] : [])];
  const row = ids.map((id, i) => ({ id, x: safeL + 4 + i * (BTN + 2), y: 2 }));
  const mid = board ? { id: 'back', text: 'button.back', main: !board.shop || owned.has(board.shop) }
    : state === 'title' ? (padlocked(kind) ? null : { id: 'start', text: 'button.start', main: true })
    : state === 'ko' && fresh && settled() ? { id: 'name', text: 'end.name_button', main: true } : null;
  if (board?.gate) for (let i = 0; i < 10; i++) { const d = (i + 1) % 10; row.push({ id: `digit${d}`, text: String(d), x: W / 2 - 64 + i * 13, y: SKY - safeT + 50, w: 11, h: 11 }); } // (1 to 9, then 0)
  if (board?.shop) {
    const price = store.prices[board.shop], buy = price ? t('shop.buy_price', { price }) : t('shop.buy'), restore = t('shop.restore');
    if (!owned.has(board.shop)) row.push({ id: 'buy', text: buy, x: Math.round(W / 2 - (textWidth(buy) + 12) / 2), y: SKY - safeT + 30, w: textWidth(buy) + 12, h: 13, main: true });
    row.push({ id: 'restore', text: restore, x: Math.round(W / 2 - (textWidth(restore) + 8) / 2), y: SKY - safeT + 46, w: textWidth(restore) + 8, h: 11 });
  }
  if (board?.credits && board.runs) row.push({ id: 'share', text: 'button.share', x: W / 2 + 2, y: SKY - safeT + 41, w: 31, h: 11 }); // (the runs: see drawCredits)
  const midW = mid && Math.max(31, textWidth(t(mid.text)) + 12);
  return [...row, ...(mid ? [{ ...mid, x: Math.round(W / 2 - midW / 2), y: SKY - safeT + padRow + 2, w: midW, h: 13 }] : []), ...cheats()];
}
// under the ground, from the top in the world: the row of the pads (and the start button), between the ground and the
// line of help at the bottom of the screen (see fit)
let padRow = GROUND + 4, helpY = GROUND + 24;
// ?cheats: the ones that do something now, in a row at the bottom of the screen, in the middle (the line of help over
// them: see fit); their words as they are (not the player's: see lang.js)
const CHEATS = [
  { id: 'cheat.win', text: 'WIN', when: () => state === 'run' }, // the run won: home at dawn, as if it got through the night
  { id: 'cheat.power', text: 'POWER', when: () => state === 'run' }, // the animal's super power, as from golden food
  { id: 'cheat.energy', text: 'ENERGY', when: () => state === 'run' }, // the energy full again
  { id: 'cheat.unlock', text: 'UNLOCK', when: () => state === 'title' && !ALL && KINDS.some((k) => !unlocked(k)) }, // the next animal, running in
  { id: 'cheat.buy', text: 'BUY', when: () => state === 'title' && SHOP && !ALL && owned.size < Object.keys(PACKS).length }, // every animal pack, as if bought
  { id: 'cheat.food', text: 'FOOD', when: () => state === 'title' && !padlocked(kind) && (treats[kind] || 0) < MAX_TREATS }, // all the treats the picked one can have
  { id: 'cheat.reset', text: 'RESET', when: () => true }, // the game as the first time (see ?reset), cheats still on
];
function cheats() {
  if (!CHEATING || naming || board) return [];
  const on = CHEATS.filter((c) => c.when()), w = (c) => textWidth(c.text) + 8, all = on.reduce((a, c) => a + w(c) + 2, -2);
  let x = W / 2 - all / 2;
  return on.map((c) => { const b = { id: c.id, text: c.text, x: Math.round(x), y: VH - safeT - BTN - 3, w: w(c), h: BTN, cheat: true }; x += b.w + 2; return b; });
}
// on the title, arrows in the bottom corners (pads, see showPad) pick the animal before or after (round the row),
// whenever there is more than one
const picking = () => state === 'title' && !board && carousel !== null && playable().length > 1;
const buttonAt = (x, y) => (y -= safeT, buttons().find((b) => x >= b.x - 1 && x < b.x + (b.w || BTN) + 1 && y >= b.y - 1 && y < b.y + (b.h || BTN) + 1));
let pressedBtn = null;
// a screen's main button (START, BACK, OK, BUY: main) bobs, as food does (see bob; drawn so, pressed where it rests)
function drawButtons(pal) {
  for (const b of buttons()) {
    const icon = b.icon || (b.id === 'sound' ? (muted ? 'soundOff' : 'soundOn') : b.id === 'full' ? (isFull() ? 'leave' : 'full') : b.id), y = b.y + (b.main ? bob() : 0);
    if (b.text) drawButton(b.x, y, null, b.id === pressedBtn, pal, b);
    else drawButton(b.x, y, icon, b.id === pressedBtn || (board && !board.gate && !board.shop && b.id === (board.credits ? 'credits' : 'scores')), pal);
  }
  if (TOUCH && !board && inRun()) {
    showPad(pads.left, 'duck', ducking);
    showPad(pads.right, 'jump', [...fingers.values()].includes('jump'));
  } else if (picking()) {
    showPad(pads.left, 'prev', pressedBtn === 'prev');
    showPad(pads.right, 'next', pressedBtn === 'next');
  } else { showPad(pads.left, null); showPad(pads.right, null); }
}
// round, half seen, in the bottom corners of the game (on a phone: of the screen, below the world, clear of a notch): on
// the title, the animal before and after; on a phone while running, where to tap (the whole half of the screen works),
// duck left, jump right. In the game's pixels and colors (--px, --game-ink, --game-bg)
const PAD = 17; // (its icons: PAD_ICONS, icons.js)
function padSvg(icon) {
  const r = PAD / 2, o = (PAD - icon.length) / 2;
  const inside = (x, y) => x >= 0 && y >= 0 && x < PAD && y < PAD && Math.hypot(x + 0.5 - r, y + 0.5 - r) <= r;
  const paths = { ring: '', fill: '', icon: '' };
  for (let y = 0; y < PAD; y++) for (let x = 0; x < PAD; x++) {
    if (!inside(x, y)) continue;
    const edge = !inside(x - 1, y) || !inside(x + 1, y) || !inside(x, y - 1) || !inside(x, y + 1);
    paths[edge ? 'ring' : icon[y - o]?.[x - o] === 'x' ? 'icon' : 'fill'] += `M${x} ${y}h1v1h-1z`;
  }
  // (twice: as it is, and pressed over it, shown by its opacity alone, so a press never has the pad painted again)
  const svg = (as) => `<svg class="${as}" viewBox="0 0 ${PAD} ${PAD}">${Object.entries(paths).map(([k, d]) => `<path class="${k}" d="${d}"/>`).join('')}</svg>`;
  return svg('up') + svg('down');
}
const PAD_SVGS = Object.fromEntries(Object.entries(PAD_ICONS).map(([k, icon]) => [k, padSvg(icon)]));
const pads = Object.fromEntries(['left', 'right'].map((side) => {
  const el = document.createElement('div');
  el.className = 'pad'; el.id = `${side}Pad`; el.hidden = true; el.setAttribute('aria-hidden', 'true');
  stage.append(el);
  return [side, el];
}));
// a pad showing an icon (null: none), pressed or not
function showPad(el, icon, pressed = false) {
  if (el.hidden !== !icon) el.hidden = !icon;
  if (icon && el.dataset.icon !== icon) { el.dataset.icon = icon; el.innerHTML = PAD_SVGS[icon]; }
  if (el.classList.contains('on') !== pressed) el.classList.toggle('on', pressed);
}
// the button a pad is, where a pointer is (on the title: the animal before or after)
function padAt(e) {
  if (!picking()) return null;
  for (const [side, id] of [['left', 'prev'], ['right', 'next']]) {
    const r = pads[side].getBoundingClientRect(), m = r.width * 0.25; // (a little round it counts too)
    if (e.clientX >= r.left - m && e.clientX < r.right + m && e.clientY >= r.top - m && e.clientY < r.bottom + m) return { id };
  }
  return null;
}
// a button: a frame with rounded corners, an icon in it (inverted while pressed); or, wider ({ w, h, text }), words;
// or (no icon) empty; a cheat's (?cheats): orange, its words white
function drawButton(x, y, icon, on, pal, { w = BTN, h = BTN, text: words, cheat = false } = {}) {
  if (cheat) {
    ctx.fillStyle = pal[on ? COLOR.RUST : COLOR.ORANGE];
    ctx.fillRect(x + 1, y, w - 2, h); ctx.fillRect(x, y + 1, w, h - 2);
    return text(ctx, words, x + w / 2, y + (h - 5) / 2, pal[COLOR.WHITE], 'center'); // (as they are: not the player's language)
  }
  const ink = pal[COLOR.INK];
  ctx.fillStyle = ink;
  ctx.fillRect(x + 1, y, w - 2, 1); ctx.fillRect(x + 1, y + h - 1, w - 2, 1);
  ctx.fillRect(x, y + 1, 1, h - 2); ctx.fillRect(x + w - 1, y + 1, 1, h - 2);
  ctx.fillStyle = on ? ink : pal.bg;
  ctx.fillRect(x + 1, y + 1, w - 2, h - 2);
  ctx.fillStyle = on ? pal.bg : ink;
  if (words) return text(ctx, t(words), x + w / 2, y + (h - 5) / 2, on ? pal.bg : ink, 'center');
  ctx.beginPath();
  ICONS[icon]?.forEach((r, dy) => { for (let dx = 0; dx < r.length; dx++) if (r[dx] === 'x') ctx.rect(x + 2 + dx, y + 2 + dy, 1, 1); });
  ctx.fill();
}

// ---------------------------------------------------------------------------------------------------------- the runs
// Every run is written down, to balance the game by (tools/balance.html reads them): kept in this browser (lop.runs, the
// last RUNS_KEPT), sent to the dev server when the game comes from it (see sendRuns), shared from the credits (see
// shareRuns). A run:
//   { id, at (when it started), build, app (in the iOS app), kind, end ('tired' | 'bumped' | 'caught' | 'home': given
//     up | 'left': the app closed while away), secs (running, not paused), points (how far), score, dawns, energy (left),
//     unlocked: [kinds], jump: [obstacles to jump, run into], duck: [to duck under, run into], food: [eaten, missed],
//     gold: [got, missed], days: [{ secs, jump, duck }], bumps: [[secs, points, 'jump' | 'duck', chased (1), energy]] }
// (an obstacle counts once it is behind the animal, a pack as one; not while a super power is on, nor one smashed)
const RUNS_KEPT = 2000;
const newRec = () => ({ id: `${Date.now().toString(36)}-${Math.floor(Math.random() * 1e8).toString(36)}`, at: new Date().toISOString(), build: BUILT, app: !!window.Capacitor, kind,
  secs: 0, unlocked: [], jump: [0, 0], duck: [0, 0], food: [0, 0], gold: [0, 0], days: [], bumps: [] });
function tally() {
  for (const o of obstacles) {
    if (!o.last || o.counted || o.over || o.x + o.sprite.w >= RUN_X) continue;
    o.counted = true;
    if (power || o.smashed) continue;
    const need = o.duck ? 'duck' : 'jump', d = rec.days[0];
    rec[need][0]++; d[need][0]++;
    if (o.piece.hit) { rec[need][1]++; d[need][1]++; }
  }
}
// the run as it is (ended so)
const recNow = (end) => ({ ...rec, end, secs: +rec.secs.toFixed(1), points: far(), score: score(), dawns: won ? 1 : 0, treats: bag, energy: Math.round(Math.max(0, energy)),
  days: rec.days.map((d) => ({ ...d, secs: +d.secs.toFixed(1) })) });
function endRec(end) {
  if (!rec) return;
  keepRun(recNow(end));
  rec = null;
  keep('runNow', null);
  sendRuns();
}
function keepRun(r) {
  const all = keptJSON('runs') || [];
  all.push(r);
  keep('runs', JSON.stringify(all.slice(-RUNS_KEPT)));
}
{ const left = keptJSON('runNow'); if (left) { keepRun(left); keep('runNow', null); } } // (a run the app was closed in)
// the game from the dev server (npm run dev, on this computer or another in the house): each run goes to it as well
// (POST runs: data/runs.jsonl, see tools/serve.mjs), those not sent yet (lop.runsSent: the last that was)
const DEV = !window.Capacitor && /^(localhost|127\.0\.0\.1|.+\.local|10(\.\d+){3}|192\.168(\.\d+){2}|172\.(1[6-9]|2\d|3[01])(\.\d+){2})$/.test(location.hostname);
function sendRuns() {
  if (!DEV) return;
  const all = keptJSON('runs') || [], out = all.slice(all.findIndex((r) => r.id === kept('runsSent')) + 1);
  if (!out.length) return;
  fetch('runs', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(out) })
    .then((r) => { if (r.ok) keep('runsSent', out[out.length - 1].id); }).catch(() => {});
}
sendRuns();

// ------------------------------------------------------------------------------------------------------- the counter
// How many play on the web, to know whether the game is worth more (the App Store): counted at GoatCounter
// (https://lophop.goatcounter.com), which keeps nothing in the browser and no address, only the sums. Only the game at
// andreashackel.de: not the iOS app, not the dev server, not with ?cheats, ?auto, ?all, ?treats, ?shop, not in a browser
// that said ?nocount (kept, lop.nocount: the developer's own; ?nocount=off counts it again). Sent: the visit (the page:
// where from, the screen) and as events: back (played here before), home-screen (opened from it), run (a run starts),
// first-run (the first in this browser), unlocked/<animal> (one joins at dawn)
const COUNTER = 'https://lophop.goatcounter.com/count';
if (Q.has('nocount')) keep('nocount', Q.get('nocount') === 'off' ? null : '1');
const COUNTING = /(^|\.)andreashackel\.de$/.test(location.hostname) && !window.Capacitor && !AUTO && !CHEATING && !TRY_TOP && !ALL && !CHEAT_TREATS && !Q.has('shop') && !kept('nocount');
function count(path, event = true) {
  if (!COUNTING) return;
  const q = { p: path, t: document.title, s: `${screen.width},${screen.height},${window.devicePixelRatio || 1}`, rnd: Math.random().toString(36).slice(2) };
  if (event) q.e = 'true';
  else q.r = document.referrer;
  new Image().src = `${COUNTER}?${new URLSearchParams(q)}`; // (offline: lost, and nothing waits for it)
}
let played = !!kept('runs'); // (a run played in this browser before; not parsed: there may be many)
function countRun() { count('run'); if (!played) { played = true; count('first-run'); } }
count(location.pathname, false);
if (played) count('back');
if (matchMedia('(display-mode: standalone)').matches || navigator.standalone) count('home-screen');
// all the runs, as a file: shared (a phone, the app: AirDrop, Mail, Files…), else saved (a computer), else copied
async function shareRuns() {
  const json = JSON.stringify({ game: 'lop-hop', shared: new Date().toISOString(), runs: keptJSON('runs') || [] });
  const name = `lop-hop-runs-${new Date().toISOString().slice(0, 10)}.json`;
  const say = (what) => { if (board) board.said = what; };
  try {
    const file = new File([json], name, { type: 'application/json' });
    if (navigator.canShare && navigator.canShare({ files: [file] })) { await navigator.share({ files: [file] }); return say(t('credits.shared')); }
  } catch (e) { if (e.name === 'AbortError') return; }
  if (!TOUCH) {
    const a = Object.assign(document.createElement('a'), { href: URL.createObjectURL(new Blob([json], { type: 'application/json' })), download: name });
    a.click();
    return say(t('credits.saved'));
  }
  try { await navigator.clipboard.writeText(json); say(t('credits.copied')); } catch { say(t('credits.no_share')); }
}

// ------------------------------------------------------------------------------------------------- the music panel
const status = document.getElementById('status'), moodsEl = document.getElementById('moods'), callsEl = document.getElementById('calls');
let section = '–';
music.on('state', (ev) => { if (ev.section) { section = ev.section; showMood(); } });
music.on('error', (ev) => { status.textContent = ev.text; });
function showMood() {
  for (const el of moodsEl.children) el.classList.toggle('on', el.dataset.mood === mood);
  status.textContent = audio === 'on' ? `section: ${section}` : 'press a key or tap the game to start the music';
}
let callsShown = true; // (the calls written out: once a frame at most, see draw)
function showCalls() { if (!callsShown) { callsShown = true; callsEl.textContent = calls.join('\n'); } }

// ------------------------------------------------------------------------------------------------------ high scores
// one table of ten, every animal in it, kept in this browser (localStorage lop.scores: [{ name, score, kind, date }]). A
// knock-out that makes the table goes in at once, under the last name given; then the name is asked (see nameIt).
const TOP = 10;
let scores = [], lastName = '';
try {
  const s = keptJSON('scores');
  if (Array.isArray(s)) scores = s.map((e) => ({ ...e, kind: renamed(e.kind) }));
  else if (s) scores = Object.entries(s).flatMap(([k, t]) => t.map((e) => ({ ...e, kind: k }))).sort((a, b) => b.score - a.score).slice(0, TOP); // one table per animal, before
} catch { /* a table spoilt: none */ }
lastName = kept('name') || '';
const best = () => scores[0]?.score || 0;
const saveScores = () => keep('scores', JSON.stringify(scores));

// → the new entry, if the score makes the table (below those it ties with)
function record(k, s) {
  if (s <= 0 || (scores.length >= TOP && s <= scores[TOP - 1].score)) return null;
  const entry = { name: lastName || '???', score: s, kind: k, date: new Date().toISOString().slice(0, 10) };
  const at = scores.findIndex((e) => s > e.score);
  scores.splice(at < 0 ? scores.length : at, 0, entry);
  scores.length = Math.min(scores.length, TOP);
  saveScores();
  return entry;
}

// The high scores screen is drawn in the game, like the rest: one column of rank, the animal's face, name, score; the
// new entry marked, the animal sitting beside it. Its name is asked before (see openName).
let board = null; // the screen on show: { entry: the new one (marked) }
const scoresOpen = () => !!board;
const NAME_LEN = 10, ROW = 9, SCORES_X = W / 2 - 67; // a row's height (the credits); the column's left edge (120 wide)
// a high score's row: 8 high, a blank line between the faces, the last clear of the grass and the first up in the sky
// a tall screen adds, under the buttons (the title in their row); without that sky, 7 (the faces touching)
const scoreRow = () => (SKY - safeT >= 16 ? 8 : 7);
const rowAt = (i) => [SCORES_X, 71 - (TOP - 1 - i) * scoreRow()];

function showScores(entry = null) {
  board = { entry };
  updateMood();
}
// back from the high scores (or the credits): to the title, if the run is over (not to its knock-out)
const leaveScores = () => (state === 'ko' ? goHome() : closeScores());
function closeScores() {
  board = null;
  updateMood();
}
const cleanName = (v) => v.toUpperCase().replace(/[^A-ZÄÖÜ0-9 .!-]/g, '').slice(0, NAME_LEN); // what the pixel font has
// The name of a new high score, typed into a box in the game's own pixels, in the top half of the screen (a phone's
// keyboard covers the bottom half). The keys go to a field no one sees (it brings up a phone's keyboard; the
// browser's own dialog would leave full screen). OK or Enter keeps it; Escape keeps the name it went in under (the
// last one given).
let naming = null; // { entry } while its name is typed
const NAME_BOX = { w: 120, h: 42, y: 16 }; // (from the top of the screen: under the buttons)
const nameField = Object.assign(document.createElement('input'), { id: 'name', type: 'text', maxLength: NAME_LEN, autocomplete: 'off', spellcheck: false, tabIndex: -1 });
for (const [k, v] of [['autocapitalize', 'characters'], ['autocorrect', 'off'], ['enterkeyhint', 'done'], ['aria-label', 'Your name']]) nameField.setAttribute(k, v);
stage.append(nameField);
nameField.addEventListener('input', () => { const v = cleanName(nameField.value); if (v !== nameField.value) nameField.value = v; });
nameField.addEventListener('keydown', (e) => {
  e.stopPropagation(); // (not the game's keys: see keydown)
  if (e.key === 'Enter') { e.preventDefault(); doneName(true); }
  else if (e.key === 'Escape') { e.preventDefault(); doneName(false); }
});
function openName(entry) {
  naming = { entry };
  nameField.value = entry.name === '???' ? '' : entry.name;
  nameField.focus();
  nameField.setSelectionRange(nameField.value.length, nameField.value.length);
}
function doneName(save) {
  if (!naming) return;
  const { entry } = naming;
  naming = null;
  if (save) {
    entry.name = cleanName(nameField.value).trim() || '???';
    lastName = entry.name === '???' ? '' : entry.name;
    keep('name', lastName);
    saveScores();
  }
  nameField.blur();
  showScores(entry);
}
// the box: what it is for, the name as it is typed (on a line as long as the longest name, a blinking block where the
// next letter goes), and its OK button (see buttons)
function drawName(pal) {
  const ink = pal[COLOR.INK], { w, h, y } = NAME_BOX, v = cleanName(nameField.value), long = textWidth('W'.repeat(NAME_LEN)), x = Math.round(W / 2 - long / 2), end = v ? textWidth(v) + 1 : 0;
  drawButton(W / 2 - w / 2, y, null, false, pal, { w, h }); // (a frame)
  text(ctx, t('scores.new'), W / 2, y + 5, pal[COLOR.ORANGE], 'center');
  text(ctx, v, x, y + 14, ink);
  ctx.fillStyle = pal[COLOR.DIM]; ctx.fillRect(x, y + 20, long, 1);
  if (v) { ctx.fillStyle = ink; ctx.fillRect(x, y + 20, end - 1, 1); } // (under what is typed: in ink)
  if (v.length < NAME_LEN && Math.floor(blinkT * 3) % 2 === 0) { ctx.fillStyle = ink; ctx.fillRect(x + end, y + 14, 3, 5); }
}

// the high scores (or the credits), the animal sitting under them (the way out: the BACK button; a key: Space runs,
// Escape goes back)
function drawBoard(pal) {
  if (board.gate) return drawGate(pal);
  if (board.shop) return drawShop(pal);
  (board.credits ? drawCredits : drawScores)(pal);
  if (gained && state === 'ko' && !board.credits) help(t('end.unlocked', { name: nameOf(gained) }), pal, pal[COLOR.ORANGE]); // (after a run: see hud)
  if (!sit) return;
  if (!sit.on) return animal(kind, 'idle', idleFrame(kind, blinkT), { blink: blinking() }).draw(ctx, Math.round(sit.x), GROUND - FOOT, pal);
  const st = stride(kind, sit.phase), x = Math.round(sit.x); // running there (the way it goes)
  if (sit.dir < 0) { ctx.save(); ctx.translate(2 * x + 26, 0); ctx.scale(-1, 1); }
  animal(kind, 'run', st.frame).draw(ctx, x, GROUND - FOOT - st.lift, pal);
  if (sit.dir < 0) ctx.restore();
}
// the animal on the high scores (beside them) and the credits (in the same place): it runs there from where it was (its place
// on the title; where the run ended), and back to its place on the title after (sit: { x, phase, dir, on: running })
let sit = null;
const sitTo = () => SCORES_X + 132;
function sitFrom() {
  if (state === 'ko') return won ? Math.min(RUN_X + homeX, viewR) : RUN_X; // (run off home: in from the right)
  return at[kind] !== undefined && carousel !== null ? placeX(at[kind]) : sitTo();
}
function updateSit(dt) {
  if (!board || board.gate || board.shop) { // closed: on the title, to its place in the row from here
    if (sit && !board && state === 'title' && carousel !== null) at[kind] = placeAt(sit.x);
    if (!board) sit = null;
    return;
  }
  sit ||= { x: sitFrom(), phase: 0, dir: 1, on: false };
  const d = sitTo() - sit.x, v = RUN * 34;
  sit.on = Math.abs(d) > 0.5;
  if (!sit.on) { sit.x = sitTo(); return; }
  sit.dir = Math.sign(d);
  sit.x += sit.dir * Math.min(Math.abs(d), v * dt);
  sit.phase = (sit.phase + dt * strides(kind, v)) % 1;
}
function drawScores(pal) {
  const ink = pal[COLOR.INK], dim = pal[COLOR.DIM];
  atTop(() => text(ctx, t('scores.title'), SCORES_X + 60, 2 + (BTN - 5) / 2, ink, 'center')); // (in the buttons' row, as BACK's words)
  for (let i = 0; i < TOP; i++) {
    const [x, y] = rowAt(i), e = scores[i], mark = e && e === board.entry;
    if (mark) { ctx.fillStyle = pal[COLOR.ORANGE]; ctx.fillRect(x - 2, y - 1, 124, 7); }
    const c = mark ? pal.bg : e ? ink : dim;
    text(ctx, `${i + 1}.`, x + 11, y, c, 'right');
    if (e) face(e.kind)?.draw(ctx, x + 13, y - 1, pal);
    text(ctx, e ? e.name : '-', x + 15 + FACE_W, y, c);
    if (e) text(ctx, e.score, x + 120, y, c, 'right');
  }
}

// the credits: who made what (what, dim, on the left; who on the right), on the high scores' screen (board.credits)
const CREDITS = [ // (ids in lang/, or names: written as they are)
  ['credits.game', 'ANDREAS HACKEL'],
];
function drawCredits(pal) {
  const ink = pal[COLOR.INK], dim = pal[COLOR.DIM];
  text(ctx, t('credits.title'), W / 2, 4, ink, 'center');
  CREDITS.forEach(([what, who], i) => { text(ctx, what && t(what), W / 2 - 4, 16 + i * ROW, dim, 'right'); text(ctx, t(who), W / 2 + 4, 16 + i * ROW, ink); });
  if (board.runs) text(ctx, t(board.runs > 1 ? 'credits.runs_kept' : 'credits.run_kept', { n: board.runs }), W / 2 - 3, 44, dim, 'right'); // (and SHARE: see buttons)
  if (board.said) help(board.said, pal, pal[COLOR.ORANGE]);
  text(ctx, t('credits.thanks'), W / 2, 16 + (CREDITS.length + 1) * ROW + 1, pal[COLOR.ORANGE], 'center');
  text(ctx, `VERSION ${APP_VERSION || BUILT}`, W / 2, 58, dim, 'center'); // (which build this is: the app's version, or when the web's was made)
}
// An animal pack's shop (the iOS app's, see SHOP), behind a parental gate: a sum for a grown-up, its numbers in words,
// answered on a row of keys (wrong: another sum). Then what the pack has (its animals running by), BUY (its price as
// the App Store gives it) and RESTORE PURCHASES; the App Store's own sheet takes the payment.
// store: the App Store, through the iOS app's Store plugin (app/ios/App/App/StorePlugin.swift); none on the web (?shop
// there: nothing to buy; ?cheats: bought at once). prices: each pack's, as the App Store writes it ("2,99 €"), once it
// said; check(): the packs the player owns, from the App Store (at the start, back in front, in the shop); buy(id) →
// 'bought', 'pending' (a grown-up to say yes: Ask to Buy), 'cancelled', 'failed', null (no store); restore() →
// 'restored', 'nothing', 'failed', null
const native = window.Capacitor?.nativePromise && ((method, options = {}) => window.Capacitor.nativePromise('Store', method, options));
const store = {
  prices: {},
  async check() {
    if (!native) return;
    try { own((await native('owned')).ids); } catch {} // (not reached: as kept)
    if (Object.keys(this.prices).length) return;
    try { for (const p of (await native('products', { ids: Object.keys(PACKS) })).products) this.prices[p.id] = priceText(p.price); } catch {}
  },
  async buy(id) {
    if (!native) { if (CHEATING) own([...owned, id]); return CHEATING ? 'bought' : null; }
    const { result } = await native('buy', { id }).catch(() => ({ result: 'failed' }));
    if (result === 'bought') own([...owned, id]);
    return result === 'unavailable' ? null : result;
  },
  async restore() {
    if (!native) return CHEATING ? 'nothing' : null;
    const got = await native('restore').catch(() => ({ ids: [...owned], failed: true }));
    own(got.ids);
    return got.failed ? 'failed' : owned.size ? 'restored' : 'nothing';
  },
};
// a price in the font: the App Store's spaces plain, and none at all if it has a letter the font lacks (BUY alone then)
function priceText(s) {
  s = String(s).replace(/[\u00a0\u202f\u2009]/g, ' ').toUpperCase();
  return [...s].every((ch) => GLYPHS[ch]) ? s : null;
}
store.check();
document.addEventListener('visibilitychange', () => { if (!document.hidden) store.check(); }); // (Ask to Buy said yes, meanwhile)
const NUMBERS = ['gate.four', 'gate.five', 'gate.six', 'gate.seven', 'gate.eight', 'gate.nine']; // (4 to 9: a sum 16 to 81, two digits)
const newSum = (wrong = false) => ({ a: 4 + Math.floor(rnd() * 6), b: 4 + Math.floor(rnd() * 6), typed: '', wrong });
// the animal whose padlock is at (x, y) on the title, in the world (a little round it counts too)
const lockAt = (x, y) => playable().find((k) => padlocked(k) && at[k] !== undefined && !runs[k]?.on && !jumps[k] && x >= placeX(at[k]) + 7 && x < placeX(at[k]) + 21 && y >= GROUND - 33 && y < GROUND - 18);
function openGate(pack) { closeScores(); board = { gate: newSum(), pack }; updateMood(); }
function gateDigit(d) {
  const g = board?.gate;
  if (!g) return;
  g.typed += d; g.wrong = false;
  if (g.typed.length < 2) return;
  if (+g.typed === g.a * g.b) { board = { shop: board.pack }; updateMood(); store.check(); }
  else board.gate = newSum(true);
}
const SAID = { bought: 'shop.thanks', pending: 'shop.pending', failed: 'shop.failed', restored: 'shop.restored', nothing: 'shop.nothing' };
async function shopDo(what) { // (what: 'buy' or 'restore')
  const b = board;
  if (!b?.shop || b.busy) return;
  b.busy = true; b.said = null;
  const got = await (what === 'buy' ? store.buy(b.shop) : store.restore());
  b.busy = false;
  b.said = got === null ? t('shop.unavailable') : SAID[got] ? t(SAID[got]) : null; // (cancelled: nothing said)
}
function drawGate(pal) {
  const g = board.gate, ink = pal[COLOR.INK];
  text(ctx, t('gate.title'), W / 2, 8, pal[COLOR.ORANGE], 'center');
  text(ctx, t('gate.question', { a: t(NUMBERS[g.a - 4]), b: t(NUMBERS[g.b - 4]) }), W / 2, 20, ink, 'center');
  for (let i = 0; i < 2; i++) { // the answer: two digits
    const x = W / 2 - 10 + i * 11;
    drawButton(x, 30, null, false, pal, { w: 9, h: 11 });
    if (g.typed[i]) text(ctx, g.typed[i], x + 3, 33, ink);
  }
  if (g.wrong) text(ctx, t('gate.again'), W / 2, 43, pal[COLOR.DIM], 'center');
}
function drawShop(pal) {
  const ink = pal[COLOR.INK], dim = pal[COLOR.DIM];
  text(ctx, t('shop.title'), W / 2, 4, ink, 'center');
  text(ctx, t('shop.more', { n: PACKS[board.shop].length }), W / 2, 13, dim, 'center');
  text(ctx, t('shop.once'), W / 2, 21, dim, 'center');
  if (owned.has(board.shop)) text(ctx, t('shop.owned'), W / 2, 34, pal[COLOR.ORANGE], 'center');
  if (board.said) help(board.said, pal, pal[COLOR.ORANGE]);
  for (const [k, x, st] of parade()) if (x >= viewL - 40 && x <= viewR) animal(k, 'run', st.frame, { body: paraders[k] }).draw(ctx, x, GROUND - FOOT - st.lift, pal);
}
// the shop's pack's animals running by, the first ahead, round and round: [kind, x, its stride] each; their ears,
// tails and trunks swung as they run (paraders: their bodies, see moveBody; one coming round again starts afresh there)
const PARADE_GAP = 40, PARADE_SPEED = 30;
const paraders = {};
function parade() {
  const paid = PACKS[board.shop], loop = paid.length * PARADE_GAP;
  return paid.map((k, i) => [k, Math.round((((blinkT * PARADE_SPEED - i * PARADE_GAP) % loop) + loop) % loop) - 40, stride(k, (blinkT * strides(k, PARADE_SPEED) + i * 0.37) % 1)]);
}
function updateParade(dt) {
  for (const [k, x, st] of parade()) moveBody(paraders[k] ||= {}, k, 'run', st.frame, x, GROUND - FOOT - st.lift, 0, dt);
}
const LOGO = { O: '75557', P: '75744' }; // (the title's letters: square)
// what to do, in a line of its own at the bottom of the screen (dim, or in a color)
const help = (s, pal, color = pal[COLOR.DIM]) => text(ctx, s, W / 2, helpY, color, 'center');

// ------------------------------------------------------------------------------------------------------------ world
// the course's next piece comes in at the right (where it is in the course: the same every run, see level.js): low
// obstacles to jump (cacti, rocks, logs, low crows), high ones to duck under (branches, crows at head height), crows to
// run under; food now and then, on the ground or up in the air (more for the sly fox); golden food over an obstacle
function place(p) {
  const x = W - (dist - p.at);
  const piece = { hit: false }; // (what is jumped or ducked at once: run into or not, see tally)
  p.items.forEach((it, i) => obstacles.push({ kind: it.kind, sprite: it.sprite, x: x + it.dx, y: it.y, fly: it.fly, duck: it.duck, over: it.over, piece, last: i === p.items.length - 1 }));
  for (const f of p.food) if (!f.sly || (power && kind === 'fox')) food.push({ x: x + f.dx, y: f.y });
  if (p.gold) gold = { x: x + p.gold.dx, y: p.gold.y };
}

// ?auto: jump what is low, duck what is at head height, run under the rest; jump for food in the air when it is clear.
// (popcorn: the guinea pig's super power, the same, through anything, and little hops for joy when nothing is near)
function autopilot(popcorn = false) {
  const next = obstacles.filter((o) => o.x + o.sprite.w > RUN_X + 2 && !o.over).sort((a, b) => a.x - b.x)[0];
  duck(false);
  const p = powered();
  if (!popcorn && (p.smashes || p.bounces || p.passes || p.clears)) return; // straight through (the otter slides by itself)
  const gap = next ? next.x - (RUN_X + 22) : Infinity;
  if (next?.duck) { duck(alt === 0 && gap < 30); return; }
  if (alt === 0 && gap < speed * 0.1 && gap > -8) return press();
  if (popcorn) { if (alt === 0 && gap > speed * 0.5 && rnd() < 0.05) { vAlt = 150; sparkle(4, 40); } return; }
  const snack = food.find((f) => f.y < GROUND - 20 && f.x > RUN_X);
  if (snack && alt === 0 && gap > 90 && snack.x - (RUN_X + 12) < speed * 0.12) press();
}

// blinking, now and then (t: the time; a little later for another animal)
const blinking = (t = blinkT) => t % 3.2 < 0.12;
// the animal's pose now → [pose, frame, blink]; paused, asleep where it is (its eyes shut)
function animalPose() { const p = poseNow(); return state === 'paused' ? [p[0], p[1], true] : p; }
function poseNow() {
  if (state === 'ko' && won) return alt > 0 ? ['jump', jumpFrame(kind, vAlt / (JUMP * T().jump)), false] : ['run', stride(kind, phase).frame, blinking()]; // (running off)
  if (state === 'ko') return [alt > 0 ? 'hurt' : 'ko', 0, false];
  if (state === 'title') return launch ? ['run', stride(kind, launch.phase).frame, false] : ['idle', idleFrame(kind, blinkT), blinking()];
  if (hurtT > 0) return ['hurt', 0, false];
  if (power && kind === 'hedgehog') return ['ball', Math.floor(phase * 8) % 4, false]; // spike ball
  if (drumT > 0 && alt === 0) return ['drum', Math.floor(drumT * 12) % 2, false]; // (the gorilla's chest drum)
  if (alt > 0 && flying()) return ['jump', Math.floor(blinkT * 10) % 2, blinking()]; // (the ostrich's wings beating: see its jump)
  if (alt > 0) return ['jump', jumpFrame(kind, vAlt / (JUMP * T().jump)), blinking()];
  if (ducking) return ['duck', stride(kind, phase, 'duck').frame, blinking()];
  return [power && kind === 'elephant' ? 'spray' : 'run', stride(kind, phase).frame, blinking()]; // (splash: the trunk up)
}
// asleep (paused): Zs float up from its head one after another, drifting, growing, fading at the top
let sleepT = 0;
const ZS = [['xxxx', '..x.', '.x..', 'xxxx'], ['xxxxx', '...x.', '..x..', '.x...', 'xxxxx']];
function sleepZs(pal) {
  const [hx, hy] = headAt();
  ctx.fillStyle = pal[COLOR.INK];
  for (let i = 0; i < 3; i++) {
    let p = sleepT * 0.45 - i / 3;
    if (p < 0) continue;
    p %= 1;
    const z = ZS[p < 0.45 ? 0 : 1], x = Math.round(hx + 3 + p * 9 + Math.sin(p * 6 + i) * 1.5), y = Math.round(hy - 2 - p * 16);
    ctx.globalAlpha = p > 0.8 ? (1 - p) / 0.2 : 1;
    z.forEach((row, r) => { for (let c = 0; c < row.length; c++) if (row[c] === 'x') ctx.fillRect(x + c, y + r, 1, 1); });
  }
  ctx.globalAlpha = 1;
}
// the animal as it is drawn now (scale: the giant dino's); the same until it moves on (see update), however often drawn
let drawn = {};
const animalSprite = (scale = 1) => {
  if (drawn.scale !== scale) { const [pose, f, blink] = animalPose(); drawn = { scale, sprite: animal(kind, pose, f, { blink, body, scale }) }; }
  return drawn.sprite;
};
// the animal's moving parts (its tail, its ears: see the rigs in art.js), swung by how it moves on the screen
const body = {};
// the giant dino's size (it grows and shrinks in a quarter second) and where it is drawn: its feet stay on the ground,
// it grows forward a little. → x, y, w, h, scale (1 for anyone else)
function giantBox() {
  const s = power && kind === 'dino' ? (POWER_SECS - power < 0.25 || power < 0.25 ? 1.5 : 2) : 1; // (as POWERS has it: twice as big)
  return [RUN_X - 4 * (s - 1), animalY() + FOOT * (1 - s), 26 * s, 20 * s, s];
}
const hopping = () => (state === 'run' || won) && alt === 0 && !ducking && hurtT <= 0;
const animalY = () => GROUND - FOOT - alt - (hopping() ? stride(kind, phase).lift : 0);
const headAt = () => { const sp = animalSprite(); return [RUN_X + sp.head[0], animalY() + sp.head[1]]; };

function update(dt) {
  drawn = {};
  blinkT += dt;
  updateRow(dt);
  updateSit(dt);
  if (board?.shop) updateParade(dt);
  if (launch) { // off to the run
    launch.t += dt; launch.v += 900 * dt; // (some 150 px: to the edge, about)
     launch.x += launch.v * dt; launch.phase = (launch.phase + dt * strides(kind, launch.v)) % 1;
    if (launch.t >= LAUNCH_SECS) start();
  }
  fadeIn = Math.max(0, fadeIn - dt);
  if (state === 'title' && chew > 0 && !runs[kind]?.on && at[kind] !== undefined) { const [tx, ty, a, look, nod] = chewPose(); moveReaching(body, kind, tx, ty, a, look, W / 2 - 13, GROUND - FOOT, dt, nod); } // (chewing: see standing)
  else if (state === 'title' && (treatAt() || begging) && !runs[kind]?.on && at[kind] !== undefined) moveReaching(body, kind, ...reachTo(placeX(at[kind]), treatAt() || begAt()), reach.amount, reach.look, W / 2 - 13, GROUND - FOOT - reach.alt, dt, reach.sniff); // (reaching for a treat: see standing)
  else { const [pose, f] = animalPose(); moveBody(body, kind, pose, f, state === 'title' ? W / 2 - 13 + (launch?.x || 0) : RUN_X, state === 'title' ? GROUND - FOOT : animalY(), state === 'run' ? speed : 0, dt); } // (on the title: where it settles, so sliding there does not fling its ears)
  if (state === 'ko') koT += dt;
  if (AUTO && state === 'ko' && koT > 3) start();
  if (state !== 'run' && state !== 'ko') return;

  if (state === 'run') {
    if (rec) { rec.secs += dt; (rec.days[0] ||= { secs: 0, jump: [0, 0], duck: [0, 0] }).secs += dt; }
    if (AUTO || (power && kind === 'guineapig')) autopilot(!AUTO);
    duck();
    queued = Math.max(0, queued - dt);
    slow = Math.max(0, slow - dt / 1.2);
    speed = pace(kind, dist) * (chase ? CHASE : 1) * (1 - 0.45 * slow) * (powered().boost || 1);
  } else if (won) { // home: the world comes to a stop, the animal runs off to the right; the day comes
    speed *= Math.exp(-4 * dt);
    homeV = Math.min(240, homeV + 400 * dt); homeX += homeV * dt;
    dark = Math.max(0, dark - dt / 4); sunrise = Math.min(2, sunrise + dt * 0.5);
  } else speed *= Math.exp(-5 * dt); // knocked out: the world rolls to a stop (back a little, after a bump)
  const dx = speed * dt;
  dist += state === 'run' ? dx : 0;
  if (powered().doubles && state === 'run') bonus += dx * SCORE_PER_PX * T().mult; // double points
  const was = phase;
  phase = (phase + dt * strides(kind, won ? Math.max(speed, homeV) : speed)) % 1;
  if (phase < was && hopping() && leaps(kind)) { // a leap lands: a puff of dust
    for (let i = 0; i < 2; i++) parts.push({ x: RUN_X + 6 + i * 4, y: GROUND - 1, vx: -20 - rnd() * 20, vy: -10 - rnd() * 15, life: 0.25, color: COLOR.FAINT });
  }
  flash = Math.max(0, flash - dt);
  shake = Math.max(0, shake - dt);
  safe = Math.max(0, safe - dt);
  hurtT = Math.max(0, hurtT - dt);
  drumT = Math.max(0, drumT - dt);

  // jumping: a held jump floats, a ducked one falls fast
  if (alt > 0 || vAlt > 0) {
    vAlt -= GRAVITY * T().gravity * (ducking ? 3 : 1) * dt;
    if (power && kind === 'squirrel') vAlt = Math.max(vAlt, -55); // gliding down
    if (flying()) vAlt = Math.max(vAlt, 0); // flying: it stays up while the jump is held (pressed again: up a little more)
    alt += vAlt * dt;
    if (alt > 56) { alt = 56; vAlt = Math.min(vAlt, 0); } // (a super hop stays on the screen)
    if (alt <= 0) {
      alt = 0; vAlt = 0; airJumps = 0;
      for (let i = 0; i < 3; i++) parts.push({ x: RUN_X + 8 + i * 3, y: GROUND - 1, vx: -30 - rnd() * 30, vy: -20 - rnd() * 20, life: 0.35, color: COLOR.INK });
      if (queued && state === 'run') { queued = 0; jump(); if (!jumpHeld) release(); } // (pressed just before: a tap or held on)
    }
  }

  // the world moves left
  while (state === 'run' && dist + Math.max(0, viewR - W) >= ahead.at && ahead.at < homeAt - CLEAR) { place(ahead); ahead = track.next(); } // (where the screen shows past the world: there already)
  for (const o of obstacles) {
    o.x -= dx + o.fly * dt;
    if (o.smashed) { o.x += o.vx * dt; o.y += o.vy * dt; o.vy += 600 * dt; } // bowled over: tumbling away
    if (o.kind === 'crow') o.sprite = crow(Math.floor(blinkT * 6) % 2);
  }
  for (const y of herd) { // the stampede: yaks running by, faster than the world, trampling what is ahead (all but what is high)
    y.x += 170 * dt; y.phase = (y.phase + dt * strides('yak', speed + 170)) % 1;
    for (const o of obstacles) if (!o.smashed && !o.over && o.x < y.x + 24 && o.x + o.sprite.w > y.x + 4) smash(o, true);
  }
  herd = herd.filter((y) => y.x < Math.max(W, viewR) + 10);
  for (const p of spits) { // spit, flying at what it was aimed at
    const o = p.to, tx = o.x + o.sprite.w / 2, ty = o.y + (o.kind === 'branch' ? o.sprite.h - 4 : o.sprite.h / 2), d = Math.hypot(tx - p.x, ty - p.y);
    if (o.smashed || d < 5) { if (!o.smashed) smash(o); p.done = true; continue; }
    p.x += ((tx - p.x) / d) * 320 * dt; p.y += ((ty - p.y) / d) * 320 * dt;
    if (rnd() < dt * 30) parts.push({ x: p.x, y: p.y, vx: -20, vy: 0, life: 0.2, color: COLOR.FAINT });
  }
  spits = spits.filter((p) => !p.done);
  if (rec && state === 'run') tally();
  const gone = Math.min(0, viewL); // (off the screen's left edge, past the world's on a wider screen)
  obstacles = obstacles.filter((o) => o.x > gone - o.sprite.w && o.y < H);
  for (const f of food) f.x -= dx;
  food = food.filter((f) => f.x > gone - 14);
  if (gold) { gold.x -= dx; if (gold.x < gone - 14) { gold = null; if (rec && state === 'run') rec.gold[1]++; } }
  for (const c of clouds) { c.x -= dx * 0.15; if (c.x < gone - 20) { c.x = Math.max(W, viewR) + sky() * 80; c.y = 8 + sky() * 30 - sky() * SKY * 0.7; } }
  hillX += dx * 0.08;
  groundX = (groundX + dx) % GROUND_LOOP;
  if (chase) { // the chaser runs up behind, closer with every bump (and back while a super power lasts)
    // it runs like the animal: its own stride, its tail and ears swung by it
    const c = hunter();
    chase.phase = (chase.phase + dt * strides(c, chase.joining ? chase.v || 0 : Math.max(speed, 60))) % 1;
    const st = stride(c, chase.phase), still = chase.caught || chase.there;
    moveBody(chase.body, c, still ? 'idle' : 'run', still ? idleFrame(c, blinkT) : st.frame, chase.x + 4, GROUND - FOOT - (still ? 0 : st.lift), speed, dt);
    if (chase.joining) { // (up to the middle, slowing as it comes, and it stays: the animal runs off without it)
      const to = W / 2 - 17; // (drawn 4 to the right: in the middle, as on the high scores)
      chase.v = chase.there ? 0 : Math.max(25, Math.min(120, (to - chase.x) * 2.5, (chase.v || 0) + 250 * dt)); // (setting off slower than the animal: not into it)
      chase.x = Math.min(to, chase.x + chase.v * dt);
      if (chase.x >= to - 0.5) chase.there = true;
      if (chase.there && !board && rnd() < dt * 5) twinkle(chase.x + 4); // (new: twinkling already, as on the title)
    }
    else if (chase.leaving) { chase.x -= (state === 'run' ? 60 : 30) * dt; if (chase.x < -40) chase = null; }
    else if (!chase.caught) {
      if (power) chase.catching = false;
      chase.heat = Math.max(0, chase.heat - dt / ((RECOVER + DAY_RECOVER * Math.min(6, hardness(kind, far())))));
      // (it comes into sight first, a power or not: the night's banner says it is after the animal; then a power holds
      // it back, or shakes it off)
      const to = safeL + (power && chase.seen ? CRUISE_X - 12 : chase.catching ? CATCH_X : CRUISE_X + ((CATCH_X - CRUISE_X) / 2) * chase.heat); // (right of a notch)
      chase.x += Math.max(-10 * dt, Math.min(40 * dt, to - chase.x));
      if (chase.x >= safeL + CRUISE_X - 0.5 && !chase.seen) { chase.seen = true; meet(hunter()); }
      if (state === 'run' && chase.catching && chase.x >= safeL + CATCH_X - 0.5) { // caught
        speed = 0; chase.caught = true;
        return knockOut('CAUGHT', t('end.caught', { the: theOf(hunter()) }));
      }
    }
  }
  if (state !== 'run') return;

  // tired: sweat drops off its head (blue), blown back
  if (energy < LOW && rnd() < dt * (energy < VERY_LOW ? 6 : 2.5)) { const [hx, hy] = headAt(); parts.push({ x: hx - 1, y: hy - 3, vx: -20 - rnd() * 30, vy: -50 - rnd() * 30, life: 0.45, color: COLOR.BLUE, h: 2 }); }
  // a super power wears off (a warning first: see ENDING)
  if (power) {
    power = Math.max(0, power - dt);
    if (rnd() < dt * 30 * Math.min(1, power / ENDING)) sparkle(1);
    if (kind === 'dino') { // giant: what its big body touches tumbles away
      const [x, y, w, h] = giantBox();
      for (const o of obstacles) if (!o.smashed && o.x < x + w && o.x + o.sprite.w > x && o.y < y + h && o.y + o.sprite.h > y) smash(o);
    }
    if (kind === 'pig') { // truffle snout: what is just ahead is dug up as truffles (its food), to eat on the way
      const meal = FOOD.truffle;
      for (const o of obstacles) if (!o.smashed && !o.dug && !o.over && o.x > RUN_X + 30 && o.x < RUN_X + 100) {
        o.dug = true;
        food.push({ x: o.x + Math.max(0, o.sprite.w / 2 - meal.w / 2), y: GROUND - meal.h - 1 });
        for (let i = 0; i < 8; i++) parts.push({ x: o.x + rnd() * o.sprite.w, y: GROUND - 2 - rnd() * 6, vx: (rnd() - 0.5) * 80, vy: -40 - rnd() * 70, life: 0.4, color: COLOR.DIM });
        floats.push({ text: t('run.sniff'), x: o.x - 4, y: GROUND - 26, life: 0.6 });
      }
      obstacles = obstacles.filter((o) => !o.dug);
    }
    if (kind === 'yak' && (herdT -= dt) <= 0) { // stampede: a herd of three now and then
      herdT = 1.6;
      for (let i = 0; i < 3; i++) herd.push({ x: -30 - i * 24 - rnd() * 8, phase: rnd() });
    }
    if (kind === 'dromedary' && (spitT -= dt) <= 0) { // spit: at what flies or hangs ahead
      const o = obstacles.find((x) => !x.smashed && !x.aimed && (x.kind === 'crow' || x.kind === 'branch') && x.x > RUN_X + 10 && x.x < W - 10);
      if (o) { o.aimed = true; spitT = 0.25; spits.push({ x: RUN_X + 24, y: animalY() + 4, to: o }); floats.push({ text: t('run.ptoo'), x: RUN_X + 18, y: animalY() - 6, life: 0.4 }); }
    }
    if (kind === 'wolf') for (const o of obstacles) if (!o.smashed && o.x > RUN_X + 12 && o.x < RUN_X + 80) smash(o, true); // howl
    if (kind === 'elephant') { // splash: water sprayed from the trunk, washing away what is just ahead
      if (rnd() < dt * 70) parts.push({ x: RUN_X + 29, y: animalY() + 6, vx: 110 + rnd() * 80, vy: -40 - rnd() * 40, life: 0.5, color: COLOR.BLUE }); // (from the trunk's tip)
      for (const o of obstacles) if (!o.smashed && o.x > RUN_X + 14 && o.x < RUN_X + 64) smash(o, true);
    }
    if (kind === 'rhino' && (quake -= dt) <= 0) { // quake: a stomp every so often, everything on the screen flies off
      quake = 1.4; shake = 0.3;
      for (const o of obstacles) if (!o.smashed && o.x < W) smash(o, true);
      call('sting', 'smash');
    }
    if (kind === 'skunk') { // stink: a green cloud behind it, crows flap off
      if (rnd() < dt * 40) parts.push({ x: RUN_X + 2, y: animalY() + 6 + rnd() * 8, vx: -30 - rnd() * 40, vy: -10 - rnd() * 20, life: 0.6, color: COLOR.GREEN });
      for (const o of obstacles) if (o.kind === 'crow') o.y -= 50 * dt;
    }
    if (powered().shakes && chase?.seen && !chase.leaving) shaken(); // (it comes, is seen, and turns away)
    if (!power) { duck(kind === 'guineapig' ? false : duckHeld); call('sting', 'powerdown'); updateMood({ within: 0 }); } // (a belly slide ends; popcorn lets go of its own ducking)
  }

  // what the animal runs into (the frame of its move as it is, not eased into: it ducks as quickly as ever), what it eats
  const [pose, f] = animalPose(), sp = hitbox(kind, pose, f), ay = animalY();
  if (!safe && !powered().passes) for (const o of obstacles) if (!o.smashed && hits(sp, RUN_X, ay, o.sprite, o.x, o.y)) { bump(o); if (state !== 'run') return; break; }
  const meal = FOOD[ANIMALS[kind].food];
  if (power && kind === 'fox') for (const f of food) { // sly: the food comes to the fox
    const tx = RUN_X + 10 - f.x, ty = ay + 8 - f.y, d = Math.hypot(tx, ty);
    if (d < 120 && d > 1) { f.x += (tx / d) * 160 * dt; f.y += (ty / d) * 160 * dt; }
  }
  const reaches = (f) => f.x + meal.w > RUN_X + 3 && f.x < RUN_X + 22 && f.y + meal.h > ay + 3 && f.y < ay + FOOT; // (its mouth: food comes to it)
  if (gold && reaches(gold)) { gold = null; startPower(); if (rec) rec.gold[0]++; }
  food = food.filter((f) => {
    if (!reaches(f)) {
      if (!f.missed && f.x + meal.w <= RUN_X + 3) { f.missed = true; streak = 0; if (rec) rec.food[1]++; } // (gone by: a feast ends)
      return true;
    }
    const gain = MEAL * (power && kind === 'bear' ? 2 : 1), treat = energy + gain > 100 && (treats[kind] || 0) + bag < MAX_TREATS; // (more than there is room for: a treat too, while it can have more)
    energy = Math.min(100, energy + gain);
    if (treat) { bag++; tossed.push({ x: f.x, y: f.y, t: 0 }); if (rec) rec.treats = bag; }
    if (rec) rec.food[0]++;
    streak++;
    const worth = 25 * Math.min(streak, FEAST);
    bonus += worth;
    call('sting', 'reward');
    floats.push({ text: streak > 1 ? `+${worth} X${streak}` : '+25', x: f.x, y: f.y - 6, life: 0.8 });
    if (!treat) floats.push({ sprite: heart, x: f.x + (streak > 1 ? 34 : 14), y: f.y - 6, life: 0.8 });
    for (let i = 0; i < 6; i++) parts.push({ x: f.x + 3, y: f.y + 3, vx: (rnd() - 0.5) * 90, vy: -rnd() * 80, life: 0.5, color: treat ? COLOR.WHITE : COLOR.GREEN }); // (never red, from an animal: it could look like blood; a treat: sparkling white)
    return false;
  });

  // running tires: without food the energy runs out
  if (!power) energy -= drain(kind, far()) * dt; // (a super power keeps the energy)
  if (energy <= 0) return knockOut('tired');

  // the night: it falls after the day's run, the next animal chases the animal through it, toward its end the sky
  // pales (halfway to day by dawn: the morning) and the sun comes up, and at dawn the animal is home
  const s = far(), n = nightAt(kind, 1); // (the same every run)
  if (!night && s >= n.from) { night = true; call('sting', 'dusk'); banner(t('run.night'), 24, 2, 0, 2); }
  paling = night && s >= n.pale;
  sunrise = paling ? Math.min(1, (s - n.pale) / (n.to - n.pale)) : 0;
  const lit = night ? 1 - 0.5 * sunrise : 0;
  dark += Math.max(-dt / TWILIGHT, Math.min(dt / TWILIGHT, lit - dark)); // (dusk takes a while)
  if (night && !hunted && s >= n.hunt) { // the chaser comes
    hunted = true;
    chase = newChase();
    call('sting', 'chased');
    banner(t('run.chased', { the: theOf(hunter()) }), 30);
  }
  if (dist >= homeAt) return arrive();
  if (beat && score() > beat && !AUTO) { // past the best score so far
    beat = 0;
    call('sting', 'record');
    banner(t('run.new_best'), 30);
  }
  if (Math.floor(score() / 100) > hundreds) { hundreds = Math.floor(score() / 100); flash = 1; } // the score blinks every 100
  updateMood();
}

function updateBits(dt) {
  for (const t of tossed) t.t += dt;
  if (tossed.length) tossed = tossed.filter((t) => t.t < FLY_SECS);
  for (const p of parts) { p.x += p.vx * dt; p.y += p.vy * dt; p.vy += (p.g ?? 300) * dt; p.life -= dt; } // (g: its own fall, or none)
  parts = parts.filter((p) => p.life > 0);
  for (const f of floats) { f.y -= (f.rise ?? 12) * dt; f.life -= dt; }
  floats = floats.filter((f) => f.life > 0);
}

// ------------------------------------------------------------------------------------------------------------- draw
const scenery = random(1); // (the stars, the ground's bits: the same every time too)
const stars = Array.from({ length: 100 }, () => ({ x: Math.floor(scenery() * (W + 40)) - 20, y: 50 - Math.floor(scenery() * 210), p: scenery() * 6 })); // (up into the sky a tall screen adds)
const GROUND_LOOP = 600;
const groundBits = Array.from({ length: 70 }, () => ({ x: Math.floor(scenery() * GROUND_LOOP), kind: scenery() < 0.15 ? 'tuft' : scenery() < 0.5 ? 'dash' : 'dot', y: 2 + Math.floor(scenery() * 4) }));
let stageBg = null, stageInk = null;
// the title's animals in a row, the one picked in the middle: the row slides to it (carousel: where it is now, in
// places); each animal slides to its own place too (at), as the order changes or a gap opens for a grabbed one. The row
// goes from right to left: the first on the right, each one unlocked after it to the left (it comes in from the left,
// running, and stops behind the others)
let carousel = null;
const at = {};
const placeX = (p) => Math.round(W / 2 - 13 - (p - carousel) * 34); // a place in the row → x on the screen
const placeAt = (x) => carousel - (x - (W / 2 - 13)) / 34; // … and back
const animalAt = (x) => playable().find((k) => k !== dropped?.k && at[k] !== undefined && x >= placeX(at[k]) - 2 && x < placeX(at[k]) + 26);

// grabbing an animal on the title (Dungeon Keeper's hand): pressed and moved a little, it is picked up by the middle of
// its back and hangs from the hand about level, tipping as it is carried about and squirming (see holdUp in art.js);
// the others run aside to open a gap where it would go; held near an edge, the row scrolls under it. Let go, it drops, rights itself, lands with
// a squash and a puff of dust in its new place, and is picked. (grip: pressed, not yet moved; held: picked up, x, y
// where the hand holds it, px, py the pointer, h how it hangs; dropped: falling, then landing)
let grip = null, held = null, dropped = null, arriving = null; // (arriving: one just unlocked, to run in)
// feeding: a treat dragged from over the picked animal (feed: the pointer, where the treat is, in the world's pixels);
// the animal reaches for it (see reaching in art.js: its head after it, rearing up for one held high). Let go at its
// mouth, eaten; elsewhere it falls (loose), the animal after it with its mouth: passing it, caught; on the ground, the
// animal walks to it (WALK px a second) and eats it there, then goes back to its place. Eaten: happy, hearts
let feed = null, loose = null; // (loose: { x, y, vy, down, eat }: falling, on the ground; being eaten)
const WALK = 40, TREAT_FALL = 420, CARRY_FROM = 8; // (CARRY_FROM: art pixels from its place)
const mealOf = () => FOOD[ANIMALS[kind].food];
const treatSpot = () => [placeX(playable().indexOf(kind)) + 13, GROUND - 25 - mealOf().h]; // (its middle, its top: over it, at its place: see updateRow; staying there as it goes after one)
const onTreat = (x, y) => { const [cx, cy] = treatSpot(), m = mealOf(); return treatsOf(kind) > 0 && !loose && Math.abs(x - cx) <= m.w / 2 + 6 && y >= cy - 4 && y <= cy + m.h + 3; };
// what the picked animal reaches for (its middle), if anything; its pose, at x; its mouth then
const treatAt = () => (feed ? [feed.x, feed.y] : loose ? [loose.x + mealOf().w / 2, loose.y + mealOf().h / 2] : null);
// (faceL: turned round, for one behind it, left of its middle, till it is well right of it again; drawn mirrored)
let faceL = false;
// (where it is, in its box: as it faces)
function reachTo(x, [tx, ty]) {
  if (tx < x + 10) faceL = true; else if (tx > x + 16) faceL = false;
  return [faceL ? x + 26 - tx : tx - x, ty - (GROUND - FOOT - reach.alt)]; // (hopping after it: from up there)
}
const reachFor = (x, at, eating = false) => reaching(kind, ...reachTo(x, at), eating, reach.amount, reach.look, body, eating ? 0 : reach.sniff); // (its ears, its tail: see update)
// how it goes after a treat held out: in tries, as an idle animation, not all the time. A try: it looks at it, stretches
// toward it, strains after it a moment (bobbing a little), sinks back; then it rests, still eyeing it, a second or two
// (some of each try's lengths a little different), and tries again. One let go: after it at once, all out. With none
// out, now and then (every 4 to 10 s) it tries once for its treats over it (begging: looking away again after). One held
// out of its reach, over its mouth: as it strains, now and then (HOP_TRIES of the tries) it hops up after it too, a
// little short of it, at most as high as its file says (fed.hop, see HANDLING in art.js; 0: never) (alt, v: how high it
// is, how fast it goes up; hopped: this try's chance had)
const reach = { t: 0, rest: 0.25, amount: 0, look: 0, strain: 0.7, sniff: 0, alt: 0, v: 0, hopped: false };
const HOP_TRIES = 0.6, HOP_OVER = 4; // (HOP_OVER: art pixels over its mouth before it hops)
function hopAfter() {
  const x = placeX(at[kind]), gap = mouthOf(reachFor(x, [feed.x, feed.y]), x)[1] - feed.y, most = handling(kind).fed.hop; // (how far over its mouth it is; the highest it hops)
  if (!(most > 0) || gap <= HOP_OVER || rnd() >= HOP_TRIES) return;
  reach.v = Math.sqrt(2 * GRAVITY * ANIMALS[kind].gravity * Math.min(most, gap * 0.7));
}
// the hop: up, and down again, landing with a puff of dust
function stepHop(dt) {
  if (!reach.v && !reach.alt) return;
  reach.v -= GRAVITY * ANIMALS[kind].gravity * dt; reach.alt += reach.v * dt;
  if (reach.alt > 0) return;
  reach.alt = reach.v = 0;
  if (at[kind] === undefined) return;
  const x = placeX(at[kind]);
  for (let i = 0; i < 4; i++) { const side = i % 2 ? 1 : -1; parts.push({ x: x + 13 + side * (4 + rnd() * 4), y: GROUND - 1, vx: side * (15 + rnd() * 20), vy: -8 - rnd() * 15, life: 0.25, color: COLOR.FAINT }); }
}
const SNIFFS = 2, SNIFF_SECS = 1 / 3; // (stretched out, it sniffs at it: two little nods, a third of a second each)
let begging = false, begWait = 3;
const begAt = () => { const [cx, cy] = treatSpot(); return [cx, cy + mealOf().h / 2]; };
const canBeg = () => state === 'title' && !board && !held && !dropped && !grip && !launch && !arriving && !pets[kind] && !jumps[kind] && !runs[kind]?.on && treatsOf(kind) > 0;
function updateReach(dt) {
  stepHop(dt);
  if (chew > 0 && (state !== 'title' || board)) chew = 0; // (off to a run, or the high scores: no more chewing)
  else if (chew > 0 && (chew -= dt) <= 0) { chew = 0; if (at[kind] !== undefined) eaten(); }
  if (chew > 0 && at[kind] !== undefined && rnd() < dt * 12) crumb(mouthOf(chewing(), placeX(at[kind]))); // (crumbs as it chews)
  reach.sniff = 0;
  if (!treatAt()) {
    if (begging && !canBeg()) begging = false; // (petted, picked up, off to a run: it stops)
    if (!begging) {
      reach.t = reach.amount = reach.look = 0; reach.rest = 0.25;
      if (canBeg() && (begWait -= dt) <= 0) { begging = true; reach.rest = 0; faceL = false; }
      return;
    }
  } else begging = false;
  if (loose) { reach.amount = Math.min(1, reach.amount + 6 * dt); reach.look = 1; return; }
  const LOOK = 0.3, UP = 0.45, DOWN = 0.45, t = (reach.t += dt), s = reach.strain, away = begging ? 1 : 0.4; // (away: how far it looks away between tries)
  if (t < reach.rest) { reach.amount = 0; reach.look += (0.6 - reach.look) * Math.min(1, 6 * dt); return; } // resting, eyeing it
  const u = t - reach.rest;
  if (u < LOOK) { reach.hopped = false; reach.look = 1 - away + away * ease(u / LOOK); reach.amount = 0.15 * ease(u / LOOK); } // it looks (from eyeing it, or from looking ahead)
  else if (u < LOOK + UP) { reach.look = 1; reach.amount = 0.15 + 0.85 * ease((u - LOOK) / UP); } // it stretches
  else if (u < LOOK + UP + s) { // it strains, sniffing at it first
    const v = u - LOOK - UP;
    if (!reach.hopped && v > 0.1) { reach.hopped = true; if (feed && !begging) hopAfter(); } // (now and then, a hop after it)
    reach.amount = 0.9 + 0.1 * Math.cos((v / s) * Math.PI * 4);
    if (v < SNIFFS * SNIFF_SECS) reach.sniff = Math.round(((1 - Math.cos((v / SNIFF_SECS) * Math.PI * 2)) / 2) * 4) / 4;
  }
  else if (u < LOOK + UP + s + DOWN) { reach.amount = 1 - ease((u - LOOK - UP - s) / DOWN); reach.look = 1 - away * ease((u - LOOK - UP - s) / DOWN); } // it sinks back
  else if (begging) { begging = false; begWait = 4 + rnd() * 6; reach.t = reach.amount = reach.look = 0; } // (begged once: back to sitting about)
  else { reach.t = 0; reach.rest = 1 + rnd() * 1.2; reach.strain = 0.7 + rnd() * 0.5; reach.look = 0.6; } // (strain: long enough for its sniffs)
}
const mouthOf = (sp, x) => { const [mx, my] = sp.mouth || [sp.head[0] + 4, sp.head[1] + 8]; return [faceL ? x + 26 - mx : x + mx, GROUND - FOOT - reach.alt + my]; }; // (an elephant's: its trunk's tip)
function drawFacing(sp, x, y, pal) {
  if (!faceL) return sp.draw(ctx, x, y, pal);
  ctx.save(); ctx.translate(2 * x + 26, 0); ctx.scale(-1, 1); sp.draw(ctx, x, y, pal); ctx.restore();
}
// a treat eaten: chewing it (for as long as its file says, its head nodding up and down as many times, its eyes shut
// happily: see handling in art.js), then happy
let chew = 0, chewFor = 1; // (seconds of chewing left, of how many)
function eatTreat([mx, my]) {
  treats[kind]--; keep('treats', JSON.stringify(treats));
  pets[kind] = { joy: 1, t: 0, strokes: 0 };
  chew = chewFor = handling(kind).fed.chewFor;
  for (let i = 0; i < 5; i++) crumb([mx, my]);
}
// eaten up (chewed): happy, hearts float up from its head, a chime
function eaten() {
  const x = placeX(at[kind]), [mx, my] = mouthOf(animal(kind, 'idle', 0), x);
  for (let i = 0; i < 3; i++) floats.push({ sprite: heart, x: mx - 8 + i * 5, y: my - 10 - i * 3, life: 0.9 + i * 0.15, rise: 16 });
  call('sting', 'reward');
}
// an animal (in its box at x) just unlocked, not played yet: twinkling, little yellow crosses floating up off it
function twinkle(x) {
  parts.push({ x: x + 3 + rnd() * 20, y: GROUND - 3 - rnd() * 20, vx: (rnd() - 0.5) * 6, vy: -6 - rnd() * 8, g: 0, life: 0.4 + rnd() * 0.4, color: COLOR.YELLOW, star: true });
}
// a crumb of the treat flying off its mouth, in one of the treat's colors (mostly forward, now and then back)
function crumb([mx, my]) {
  const colors = [...new Set(mealOf().px)].filter(Boolean), dir = (faceL ? -1 : 1) * (rnd() < 0.75 ? 1 : -0.6);
  parts.push({ x: mx, y: my, vx: dir * (10 + rnd() * 40), vy: -25 - rnd() * 45, life: 0.35 + rnd() * 0.3, color: colors[Math.floor(rnd() * colors.length)] });
}
// chewing: as it reaches a little toward a point low in front of it (in its box), its head nodding (see sniff in reachPosed)
function chewPose() {
  const u = 1 - chew / chewFor, { chews, nod } = handling(kind).fed;
  return [30, FOOT - 6, 0.35, 1, nod * Math.sin(u * chews * Math.PI * 2)];
}
function chewing() {
  const [tx, ty, amount, look, nod] = chewPose();
  return reaching(kind, tx, ty, true, amount, look, body, nod);
}
function dropTreat() {
  const x = placeX(at[kind]), mouth = mouthOf(reachFor(x, [feed.x, feed.y]), x);
  if (Math.hypot(feed.x - mouth[0], feed.y - mouth[1]) < 8) eatTreat(mouth); // (at its mouth)
  else loose = { x: feed.x - mealOf().w / 2, y: feed.y - mealOf().h / 2, vy: 0, down: false, eat: 0 };
  feed = null; hand('');
}
// a treat let go: falling (caught as it passes the mouth), on the ground (walked to, eaten)
function updateLoose(dt) {
  const meal = mealOf(), x = placeX(at[kind]), r = runs[kind] || (runs[kind] = { phase: 0, dir: 1, on: false });
  if (!loose.down) {
    loose.vy += TREAT_FALL * dt; loose.y += loose.vy * dt;
    const mouth = mouthOf(reachFor(x, treatAt()), x);
    if (Math.hypot(loose.x + meal.w / 2 - mouth[0], loose.y + meal.h / 2 - mouth[1]) < 7) { eatTreat(mouth); loose = null; return; } // caught
    if (loose.y >= GROUND + 1 - meal.h) { loose.y = GROUND + 1 - meal.h; loose.down = true; }
    return;
  }
  if (loose.carried) { // in its mouth, back to its place (see standing), and eaten there
    const home = playable().indexOf(kind), dp = home - at[kind];
    if (Math.abs(dp) > 0.001) {
      r.on = true; r.dir = -Math.sign(dp); // (further in the row: to the left)
      at[kind] += Math.sign(dp) * Math.min(Math.abs(dp), (WALK * dt) / 34);
      r.phase = (r.phase + dt * strides(kind, WALK)) % 1;
      return;
    }
    r.on = false; faceL = false;
    eatTreat(mouthOf(animal(kind, 'idle', 0), x)); loose = null;
    return;
  }
  // to it: its mouth over it, bent down (as it would be, reaching for it in front of it), from the side it lay on
  const bent = reaching(kind, 30, FOOT - 2), mouth = bent.mouth ? bent.mouth[0] : bent.head[0] + 4, cx = loose.x + meal.w / 2;
  loose.side ??= cx < x + 13 ? -1 : 1;
  const want = loose.side < 0 ? cx - (26 - mouth) : cx - mouth, d = want - x;
  loose.far ??= Math.abs(d) > CARRY_FROM; // (far from its place: picked up and carried back)
  if (Math.abs(d) > 1 && !loose.eat) {
    r.on = true; r.dir = Math.sign(d);
    at[kind] -= (Math.sign(d) * Math.min(Math.abs(d), WALK * dt)) / 34; // (a place further: to the left)
    r.phase = (r.phase + dt * strides(kind, WALK)) % 1;
    return;
  }
  r.on = false;
  if ((loose.eat += dt) > (loose.far ? 0.3 : 0.6)) { // (far: picked up, a moment bent down to it; else eaten there)
    if (loose.far) loose.carried = true;
    else { eatTreat(mouthOf(reachFor(x, treatAt()), x)); loose = null; }
  }
}
const heldBody = {}; // (its ears and tail)
const LIFT = 3; // (moved this far, in art pixels: a grab, not a tap)
// the mouse's cursor: an open hand petting, a closed one holding an animal, '' the usual (on the stage too: it has the
// pointer while it is pressed, see pointerdown)
const hand = (c) => { stage.style.cursor = view.style.cursor = c; };
const FINGER = 40; // (on a touch screen, an animal hangs this much further below the finger, in CSS pixels)
const RUN = 2.2; // how fast the others run to their places (places a second)
const runs = {}; // (an animal running to its place: how far in its stride, which way)
// the place a held animal would go to (n in the row, with it), never past the padlocked ones (they stay last)
const gapAt = (n) => Math.max(0, Math.min(n - 1 - playable().filter(padlocked).length, Math.round(placeAt(held.x - heldAt(held.k)[0]))));
function letGo() {
  const k = held.k, row = playable().filter((o) => o !== k);
  row.splice(gapAt(row.length + 1), 0, k);
  order = row;
  if (!ALL) keep('order', JSON.stringify(order)); // (?all: nothing saved)
  at[k] = placeAt(held.x - heldAt(k)[0]);
  held.h.falling = true;
  dropped = { k, h: held.h, y: held.y, vy: 0, squash: 0, landed: false };
  held = null;
  hand('');
  pick(k);
}
// a double tap: the animal jumps (as it would running), and lands with a puff of dust. (tapped: the last tap, to tell
// a second one; jumps: k → how high it is, how fast it goes up)
let tapped = null;
const jumps = {};
function hop(k) {
  if (jumps[k] || held?.k === k || dropped?.k === k) return;
  jumps[k] = { alt: 0, v: JUMP * ANIMALS[k].jump };
  call('sting', 'jump');
}
function updateJumps(dt) {
  for (const k in jumps) {
    const j = jumps[k];
    j.v -= GRAVITY * ANIMALS[k].gravity * dt; j.alt += j.v * dt;
    if (j.alt > 0) continue;
    delete jumps[k];
    const x = placeX(at[k]);
    for (let i = 0; i < 6; i++) { const side = i % 2 ? 1 : -1; parts.push({ x: x + 13 + side * (5 + rnd() * 5), y: GROUND - 1, vx: side * (20 + rnd() * 30), vy: -10 - rnd() * 25, life: 0.3, color: COLOR.FAINT }); }
  }
}

// petting: rubbed back and forth along its back, an animal likes it more and more (joy, 0…1: how far it was rubbed),
// and less again once left alone; every other stroke (a turn of the hand) a heart floats up from its head, with a
// little chime now and then
const pets = {}; // (k → { joy, t, strokes })
let chimed = 0;
function pet(g, x) {
  const p = pets[g.k] || (pets[g.k] = { joy: 0, t: 0, strokes: 0 });
  if (!g.pet) { g.pet = true; g.lastX = g.from = g.x; g.dir = 0; hand('grab'); } // (an open hand)
  const d = Math.sign(x - g.lastX);
  if (d) { p.lean = d; p.still = 0; } // (leaning the way the hand goes)
  if (d && d !== g.dir) { // the hand turns: a stroke (once it went some way)
    if (g.dir && Math.abs(g.lastX - g.from) >= 3 && ++p.strokes % 2 === 0 && p.joy >= handling(g.k).petted.happy) heartUp(g.k);
    g.dir = d; g.from = g.lastX;
  }
  p.joy = Math.min(1, p.joy + Math.abs(x - g.lastX) / 60);
  p.petting = true;
  g.lastX = x;
}
function heartUp(k) {
  const sp = petted(k, k === kind ? idleFrame(k, blinkT) : 0, pets[k].joy, pets[k].t, pets[k].lean), x = placeX(at[k]);
  floats.push({ sprite: heart, x: x + sp.head[0] + rnd() * 4 - 4, y: GROUND - FOOT + sp.head[1] - 2, life: 0.9, rise: 16 });
  if (blinkT - chimed > 1.2) { chimed = blinkT; call('sting', 'reward'); }
}
function updatePets(dt) {
  for (const k in pets) {
    const p = pets[k];
    p.t += dt;
    if ((p.still = (p.still || 0) + dt) > 0.12) p.lean = 0; // (the hand stopped)
    if (!(grip?.pet && grip.k === k)) p.petting = false;
    if (!p.petting && (p.joy -= dt * 0.5) <= 0) delete pets[k];
  }
}
function updateRow(dt) {
  updatePets(dt);
  updateJumps(dt);
  if ((grip || held || dropped || feed || loose) && (state !== 'title' || board || launch)) { grip = held = dropped = feed = loose = null; hand(''); }
  updateReach(dt);
  if (loose) updateLoose(dt); // (run, or off to the high scores, meanwhile)
  const row = playable(), n = row.length, lead = coming() ? row.indexOf(kind) : -1; // (a place left of the picked one, behind it: see coming)
  if (held) { // near an edge the row scrolls (the further in, the faster), to the end and no further
    const edge = 40, by = held.px < edge ? -(edge - held.px) / edge : held.px > W - edge ? (held.px - (W - edge)) / edge : 0;
    carousel = Math.max(0, Math.min(n - 1, carousel - by * 8 * dt)); // (the left: further in the row)
  } else {
    const sel = row.indexOf(kind);
    carousel = carousel === null ? sel : carousel + (sel - carousel) * Math.min(1, dt * 10);
  }
  if (newKind && state === 'title' && !board && at[newKind] !== undefined && rnd() < dt * 5) twinkle(placeX(at[newKind])); // unlocked, not played yet
  if (arriving && state === 'title') { at[arriving] = placeAt(Math.floor(viewL) - 30); arriving = null; } // (the new one: from off the left)
  // each to its place (past the gap, one on), running there
  const others = held ? row.filter((k) => k !== held.k) : row, gap = held ? gapAt(n) : n;
  others.forEach((k, i) => {
    const p = (i < gap ? i : i + 1) + (lead >= 0 && i > lead ? 1 : 0), r = runs[k] || (runs[k] = { phase: 0, dir: 1, on: false });
    if (at[k] === undefined) at[k] = p;
    if (k === kind && loose) return; // (after a treat let go: see updateLoose)
    const d = p - at[k];
    r.on = Math.abs(d) > 0.001 && !(dropped?.k === k && !dropped.landed);
    if (!r.on) return;
    at[k] += Math.sign(d) * Math.min(Math.abs(d), RUN * dt);
    r.dir = -Math.sign(d); // (the way it goes on the screen: further in the row, to the left)
    r.phase = (r.phase + dt * strides(k, RUN * 34)) % 1;
  });
  if (held) { // where it is held follows the hand (quickly: it has some weight), never so low it would touch the ground
    const py = Math.min(held.py, GROUND - hangDepth(held.k) - 2);
    held.x += (held.px - held.x) * Math.min(1, dt * 30);
    held.y += (py - held.y) * Math.min(1, dt * 30);
    swing(held.h, [held.x, held.y], dt);
    moveHung(heldBody, held.h, held.x, held.y, dt);
  } else if (dropped) { // falling to the ground, righting itself on the way; landing with a squash and a puff of dust
    const d = dropped, [sx, sy] = heldAt(d.k), x = placeX(at[d.k]), floor = GROUND - FOOT + sy;
    if (!d.landed) {
      d.vy += GRAVITY * dt; d.y = Math.min(floor, d.y + d.vy * dt);
      swing(d.h, [x + sx, d.y], dt);
      moveHung(heldBody, d.h, x + sx, d.y, dt);
      if (d.y >= floor && Math.abs(d.h.ang) < 0.12) { // (down, and upright)
        d.landed = true; d.squash = d.squashFor = handling(d.k).dropped.squashFor; d.hard = Math.min(1, 0.3 + d.vy / 600); // (from higher: flatter)
        for (let i = 0; i < 8; i++) {
          const side = i % 2 ? 1 : -1;
          parts.push({ x: x + 13 + side * (6 + rnd() * 6), y: GROUND - 1, vx: side * (25 + rnd() * 35), vy: -15 - rnd() * 30, life: 0.35, color: COLOR.FAINT });
        }
      }
    } else if ((d.squash -= dt) <= 0) dropped = null;
    if (dropped?.landed) moveBody(heldBody, d.k, 'idle', 0, x, GROUND - FOOT, 0, dt);
  }
}
// the grabbed animal: hanging from the hand (a shadow under it on the ground), falling, or landing
function drawGrabbed(pal) {
  const g = held || dropped;
  if (!g) return;
  const blink = blinking(blinkT + 0.7);
  if (dropped?.landed) { // flat as it lands, then up again
    const x = placeX(at[g.k]), s = handling(g.k).dropped.squash * g.hard * Math.max(0, g.squash / g.squashFor);
    ctx.save();
    ctx.translate(x + 13, GROUND);
    ctx.scale(1 + s, 1 - s);
    animal(g.k, 'idle', 0, { blink, body: heldBody }).draw(ctx, -13, -FOOT, pal);
    ctx.restore();
    return;
  }
  const x = held ? held.x : placeX(at[g.k]) + heldAt(g.k)[0], y = g.y, [sp, pin] = hung(g.h, { blink, body: heldBody });
  const up = GROUND - (y - pin[1] + sp.oy + sp.h); // (how high its lowest point is)
  if (up > 1) { // its shadow: smaller the higher it is
    const w = Math.max(4, Math.round(16 - up / 4));
    ctx.globalAlpha = 0.25; ctx.fillStyle = pal[COLOR.INK];
    ctx.fillRect(Math.round(x) - w / 2, GROUND - 1, w, 1);
    ctx.globalAlpha = 1;
  }
  sp.draw(ctx, x - pin[0], y - pin[1], pal);
}

// on the title, the one to come, as a shadow: the one that would chase the picked one (if it is not unlocked yet),
// standing right behind it, left of it (a place is kept for it there: see updateRow)
const coming = () => { const c = chaserOf(kind); return state === 'title' && !board && !held && !dropped && !ALL && !unlocked(c) && met.includes(c) ? c : null; };
function toCome(pal) {
  const c = coming();
  if (c && at[kind] !== undefined) {
    const x = placeX(playable().indexOf(kind) + 1); // (the place kept for it, behind the picked one: see updateRow)
    animal(c, 'idle', 0).draw(ctx, x, GROUND - FOOT, shadow(pal, COLOR.DIM));
  }
}
// a padlock over an animal unlocked but not bought (see padlocked): its shackle in ink, its body golden
const PADLOCK = ['..xxx..', '.x...x.', '.x...x.', 'xxxxxxx', 'xooooox', 'xooxoox', 'xooxoox', 'xooooox', 'xxxxxxx'];
// an animal standing on the title (and the high scores): the one picked in front, the others
// faded behind (p: its place in the row)
function standing(k, p, on, pal) {
  const x = placeX(p), r = runs[k];
  if (x < viewL - 26 || x > viewR) return;
  const pt = pets[k];
  ctx.globalAlpha = on ? 1 : 0.4 + 0.6 * (pt?.joy || 0); // (one petted lights up)
  const jp = jumps[k];
  if (jp) animal(k, 'jump', jumpFrame(k, jp.v / (JUMP * ANIMALS[k].jump))).draw(ctx, x, GROUND - FOOT - Math.round(jp.alt), pal); // jumping (a double tap)
  else if (grip?.duck && grip.k === k) animal(k, 'duck', 0).draw(ctx, x, GROUND - FOOT, pal); // pushed down
  else if (on && chew > 0 && !r?.on) drawFacing(chewing(), x, GROUND - FOOT - Math.round(reach.alt), pal); // chewing a treat
  else if (on && (treatAt() || begging) && !r?.on) drawFacing(reachFor(x, treatAt() || begAt(), loose?.eat > 0.2 && !loose.far), x, GROUND - FOOT - Math.round(reach.alt), pal); // reaching for a treat (eating it; begging for one)
  else if (pt && !r?.on) petted(k, on ? idleFrame(k, blinkT) : 0, pt.joy, pt.t, pt.lean).draw(ctx, x, GROUND - FOOT, pal); // being petted
  else if (r?.on) { // running to its place (the way it goes)
    const st = stride(k, r.phase), y = GROUND - FOOT - st.lift;
    if (r.dir < 0) { ctx.save(); ctx.translate(2 * x + 26, 0); ctx.scale(-1, 1); }
    const sp = animal(k, 'run', st.frame, { blink: on && blinking() });
    if (on && loose?.carried) { const m = mealOf(), [mx, my] = sp.mouth || [sp.head[0] + 4, sp.head[1] + 8]; m.draw(ctx, Math.round(x + mx - m.w / 2), Math.round(y + my - m.h / 2), pal); } // (a treat carried home in its mouth, behind it)
    sp.draw(ctx, x, y, pal);
    if (r.dir < 0) ctx.restore();
  } else (on && !board ? animalSprite() : animal(k, 'idle', on ? idleFrame(k, blinkT) : 0, { blink: on && blinking() })).draw(ctx, x + (on && launch ? Math.round(launch.x) : 0), GROUND - FOOT, pal); // (off to a run)
  ctx.globalAlpha = 1;
  if (padlocked(k) && !jp && !r?.on && !board) PADLOCK.forEach((row, y) => [...row].forEach((c, i) => { if (c !== '.') { ctx.fillStyle = pal[c === 'x' ? COLOR.INK : COLOR.YELLOW]; ctx.fillRect(x + 10 + i, GROUND - 30 + y, 1, 1); } })); // (over it, once it stands in its place)
}

// a bar at the top, in the middle, at y: an icon, a frame, filled that much (0…1) in a color
function bar(pal, icon, y, full, color) {
  const x = Math.round((safeL + W - safeR) / 2) - 30; // (in the middle of the screen, where the eye passes more often than in a corner)
  icon.draw(ctx, x + 6, y, pal);
  ctx.fillStyle = pal[COLOR.INK];
  ctx.fillRect(x + 13, y, 42, 5);
  ctx.fillStyle = pal.bg;
  ctx.fillRect(x + 14, y + 1, 40, 3);
  ctx.fillStyle = pal[color];
  ctx.fillRect(x + 14, y + 1, Math.ceil(40 * full), 3);
}
// the energy: a heart and a bar that turns red (and blinks) when it runs low
function energyBar(pal) {
  const low = energy < LOW;
  if (!(low && state === 'run' && Math.floor(blinkT * 4) % 2)) bar(pal, heart, 5, energy / 100, low ? COLOR.RED : COLOR.GREEN);
  const landed = bag - tossed.length; // (those still flying not yet counted)
  if (landed > 0) { const [x, y] = bagAt(), meal = FOOD[T().food]; meal.draw(ctx, x, y - Math.floor((meal.h - 5) / 2), pal); text(ctx, String(landed), x + meal.w + 2, y, pal[COLOR.INK]); }
}
// where the bag is shown, at the top (right of the energy bar; see bar)
const bagAt = () => [Math.round((safeL + W - safeR) / 2) - 30 + 58, 5];
// a treat flying into the bag, from where it was eaten (in an arc), in the world's pixels
function drawTossed(pal) {
  const meal = FOOD[T().food], [bx, by] = bagAt(), ty = by + safeT - SKY - Math.floor((meal.h - 5) / 2);
  for (const t of tossed) {
    const p = ease(t.t / FLY_SECS);
    meal.draw(ctx, Math.round(t.x + (bx - t.x) * p), Math.round(t.y + (ty - t.y) * p - Math.sin(Math.PI * p) * 14), pal);
  }
}
// what is left of a super power, under the energy: a star and a golden bar (blinking in its last two seconds)
function powerBar(pal) {
  if (power && !(power < 2 && Math.floor(power * 6) % 2)) bar(pal, star, 12, power / POWER_SECS, COLOR.YELLOW);
}

// birds circling a knocked-out head; the ones behind it are drawn first
function dizzyBirds(pal, behind) {
  const [hx, hy] = headAt();
  for (let i = 0; i < 3; i++) {
    const a = koT * 4 + (i * Math.PI * 2) / 3;
    if ((Math.sin(a) < 0) !== behind) continue;
    bird(Math.floor(koT * 8 + i) % 2).draw(ctx, hx + Math.cos(a) * 9 - 4, hy + Math.sin(a) * 2.5 - 4, pal);
  }
}

// dusk and dawn: day turns to a sunset, a purple dusk, then night; night to a morning (by dawn), then day (at the den).
// Each pass on the way is a crossfade: the world drawn in both palettes, the second over the first (a pixel's colours
// blend smoothly). Sunset and morning are the day tinted, dusk the night; each with a sky of its own (one colour: no
// gradient).
const blend = (a, b, f) => `#${rgb(a).map((v, i) => Math.round(v * (1 - f) + rgb(b)[i] * f).toString(16).padStart(2, '0')).join('')}`;
const tint = (pal, by, f, more) => ({ ...Object.fromEntries(Object.entries(pal).map(([k, c]) =>
  [k, blend(c, `#${rgb(c).map((v, i) => Math.round((v * rgb(by)[i]) / 255).toString(16).padStart(2, '0')).join('')}`, f)])), ...more });
const SKIES = {
  day: PALETTES.day,
  sunset: tint(PALETTES.day, '#ff8c5a', 0.6, { bg: '#f7a76c' }),
  dusk: tint(PALETTES.night, '#ffb4d8', 0.3, { bg: '#56457a' }),
  night: PALETTES.night,
  morning: tint(PALETTES.day, '#ffb4c4', 0.45, { bg: '#ffdcbc' }),
};
// the two palettes to draw in and how much of the second, from how dark it is and which way it is going
function skies() {
  const down = night && !paling, way = down ? ['day', 'sunset', 'dusk', 'night'] : ['night', 'morning', 'day'], f = (down ? dark : 1 - dark) * (way.length - 1);
  const i = Math.min(Math.floor(f), way.length - 1);
  return i < way.length - 1 ? [SKIES[way[i]], SKIES[way[i + 1]], ease(f - i)] : [SKIES[way[i]], null, 0];
}
const second = document.createElement('canvas'), secondCtx = second.getContext('2d');
const themeColor = document.querySelector('meta[name=theme-color]');

function draw() {
  drawn = {};
  showCalls();
  const [a, b, f] = board ? [PALETTES.day, null, 0] : skies(); // (the high scores: always by day)
  const bg = f ? blend(a.bg, b.bg, f) : a.bg;
  if (stageBg !== bg) { // around the game in full screen, and the phone's bars
    document.documentElement.style.setProperty('--game-bg', stageBg = bg);
    themeColor.content = bg;
  }
  // a quake shakes the screen (by a screen pixel)
  const q = shake > 0 ? Math.round((rnd() - 0.5) * 2) * SCALE : 0;
  vctx.setTransform(SCALE, 0, 0, SCALE, OX + q, (SKY * SCALE) + (q && (rnd() < 0.5 ? -q : q)));
  if (f < 1) scene(a);
  if (f > 0) {
    ctx = secondCtx;
    scene(b);
    ctx = vctx;
    ctx.globalAlpha = f; ctx.drawImage(second, -OX / SCALE, -SKY, second.width / SCALE, second.height / SCALE); ctx.globalAlpha = 1; // (pixel for pixel)
  }
  // the writing in whichever palette stands out more against the sky as it is now (blended, it would fade away)
  const stands = (p) => Math.abs(luma(p[COLOR.INK]) - luma(bg));
  const hp = f && stands(b) > stands(a) ? b : a;
  if (stageInk !== hp[COLOR.INK]) document.documentElement.style.setProperty('--game-ink', stageInk = hp[COLOR.INK]); // (the pads)
  hud(hp);
  const fade = launch ? ease(Math.min(1, launch.t / LAUNCH_SECS)) : fadeIn / FADE_IN; // (into a run: out, then in)
  if (fade > 0) { vctx.setTransform(1, 0, 0, 1, 0, 0); vctx.globalAlpha = fade; vctx.fillStyle = bg; vctx.fillRect(0, 0, view.width, view.height); vctx.globalAlpha = 1; }
}

// the ground: its line, the bits on it and under it (→ where it has scrolled to, in screen pixels)
function ground(pal) {
  ctx.fillStyle = pal[COLOR.INK];
  ctx.fillRect(Math.floor(viewL), GROUND, Math.ceil(viewR - viewL) + 1, 1);
  // the specks and tufts fainter than the line and what lies on it: at speed they jump several pixels a frame, and the
  // eye goes to the obstacles first
  ctx.fillStyle = pal[COLOR.DIM];
  ctx.beginPath();
  const scroll = snap(groundX), from = Math.floor(viewL) - 6; // (from: a tuft going off on the left still shows)
  for (const b of groundBits) {
    const x = from + snap(((b.x - scroll - from) % GROUND_LOOP + GROUND_LOOP) % GROUND_LOOP);
    if (x >= viewR) continue;
    if (b.kind === 'dot') ctx.rect(x, GROUND + b.y, 1, 1);
    else if (b.kind === 'dash') ctx.rect(x, GROUND + b.y, 3, 1);
    else { ctx.rect(x, GROUND - 1, 1, 1); ctx.rect(x + 2, GROUND - 2, 1, 2); ctx.rect(x + 4, GROUND - 1, 1, 1); }
  }
  ctx.fill();
  return scroll;
}

// the world, in one palette
function scene(pal) {
  ctx.fillStyle = pal.bg;
  ctx.fillRect(Math.floor(viewL) - 1, -SKY - 1, Math.ceil(viewR - viewL) + 3, VH + 2); // (and round it: a quake shakes it a pixel)
  if (board) return ground(pal); // (the high scores: on the plain sky and the ground, see hud)
  if (pal === PALETTES.night) { // the stars and the moon
    ctx.fillStyle = pal[COLOR.INK];
    ctx.beginPath();
    for (const s of stars) if (s.y >= -SKY && Math.sin(blinkT * 2 + s.p) > -0.6) ctx.rect(s.x, s.y, 1, 1);
    ctx.fill();
    moon.draw(ctx, W - 60, 10 - Math.round(SKY / 2), pal);
  }
  if (sunrise > 0 && dark > 0) { // the sun coming up behind the hills (none of it below the ground's line), white: as the day comes it is gone into the sky
    const r = 8, cx = Math.round(viewR) - 70, cy = GROUND + r - Math.round(sunrise * 24 - Math.max(0, sunrise - 1) * 14);
    ctx.fillStyle = pal[COLOR.WHITE];
    ctx.globalAlpha = Math.min(1, dark * 3);
    ctx.beginPath();
    for (let y = -r; y < r; y++) { const w = Math.round(Math.sqrt(r * r - (y + 0.5) ** 2)); if (cy + y < GROUND) ctx.rect(cx - w, cy + y, 2 * w, 1); }
    ctx.fill();
    ctx.globalAlpha = 1;
  }
  // far hills
  ctx.fillStyle = pal[COLOR.FAINT];
  const hills = snap(hillX), from = Math.floor(hills);
  ctx.beginPath();
  for (let x = Math.floor(viewL); x <= Math.ceil(viewR); x++) { // (each column of the hills keeps its height; they slide by screen pixels)
    const h = hill(x + from);
    ctx.rect(x - (hills - from), Math.round(GROUND - h), 1, Math.round(h));
  }
  ctx.fill(); // (one path: one fill, not a fill a column)
  for (const c of clouds) cloud.draw(ctx, c.x, c.y, pal);

  const scroll = ground(pal);


  // what lies on the ground moves with it, rounded with it to the same screen pixel (on its own, it could be one off)
  const onGround = (x) => snap(x + groundX) - scroll;
  const meal = FOOD[ANIMALS[kind].food];
  const hungry = state === 'run' && energy < LOW; // (the food glints: see LOW)
  for (const f of food) {
    const x = onGround(f.x), y = f.y + bob(f.x * 0.1);
    meal.draw(ctx, x, y, pal);
    if (hungry && (blinkT * 2.5 + f.x * 0.013) % 1 < 0.3) { ctx.fillStyle = pal[COLOR.ORANGE]; ctx.fillRect(x + meal.w, y - 3, 1, 3); ctx.fillRect(x + meal.w - 1, y - 2, 3, 1); }
  }
  if (gold) { // golden, with a glint going round it
    const x = onGround(gold.x), y = gold.y + bob();
    meal.draw(ctx, x, y, golden(pal));
    const a = blinkT * 6;
    ctx.fillStyle = pal[COLOR.YELLOW];
    ctx.fillRect(x + Math.round(meal.w / 2 + Math.cos(a) * (meal.w / 2 + 3)), Math.round(y + meal.h / 2 + Math.sin(a) * (meal.h / 2 + 3)), 1, 1);
    ctx.fillStyle = pal[COLOR.WHITE];
    ctx.fillRect(x + Math.round(meal.w / 2 - Math.cos(a) * (meal.w / 2 + 3)), Math.round(y + meal.h / 2 - Math.sin(a) * (meal.h / 2 + 3)), 1, 1);
  }
  for (const y of herd) animal('yak', 'run', stride('yak', y.phase).frame).draw(ctx, y.x, GROUND - FOOT - 1, pal); // (the stampede, a little behind)
  ctx.fillStyle = pal[COLOR.WHITE];
  for (const p of spits) ctx.fillRect(snap(p.x) - 1, snap(p.y) - 1, 2, 2);
  ctx.globalAlpha = stinks() ? 0.35 : 1; // (faded while the skunk stinks: it runs through them)
  for (const o of obstacles) o.sprite.draw(ctx, onGround(o.x), o.y, pal);
  ctx.globalAlpha = 1;
  if (chase) { // the next animal
    const c = hunter();
    const st = stride(c, chase.phase), blink = blinking(blinkT + 1.3), still = chase.caught || chase.there; // (caught it; or joined, in the middle)
    (still ? animal(c, 'idle', idleFrame(c, blinkT), { blink, body: chase.body }) : animal(c, 'run', st.frame, { blink, body: chase.body }))
      .draw(ctx, chase.x + 4, GROUND - FOOT - (still ? 0 : st.lift), pal);
  }

  if (state === 'title') {
    if (loose && !loose.carried) mealOf().draw(ctx, Math.round(loose.x), Math.round(loose.y), pal); // (let go: behind the animals; carried: see standing)
    toCome(pal); // (behind them: the picked one may go by it, after a treat)
    for (const k of playable()) if (k !== held?.k && k !== dropped?.k && k !== kind) standing(k, at[k], false, pal);
    if (kind !== held?.k && kind !== dropped?.k && at[kind] !== undefined) standing(kind, at[kind], true, pal); // (the picked one in front of them)
    drawGrabbed(pal);
    const left = treatsOf(kind);
    if (!launch && !held && !feed && !loose && left > 0) { // the picked one's treats, over its place: the food, how many (not while one is out)
      const meal = mealOf(), s = String(left), w = meal.w + 2 + textWidth(s), [cx, ty] = treatSpot(), tx = Math.round(cx - w / 2);
      meal.draw(ctx, tx, ty, pal); text(ctx, s, tx + meal.w + 2, ty + Math.floor((meal.h - 5) / 2), pal[COLOR.INK]);
    }
    if (feed) { const meal = mealOf(); meal.draw(ctx, Math.round(feed.x - meal.w / 2), Math.round(feed.y - meal.h / 2), pal); } // (the treat carried)
  }
  else {
    if (state === 'ko' && !won) dizzyBirds(pal, true);
    ctx.globalAlpha = safe > 0 && state === 'run' && Math.floor(safe * 10) % 2 ? 0.35 : 1;
    // golden while a power is on; at its end flickering, faster and faster; almost out of energy, flushed red a moment
    // every second
    const flashing = power > ENDING || (power > 0 && Math.floor(power / (0.06 + (0.14 * power) / ENDING)) % 2 === 0);
    const red = !power && state === 'run' && energy < VERY_LOW && blinkT % 1 < 0.15;
    if (power && kind === 'cheetah') { // sprint: a blur behind it
      for (const [d, a] of [[12, 0.15], [6, 0.3]]) { ctx.globalAlpha = a; animalSprite().draw(ctx, RUN_X - d, animalY(), pal); }
      ctx.globalAlpha = 1;
    }
    const [gx, gy, , , s] = giantBox();
    animalSprite(s).draw(ctx, gx + Math.round(homeX), gy, flashing ? golden(pal) : red ? flushed(pal) : pal); // (the giant: drawn bigger, still smooth; home: running off)
    ctx.globalAlpha = 1;
    if (state === 'paused') sleepZs(pal);
    if (state === 'ko' && !won) dizzyBirds(pal, false);
    if (power > 0 && power <= ENDING && state === 'run') { // the seconds left, over its head (each a little hop as it comes)
      const [hx, hy] = headAt(), left = Math.ceil(power), hop = power - Math.floor(power) > 0.85 ? 1 : 0;
      outlined(String(left), hx, Math.min(hy, gy) - 17 - hop, pal[COLOR.YELLOW], pal[COLOR.INK], 2); // (golden as the power, outlined: legible on any sky)
    }
  }
  let color = null;
  for (const p of parts) {
    if (p.color !== color) ctx.fillStyle = pal[color = p.color];
    const x = snap(p.x), y = snap(p.y);
    ctx.fillRect(x, y, 1, p.h || 1);
    if (p.star && p.life > 0.15) { ctx.fillRect(x - 1, y, 3, 1); ctx.fillRect(x, y - 1, 1, 3); } // (a twinkle: a little cross, a dot as it fades)
  }
  for (const f of floats) {
    if (state === 'paused' && !f.sprite) continue; // (paused: its words over them, theirs again as it goes on)
    if (f.sprite) f.sprite.draw(ctx, f.x, Math.round(f.y), pal);
    else text(ctx, f.text, f.x, Math.round(f.y), pal[COLOR.INK], 'left', f.size || 1, f.size > 1 ? LOGO : undefined);
  }
}

// text with a dark edge around it (a pixel of the font's size), centred on x
function outlined(s, x, y, color, edge, size = 1) {
  for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1], [-1, -1], [1, -1], [-1, 1], [1, 1]]) text(ctx, s, x + dx, y + dy, edge, 'center', size);
  text(ctx, s, x, y, color, 'center', size);
}

// what is written over the world (and the high scores), in one palette
function hud(pal) {
  if (board) { drawBoard(pal); atTop(() => drawButtons(pal)); return; }
  // the energy, the score (blinking at every hundred): at the top of the screen
  atTop(() => {
    if (state === 'run' || state === 'paused') { energyBar(pal); powerBar(pal); }
    const pad = (n) => String(n).padStart(5, '0');
    if (!(flash > 0 && Math.floor(flash * 8) % 2)) text(ctx, pad(score()), W - safeR - 6, 5, pal[COLOR.INK], 'right');
  });

  if (tossed.length) drawTossed(pal);
  if (state === 'title') {
    text(ctx, 'LOP HOP', W / 2, 10, pal[COLOR.INK], 'center', 2, LOGO);
    const pick = playable().length > 1;
    if (TOUCH) { if (pick) help(t('title.tap_to_pick'), pal); } // (moving, petting, ducking, jumping: to be found)
    else if (padlocked(kind)) help(t('title.keys_pick'), pal); // (no running with it)
    else help(t(pick ? 'title.keys_to_pick' : 'title.keys'), pal);
  } else if (state === 'ko' && naming) atTop(() => drawName(pal));
  else if (state === 'ko') {
    if (won) text(ctx, koWhy, W / 2, 20, pal[COLOR.INK], 'center', 2, LOGO); else text(ctx, koWhy, W / 2, 24, pal[COLOR.INK], 'center');
    if (gained && koT > 0.3 && (koT > 2 || Math.floor(koT * 4) % 2)) text(ctx, t('end.unlocked', { name: nameOf(gained) }), W / 2, 33, pal[COLOR.ORANGE], 'center'); // (unlocked in this run: again, blinking at first, so it is not missed)
    if (won && bag && koT > 0.6) { // the treats brought home
      const meal = FOOD[T().food], s = `+${bag}`, w = meal.w + 2 + textWidth(s), x = Math.round(W / 2 - w / 2), y = gained ? 42 : 33;
      meal.draw(ctx, x, y - Math.floor((meal.h - 5) / 2), pal); text(ctx, s, x + meal.w + 2, y, pal[COLOR.INK]);
    }
    if (settled() && fresh) help(t(TOUCH ? 'end.name_tap' : 'end.name_keys'), pal, pal[COLOR.ORANGE]);
    else if (settled() && !fresh && gained) help(t(TOUCH ? 'end.yours_tap' : 'end.yours_keys', { the: theOf(gained) }), pal, pal[COLOR.ORANGE]);
    else if (settled() && !fresh) help(t(TOUCH ? 'end.again_tap' : 'end.again_keys'), pal);
  } else if (state === 'paused') {
    text(ctx, t(TOUCH ? 'run.paused_tap' : 'run.paused_keys'), W / 2, 30, pal[COLOR.INK], 'center');
  }

  atTop(() => {
    drawButtons(pal);
    if (FPS) { text(ctx, rate.shown, W - safeR - 3, 21, pal[COLOR.INK], 'right'); text(ctx, `UNEVEN ${rate.uneven}  LONG ${rate.long} (${Math.round(rate.longest)} MS)`, W - safeR - 3, 28, pal[COLOR.INK], 'right'); } // (under the day)
  });
}
// drawn from the top of the screen (under a status bar), not of the world (see fit: the sky added above it)
function atTop(draw) { ctx.translate(0, safeT - SKY); draw(); ctx.translate(0, SKY - safeT); }

// the canvases in screen pixels, one for one (the browser scales nothing: what moves, moves evenly), a whole number per
// art pixel: the art is drawn in art pixels, scaled up (not blurred), and what moves is placed to the screen pixel (see
// snap), so it glides instead of stepping a big pixel at a time. The world in the middle: on a screen a little narrower
// than whole pixels allow, a few art pixels of its sides are cut off (where a phone's round corners are anyway); on one
// a little wider, the sky and the ground go on past them (viewL, viewR)
const FORCE = +Q.get('scale') || 0; // ?scale=3: drawn 3 screen pixels an art pixel (the page scales it up)
// (a probe for how much of the screen's sides a notch or round corners may cover, in CSS pixels: the screen less those,
// so it changes size when they change; in the iOS app they can come after the page has loaded, with no resize)
const inset = document.createElement('div');
inset.style.cssText = 'position: fixed; visibility: hidden; pointer-events: none; top: env(safe-area-inset-top); right: env(safe-area-inset-right); bottom: env(safe-area-inset-bottom); left: env(safe-area-inset-left)';
document.body.append(inset);
function fit() {
  // the canvas's pixels (a CSS pixel: the screen's pixels in it, or with ?scale as many as make the world that wide), art
  // pixels (as many of them as come nearest the world's width, but the world's height fits), the world's left edge (OX)
  const r = (viewRect = view.getBoundingClientRect()), w = r.width || W, cs = getComputedStyle(inset);
  const dpp = FORCE ? (FORCE * W) / w : devicePixelRatio, cw = Math.round(w * dpp), ch = Math.round((r.height || H) * dpp);
  const scale = FORCE || Math.max(1, Math.min(Math.round(cw / W), Math.floor(ch / H)));
  OX = Math.round((cw - W * scale) / 2);
  viewL = -OX / scale; viewR = (cw - OX) / scale;
  const art = dpp / scale, artX = (x) => x * art + viewL; // (art pixels a CSS pixel; a CSS x on the canvas → the world's)
  // the game fills the screen's width on a phone (see index.html): what is drawn at its sides keeps clear of the notch
  // (and of what is cut off)
  safeL = Math.max(0, Math.ceil(artX(Math.max(0, parseFloat(cs.left) - r.left))));
  safeR = Math.max(0, Math.ceil(W - artX(w - Math.max(0, parseFloat(cs.right) - (document.documentElement.clientWidth - r.right)))));
  const top = parseFloat(cs.top) - r.top; // (and a little more: the status bar fades out below its edge)
  safeT = top > 0 ? Math.ceil(top * art) + 5 : 0;
  RUN_X = 30 + safeL; // (the animal, and the one chasing it, where they were before the game went under the notch)
  const px = 1 / art; // (CSS pixels an art pixel)
  document.documentElement.style.setProperty('--px', px); // (the pads)
  // a screen taller than the world (a phone, full screen): the world in the middle, as much more sky above it as room
  // below it (where the pads are), up to where the branches' trunks end
  VH = Math.ceil(ch / scale);
  SKY = Math.min(Math.floor((VH - H) / 2), TRUNK);
  // under the ground: the line of help at the bottom (5 art pixels under it on every screen, clear of a phone's home bar
  // too), the pads' row between
  helpY = VH - SKY - 10 - (CHEATING ? BTN + 3 : 0); // (?cheats: their buttons under it)
  padRow = Math.max(GROUND + 2, Math.round((GROUND + 1 + helpY - 2 - PAD) / 2));
  stage.style.setProperty('--pad-top', `${view.offsetTop + (SKY + padRow) * px}px`);
  if (fitted === `${cw} ${ch} ${scale}`) return;
  fitted = `${cw} ${ch} ${scale}`;
  setScale(SCALE = scale);
  for (const c of [view, second]) { c.width = cw; c.height = ch; }
  for (const cx of [vctx, secondCtx]) { cx.setTransform(scale, 0, 0, scale, OX, SKY * scale); cx.imageSmoothingEnabled = false; }
}
let SCALE = 1, OX = 0, fitted = ''; // (screen pixels an art pixel; how many from the canvas's left edge the world's is; the size fitted to)
new ResizeObserver(fit).observe(view);
new ResizeObserver(fit).observe(inset);
addEventListener('resize', fit); // (turned the other way round: the notch on the other side)
fit();

// fixed steps, so a slow frame never lets the animal pass through a cactus; at most a quarter second caught up. At most
// 60 frames a second (a faster screen, 120 Hz: every other one; ?hz=120: each one, where the browser gives that many),
// each due a 60th (a 120th) of a second after the one before. A frame that comes less than half the screen's own frame
// (vsync: a 60th, a 120th, learnt) from when it was due counts as on time, as if it came then: a frame's time is when its
// callback ran (WebKit: to the millisecond), so one run 5 ms late by other work, though on the screen in time, took
// three steps and the next one, as if early, one: half the world's move, then one and a half, in some runs often. The
// due times follow the frames slowly (an eighth of how late each was), so a screen a little faster than 60 Hz no longer
// skips one every few seconds. Later than that (a frame missed): the time it came, from there on. A frame takes as many
// steps as its time holds, rounded, and half of what that leaves over on to the next (all of it kept, the leftover
// could settle at half a step, and the frames take three steps and one by turns)
const HZ = Q.get('hz') === '120' ? 120 : 60, STEP = 1 / 120, FRAME = 1000 / HZ;
let last = performance.now(), over = 0, due = 0, clock = last, called = last, vsync = FRAME, readied = null, ready = null;
// (?fps: each second, the frames drawn in it, the work of a frame on average and at most, in ms; since the start, the
// frames that took other than a frame's steps, and those over 50 ms while running (LONG) with the longest)
const rate = { frames: 0, since: 0, work: 0, worst: 0, shown: '', uneven: 0, long: 0, longest: 0 };
function frame(now) {
  const gap = now - called; called = now;
  if (gap > 4 && gap < 100) vsync += (gap - vsync) / 20;
  if (now < due - vsync / 2) { requestAnimationFrame(frame); return; } // (too soon: the screen's next one)
  const late = now - due, was = clock;
  if (Math.abs(late) < vsync / 2) { clock = due; due += Math.max(FRAME, vsync) + late / 8; } // (on time; a slower screen: its own frame)
  else { clock = now; due = now + FRAME; } // (behind: from now on)
  const began = performance.now(), ms = now - last, time = Math.min(250, clock - was + over), steps = Math.round(time / (STEP * 1000));
  over = (time - steps * STEP * 1000) / 2;
  last = now;
  if (FPS) rate.uneven += steps !== 120 / HZ;
  if (FPS && state === 'run' && ms > 50) { rate.long++; rate.longest = Math.max(rate.longest, ms); } // (running, a frame held three times over or more)
  for (let i = 0; i < steps; i++) if (state !== 'paused') { update(STEP); updateBits(STEP); }
  if (state === 'paused') sleepT += (steps * STEP); // (the Zs of its sleep go on: see sleepZs)
  if (readied !== kind) { readied = kind; ready = readying(kind); }
  if (ready?.next().done) ready = null; // (the animal made ready to run, a piece a frame: see readying)
  draw();
  if (LOG) log(now, ms, steps, performance.now() - began);
  if (FPS) {
    const work = performance.now() - began;
    rate.frames++; rate.work += work; rate.worst = Math.max(rate.worst, work);
    if (now - rate.since >= 1000) {
      rate.shown = `${Math.round((rate.frames * 1000) / (now - rate.since))} FPS  ${(rate.work / rate.frames).toFixed(1)} MS  MAX ${rate.worst.toFixed(1)}  ${view.width}X${view.height}`;
      Object.assign(rate, { frames: 0, since: now, work: 0, worst: 0 });
    }
  }
  requestAnimationFrame(frame);
}
// (?log: see LOG; and every 10 seconds, how many frames there were and how many it wrote about. held: a timer runs every
// few milliseconds, and the longest it went without running since the frame before (long: the page itself was held
// up, by its own work or by collecting its garbage; short: the screen waited); msgs: the music's messages since)
const told = { at: 0, frames: 0, lines: 0, work: 0, made: 0, canvases: 0, notes: '', held: 0, pulse: 0, msgs: 0 };
if (LOG) {
  const tick = () => { const t = performance.now(); told.held = Math.max(told.held, t - (told.pulse || t)); told.pulse = t; setTimeout(tick, 4); };
  tick();
  music.on('*', () => { told.msgs++; });
}
function log(now, ms, steps, work) {
  if (!told.at) { told.at = now; console.log(`LOP start ${view.width}x${view.height} scale ${SCALE} dpr ${devicePixelRatio} hz ${HZ} ${navigator.userAgent}`); }
  const fresh = made.sprites - told.made, what = notes.join(' ');
  told.frames++; told.made = made.sprites;
  if (steps !== 120 / HZ || Math.abs(ms - FRAME) > 4 || work > 8) {
    told.lines++;
    console.log(`LOP ${ms.toFixed(1)} ms x${steps} work ${work.toFixed(1)} (before ${told.work.toFixed(1)}) held ${told.held.toFixed(0)} msgs ${told.msgs} new ${fresh} ${state} speed ${Math.round(speed || 0)}${what ? ` | ${what}` : ''}${told.notes ? ` | before: ${told.notes}` : ''}`);
  }
  told.work = work; told.notes = what; notes.length = 0; told.held = 0; told.msgs = 0;
  if (now - told.at >= 10000) { console.log(`LOP 10 s: ${told.frames} frames, ${told.lines} written, ${made.canvases - told.canvases} canvases made`); told.at = now; told.frames = told.lines = 0; told.canvases = made.canvases; }
}
updateMood();
requestAnimationFrame(frame);
// the iOS app (window.Capacitor) may play without a tap: the music starts with the title
if (window.Capacitor) startAudio();

// offline, and installable: a service worker keeps the game's files (not on localhost, where files change all the time)
if ('serviceWorker' in navigator && !['localhost', '127.0.0.1'].includes(location.hostname)) navigator.serviceWorker.register('sw.js');
