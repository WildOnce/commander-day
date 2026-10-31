// Life counter: full-screen table view, controls, eliminations, results.
import { A, store, DEVICE, MODE, render, toast, panel, leader, esc, pname, me, go } from './ctx.js';
import { gameId, newGame, setLife, setCmd, settle, endGame, timerInfo, alive, cmdFrom, gameStart } from './logic.js';
import { sprite, confetti } from './sprites.js';
import { clock, buzz, pick } from './util.js';
import { fxScan, koQuip, winSub } from './fun.js';
const mins = (ms) => { const t = Math.max(0, Math.ceil(ms / 1000)); return `${Math.floor(t / 60)}:${String(t % 60).padStart(2, '0')}`; };

const QUIPS = [
  'AB AN DIE BAR 🍺', 'DART WARTET 🎯', 'NO RECORD OF RETURN FOUND', 'ASH // RESIDUAL MATTER', 'SIGNAL LOST',
  'RESPAWN IN DER NÄCHSTEN RUNDE', 'DAS DECK WAR SCHULD', 'GG. WIRKLICH.', 'LEAVE THE FALLEN, RIDE ON', 'MULLIGAN INS JENSEITS',
];
const CAUSE = { life: 'LEBEN AUF 0', poison: 'VERGIFTET', cmd: 'COMMANDER-SCHADEN', concede: 'AUFGEGEBEN', manual: 'K.O.', mill: 'GEMILLT' };
const causeTxt = (c, by) => (c === 'mill' && !by ? 'SELF-MILL' : CAUSE[c] || c || 'K.O.');

const backTo = () => (A.route.startsWith('game/') ? (MODE === 'host' ? 'live' : 'home') : MODE === 'host' ? 'me' : 'home');

export function myTable(snap = A.snap, pid = A.me) {
  const r = snap?.live;
  if (!r || !pid) return null;
  const ts = r.tables.filter((t) => t.players.includes(pid));
  const t = ts[ts.length - 1];
  return t ? { round: r, table: t, gid: gameId(r, t) } : null;
}

function currentRef() {
  if (A.route.startsWith('game/')) {
    const gid = A.route.slice(5);
    for (const r of A.snap.rounds) for (const t of r.tables) if (gameId(r, t) === gid) return { gid, round: r, table: t };
    return null;
  }
  return myTable();
}

export function timerLabel(round, cfg) {
  const ti = timerInfo(round, cfg);
  if (!round) return { txt: '--:--', ti };
  if (ti.phase === 'idle') return { txt: `${mins(ti.playMs)}`, ti };
  if (ti.phase === 'ended') return { txt: 'TIME OUT', ti };
  if (ti.phase === 'ot') return { txt: `OT ${mins(ti.left)}`, ti };
  return { txt: (ti.paused ? '‖ ' : '') + mins(ti.left), ti };
}

/* ───────────── mutations ───────────── */

export function mutate(gid, fn, { debounce = 300 } = {}) {
  const cur = store.get('game/' + gid); // always the freshest local state, never a stale snapshot
  if (!cur) return;
  const g = structuredClone(cur);
  (A.undo[gid] ||= []).push(cur);
  if (A.undo[gid].length > 150) A.undo[gid].shift();
  fn(g);
  const fresh = settle(g);
  store.put('game/' + gid, g, { debounce });
  for (const s of fresh) {
    buzz([60, 40, 160]);
    if (s.out.cause === 'life' && !g.ended) A.ui.sheet = { type: 'who', i: g.seats.indexOf(s) };
  }
  if (g.ended && !cur.ended) A.ui.sheet = null; // results take over the screen
}

/** Life totals can only change while the round timer runs (not before start, not while paused). */
export function lockedFor(roundId) {
  const r = A.snap.rounds.find((x) => x.id === roundId);
  const ti = timerInfo(r, A.snap.config);
  return ti.phase === 'idle' ? 'idle' : ti.paused ? 'paused' : null;
}

function bump(gid, i, d) {
  const g = store.get('game/' + gid);
  if (!g || g.controller !== DEVICE || lockedFor(g.roundId)) return;
  mutate(gid, (x) => setLife(x, x.seats[i].pid, d));
  const k = gid + ':' + i;
  const prev = A.delta[k];
  const now = Date.now();
  A.delta[k] = { v: prev && now - prev.t < 1800 ? prev.v + d : d, t: now };
  clearTimeout(A.deltaT);
  A.deltaT = setTimeout(render, 1850);
}

