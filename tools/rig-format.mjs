// node tools/rig-format.mjs — writes every animal's build (animals/*.js) the way the editor does (see rig-format.js);
// one whose build is an asset (assets/*.js) is left as it is
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { spliceBuild } from './rig-format.js';

const dir = new URL('../animals/', import.meta.url);
for (const f of readdirSync(dir).filter((f) => f.endsWith('.js') && f !== 'kit.js')) {
  const url = new URL(f, dir), { build } = await import(url);
  const was = readFileSync(url, 'utf8');
  if (!was.includes('// @build')) continue; // (its build: from its asset, assets/*.js)
  const now = spliceBuild(was, build);
  if (now !== was) { writeFileSync(url, now); console.log(`animals/${f}`); }
}
