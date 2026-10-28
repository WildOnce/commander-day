// Shared app context + tiny HTML helpers.
import { Store, DEVICE } from './sync.js';
import { DemoStore } from './demo-store.js';
import { esc, ls } from './util.js';
import { snapshot } from './logic.js';

export const MODE = ['host', 'tv'].includes(document.body.dataset.mode) ? document.body.dataset.mode : 'player';
// ?demo → self-contained offline test game with simulated players
export const DEMO = new URLSearchParams(location.search).has('demo') && document.body.dataset.mode !== 'host';
export const store = DEMO ? new DemoStore() : new Store();
export { DEVICE };

export const A = {
  snap: null, me: null, route: '', ui: {}, draft: null,
  undo: {}, delta: {}, dismissed: {}, celebrated: {}, hold: null,
};

export const meKey = () => `cz.me.${store.prefix}`;
export const me = () => (A.me && A.snap?.P[A.me]) || null;

let _render = () => {};
export const setRender = (fn) => { _render = fn; };
export const render = () => _render();

export function refresh() { A.snap = snapshot(store); }

export function go(route) {
  if (location.hash !== '#/' + route) location.hash = '#/' + route;
  else render();
}

export function toast(html, ms = 2600) {
  document.querySelectorAll('.toast').forEach((t) => t.remove());
  const t = document.createElement('div');
  t.className = 'toast';
  t.innerHTML = html;
  document.body.appendChild(t);
  setTimeout(() => t.remove(), ms);
}

/* HTML helpers */
export const panel = (title, body, { cls = '', right = '' } = {}) =>
  `<section class="panel ${cls}">${title != null ? `<div class="ph"><span>${esc(title)}</span><span>${right}</span></div>` : ''}${body}</section>`;
export const leader = (l, r, cls = '') =>
  `<div class="leader"><span class="l">${esc(l)}</span><span class="d"></span><span class="r ${cls}">${r}</span></div>`;
export const wubrg = (c = '') => `<span class="wubrg">${[...(c || '')].map((x) => `<i class="${esc(x)}"></i>`).join('')}</span>`;

export function topbar(left) {
  const st = store.status || [];
  const dots = st.map((s) => `<i class="dot ${s === 'online' ? 'on' : ''}"></i>`).join('');
  const sig = store.online ? (st.every((s) => s === 'online') ? 'STRONG' : 'WEAK') : 'LOST';
  return `<div class="top"><span>${left}</span><span class="sig">// SIGNAL ${'.'.repeat(4)} ${sig} ${dots}</span></div>`;
}

export const pname = (pid) => A.snap?.P[pid]?.name || '???';
export { esc, ls };