export function initLifeInput() {
  document.addEventListener('pointerdown', (e) => {
    const el = e.target.closest('[data-tap]');
    if (!el) return;
    e.preventDefault();
    if (A.hold) clearTimeout(A.hold.t); // second finger: never leave the first hold repeating forever
    const h = (A.hold = { gid: el.dataset.g, i: +el.dataset.i, dir: +el.dataset.tap, fired: false, at: Date.now(), el });
    h.t = setTimeout(function rep() {
      if (A.hold !== h || Date.now() - h.at > 3500) { if (A.hold === h) endHold(); return; } // stale or stuck hold
      h.fired = true; bump(h.gid, h.i, h.dir * 10); buzz(18);
      const life = h.el.closest('.tile')?.querySelector('.life'); // DOM is frozen while holding: update the number in place
      const g = store.get('game/' + h.gid); if (life && g?.seats[h.i]) life.textContent = g.seats[h.i].life;
      h.t = setTimeout(rep, 420);
    }, 450);
  });
  const up = () => {
    const h = A.hold; if (!h) return;
    clearTimeout(h.t);
    A.hold = null;
    if (!h.fired) { bump(h.gid, h.i, h.dir); buzz(6); }
    render();
  };
  const endHold = () => { if (A.hold) { clearTimeout(A.hold.t); A.hold = null; render(); } };
  window.addEventListener('pointerup', up);
  window.addEventListener('pointercancel', endHold);
  document.addEventListener('visibilitychange', endHold);
  document.addEventListener('contextmenu', (e) => { if (e.target.closest('.lcw')) e.preventDefault(); });

  // Seats: drag a player's name onto another tile to swap places.
  const tileAt = (x, y) => document.elementFromPoint(x, y)?.closest('.tile[data-seat]');
  document.addEventListener('pointerdown', (e) => {
    const w = e.target.closest('.tile[data-seat] .who, .tile[data-seat] .deadfx');
    A.drag?.ghost?.remove();
    A.drag = null;
    if (!w) return;
    const t = w.closest('.tile');
    A.drag = { gid: t.dataset.g, i: +t.dataset.seat, x: e.clientX, y: e.clientY, t: Date.now(), on: false, name: t.querySelector('.who b')?.textContent || '' };
  });
  window.addEventListener('pointermove', (e) => {
    const d = A.drag; if (!d) return;
    if (!d.on) {
      if (Math.hypot(e.clientX - d.x, e.clientY - d.y) < 14) return;
      d.on = true; buzz(15);
      d.ghost = Object.assign(document.createElement('div'), { className: 'seatghost', textContent: '⇄ ' + d.name });
      document.body.appendChild(d.ghost);
      document.querySelector(`.tile[data-seat="${d.i}"]`)?.classList.add('dragsrc');
    }
    e.preventDefault();
    d.ghost.style.transform = `translate(${e.clientX}px, ${e.clientY}px) translate(-50%, -130%)`;
    const t = tileAt(e.clientX, e.clientY);
    document.querySelectorAll('.tile.droptgt').forEach((x) => x !== t && x.classList.remove('droptgt'));
    if (t && +t.dataset.seat !== d.i) t.classList.add('droptgt');
  }, { passive: false });
  const drop = (e, ok) => {
    const d = A.drag; if (!d) return;
    A.drag = null;
    if (!d.on) return;
    d.ghost.remove();
    A.dragEnd = Date.now(); // swallow the click that follows the drop
    const t = ok && tileAt(e.clientX, e.clientY);
    if (t && t.dataset.g === d.gid && +t.dataset.seat !== d.i) swapSeats(d.gid, d.i, +t.dataset.seat);
    else render();
  };
  window.addEventListener('pointerup', (e) => drop(e, true));
  window.addEventListener('pointercancel', (e) => drop(e, false));
  document.addEventListener('click', (e) => { if (Date.now() - (A.dragEnd || 0) < 400) { e.stopPropagation(); e.preventDefault(); } }, true);
}

/** Swap two players' places at the table. Each keeps their colour (s.c) and all counters. */
function swapSeats(gid, a, b) {
  const g = store.get('game/' + gid);
  if (!g || g.controller !== DEVICE || g.ended || a === b || !g.seats[a] || !g.seats[b]) return render();
  mutate(gid, (x) => {
    x.seats.forEach((s, i) => { if (s.c == null) s.c = i; });
    [x.seats[a], x.seats[b]] = [x.seats[b], x.seats[a]];
  }, { debounce: 0 });
  for (const k in A.delta) if (k.startsWith(gid + ':')) delete A.delta[k];
  A.ui.sheet = null;
  buzz([20, 30, 20]);
  render();
}

/* ───────────── views ───────────── */

export function lifeView() {
  const s = A.snap;
  const ref = currentRef();
  if (!ref) {
    return { html: panel('LIFE COUNTER', `<div class="row" style="gap:14px">${sprite('beer', 4, 'float')}<div><div class="h2">${Date.now() < s.config.eventStart ? "NOCH NICHT" : "KEIN TISCH"}</div>
      <div class="muted small">${Date.now() < s.config.eventStart ? 'Der Life Counter wird am Spieltag freigeschaltet, sobald die Tische ausgelost sind.' : 'Du bist gerade keinem Tisch zugeteilt. Warte auf die Auslosung — oder ab an die Bar.'}</div></div></div>`), tabs: true };
  }
  const g = s.G[ref.gid];
  if (!g) return { html: preStart(ref), tabs: true };
  return { html: board(g, ref), full: true };
}

