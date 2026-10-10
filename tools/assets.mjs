// An animal made into an asset (assets/<name>.js, see asset.js): its rig's build (animals/<name>.js) and its depth
// (turn3d.js DEPTH, or flat) in one file of data. node tools/assets.mjs rabbit; once only (it will not write over an
// asset: the asset is the animal's from then on, its file importing its build from it)
import { writeFileSync, existsSync } from 'node:fs';
import { fromRig } from '../asset.js';
import { formatAsset } from './rig-format.js';

const name = process.argv[2], file = new URL(`../assets/${name}.js`, import.meta.url);
if (!/^[a-z]+$/.test(name || '')) throw new Error('which animal? node tools/assets.mjs rabbit');
if (existsSync(file)) throw new Error(`assets/${name}.js is there already`);
const { build } = await import(`../animals/${name}.js`), { DEPTH } = await import('../turn3d.js');
writeFileSync(file, formatAsset(fromRig(name, build, DEPTH[name])));
console.log(`wrote assets/${name}.js`);
