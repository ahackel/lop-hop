// Play (see editor.js, play.js): how the animal is handled, its numbers in the inspector; what to try on the stage
import { ANIMALS, HANDLING } from '../art.js';
import { $, el, iconBtn } from './dom.js';
import { field, inspect, numIn, stack } from './inspector.js';
import * as sandbox from './play.js';
import { base, build, commit, kind, skin } from './state.js';

// how it is handled (see HANDLING in art.js, play.js): each number, from to, what it does; what its file doesn't set is
// as HANDLING has it (a number set back to that: gone from the file)
const HANDLED = {
  held: ['Carried', { at: 'where the hand holds it, from the middle of its back', sag: [0, 3, 'how much its hips and head droop'], tip: [0, 4, 'how much moving it tips it'],
    hang: [2, 40, 'how far under the hand it seems to hang: longer, slower swings'], settle: [0, 12, 'how fast its swinging dies down'], most: [0.1, 1.5, 'the most it tips, radians'] }],
  squirm: ['Squirming', { fits: [0, 6, 'how quick its fits come'], strength: [0, 4, 'how hard it squirms'], paddle: [0, 4, 'how much its legs paddle'], nod: [0, 0.5, 'how much its head nods'] }],
  dropped: ['Dropped', { righting: [50, 2000, 'how hard it rights itself as it falls'], damping: [0, 120, 'how little that wobbles'], squash: [0, 0.8, 'how flat it lands'],
    squashFor: [0.05, 0.6, 'for how long, seconds'] }],
  petted: ['Petted', { lean: [0, 0.3, 'how far it leans with the hand, radians'], duck: [0, 3, 'how far its head ducks into the hand'], nuzzle: [0, 0.6, 'how far its head turns down'],
    ears: [0, 3, 'how far its ears lie back'], wag: [0, 1.5, 'how far its tail wags, radians'], wagRate: [2, 40, 'how fast'], happy: [0, 1, 'how much it must like it to shut its eyes happily'] }],
  fed: ['Fed', { stretch: [0, 6, 'how far its head stretches for a treat'], upright: [0, 1.6, 'how far up it turns for one held high, radians'],
    rears: [0, 1, 'how far up on its hind legs it gets for one'], hop: [0, 30, 'the highest it hops after one held over it, pixels (0: never)'], chews: [1, 8, 'nods as it eats', true], nod: [0, 10, 'how big'], chewFor: [0.2, 3, 'for how long, seconds'] }],
};
const CHAIN = { stiffness: [0, 3000, 'how hard it springs back'], damping: [0, 80, 'how little it rings'], weight: [0, 300, 'how much it hangs down'] };
const stepOf = (min, max) => 10 ** Math.floor(Math.log10((max - min) / 100));
const handled = (g, k) => build.handling?.[g]?.[k] ?? HANDLING[g][k];
function setHandling(g, k, v) {
  const h = (build.handling ||= {}), o = (h[g] ||= {});
  if (JSON.stringify(v) === JSON.stringify(HANDLING[g][k])) delete o[k]; else o[k] = v;
  if (!Object.keys(o).length) delete h[g];
  if (!Object.keys(h).length) delete build.handling;
}
export function inspectPlay(box) {
  box.append(el('h2', { textContent: `Handling the ${ANIMALS[kind].name.toLowerCase()}`, title: `${skin ? `A skin of the ${base}: handled as the ${base} is (changing it changes both). ` : ''}Orange: set in its file; the rest as every animal is. They are tried on the stage at once, and in the preview below.` }));
  const own = (g, k) => build.handling?.[g]?.[k] !== undefined;
  for (const [g, [title, specs]] of Object.entries(HANDLED)) {
    const head = el('div', { className: `group${build.handling?.[g] ? ' own' : ''}` }, el('span', { textContent: title }));
    if (build.handling?.[g]) head.append(iconBtn('revert', 'usual', { title: `${title}: as every animal is (as art.js has it)`, onclick: () => { commit(() => { delete build.handling[g]; if (!Object.keys(build.handling).length) delete build.handling; }); inspect(); } }));
    box.append(head);
    for (const [k, spec] of Object.entries(specs)) {
      let input, note = spec[2], f = null;
      const set = (x) => { setHandling(g, k, x); f?.classList.toggle('own', own(g, k)); }; // (marked as set in its file, or not, as it changes)
      if (k === 'at') {
        const now = () => handled(g, k).slice();
        input = stack(handled(g, k).map((v, j) => numIn(v, (x) => { const q = now(); q[j] = x; set(q); }, { label: 'xy'[j] })));
        note = spec;
      } else if (k === 'rears') {
        const auto = handled(g, k) === null, legs = el('input', { type: 'checkbox', checked: auto, onchange: () => { commit(() => setHandling(g, k, legs.checked ? null : 0.5)); inspect(); } });
        input = el('span', { className: 'num' }, el('label', {}, legs, ' by its legs'), ...(auto ? [] : [numIn(handled(g, k), set, { min: 0, max: 1, step: 0.01 })]));
      } else {
        const [min, max, , whole] = spec;
        input = numIn(handled(g, k), set, whole ? { step: 1, min, max, whole: true } : { min, max, step: stepOf(min, max) });
      }
      f = field(k, input, note);
      if (own(g, k)) f.classList.add('own');
      box.append(f);
    }
  }
  if (!build.chains || !Object.keys(build.chains).length) return;
  box.append(el('div', { className: 'group' }, el('span', { textContent: 'Ears and tails' })));
  for (const [n, c] of Object.entries(build.chains)) {
    box.append(el('div', { className: 'note', style: 'margin-top:6px', textContent: `${n}${c.ear ? ' (an ear)' : ''}` }));
    for (const [k, [min, max, note]] of Object.entries(CHAIN)) box.append(field(k, numIn(c[k] ?? 0, (x) => { c[k] = x; }, { min, max: Math.max(max, (c[k] || 0) * 2), step: stepOf(min, max) }), note));
  }
}
// what can be done on the stage, in Play
export function playHelp(box) {
  const tips = [['Pick it up', 'press on it and pull up; carry it about'], ['Drop it', 'let go, high or low'], ['Pet it', 'press and rub sideways along its back'],
    ['Make it duck', 'press it down'], ['Feed it', 'take the treat over it and hold it out; let go at its mouth (or drop it)'], ['A hop', 'double-click it']];
  for (const [t, d] of tips) box.append(el('div', { className: 'row', style: 'cursor:default', title: d }, el('span', { textContent: t })));
}
$('slow').onchange = () => { sandbox.play.slow = $('slow').checked; };
$('replay').onclick = () => sandbox.reset(kind);