function preStart(ref) {
  const s = A.snap;
  const seats = ref.table.players.map((pid) => {
    const p = s.P[pid];
    return `<div class="seat ${pid === A.me ? 'me' : ''}"><div class="n">${esc(p?.name)}</div><div class="c">${esc(p?.decks?.[0]?.name || 'KEIN DECK')}</div></div>`;
  }).join('');
  return `<div class="stack">
    ${panel(`RUNDE ${ref.round.n} · TISCH ${ref.table.no}${ref.table.auto ? ' · BAR-TISCH' : ''}`, `
      <div class="row" style="gap:16px;margin-bottom:10px">${sprite('rider', 3, 'bob')}<div><div class="h1">TISCH ${ref.table.no}</div><div class="tag">${ref.table.players.length} SPIELER · START ${40} LEBEN</div></div></div>
      <div class="seatlist">${seats}</div>`, { cls: 'hi' })}
    ${panel('HINWEIS', `<div class="small muted">Nur <b>ein</b> Gerät pro Tisch startet den Counter. Alle anderen sehen live mit. Commander wählst du im Counter über den Namen.</div>`)}
    <button class="btn pri block" data-act="lc-start" data-g="${ref.gid}">▶ LIFE COUNTER STARTEN</button>
    <button class="btn block" data-act="nav" data-to="${backTo()}">← ZURÜCK</button>
  </div>`;
}

function board(g, ref) {
  const s = A.snap;
  const ctrl = g.controller === DEVICE;
  const n = g.seats.length;
  const nTop = Math.floor(n / 2);
  const idx = g.seats.map((_, i) => i);
  const top = idx.slice(0, nTop), bot = idx.slice(nTop);
  const { txt, ti } = timerLabel(ref.round, s.config);
  const lock = g.ended ? null : lockedFor(g.roundId);
  const tl = (i) => tile(g, i, ctrl && !lock, n);
  const ctrlSheets = ctrl;
  let html = `<div class="lcw ${lock ? 'locked' : ''}" data-g="${g.id}">
    ${nTop ? `<div class="lcrow flip" style="grid-template-columns:repeat(${top.length},1fr)">${top.map(tl).join('')}</div>` : ''}
    <div class="lcmid">
      <span class="row" style="gap:6px"><button class="ib" data-act="nav" data-to="${backTo()}" aria-label="Zurück zur Übersicht">←</button><button class="ib" data-act="lc-sheet" data-k="menu" aria-label="Menü">☰</button></span>
      <span class="tm ${ti.phase === 'ot' ? 'ot' : ''}" data-timer="${ref.round.id}">${txt}</span>
      <span class="tag">T${ref.table.no}</span>
      ${ctrl ? `<button class="ib" data-act="lc-undo" data-g="${g.id}" aria-label="Rückgängig">↶</button>` : '<span style="width:44px"></span>'}
    </div>
    <div class="lcrow" style="grid-template-columns:repeat(${bot.length},1fr)">${bot.map(tl).join('')}</div>
    ${!ctrl ? `<div class="viewer"><button class="chip" data-act="lc-take" data-g="${g.id}">LIVE · ${esc(g.controllerName || '?')} STEUERT · ÜBERNEHMEN</button></div>` : ''}
  </div>`;
  if (lock) html += `<div class="lockbox"><div class="row" style="gap:14px">${sprite(lock === 'idle' ? 'star' : 'beer', 4, 'float')}<div>
      <div class="h2">${lock === 'idle' ? 'WARTET AUF START' : 'PAUSE'}</div>
      <div class="small muted">${lock === 'idle' ? 'Der Life Counter wird freigeschaltet, sobald der Host den Rundentimer startet.' : 'Der Host hat den Timer pausiert. Geht gleich weiter.'}${ctrl ? ' Commander kannst du schon über ⋯ wählen.' : ''}</div></div></div></div>`;
  html += sheetHtml(g, ref, ctrlSheets, nTop);
  html += resultHtml(g, ref);
  return html;
}

