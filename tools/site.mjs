// node tools/site.mjs — the game as GitHub Pages publishes it (.github/workflows/pages.yml), into _site/: only the files
// the game plays from (tools/files.mjs) and its service worker, not the tools (the editor, balance, font, tools/) nor the
// rest of the repo; and no cheats (?cheats does nothing there)
import fs from 'node:fs';
import path from 'node:path';
import { root, read, GAME_FILES, copyGame } from './files.mjs';

const site = path.join(root, '_site'), files = ['sw.js', ...GAME_FILES];
copyGame(site, files);
const CHEATS = "const CHEATING = Q.has('cheats');", js = read('game.js');
if (!js.includes(CHEATS)) throw new Error(`game.js: no "${CHEATS}" to turn the cheats off by`);
fs.writeFileSync(path.join(site, 'game.js'), js.replace(CHEATS, 'const CHEATING = false; // (published: no cheats, see tools/site.mjs)'));
console.log(`copied ${files.length} files into _site/, without the cheats`);
