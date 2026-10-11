// The wolf: the fox's build, in grey (dark grey socks and ear tips). (Its shapes are the fox's: edit those.)
import { build as fox, make as makeFox } from './fox.js';

// @build: the rig, edited in the editor (editor/), which rewrites what is between these lines
export const build = { recolor: { FOX: 'WOLF', BROWN: 'WOLF_DARK' } };
// @end

// the fox, recolored
export const make = (rig) => ({ ...makeFox(fox), ...rig });

export default make(build);