function tile(g, i, ctrl, n) {
  const s = g.seats[i];
  const p = A.snap.P[s.pid];
  const now = Date.now();
  const dl = A.delta[g.id + ':' + i];
  const showD = ctrl && dl && now - dl.t < 1800 && dl.v;
  const cmdMax = Math.max(0, ...Object.values(s.cmd).flat());
  const tax = (s.tax[0] + s.tax[1]) * 2;
  const ctr = [
    cmdMax ? `<span>⚔${cmdMax}</span>` : '', s.poison ? `<span class="${s.poison >= 7 ? 'alert' : ''}">☠${s.poison}</span>` : '',
    s.energy ? `<span>⚡${s.energy}</span>` : '', s.exp ? `<span>✦${s.exp}</span>` : '', s.rad ? `<span>☢${s.rad}</span>` : '',
    tax ? `<span>TAX+${tax}</span>` : '', g.initiative === s.pid ? '<span class="gold">⇡INIT</span>' : '', g.day ? `<span>${g.day === 'day' ? '☀' : '☾'}</span>` : '',
  ].join('');
  let dead = '';
  if (s.out) {
    const recent = now - s.out.at < 5000;
    const place = g.ended?.placements.find((x) => x.pid === s.pid)?.place;
    const quip = koQuip(g, s) || QUIPS[(s.out.at + s.pid.charCodeAt(0)) % QUIPS.length];
    dead = `<div class="deadfx" ${ctrl ? `data-act="lc-sheet" data-k="seat" data-i="${i}"` : ''}>
      <div class="${recent ? 'pop' : 'rise'}">${sprite(s.out.cause === 'mill' ? (recent ? 'crab' : 'book') : recent ? 'skull' : 'ghost', n > 4 ? 4 : 6, recent ? 'glitch' : '', s.out.cause === 'mill')}</div>
      <div class="ko ${recent ? 'glitch' : ''}">K.O.</div><div class="nm">${esc(p?.name || '')}</div>
      <div class="tag" style="color:var(--alert)">${causeTxt(s.out.cause, s.out.by)}${s.out.by ? ' · BY ' + esc(pname(s.out.by)) : ''}${place ? ` · PLATZ ${place}` : ''}</div>
      <div class="small">${quip}</div></div>`;
  }
  const seatable = g.controller === DEVICE && !g.ended;
  return `<div class="tile n${n} ${s.out ? 'dead' : ''} ${g.monarch === s.pid ? 'mon' : ''}" style="--pc:var(--p${(s.c ?? i) % 6})" data-fx="${i}"${seatable ? ` data-seat="${i}" data-g="${g.id}"` : ''}>
    <div class="who" ${ctrl ? `data-act="lc-sheet" data-k="seat" data-i="${i}"` : ''}><div class="whorow">${cmdArt(p, s)}
      <div class="whotext"><b>${esc(p?.name || '?')}</b><span>${esc(s.deckName || '▸ COMMANDER WÄHLEN')}</span></div></div></div>
    ${g.monarch === s.pid ? `<span class="crownb">${sprite('crown', 2)}</span>` : ''}
    ${ctrl && !g.ended ? `<div class="hit minus" data-tap="-1" data-g="${g.id}" data-i="${i}">−</div><div class="hit plus" data-tap="1" data-g="${g.id}" data-i="${i}">+</div>` : ''}
    <div class="life">${s.life}</div>
    <div class="ctr">${ctr}</div>
    ${showD ? `<div class="delta ${dl.v < 0 ? 'neg' : ''}">${dl.v > 0 ? '+' : ''}${dl.v}</div>` : ''}
    ${ctrl || (g.controller === DEVICE && !g.ended) ? `<button class="more" data-act="lc-sheet" data-k="seat" data-i="${i}" aria-label="Details">⋯</button>` : ''}
    ${dead}
  </div>`;
}

/** Small pixelated commander portrait (Scryfall art), or a pixel sword if the deck has no art. */
function cmdArt(p, s) {
  const art = p?.decks?.find((d) => d.id === s.deckId)?.art;
  return art ? `<canvas class="cmdart" width="24" height="18" data-art="${esc(art)}" aria-hidden="true"></canvas>`
    : `<span class="cmdart ph">${sprite('sword', 2)}</span>`;
}

const stepper = (val, attrs) =>
  `<span class="stepper"><button data-act="lc-step" ${attrs} data-d="-1">−</button><span>${val}</span><button data-act="lc-step" ${attrs} data-d="1">+</button></span>`;

