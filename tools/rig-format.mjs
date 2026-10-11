// node tools/rig-format.mjs (npm run rigs) — writes every asset (assets/*.js) the way the editor saves it (see
// rig-format.js), so a save changes only what was edited
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { formatAsset } from './rig-format.js';

const dir = new URL('../assets/', import.meta.url);
for (const f of readdirSync(dir).filter((f) => f.endsWith('.js'))) {
  const url = new URL(f, dir), { default: asset } = await import(url);
  const now = formatAsset(asset);
  if (now !== readFileSync(url, 'utf8')) { writeFileSync(url, now); console.log(`assets/${f}`); }
}
