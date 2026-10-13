// node tools/site.mjs — the game as GitHub Pages publishes it (.github/workflows/pages.yml), into _site/: only the files
// the game plays from (those the service worker keeps, sw.js, and the engine's), not the tools (the editor, balance,
// font, tools/) nor the rest of the repo; and no cheats (?cheats does nothing there)
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..'), site = path.join(root, '_site');
const read = (f) => fs.readFileSync(path.join(root, f), 'utf8');
const game = new Function(`return ${read('sw.js').match(/const GAME = (\[[^\]]*\])/)[1]}`)().filter((f) => f !== './');
const files = ['sw.js', ...game, 'engine/files.json', ...JSON.parse(read('engine/files.json')).map((f) => `engine/${f}`)];

fs.rmSync(site, { recursive: true, force: true });
for (const f of files) {
  fs.mkdirSync(path.dirname(path.join(site, f)), { recursive: true });
  fs.copyFileSync(path.join(root, f), path.join(site, f));
}
const CHEATS = "const CHEATING = Q.has('cheats');", js = read('game.js');
if (!js.includes(CHEATS)) throw new Error(`game.js: no "${CHEATS}" to turn the cheats off by`);
fs.writeFileSync(path.join(site, 'game.js'), js.replace(CHEATS, 'const CHEATING = false; // (published: no cheats, see tools/site.mjs)'));
console.log(`copied ${files.length} files into _site/, without the cheats`);