function sheetHtml(g, ref, ctrl, nTop) {
  const sh = A.ui.sheet;
  if (!sh || !ctrl || sh.g && sh.g !== g.id) { A.ui.sheetKey = null; return ''; }
  // only animate when the sheet first opens – re-renders while it is open must not replay the slide-in
  const key = `${g.id}:${sh.type}:${sh.i}`;
  const still = A.ui.sheetKey === key ? 'still' : '';
  A.ui.sheetKey = key;
  const rot = sh.i != null && sh.i < nTop ? 'rot' : '';
  const close = `<button class="btn sm" data-act="lc-close">✕</button>`;
  let body = '';
  if (sh.type === 'seat') {
    const s = g.seats[sh.i];
    const p = A.snap.P[s.pid];
    const decks = p?.decks || [];
    const opts = decks.map((d) => `<option value="${d.id}" ${d.id === s.deckId ? 'selected' : ''}>${esc(d.name)}</option>`).join('');
    const opp = g.seats.filter((o) => o.pid !== s.pid);
    const cmdRows = opp.map((o) => {
      const arr = cmdFrom(s, o.pid);
      return `<div class="between" style="padding:4px 0"><span class="small up">${esc(pname(o.pid))}<br><span class="dim">${esc(o.deckName || '')}</span></span>
        <span class="row">${stepper(arr[0], `data-i="${sh.i}" data-f="cmd" data-o="${o.pid}" data-x="0"`)}${o.partner ? stepper(arr[1], `data-i="${sh.i}" data-f="cmd" data-o="${o.pid}" data-x="1"`) : ''}</span></div>`;
    }).join('');
    const ctr = (lbl, f) => `<div class="between" style="padding:4px 0"><span class="small up">${lbl}</span>${stepper(s[f], `data-i="${sh.i}" data-f="${f}"`)}</div>`;
    body = `<div class="between"><div class="h2">${esc(p?.name)}</div>${close}</div>
      <label class="lbl" style="margin-top:10px">Commander / Deck</label>
      <select class="in" data-chg="lc-deck" data-i="${sh.i}">${opts}${!decks.find((d) => d.id === s.deckId) ? `<option selected>${esc(s.deckName || '—')}</option>` : ''}</select>
      <div class="toggle ${s.partner ? 'on' : ''}" data-act="lc-flag" data-i="${sh.i}" data-f="partner"><span class="small">PARTNER / 2. COMMANDER</span><span class="sw"></span></div>
      <div class="tag" style="margin-top:8px">COMMANDER-SCHADEN ERHALTEN (21 = K.O.)</div>${cmdRows}
      <div class="tag" style="margin-top:10px">COUNTER</div>
      ${ctr('☠ GIFT (10 = K.O.)', 'poison')}${ctr('⚡ ENERGIE', 'energy')}${ctr('✦ ERFAHRUNG', 'exp')}${ctr('☢ RAD', 'rad')}
      <div class="between" style="padding:4px 0"><span class="small up">COMMANDER-TAX</span><span class="row">
        ${stepper(`+${s.tax[0] * 2}`, `data-i="${sh.i}" data-f="tax" data-x="0"`)}${s.partner ? stepper(`+${s.tax[1] * 2}`, `data-i="${sh.i}" data-f="tax" data-x="1"`) : ''}</span></div>
      <div class="grid2" style="margin-top:10px">
        <button class="chip ${g.monarch === s.pid ? 'gold' : ''}" data-act="lc-mon" data-i="${sh.i}" style="justify-content:center;min-height:38px">👑 MONARCH</button>
        <button class="chip ${g.initiative === s.pid ? 'gold' : ''}" data-act="lc-init" data-i="${sh.i}" style="justify-content:center;min-height:38px">⇡ INITIATIVE</button>
      </div>
      ${!g.ended ? `<div class="tag" style="margin:12px 0 6px">PLATZ TAUSCHEN MIT · ODER NAMEN ZIEHEN</div>
      <div class="row wrap">${g.seats.map((o, j) => j === sh.i ? '' : `<button class="chip" data-act="lc-swap" data-i="${sh.i}" data-j="${j}">⇄ ${esc(pname(o.pid))}</button>`).join('')}</div>` : ''}
      <div style="margin-top:12px">${s.out
        ? `<button class="btn block" data-act="lc-revive" data-i="${sh.i}">✚ WIEDERBELEBEN</button>`
        : `<div class="stack"><button class="btn warn block" data-act="lc-sheet" data-k="ko" data-i="${sh.i}">✕ K.O. / AUFGEBEN</button><button class="btn warn block" data-act="lc-sheet" data-k="mill" data-i="${sh.i}">▤ GEMILLT (BIBLIOTHEK LEER)</button></div>`}</div>`;
  } else if (sh.type === 'who' || sh.type === 'ko' || sh.type === 'mill') {
    const s = g.seats[sh.i];
    const others = g.seats.filter((o) => o.pid !== s.pid);
    const mill = sh.type === 'mill'; const m = sh.type === 'who' ? 0 : 1;
    body = `<div class="between"><div class="h2">${mill ? 'GEMILLT MELDEN' : sh.type === 'ko' ? 'K.O. MELDEN' : 'K.O.!'}</div>${close}</div>
      <div class="row" style="gap:12px;margin:10px 0">${sprite('skull', 5, 'glitch')}<div><div class="h2 alert">${esc(pname(s.pid))}</div><div class="tag">${mill ? 'WER HAT GEMILLT?' : "WER WAR'S?"}</div></div></div>
      <div class="stack">${others.map((o) => `<button class="btn block" data-act="lc-who" data-i="${sh.i}" data-by="${o.pid}" data-m="${m}"${mill ? ' data-c="mill"' : ''}>${esc(pname(o.pid))}</button>`).join('')}
      <button class="btn block" data-act="lc-who" data-i="${sh.i}" data-by="" data-m="${m}"${mill ? ' data-c="mill"' : ''}>${mill ? 'SELF-MILL / NIEMAND' : sh.type === 'ko' ? 'AUFGEGEBEN / NIEMAND' : 'NIEMAND / SELBST'}</button></div>`;
  } else if (sh.type === 'menu') {
    body = `<div class="between"><div class="h2">MENÜ</div>${close}</div>
      <div class="tag" style="margin:10px 0 6px">WÜRFEL & CO.</div>
      <div class="grid2"><button class="btn" data-act="lc-roll" data-k="6">⚄ W6</button><button class="btn" data-act="lc-roll" data-k="20">◆ W20</button>
      <button class="btn" data-act="lc-roll" data-k="coin">◎ MÜNZE</button><button class="btn" data-act="lc-roll" data-k="first">⚑ WER STARTET</button></div>
      <div class="toggle ${g.day ? 'on' : ''}" data-act="lc-day" style="margin-top:8px"><span class="small">TAG / NACHT: ${g.day === 'night' ? '☾ NACHT' : g.day === 'day' ? '☀ TAG' : 'AUS'}</span><span class="sw"></span></div>
      <div class="stack" style="margin-top:8px">
        <button class="btn block" data-act="lc-sheet" data-k="log">≡ VERLAUF</button>
        <button class="btn block" data-act="lc-undo" data-g="${g.id}">↶ RÜCKGÄNGIG</button>
        ${!g.ended ? `<button class="btn warn block" data-act="lc-end" data-g="${g.id}">■ SPIEL BEENDEN (UNENTSCHIEDEN)</button>` : `<button class="btn block" data-act="lc-result">★ ERGEBNIS ZEIGEN</button>`}
        <button class="btn block" data-act="nav" data-to="${backTo()}">← ÜBERSICHT</button>
      </div>`;
  } else if (sh.type === 'log') {
    const start = gameStart(g, ref.round);
    const rows = [...g.log].reverse().slice(0, 200).map((e) => {
      const t = clock(e.t - start);
      if (e.k === 'life') return `<div>${t} · ${esc(pname(e.pid))} <span class="${e.d < 0 ? 'alert' : ''}">${e.d > 0 ? '+' : ''}${e.d}</span></div>`;
      if (e.k === 'cmd') return `<div>${t} · ${esc(pname(e.pid))} ⚔ ${e.d > 0 ? '+' : ''}${e.d} von ${esc(pname(e.from))}</div>`;
      if (e.k === 'out') return `<div class="alert">${t} · ${esc(pname(e.pid))} K.O. (${causeTxt(e.cause, e.by)})</div>`;
      if (e.k === 'revive') return `<div>${t} · ${esc(pname(e.pid))} ✚ zurück</div>`;
      if (e.k === 'end') return `<div class="gold">${t} · SPIELENDE</div>`;
      return `<div>${t} · ${esc(pname(e.pid))} ${esc(e.k)} ${e.d ?? ''}</div>`;
    }).join('');
    body = `<div class="between"><div class="h2">VERLAUF</div>${close}</div><div class="log" style="margin-top:8px">${rows || '<div class="dim">NOCH NICHTS PASSIERT.</div>'}</div>`;
  }
  return `<div class="scrim" data-act="lc-close"></div><div class="sheet ${rot} ${still}" data-sheet="${key}">${body}</div>`;
}

