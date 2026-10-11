// A rig's build (its data: see animals/*.js) as source, the way the files have it: an object literal, each part on a
// line of its own when it will not fit on one, numbers to three places. The editor writes it back between the
// `// @build` and `// @end` lines of an animal's file (see tools/serve.mjs); node tools/rig-format.mjs does it for all.

const WIDTH = 150;
const KEY = /^[A-Za-z_$][\w$]*$/;
const num = (n) => String(Math.round(n * 1000) / 1000);
const key = (k) => (KEY.test(k) ? k : `'${k}'`);

// one line, or null when a part needs lines of its own
function inline(v) {
  if (typeof v === 'number') return num(v);
  if (typeof v === 'string') return `'${v.replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`;
  if (typeof v === 'boolean' || v === null) return String(v);
  if (Array.isArray(v)) { const parts = v.map(inline); return parts.includes(null) ? null : `[${parts.join(', ')}]`; }
  if (typeof v === 'object') {
    const parts = Object.entries(v).filter(([, x]) => x !== undefined).map(([k, x]) => { const s = inline(x); return s === null ? null : `${key(k)}: ${s}`; });
    return parts.includes(null) ? null : parts.length ? `{ ${parts.join(', ')} }` : '{}';
  }
  return null;
}

// a value at an indent (in spaces), its first line after `lead` (how much of its line comes before it)
function block(v, indent, lead) {
  const one = inline(v);
  if (one !== null && lead + one.length <= WIDTH) return one;
  const pad = ' '.repeat(indent + 2);
  if (Array.isArray(v)) return `[\n${v.map((x) => `${pad}${block(x, indent + 2, indent + 2)},`).join('\n')}\n${' '.repeat(indent)}]`;
  if (v && typeof v === 'object') {
    const lines = Object.entries(v).filter(([, x]) => x !== undefined).map(([k, x]) => `${pad}${key(k)}: ${block(x, indent + 2, indent + 2 + key(k).length + 2)},`);
    return `{\n${lines.join('\n')}\n${' '.repeat(indent)}}`;
  }
  return one;
}

export const formatBuild = (build) => `export const build = ${block(build, 0, 'export const build = '.length)};`;

// an asset's file (assets/<name>.js, see asset.js): the object as data, a module the game imports as it is
export const formatAsset = (asset) => `// ${asset.name}: an asset (see asset.js), written by the editor and tools/assets.mjs; data only\nexport default ${block(asset, 0, 'export default '.length)};\n`;

// an animal's file with its build replaced (between the `// @build` line and the `// @end` line)
export function spliceBuild(source, build) {
  const m = /(\/\/ @build[^\n]*\n)[\s\S]*?\n(\/\/ @end)/.exec(source);
  if (!m) throw new Error('no // @build … // @end in the file');
  return source.slice(0, m.index) + m[1] + formatBuild(build) + '\n' + m[2] + source.slice(m.index + m[0].length);
}
