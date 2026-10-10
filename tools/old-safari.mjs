// The game is played on an older iPad (Safari 15), which lacks what browsers learned since (from 15.4 on). The tests
// run without it: imported first by tools/test.mjs, this takes it away before the engine and the art load, so they fail
// here if they use it. What can't be taken away in node (syntax, CSS, the DOM) oldSafari() looks for in the files the
// browser loads: a feature newer than Safari 15 needs a fallback (typeof … / '…' in … on the same line, or for dvh the
// same rule with vh just before it).
import { readFileSync, readdirSync } from 'node:fs';

for (const k of ['at', 'findLast', 'findLastIndex', 'toSorted', 'toReversed', 'toSpliced', 'with']) delete Array.prototype[k];
for (const T of [Int8Array, Uint8Array, Uint8ClampedArray, Int16Array, Uint16Array, Int32Array, Uint32Array, Float32Array, Float64Array]) {
  for (const k of ['at', 'findLast', 'findLastIndex', 'toSorted', 'toReversed', 'with']) delete Object.getPrototypeOf(T.prototype)[k];
}
delete String.prototype.at;
delete Object.hasOwn;
delete Object.groupBy;
delete Array.fromAsync;
delete globalThis.structuredClone;

const root = new URL('../', import.meta.url);
const js = (dir) => readdirSync(new URL(dir, root), { recursive: true }).filter((f) => f.endsWith('.js')).map((f) => `${dir}${f}`);
export const FILES = ['index.html', 'sw.js', 'game.js', 'level.js', 'music.js', 'lang.js', 'art.js', 'font.js', 'icons.js', 'asset.js', ...js('assets/'), 'turn3d.js', 'turn-gl.js', 'turn-mesh.js', 'tools/bench.html', 'tools/bench.js', ...js('animals/'), ...js('engine/src/')];

// [what, a pattern for it, a fallback must be on the same line] (in the code, not its comments)
const NEWER = [
  ['Array/String .at() (15.4)', /(?<!\bthis|\bm)\.at\(/], // (this.at: the engine's scheduling, m.at: a move's pose)
  ['findLast, toSorted, toReversed, toSpliced, .with() (15.4/16)', /\.(findLast|findLastIndex|toSorted|toReversed|toSpliced|with)\(/],
  ['Object.hasOwn / Object.groupBy / Array.fromAsync (15.4+)', /\b(Object\.hasOwn|Object\.groupBy|Array\.fromAsync)\(/],
  ['structuredClone (15.4)', /\bstructuredClone\b/, 'structuredClone'],
  ['OffscreenCanvas (16.4)', /\bOffscreenCanvas\b/, 'OffscreenCanvas'],
  ['requestIdleCallback (none)', /\brequestIdleCallback\b/, 'requestIdleCallback'],
  ['navigator.audioSession (newer)', /\baudioSession\b/, 'audioSession'],
  ['canvas roundRect (16)', /\.roundRect\(/],
  ['regex lookbehind (16.4)', /\(\?<[=!]/],
  ['class static blocks (16.4)', /\bstatic\s*\{/],
  ['<dialog> (15.4)', /<dialog\b|\.showModal\(/],
  [':has() in a query (15.4)', /querySelector(All)?\([^)]*:has\(/],
  ['import maps (16.4)', /type=["']importmap["']/],
  ['@container / color-mix (16)', /@container\b|\bcolor-mix\(/],
];
const guarded = (line, name) => new RegExp(`typeof\\s+(\\w+\\.)?${name}\\b|['"]${name}['"]\\s+in\\b`).test(line);
const code = (line) => line.replace(/^\s*(\/\/|\*|\/\*).*$/, '').replace(/\s\/\/\s.*$/, ''); // (a line's comment left out)

export function oldSafari() {
  const found = [];
  for (const f of FILES) {
    const src = readFileSync(new URL(f, root), 'utf8');
    src.split('\n').forEach((raw, i) => {
      const line = code(raw);
      for (const [what, re, name] of NEWER) if (re.test(line) && !(name && guarded(line, name))) found.push(`${f}:${i + 1} ${what}`);
    });
    // dvh, svh, lvh (15.4): the same declaration in vh first, for Safari 15 (which drops the one it can't read)
    const flat = src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\s+/g, ' ');
    for (const m of flat.matchAll(/([\w-]+)\s*:\s*([^;{}]*\d[dsl]v[hw][^;{}]*)/g)) {
      const plain = `${m[1]}: ${m[2].replace(/(\d)[dsl](v[hw])/g, '$1$2')}`.trim();
      if (!flat.slice(0, m.index).includes(plain)) found.push(`${f} ${m[1]}: …${m[2].match(/\d+[dsl]v[hw]/)[0]} without a vh fallback before it`);
    }
  }
  return found;
}