const RESULT_DELAY = 2800; // let the last K.O. (skull → ghost) play before the victory screen

function resultHtml(g, ref) {
  if (!g.ended) return '';
  const key = g.id + ':' + g.ended.at;
  if (A.dismissed[key]) return '';
  const wait = RESULT_DELAY - (Date.now() - g.ended.at);
  if (wait > 0 && !A.celebrated[key]) {
    clearTimeout(A.resultT);
    A.resultT = setTimeout(render, wait + 30);
    return '';
  }
  // after the first paint the overlay must stay put on re-renders (no replayed entrance animations)
  const still = A.celebrated[key] ? 'still' : '';
  const start = gameStart(g, ref.round);
  const pl = [...g.ended.placements].sort((a, b) => a.place - b.place);
  const last = Math.max(...pl.map((x) => x.place));
  const rows = pl.map((x) => {
    const s = g.seats.find((y) => y.pid === x.pid);
    const spr = x.place === 1 ? (x.draw ? 'shield' : 'trophy') : x.place === last ? 'skull' : 'sword';
    const info = s?.out ? `K.O. ${clock(s.out.at - start)}` : `${s?.life} ♥`;
    return `<div class="rank stage" style="--d:${0.9 + pl.indexOf(x) * 0.25}s"><span class="p ${x.place === 1 ? 'gold' : x.place === last ? 'alert' : ''}">${x.place}.</span>${sprite(spr, 3, x.place === 1 ? 'bob' : '')}${s ? cmdArt(A.snap.P[x.pid], s) : ''}
      <div class="grow" style="flex:1;min-width:0"><div class="up">${esc(pname(x.pid))}${x.draw ? ' <span class="gold small">· UNENTSCHIEDEN</span>' : ''}</div>
      <div class="tag">${esc(s?.deckName || '')}</div></div><span class="small muted">${info}</span></div>`;
  }).join('');
  const win = pl.find((x) => x.place === 1 && !x.draw);
  const title = win ? 'VICTORY' : g.ended.reason === 'time' ? 'TIME OUT' : 'DRAW';
  const sub = win ? (winSub(win.pid, g) || `> ${esc(pname(win.pid)).toUpperCase()} REITET ALLEIN DAVON`)
    : g.ended.reason === 'time' ? '> ZEIT ABGELAUFEN · SPIEL BEENDET → UNENTSCHIEDEN' : '> SPIEL BEENDET → UNENTSCHIEDEN';
  const ws = win && g.seats.find((y) => y.pid === win.pid);
  const wArt = ws && A.snap.P[win.pid]?.decks?.find((d) => d.id === ws.deckId)?.art;
  const winTrophy = win ? `<div class="stage pop-in winbox" style="--d:.15s">${wArt ? `<canvas class="winart" width="40" height="30" data-art="${esc(wArt)}"></canvas>` : ''}<span class="wintro">${sprite('trophy', wArt ? 5 : 7, 'bob')}</span>
    ${ws?.deckName ? `<div class="tag" style="text-align:center;margin-top:6px">${esc(ws.deckName)}</div>` : ''}</div>` : '';
  return `<div class="overlay result ${still}" id="result" data-key="${key}"><div class="box stack">
    <div class="stage" style="--d:0s;position:relative;height:70px;overflow:hidden"><div class="ride" style="position:absolute;bottom:0">${sprite('rider', 4)}</div></div>
    ${winTrophy}
    <div class="stage" style="--d:.45s">${panel('SCAN COMPLETE', `<div class="h1">${title}</div><div class="tag">${sub}</div>`, { cls: win ? 'acc' : 'hi' })}</div>
    <div class="stage" style="--d:.75s">${panel('PLATZIERUNG', rows)}</div>
    <div class="stage" style="--d:${1.1 + pl.length * 0.25}s">${panel('BATTLEFIELD STATUS', leader('ZONE', `TISCH ${ref.table.no}`) + leader('HOSTILES', 'NONE') + leader('DAUER', clock(g.ended.at - start)))}</div>
    <div class="stage tag" style="--d:${1.3 + pl.length * 0.25}s">> LOWER YOUR BLADE, LEAVE THE FALLEN, RIDE ON.</div>
    <button class="stage btn pri block" style="--d:${1.5 + pl.length * 0.25}s" data-act="lc-dismiss" data-k="${key}">→ ZUR ÜBERSICHT<span class="cursor"></span></button>
  </div></div>`;
}

