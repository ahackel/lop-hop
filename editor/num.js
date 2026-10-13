// A number to set, as Figma has it (the editor's inspector, see numIn in inspector.js; the settings page): a box with
// its name in it or beside it (drag the name: on by step a pixel, ⇧ ten times as fast, ⌥ a tenth), its unit after it;
// typed: a number or a sum (2*3; *2, +1: of what it is), the arrow keys a step (⇧ ten, ⌥ a tenth). A slider beside it
// only for one between a least and a most (min and max), if range. whole: whole numbers; unit, scale: shown as so many
// times what is kept (an angle: degrees, kept as radians); tip: its tooltip. What it tells: live(x) as it is dragged,
// done() after; set(x) a value typed or stepped. The field: .scrub (to drag it by a name of its own, beside it),
// .show(x) (its value, set from outside)
const CSS = `
  .num { display: flex; align-items: center; gap: 8px; min-width: 0; }
  .num .box { display: flex; align-items: center; flex: 1; min-width: 0; height: 26px; background: var(--bg); border: 1px solid transparent; border-radius: 5px; padding-left: 7px; }
  .num.ranged .box { flex: none; width: 68px; }
  .num .box:hover { border-color: var(--line); }
  .num .box:focus-within { border-color: var(--sel); }
  .num .lbl { color: var(--dim); font-size: 11px; min-width: 10px; padding-right: 2px; white-space: nowrap; }
  .num input[type=text] { border: 0; border-radius: 0; background: transparent; width: 100%; min-width: 0; padding: 0 6px 0 3px; height: 24px; font: inherit; color: inherit; font-variant-numeric: tabular-nums; }
  .num input[type=text]:focus { outline: none; }
  .num .unit { color: var(--dim); font-size: 11px; padding-right: 7px; margin-left: -4px; white-space: nowrap; pointer-events: none; }
  .num input[type=range] { flex: 1; min-width: 40px; height: 14px; margin: 0; accent-color: var(--accent); }
  .scrub { cursor: ew-resize; user-select: none; -webkit-user-select: none; }
  body.scrubbing, body.scrubbing * { cursor: ew-resize !important; user-select: none; }
`;
document.head.insertAdjacentHTML('afterbegin', `<style>${CSS}</style>`); // (first: a page's own rules win)

const make = (tag, props, ...kids) => { const e = Object.assign(document.createElement(tag), props); e.append(...kids); return e; };

// what was typed in a number's box: a number, or a sum of numbers (+ - * / and brackets; one that starts with * / +:
// of what it is, now); not one: NaN
export function typed(text, now) {
  let t = text.trim().replace(/,/g, '.').replace(/[^\d.+\-*/()\s]/g, (c) => (/[a-z°%×]/i.test(c) ? '' : c));
  if (/^[*/+]/.test(t)) t = `${now}${t}`;
  if (!t || !/^[\d.+\-*/()\s]+$/.test(t)) return NaN;
  try { return +Function(`"use strict"; return (${t});`)(); } catch { return NaN; }
}

export function numField(value, { step = 0.1, min, max, whole = false, range: ranged = true, label, unit = '', scale = 1, tip, live = () => {}, done = () => {}, set = () => {} } = {}) {
  let v = +(+value || 0).toFixed(3);
  const put = (x) => { x = whole ? Math.round(x) : +x.toFixed(3); if (min !== undefined) x = Math.max(min, x); if (max !== undefined) x = Math.min(max, x); return x; };
  const shown = (x) => String(+(x * scale).toFixed(scale === 1 ? 3 : 1));
  const box = make('input', { type: 'text', inputMode: 'decimal', value: shown(v), spellcheck: false, autocomplete: 'off' });
  const range = ranged && min !== undefined && max !== undefined ? make('input', { type: 'range', min: Math.min(min, v) * scale, max: Math.max(max, v) * scale, step: (whole ? 1 : step / 2) * scale, value: v * scale }) : null;
  const show = (x) => { v = x; box.value = shown(x); if (range) range.value = x * scale; };
  const going = (x) => { show(x); live(x); };
  const to = (x) => { x = put(x); show(x); set(x); };
  if (range) { range.oninput = () => going(put(+range.value / scale)); range.onchange = () => done(v); }
  box.onchange = () => { const x = typed(box.value, v * scale); if (Number.isFinite(x)) to(x / scale); else show(v); };
  box.onfocus = () => box.select();
  box.onkeydown = (e) => {
    if (e.key === 'Enter') { box.blur(); return; }
    if (e.key === 'Escape') { show(v); box.blur(); e.stopPropagation(); return; }
    if (e.key !== 'ArrowUp' && e.key !== 'ArrowDown') return;
    e.preventDefault();
    to(v + (e.key === 'ArrowUp' ? 1 : -1) * (whole ? 1 : step) * (e.shiftKey ? 10 : e.altKey ? 0.1 : 1));
  };
  const scrub = (e) => { // (dragging a name; a click without a drag: into the box)
    if (e.button) return;
    e.preventDefault();
    const t = e.currentTarget, x0 = e.clientX, from = v;
    let moved = false;
    t.setPointerCapture(e.pointerId); document.body.classList.add('scrubbing');
    const move = (m) => { if (Math.abs(m.clientX - x0) < 2 && !moved) return; moved = true; going(put(from + (m.clientX - x0) * (whole ? 0.25 : step) * (m.shiftKey ? 10 : m.altKey ? 0.1 : 1))); };
    const up = () => { t.removeEventListener('pointermove', move); t.removeEventListener('pointerup', up); t.removeEventListener('pointercancel', up); document.body.classList.remove('scrubbing'); if (moved) done(v); else box.focus(); };
    t.addEventListener('pointermove', move); t.addEventListener('pointerup', up); t.addEventListener('pointercancel', up);
  };
  const lbl = label !== undefined ? make('span', { className: 'lbl scrub', textContent: label }) : null;
  if (lbl) lbl.addEventListener('pointerdown', scrub);
  const wrap = make('span', { className: `num${range ? ' ranged' : ''}` }, make('span', { className: 'box' }, ...(lbl ? [lbl] : []), box, ...(unit ? [make('span', { className: 'unit', textContent: unit })] : [])), ...(range ? [range] : []));
  if (tip) wrap.title = tip;
  if (!lbl) wrap.scrub = scrub; // (the setting's name drags it)
  wrap.show = (x) => { if (document.activeElement !== box) show(x); };
  return wrap;
}
