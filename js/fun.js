// Just for fun: burn flames, the Homer crab, mill gags and Herr Fuchsbaum's personal roast.
// Purely visual – nothing here ever writes data.
import { A, toast, esc, pname } from './ctx.js';
import { sprite } from './sprites.js';

/* ───────────── who is the miller? ───────────── */

const FUCHS = /fu[cg]h?s?baum|filippo/i;
const HOMER = /homer,? the hermit/i;
export function isFuchsbaum(pid) {
  const p = A.snap?.P[pid];
  return !!p && (FUCHS.test(p.name) || (p.decks || []).some((d) => HOMER.test(d.name)));
}
const playsHomer = (g, pid) => HOMER.test(g.seats.find((s) => s.pid === pid)?.deckName || '');

/* ───────────── quips ───────────── */

const MILL = [
  'BIBLIOTHEK: 0 · FRIEDHOF: ALLES', 'WER BRAUCHT SCHON KARTEN?', 'DECK ALLE. LEBEN EGAL.',
  'IN DEN FRIEDHOF GESCHAUFELT 📚', 'ZIEH DOCH NOCH EINE … OH.', 'AB IN DIE ALTPAPIER-TONNE',
];
const FUCHS_MILL = [
  'DANKE FÜR DEN GROSSEN SPASS, FILIPPO.', 'HOMER HAT DEINE BIBLIOTHEK INS MEER GESPÜLT 🦀',
  'FUCHSBAUM 1 · DEINE BIBLIOTHEK 0', 'DIE KRABBE HAT HUNGER. AUF KARTEN.', 'SCHON WIEDER FILIPPO …',
  'HERR FUCHSBAUM BEDANKT SICH FÜR IHRE BÜCHERSPENDE', 'HOMER SAMMELT. DU VERLIERST.',
  'MAGIC? NEIN. LESEZIRKEL IM FRIEDHOF.', 'EIN APPLAUS FÜR DEN ALTPAPIER-KÖNIG 👏',
];
const CRAB = ['🦀 HOMER KLAUT', '🦀 KNIPS!', '🦀 MEINS!', '🦀 SCHNAPP', '🦀 FILIPPO WAR’S'];
const pickBy = (arr, n) => arr[Math.abs(n) % arr.length];

export function millQuip(s) {
  if (s.out?.by && isFuchsbaum(s.out.by)) return pickBy(FUCHS_MILL, s.out.at);
  return pickBy(MILL, s.out?.at || 0);
}
export function winSub(pid) {
  return isFuchsbaum(pid)
    ? '> FILIPPO HAT ALLE BIBLIOTHEKEN GELEERT. DANKE FÜR DEN GROSSEN SPASS. 🦀'
    : null;
}
export function feedMill(byPid) {
  return byPid && isFuchsbaum(byPid) ? pickBy(FUCHS_MILL, Date.now() >> 14) : null;
}

/* ───────────── effects layer (outside the re-rendered DOM, so nothing restarts) ───────────── */

function tileEl(i) { return document.querySelector(`.tile[data-fx="${i}"]`); }

export function playFx(i, kind, label = '') {
  const t = tileEl(i);
  if (!t) return;
  const r = t.getBoundingClientRect();
  const el = document.createElement('div');
  el.className = `fxl fx-${kind}${t.closest('.flip') ? ' flip' : ''}`;
  Object.assign(el.style, { left: r.left + 'px', top: r.top + 'px', width: r.width + 'px', height: r.height + 'px' });
  if (kind === 'burn') {
    el.innerHTML = `<div class="glow"></div>${[8, 24, 42, 60, 78].map((x, k) => `<span class="fl" style="left:${x}%;animation-delay:${k * 0.09}s">${sprite('flame', 7)}</span>`).join('')}
      <div class="lbl">🔥 ${esc(label)}</div>`;
  } else if (kind === 'crab') {
    el.innerHTML = `<span class="crab">${sprite('crab', 5)}<b>${esc(label)}</b></span>`;
  } else if (kind === 'mill') {
    el.innerHTML = `<span class="crab">${sprite('crab', 6)}</span>${[0, 1, 2, 3].map((k) => `<span class="bk" style="left:${20 + k * 18}%;animation-delay:${0.3 + k * 0.15}s">${sprite('book', 4)}</span>`).join('')}
      <div class="lbl">📚 GEMILLT!</div>`;
  }
  document.body.appendChild(el);
  setTimeout(() => el.remove(), kind === 'mill' ? 3200 : 2400);
}

/** Compare the game with what this device last saw and fire effects for what changed. */
export function fxScan(g) {
  if (!g) return;
  A.fxPrev ||= {};
  const prev = A.fxPrev[g.id];
  const now = g.seats.map((s) => ({ pid: s.pid, life: s.life, out: s.out?.at || 0 }));
  A.fxPrev[g.id] = now;
  if (!prev || prev.length !== now.length) return; // first look at this game: nothing to animate
  const fuchs = g.seats.find((s) => isFuchsbaum(s.pid) || playsHomer(g, s.pid));
  g.seats.forEach((s, i) => {
    const before = prev.find((p) => p.pid === s.pid);
    if (!before) return;
    const d = s.life - before.life;
    if (s.out && !before.out) {
      if (s.out.cause === 'mill') {
        playFx(i, 'mill');
        if (s.out.by && isFuchsbaum(s.out.by)) toast(`🦀 <b>${esc(pname(s.out.by))}</b> mill't <b>${esc(pname(s.pid))}</b> – ${esc(millQuip(s))}`, 4500);
      }
      return;
    }
    if (d <= -7) playFx(i, 'burn', `${d}`);
    else if (d < 0 && fuchs && fuchs.pid !== s.pid && !fuchs.out && Math.random() < 0.3) playFx(i, 'crab', `${pickBy(CRAB, s.life)} ${d}`);
  });
}