export function afterLife() {
  const w = document.querySelector('.lcw[data-g]');
  if (w) fxScan(A.snap.G[w.dataset.g]);
  const r = document.getElementById('result');
  if (r && !A.celebrated[r.dataset.key]) {
    A.celebrated[r.dataset.key] = 1;
    // confetti lives outside the overlay so re-renders can't wipe it
    setTimeout(() => confetti(document.body, 80, undefined, true), 700);
    buzz([80, 60, 80, 60, 200]);
  }
}

/* ───────────── timer-driven end ───────────── */

export function lifeTick() {
  const s = A.snap;
  if (!s?.live) return;
  const ti = timerInfo(s.live, s.config);
  if (ti.phase !== 'ended') return;
  const t0 = s.live.timer;
  const endAt = t0.endedAt || t0.startedAt + (t0.pausedTotal || 0) + ti.playMs + ti.otMs;
  for (const t of s.live.tables) {
    const gid = gameId(s.live, t);
    const g = s.G[gid];
    if (!g || g.ended) continue;
    if (g.controller === DEVICE || (MODE === 'host' && Date.now() - endAt > 15000)) {
      mutate(gid, (x) => endGame(x, 'time'), { debounce: 0 });
    }
  }
}

/* ───────────── actions ───────────── */

const gidNow = () => currentRef()?.gid;

