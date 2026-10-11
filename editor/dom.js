// The editor's page (see editor.js): its elements by id, new ones (el), the icons on its buttons
import { unsafeHTML } from './lit/directives/unsafe-html.js';

export const $ = (id) => document.getElementById(id);
export const el = (tag, props = {}, ...kids) => { const e = Object.assign(document.createElement(tag), props); e.append(...kids); return e; };
export const css = (name) => getComputedStyle(document.documentElement).getPropertyValue(name).trim();
// the icons on the buttons (24 × 24, drawn in lines in the text's color)
const ICONS = {
  undo: '<path d="M9 14 4 9l5-5"/><path d="M4 9h10.5a5.5 5.5 0 0 1 0 11H11"/>',
  redo: '<path d="m15 14 5-5-5-5"/><path d="M20 9H9.5a5.5 5.5 0 0 0 0 11H13"/>',
  revert: '<path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/>',
  save: '<path d="M15.2 3a2 2 0 0 1 1.4.6l3.8 3.8a2 2 0 0 1 .6 1.4V19a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z"/><path d="M17 21v-7a1 1 0 0 0-1-1H8a1 1 0 0 0-1 1v7"/><path d="M7 3v4a1 1 0 0 0 1 1h7"/>',
  cog: '<path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/>',
  back: '<path d="m15 18-6-6 6-6"/>',
  keyboard: '<rect x="2" y="6" width="20" height="12" rx="2"/><path d="M6 10h.01M10 10h.01M14 10h.01M18 10h.01M7 14h10"/>',
  play: '<path d="M7 4.5v15l12.5-7.5z" fill="currentColor"/>',
  pause: '<rect x="6" y="4.5" width="4" height="15" rx="1" fill="currentColor"/><rect x="14" y="4.5" width="4" height="15" rx="1" fill="currentColor"/>',
  up: '<path d="m5 12 7-7 7 7"/><path d="M12 19V5"/>',
  down: '<path d="M12 5v14"/><path d="m19 12-7 7-7-7"/>',
  copy: '<rect x="8" y="8" width="14" height="14" rx="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/>',
  paste: '<rect x="8" y="2" width="8" height="4" rx="1"/><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/>',
  trash: '<path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2"/>',
  x: '<path d="M18 6 6 18M6 6l12 12"/>',
  plus: '<path d="M5 12h14"/><path d="M12 5v14"/>',
  pivot: '<circle cx="12" cy="12" r="3"/><path d="M12 2v5M12 17v5M2 12h5M17 12h5"/>',
  key: '<path d="M12 3.5 20.5 12 12 20.5 3.5 12z" fill="currentColor"/>',
  unkey: '<path d="M12 3.5 20.5 12 12 20.5 3.5 12z"/><path d="m4 20 16-16"/>',
  eye: '<path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7-10-7-10-7z"/><circle cx="12" cy="12" r="3"/>',
  eyeOff: '<path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7-10-7-10-7z"/><path d="m4 20 16-16"/>',
  keyed: '<path d="M12 3.5 20.5 12 12 20.5 3.5 12z"/>',
  // a layer's rules (see the lists of parts), and a shape doing otherwise
  joined: '<path d="M8.5 6.5a5.5 5.5 0 1 0 0 11c1.6 0 2.5-.7 3.5-1.6 1 .9 1.9 1.6 3.5 1.6a5.5 5.5 0 1 0 0-11c-1.6 0-2.5.7-3.5 1.6-1-.9-1.9-1.6-3.5-1.6z"/>',
  outlined: '<circle cx="12" cy="12" r="8" stroke-width="3"/>',
  hits: '<path d="m4 4 4.5 4.5M20 4l-4.5 4.5M4 20l4.5-4.5M20 20l-4.5-4.5"/><circle cx="12" cy="12" r="2.5"/>',
  clipped: '<rect x="3" y="3" width="18" height="18" rx="6" stroke-dasharray="3 3"/><circle cx="12" cy="12" r="4" fill="currentColor"/>',
  far: '<circle cx="12" cy="12" r="8"/><path d="M12 4a8 8 0 0 1 0 16z" fill="currentColor"/>',
  line: '<path d="M4 19c6 0 7-13 16-14"/>',
  overEye: '<path d="M3 17s3.4-5 9-5 9 5 9 5"/><circle cx="12" cy="16" r="2"/><path d="M5 5h14"/>',
};
export const icon = (name) => unsafeHTML(svg(name)); // (in a template)
export const svg = (name) => `<svg class="i" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[name]}</svg>`;
// a button with an icon: its text beside it, or none (what it does: its title, its tooltip)
export function iconBtn(name, text, props = {}) {
  const b = el('button', { ...props, innerHTML: svg(name) });
  b.classList.add(text ? 'withIcon' : 'icon');
  if (text) b.append(el('span', { textContent: text })); else b.setAttribute('aria-label', props.title || name);
  return b;
}
for (const b of document.querySelectorAll('button[data-icon]')) { // (the page's own: data-icon, their text kept beside it)
  const text = b.textContent.trim();
  b.innerHTML = svg(b.dataset.icon); b.classList.add(text ? 'withIcon' : 'icon');
  if (text) b.append(el('span', { textContent: text })); else b.setAttribute('aria-label', b.title);
}

