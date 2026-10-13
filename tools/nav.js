// The tools' bar, first in a page's header (the editor, balance, settings, font): a link to each, the page open marked,
// in the same tab; the game with ?cheats. The links from where this file is, so they work wherever the game is served
const PAGES = [['Game', './?cheats'], ['Editor', 'editor/'], ['Balance', 'balance/'], ['Settings', 'settings/'], ['Font', 'font/']];
const root = new URL('../', import.meta.url), here = location.pathname.replace(/index\.html$/, '');

document.head.insertAdjacentHTML('beforeend', `<style>
  nav.tools { display: flex; gap: 2px; background: var(--bg); border: 1px solid var(--line); border-radius: 7px; padding: 2px; margin-right: 8px; }
  nav.tools a { padding: 3px 12px; border-radius: 5px; color: var(--dim); text-decoration: none; }
  nav.tools a:hover { color: var(--ink); }
  nav.tools a.on { background: var(--panel); color: var(--ink); font-weight: 600; box-shadow: 0 0 0 1px var(--line); }
</style>`);
const nav = document.createElement('nav');
nav.className = 'tools';
for (const [text, path] of PAGES) {
  const a = Object.assign(document.createElement('a'), { textContent: text, href: new URL(path, root).href });
  if (new URL(a.href).pathname === here && path !== PAGES[0][1]) a.className = 'on';
  nav.append(a);
}
document.querySelector('header').prepend(nav);