export const lcActions = {
  'lc-start'(el) {
    const ref = currentRef();
    if (!ref || A.snap.G[ref.gid]) return render();
    const g = newGame(ref.round, ref.table, A.snap.P, { device: DEVICE, name: me()?.name || 'HOST' });
    store.put('game/' + ref.gid, g);
    toast(`${sprite('sword', 2)} COUNTER LÄUFT · TISCH ${ref.table.no}`);
  },
  'lc-take'(el) {
    if (!confirm('Steuerung für diesen Tisch übernehmen?')) return;
    mutate(el.dataset.g, (g) => { g.controller = DEVICE; g.controllerName = me()?.name || 'HOST'; }, { debounce: 0 });
  },
  'lc-sheet'(el) { A.ui.sheet = { type: el.dataset.k, i: el.dataset.i != null ? +el.dataset.i : null }; render(); },
  'lc-close'() { A.ui.sheet = null; render(); },
  'lc-step'(el) {
    const gid = gidNow();
    if (lockedFor(A.snap.G[gid]?.roundId)) return toast('⏳ ERST WENN DER RUNDENTIMER LÄUFT'); const i = +el.dataset.i; const f = el.dataset.f; const d = +el.dataset.d;
    mutate(gid, (g) => {
      const s = g.seats[i];
      if (f === 'cmd') setCmd(g, s.pid, el.dataset.o, +el.dataset.x, d);
      else if (f === 'tax') s.tax[+el.dataset.x] = Math.max(0, s.tax[+el.dataset.x] + d);
      else { s[f] = Math.max(0, s[f] + d); g.log.push({ t: Date.now(), pid: s.pid, k: f, d }); }
    });
  },
  'lc-flag'(el) { mutate(gidNow(), (g) => { const s = g.seats[+el.dataset.i]; s[el.dataset.f] = !s[el.dataset.f]; }); },
  'lc-deck'(el) {
    const gid = gidNow(); const i = +el.dataset.i;
    mutate(gid, (g) => {
      const s = g.seats[i];
      const d = A.snap.P[s.pid]?.decks?.find((x) => x.id === el.value);
      if (d) { s.deckId = d.id; s.deckName = d.name; s.partner = !!d.partner; }
    }, { debounce: 0 });
  },
  'lc-mon'(el) { mutate(gidNow(), (g) => { const pid = g.seats[+el.dataset.i].pid; g.monarch = g.monarch === pid ? null : pid; }); },
  'lc-swap'(el) { swapSeats(gidNow(), +el.dataset.i, +el.dataset.j); },
  'lc-init'(el) { mutate(gidNow(), (g) => { const pid = g.seats[+el.dataset.i].pid; g.initiative = g.initiative === pid ? null : pid; }); },
  'lc-who'(el) {
    const i = +el.dataset.i; const by = el.dataset.by || null; const manual = el.dataset.m === '1'; const mill = el.dataset.c === 'mill';
    mutate(gidNow(), (g) => {
      const s = g.seats[i];
      if (manual && !s.out) {
        s.out = { at: Date.now(), cause: mill ? 'mill' : by ? 'manual' : 'concede', by, auto: false };
        g.log.push({ t: Date.now(), pid: s.pid, k: 'out', cause: s.out.cause, by });
        if (g.monarch === s.pid) g.monarch = null;
        if (g.initiative === s.pid) g.initiative = null;
      } else if (s.out) s.out.by = by;
    }, { debounce: 0 });
    A.ui.sheet = null;
    buzz([60, 40, 160]);
  },
  'lc-revive'(el) {
    mutate(gidNow(), (g) => {
      const s = g.seats[+el.dataset.i];
      s.out = null; if (s.life <= 0) s.life = 1; if (s.poison >= 10) s.poison = 9;
      for (const k in s.cmd) s.cmd[k] = s.cmd[k].map((v) => Math.min(v, 20));
      g.log.push({ t: Date.now(), pid: s.pid, k: 'revive' });
      if (g.ended && g.ended.reason !== 'time') g.ended = null;
    }, { debounce: 0 });
    A.ui.sheet = null;
  },
  'lc-undo'(el) {
    const gid = el.dataset.g || gidNow();
    const prev = A.undo[gid]?.pop();
    if (!prev) return toast('NICHTS ZUM RÜCKGÄNGIG MACHEN');
    store.put('game/' + gid, prev, { debounce: 0 });
    toast('↶ RÜCKGÄNGIG');
  },
  'lc-day'() { mutate(gidNow(), (g) => { g.day = g.day === 'day' ? 'night' : g.day === 'night' ? null : 'day'; }); },
  'lc-roll'(el) {
    const k = el.dataset.k; const g = A.snap.G[gidNow()];
    let out;
    if (k === 'coin') out = Math.random() < 0.5 ? 'KOPF' : 'ZAHL';
    else if (k === 'first') { const al = alive(g); out = al.length ? esc(pname(pick(al).pid)).toUpperCase() + ' STARTET' : 'NIEMAND MEHR DA'; }
    else out = 1 + Math.floor(Math.random() * +k);
    A.ui.sheet = null; render();
    toast(`<div class="row" style="gap:12px">${sprite('dice', 4, 'pop')}<div><div class="tag">${k === 'coin' ? 'MÜNZE' : k === 'first' ? 'ZUFALL' : 'W' + k}</div><div class="h1">${out}</div></div></div>`, 3500);
    buzz(30);
  },
  'lc-end'(el) {
    if (!confirm('Spiel jetzt beenden? Alle Überlebenden = Unentschieden.')) return;
    A.ui.sheet = null;
    mutate(el.dataset.g, (g) => endGame(g, 'manual'), { debounce: 0 });
  },
  'lc-result'() { const g = A.snap.G[gidNow()]; if (g?.ended) delete A.dismissed[g.id + ':' + g.ended.at]; A.ui.sheet = null; render(); },
  'lc-dismiss'(el) { A.dismissed[el.dataset.k] = 1; A.ui.sheet = null; go(backTo()); },
  'show-result'(el) { delete A.dismissed[el.dataset.k]; go(el.dataset.to || 'life'); },
};
