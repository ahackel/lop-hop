// node tools/rig-format.mjs (npm run rigs) — writes every asset (assets/*.js, assets/food/*.js, assets/obstacles/*.js; not a folder's index.js) the way the editor saves it (see
// rig-format.js), so a save changes only what was edited
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { formatAsset } from './rig-format.js';

const dir = new URL('../assets/', import.meta.url);
for (const f of readdirSync(dir, { recursive: true }).filter((f) => f.endsWith('.js') && !f.endsWith('index.js'))) {
  const url = new URL(f, dir), { default: asset } = await import(url);
  const now = formatAsset(asset);
  if (now !== readFileSync(url, 'utf8')) { writeFileSync(url, now); console.log(`assets/${f}`); }
}
