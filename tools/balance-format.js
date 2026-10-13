// The tuning constants of a game file (level.js, course.mjs, game.js), for the balance page (balance/): the
// `NAME = number` of its top-level const (or let: KNEE, TOP) lines (not `DT = 1 / 60`: worked out), a comment after them left as it is.
//   readConsts(src) → { NAME: number }        setConsts(src, { NAME: number }) → src with those numbers in place
const LINE = /^(export )?(const|let) [A-Z]/;
const PAIR = /\b([A-Z][A-Z0-9_]*) = (-?\d+(?:\.\d+)?)(?![\d.]|\s*[-+*/])/g;
const split = (line) => { const i = line.indexOf('//'); return i < 0 ? [line, ''] : [line.slice(0, i), line.slice(i)]; };

export function readConsts(src) {
  const out = {};
  for (const line of src.split('\n')) {
    if (LINE.test(line)) for (const [, name, v] of split(line)[0].matchAll(PAIR)) if (!(name in out)) out[name] = +v;
  }
  return out;
}

export function setConsts(src, values) {
  return src.split('\n').map((line) => {
    if (!LINE.test(line)) return line;
    const [code, note] = split(line);
    return code.replace(PAIR, (all, name) => (name in values ? `${name} = ${+(+values[name]).toFixed(6)}` : all)) + note;
  }).join('\n');
}
