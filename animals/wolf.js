// The wolf: the fox's build, in grey (dark grey socks and ear tips). (Its shapes are the fox's: edit those.)
import { build as fox, make as makeFox } from './fox.js';
import { toBuild } from '../asset.js';
import asset from '../assets/wolf.js';

// its build: its file (assets/wolf.js, see asset.js), which the editor saves into
export const build = toBuild(asset);

// the fox, recolored
export const make = (rig) => ({ ...makeFox(fox), ...rig });

export default make(build);
