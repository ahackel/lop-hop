// The files the game plays from: those the service worker keeps (sw.js) and the engine's (engine/files.json); not the
// service worker itself, nor the tools. What GitHub Pages publishes (tools/site.mjs) and the iOS app ships (app/copy.mjs)
import fs from 'node:fs';
import path from 'node:path';

export const root = path.resolve(import.meta.dirname, '..');
export const read = (f) => fs.readFileSync(path.join(root, f), 'utf8');
const kept = new Function(`return ${read('sw.js').match(/const GAME = (\[[^\]]*\])/)[1]}`)().filter((f) => f !== './');
export const GAME_FILES = [...kept, 'engine/files.json', ...JSON.parse(read('engine/files.json')).map((f) => `engine/${f}`)];

// the files copied into dir (emptied first)
export function copyGame(dir, files = GAME_FILES) {
  fs.rmSync(dir, { recursive: true, force: true });
  for (const f of files) {
    fs.mkdirSync(path.dirname(path.join(dir, f)), { recursive: true });
    fs.copyFileSync(path.join(root, f), path.join(dir, f));
  }
}
