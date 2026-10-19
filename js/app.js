import { A, MODE, store, DEVICE, setRender, render, refresh, go, toast, panel, leader, wubrg, topbar, pname, me, meKey, esc, ls } from './ctx.js';
import { DEFAULT_CONFIG, MAX_DECKS, makeTables, scoreTables, timerInfo, gameId, freePlayers, proposeAutoTable, computeStats } from './logic.js';
import { lifeView, afterLife, lifeTick, lcActions, initLifeInput, myTable, timerLabel } from './lc.js';
import { wrappedView, afterWrapped, wrActions } from './wrapped.js';
import { sprite } from './sprites.js';
import { autocomplete, cardInfo, drawArt } from './art.js';
import { sha, uid, clock, dur, buzz } from './util.js';

const $app = document.getElementById('app');
const hostKey = () => `cz.host.${store.prefix}`;

/* ═════════════════════ boot ═════════════════════ */

async function boot() {
  initLifeInput();
  const params = new URLSearchParams(location.search);
  const urlCode = params.get('c');
  if (urlCode) history.replaceState(null, '', location.pathname + location.hash);
  const code = urlCode || ls.get('cz.code');
  store.addEventListener('change', onChange);
  store.addEventListener('status', () => { if (!isFocused()) render(); });
  window.addEventListener('hashchange', () => { A.route = location.hash.replace(/^#\/?/, ''); A.ui.sheet = null; render(); window.scrollTo(0, 0); });
  A.route = location.hash.replace(/^#\/?/, '');
  setRender(doRender);
  if (code) await enter(code, { silent: !urlCode });
  else render();
  setInterval(tick, 500);
  if ('serviceWorker' in navigator) navigator.serviceWorker.register('./sw.js').catch(() => {});
}

async function enter(code, { silent = false } = {}) {
  A.ui.login = { busy: true, code };
  render();
  await store.open(code);
  const cfg = await store.waitFor('config', silent ? 1500 : 7000);
  refresh();
  if (!cfg && MODE === 'player' && !silent) {
    store.close(); store.prefix = null;
    A.ui.login = { err: 'CODE UNBEKANNT · KEIN EVENT GEFUNDEN', code };
    return render();
  }
  ls.set('cz.code', store.code);
  A.me = ls.get(meKey());
  A.ui.login = null;
  render();
}

function onChange() {
  refresh();
  if (isFocused()) { A.pending = true; return; }
  render();
}
const isFocused = () => {
  const a = document.activeElement;
  return a && $app.contains(a) && (a.tagName === 'INPUT' || a.tagName === 'TEXTAREA');
};
document.addEventListener('focusout', () => setTimeout(() => { if (A.pending && !isFocused()) { A.pending = false; render(); } }, 60));

/* ═════════════════════ render ═════════════════════ */

function doRender() {
  if (store.prefix) refresh();
  const v = view();
  const res = typeof v === 'string' ? { html: v } : v;
  document.body.classList.toggle('lc', !!res.full);
  $app.innerHTML = res.html + (res.full || !res.tabs ? '' : tabs()) + assignOverlay();
  document.querySelectorAll('canvas[data-art]').forEach((c) => drawArt(c, c.dataset.art));
  document.querySelectorAll('[data-qr]').forEach((el) => {
    try { const q = window.qrcode(0, 'M'); q.addData(el.dataset.qr); q.make(); el.innerHTML = q.createSvgTag({ cellSize: 4, margin: 0 }); } catch {}
  });
  if (res.full) { afterLife(); wake(true); } else wake(false);
  if (A.route === 'wrapped') afterWrapped();
}

let wl = null;
async function wake(on) {
  try {
    if (on && !wl && navigator.wakeLock) { wl = await navigator.wakeLock.request('screen'); wl.addEventListener('release', () => { wl = null; }); }
    if (!on && wl) { wl.release(); wl = null; }
  } catch {}
}
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible' && document.body.classList.contains('lc')) wake(true); });

function view() {
  if (!store.prefix || A.ui.login) return loginView();
  if (MODE === 'host') {
    if (!A.snap.config || !store.get('config')) return hostCreateView();
    if (ls.get(hostKey()) !== A.snap.config.pinHash) return hostPinView();
    const r = A.route || 'round';
    if (r === 'wrapped') return { html: wrappedView() };
    if (r.startsWith('game/') || r === 'life') return lifeView();
    if (r === 'me') return { html: me() ? homeView() : hostJoinView(), tabs: true };
    if (r === 'decks' && me()) return { html: decksView(), tabs: true };
    const v = { round: hostRound, players: hostPlayers, live: liveView, setup: hostSetup, stats: statsView }[r] || hostRound;
    return { html: v(), tabs: true };
  }
  if (!me()) return registerView();
  const r = A.route || 'home';
  if (r === 'life' || r.startsWith('game/')) return lifeView();
  if (r === 'wrapped') return { html: wrappedView() };
  const v = { home: homeView, stats: statsView, decks: decksView, live: liveView }[r] || homeView;
  return { html: v(), tabs: true };
}

function tabs() {
  const items = MODE === 'host'
    ? [['round', '⚄', 'RUNDE'], ['live', '◉', 'LIVE'], ['me', '♥', 'ICH'], ['players', '☰', 'SPIELER'], ['setup', '⚙', 'SETUP']]
    : [['home', '▣', 'TISCH'], ['life', '♥', 'LIFE'], ['live', '◉', 'LIVE'], ['stats', '≡', 'STATS'], ['decks', '◎', 'DECKS']];
  const cur = A.route || items[0][0];
  return `<nav class="tabs"><div class="in">${items.map(([r, i, l]) => `<a href="#/${r}" class="${cur === r ? 'on' : ''}"><b>${i}</b>${l}</a>`).join('')}</div></nav>`;
}

/* ═════════════════════ login / register ═════════════════════ */

function loginView() {
  const L = A.ui.login || {};
  return `<div class="stack">
    ${topbar(MODE === 'host' ? '// HOST CONSOLE' : '// ACCESS TERMINAL')}
    ${panel(null, `<div style="text-align:center;padding:18px 0">${sprite('rider', 5, 'bob')}
      <div class="h1" style="font-size:clamp(30px,10vw,48px);margin-top:10px">COMMAND//ZONE</div>
      <div class="tag">COMMANDER DAY · 4ER PODS · 80+10 MIN</div></div>`)}
    ${panel('ZUGANG', `<form data-form="login" class="stack">
      <label class="lbl">> EVENT-CODE EINGEBEN</label>
      <input class="in code" name="code" autocomplete="off" autocapitalize="characters" spellcheck="false" placeholder="CODE" value="${esc(L.code || '')}" required>
      ${L.err ? `<div class="alert small">✕ ${esc(L.err)}</div>` : ''}
      <button class="btn pri block" ${L.busy ? 'disabled' : ''}>${L.busy ? 'SCANNING<span class="cursor"></span>' : '→ VERBINDEN'}</button></form>`)}
    ${panel('SYSTEM', leader('INDEXING FRAGMENT', 'PARTIAL') + leader('RESTORING CHRONOLOGY', L.busy ? 'RUNNING' : 'IDLE') + leader('CROSS-REF SIGNAL', L.busy ? '…' : 'READY'))}
    <div class="tag dim">> NO RECORD OF VICTORY FOUND. YET.</div>
  </div>`;
}

function hostCreateView() {
  return `<div class="stack">${topbar('// HOST CONSOLE')}
    ${panel('NEUES EVENT', `<div class="small muted" style="margin-bottom:10px">Unter dem Code <b>${esc(store.code)}</b> existiert noch kein Event. Lege es jetzt an.</div>
      <form data-form="create" class="stack">
        <div><label class="lbl">Eventname</label><input class="in" name="name" value="COMMANDER DAY" required></div>
        <div><label class="lbl">Host-PIN (min. 4 Zeichen)</label><input class="in" name="pin" type="password" minlength="4" required></div>
        <button class="btn pri block">→ EVENT ANLEGEN</button></form>`, { cls: 'hi' })}
    <button class="btn block" data-act="logout">← ANDERER CODE</button></div>`;
}

function hostPinView() {
  return `<div class="stack">${topbar('// HOST CONSOLE')}
    ${panel('HOST-PIN', `<form data-form="pin" class="stack"><div class="row" style="gap:14px">${sprite('shield', 4)}<div class="small muted">Event <b>${esc(A.snap.config.name)}</b> · Code ${esc(store.code)}</div></div>
      <input class="in code" name="pin" type="password" autocomplete="off" placeholder="PIN" required>
      ${A.ui.pinErr ? '<div class="alert small">✕ FALSCHE PIN</div>' : ''}
      <button class="btn pri block">→ ENTSPERREN</button></form>`, { cls: 'hi' })}
    <button class="btn block" data-act="logout">← ANDERER CODE</button></div>`;
}

function registerView() {
  const s = A.snap;
  const full = s.players.length >= s.config.maxPlayers;
  return { html: `<div class="stack">${topbar('// ' + esc(s.config.name))}
    ${panel('ANMELDUNG', full
      ? `<div class="alert">✕ EVENT VOLL (${s.players.length}/${s.config.maxPlayers}). Sprich mit dem Host.</div>`
      : `<form data-form="register" class="stack"><div class="row" style="gap:12px">${sprite('knight', 4, 'bob')}<div class="small muted">Wie heißt du, Planeswalker?</div></div>
        <input class="in code" name="name" maxlength="16" autocomplete="off" placeholder="NAME" required><input class="in code" name="pin" type="password" inputmode="numeric" pattern="[0-9]{4,6}" maxlength="6" autocomplete="off" placeholder="PIN (4–6 ZIFFERN)" required><div class="tag" style="text-transform:none">Mit Name + PIN kommst du später (auch auf einem anderen Handy) wieder in dein Profil.</div>
        <button class="btn pri block">→ ANMELDEN</button></form>`, { cls: 'hi', right: `${s.players.length}/${s.config.maxPlayers}` })}
    ${s.players.length ? panel('SCHON ANGEMELDET? NAME WÄHLEN + PIN', `<div class="row wrap">${s.players.map((p) => `<button class="chip" data-act="claim" data-id="${p.id}">${esc(p.name)}</button>`).join('')}</div>`) : ''}
    <button class="btn block" data-act="logout">← ANDERER CODE</button></div>` };
}

/* ═════════════════════ player: home ═════════════════════ */

function seatCards(round, table, { swap = false, sel = null } = {}) {
  const s = A.snap;
  const g = round && s.G[gameId(round, table)];
  return `<div class="seatlist ${swap ? 'swap' : ''}">${table.players.map((pid, i) => {
    const p = s.P[pid];
    const seat = g?.seats.find((x) => x.pid === pid);
    const deck = seat?.deckName || p?.decks?.[0]?.name || 'KEIN DECK';
    const pl = g?.ended?.placements.find((x) => x.pid === pid);
    const cls = [pid === A.me ? 'me' : '', seat?.out ? 'out' : '', sel === pid ? 'sel' : ''].join(' ');
    return `<div class="seat ${cls}" style="--pc:var(--p${i % 6})" ${swap ? `data-act="h-swap" data-t="${table.id}" data-p="${pid}"` : ''}>
      ${seat ? `<span class="lf num ${seat.out ? 'alert' : ''}">${seat.out ? '✕' : seat.life}</span>` : ''}
      <div class="n">${pl?.place === 1 ? (pl.draw ? '½ ' : '★ ') : ''}${esc(p?.name || '?')}</div><div class="c">${esc(deck)}</div></div>`;
  }).join('')}</div>`;
}

function timerBlock(round) {
  const { txt, ti } = timerLabel(round, A.snap.config);
  const pct = ti.phase === 'idle' ? 0 : ti.phase === 'ended' ? 100 : ti.phase === 'ot' ? ((ti.otMs - ti.left) / ti.otMs) * 100 : (ti.el / ti.playMs) * 100;
  return `<div class="between"><span class="big ${ti.phase === 'ot' ? 'alert' : ''}" data-timer="${round.id}">${txt}</span>
    <span class="tag" style="text-align:right">${A.snap.config.playMin}:00 SPIEL<br>+${A.snap.config.otMin} OVERTIME</span></div>
    <div class="bar ${ti.phase === 'ot' ? 'ot' : ''}" data-tbar="${round.id}"><i style="width:${Math.min(100, pct)}%"></i></div>`;
}

function homeView() {
  const s = A.snap; const m = me();
  const ref = myTable();
  const out = [topbar(`// ${esc(m.name)} · ${s.live ? 'RUNDE ' + s.live.n : 'STANDBY'}`)];
  if (s.config.wrappedAt) out.push(panel('WRAPPED IST DA', `<div class="row" style="gap:14px">${sprite('trophy', 4, 'bob')}<div class="grow"><div class="h2">DEIN TAG IN PIXELN</div><div class="small muted">Awards, Nemesis, Barzeit …</div></div></div>
    <button class="btn pri block" style="margin-top:10px" data-act="wr-open">▶ WRAPPED ÖFFNEN</button>`, { cls: 'hi' }));
  if (!m.decks?.length) out.push(panel('ACHTUNG', `<div class="small">Du hast noch keine Decks hinterlegt.</div><button class="btn block" style="margin-top:8px" data-act="nav" data-to="decks">◎ DECKS EINTRAGEN</button>`, { cls: 'alert' }));
  if (!s.live) {
    out.push(panel('STATUS', `<div class="row" style="gap:16px">${sprite('star', 5, 'float')}<div><div class="h2">WARTE AUF AUSLOSUNG<span class="cursor"></span></div>
      <div class="small muted">Der Host würfelt gleich die Tische. Du bekommst Tisch-Nr. und Mitspieler hier angezeigt.</div></div></div>`));
  } else if (ref) {
    const g = s.G[ref.gid];
    const mySeat = g?.seats.find((x) => x.pid === A.me);
    const done = g?.ended || mySeat?.out;
    out.push(panel(`DEIN TISCH · RUNDE ${s.live.n}`, `
      <div class="between"><div class="h1" style="font-size:56px">TISCH ${ref.table.no}</div>${ref.table.auto ? '<span class="chip gold">BAR-TISCH</span>' : `<span class="chip">${g ? (g.ended ? 'BEENDET' : 'LÄUFT') : 'BEREIT'}</span>`}</div>
      <div class="tag" style="margin:2px 0 8px">DU SPIELST MIT: ${ref.table.players.filter((p) => p !== A.me).map((p) => esc(pname(p))).join(' · ')}</div>
      ${timerBlock(s.live)}
      <div style="margin-top:10px">${seatCards(s.live, ref.table)}</div>
      <button class="btn pri block" style="margin-top:12px" data-act="nav" data-to="life">${g ? '♥ ZUM LIFE COUNTER' : '▶ LIFE COUNTER STARTEN'}</button>`, { cls: 'hi', right: '<span class="notch"></span>' }));
    if (done) { out.push(freePanel()); out.push(feedPanel('WÄHREND DU AN DER BAR BIST …')); }
  } else {
    out.push(panel(`RUNDE ${s.live.n}`, `<div class="row" style="gap:14px">${sprite('beer', 4, 'bob')}<div><div class="h2">DIESE RUNDE PAUSE</div><div class="small muted">Du sitzt nicht an einem Tisch. Bar, Dart, Smalltalk. 🎯</div></div></div>`));
    out.push(freePanel());
    out.push(feedPanel('WAS AN DEN TISCHEN LOS IST'));
  }
  if (s.live) {
    const others = s.live.tables.filter((t) => t.id !== ref?.table.id);
    if (others.length) out.push(panel('ALLE TISCHE', others.map((t) => `<div style="margin-bottom:10px" data-act="nav" data-to="game/${gameId(s.live, t)}">
      <div class="between"><span class="h2">TISCH ${t.no}${t.auto ? ' <span class="small gold">BAR</span>' : ''}</span><span class="tag">ANSEHEN ›</span></div>${seatCards(s.live, t)}</div>`).join('')));
  }
  out.push(panel('REGELN', leader('PODS', `${s.config.tableSize}ER`) + leader('SPIELZEIT', `${s.config.playMin} MIN`) + leader('OVERTIME', `${s.config.otMin} MIN`) + leader('DANACH', 'UNENTSCHIEDEN') + leader('STIMMUNG', 'ENTSPANNT 🍺')));
  return `<div class="stack">${out.join('')}</div>`;
}

function freePanel() {
  const s = A.snap;
  const free = freePlayers(s);
  const size = s.config.tableSize;
  const ti = timerInfo(s.live, s.config);
  const info = !s.config.autoTables ? 'AUTO-TISCHE SIND AUS.'
    : ti.phase === 'play' && ti.left < s.config.autoMinLeft * 60000 ? `ZU WENIG ZEIT FÜR EINEN NEUEN TISCH (< ${s.config.autoMinLeft} MIN).`
    : `Sobald ${size} Spieler frei sind, entsteht automatisch ein neuer Tisch.`;
  return panel('BAR · FREIE SPIELER', `<div class="row" style="gap:14px">${sprite('beer', 4, 'bob')}<div class="grow"><div class="h2">${free.length}/${size} FREI</div><div class="small muted">${info}</div></div></div>
    <div class="row wrap" style="margin-top:8px">${free.map((f) => `<span class="chip ${f.pid === A.me ? 'sel' : ''}">${esc(pname(f.pid))}</span>`).join('') || '<span class="dim small">NIEMAND</span>'}</div>
    ${s.config.autoTables ? `<div class="toggle ${me()?.pauseRound === s.live.id ? 'on' : ''}" data-act="pause" style="margin-top:6px"><span><span class="small"><b>ICH MACH PAUSE 🍺</b></span><br><span class="tag">diese Runde nicht mehr einplanen</span></span><span class="sw"></span></div>` : ''}`);
}

function assignOverlay() {
  const gid = A.ui.assign;
  if (!gid) return '';
  const ref = myTable();
  if (!ref || ref.gid !== gid) return '';
  return `<div class="overlay"><div class="box stack">
    <div style="text-align:center">${sprite('sword', 6, 'pop')}</div>
    ${panel('NEUE ZUWEISUNG', `<div class="tag">RUNDE ${ref.round.n}${ref.table.auto ? ' · BAR-TISCH' : ''}</div><div class="h1" style="font-size:64px">TISCH ${ref.table.no}</div>
      <div class="tag" style="margin:6px 0">DU SPIELST MIT</div>
      ${ref.table.players.filter((p) => p !== A.me).map((p) => `<div class="h2">› ${esc(pname(p))}</div>`).join('')}`, { cls: 'hi' })}
    <button class="btn pri block" data-act="assign-ok" data-to="life">♥ ZUM LIFE COUNTER</button>
    <button class="btn block" data-act="assign-ok">OK</button></div></div>`;
}

/* ═════════════════════ player: decks ═════════════════════ */

const emptyDraft = () => ({ name: '', colors: '', partner: false, art: null, editId: null });

function decksView() {
  const m = me();
  const d = (A.draft ||= emptyDraft());
  const decks = m.decks || [];
  const list = decks.map((x, i) => `<div class="deck">
    ${x.art ? `<canvas width="32" height="23" data-art="${esc(x.art)}"></canvas>` : `<canvas width="32" height="23"></canvas>`}
    <div class="nm"><b>${esc(x.name)}</b><span class="row">${wubrg(x.colors)}${x.partner ? '<span class="tag">PARTNER</span>' : ''}${i === 0 ? '<span class="tag gold">STANDARD</span>' : ''}</span></div>
    ${i ? `<button class="chip" data-act="deck-top" data-id="${x.id}" title="Als Standard">▲</button>` : ''}
    <button class="chip" data-act="deck-edit" data-id="${x.id}">✎</button>
    <button class="chip alert" data-act="deck-del" data-id="${x.id}">✕</button></div>`).join('');
  return `<div class="stack">${topbar('// DECK-ARCHIV')}
    ${panel('PROFIL', `<div class="between"><div class="h2">${esc(m.name)}</div><button class="chip" data-act="rename">✎ NAME</button></div>
      <div class="row" style="margin-top:10px"><button class="chip" data-act="set-pin">⚿ ${m.pinHash ? 'PIN ÄNDERN' : 'PIN FESTLEGEN'}</button><button class="chip" data-act="me-logout">⏻ ABMELDEN</button></div>`)}
    ${panel(`DEINE COMMANDER · ${decks.length}/${MAX_DECKS}`, list || '<div class="dim small">NOCH KEINE DECKS. TRAG UNTEN DEINEN ERSTEN COMMANDER EIN.</div>')}
    ${decks.length < MAX_DECKS || d.editId ? panel(d.editId ? 'DECK BEARBEITEN' : 'DECK HINZUFÜGEN', `<div class="stack">
      <div class="ac"><label class="lbl">Commander (Scryfall-Suche)</label>
        <input class="in" id="deckname" data-inp="deckname" value="${esc(d.name)}" placeholder="z.B. Atraxa" autocomplete="off"><div class="ac-list hide" id="aclist"></div></div>
      <div><label class="lbl">Farbidentität</label><div class="mana">${'WUBRG'.split('').map((c) => `<button class="${c} ${d.colors.includes(c) ? 'on' : ''}" data-act="mana" data-c="${c}">${c}</button>`).join('')}</div></div>
      <div class="toggle ${d.partner ? 'on' : ''}" data-act="draft-partner"><span class="small">PARTNER / 2 COMMANDER</span><span class="sw"></span></div>
      <div class="row"><button class="btn pri grow" data-act="deck-save">${d.editId ? '✓ SPEICHERN' : '+ HINZUFÜGEN'}</button>${d.editId || d.name ? '<button class="btn" data-act="deck-cancel">✕</button>' : ''}</div></div>`, { cls: 'hi' }) : ''}
    <div class="tag dim">TIPP: DAS OBERSTE DECK IST DEIN STANDARD AM TISCH. IM LIFE COUNTER KANNST DU JEDERZEIT WECHSELN.</div></div>`;
}

let acT;
function onDeckInput(el) {
  A.draft.name = el.value;
  A.draft.art = null;
  clearTimeout(acT);
  acT = setTimeout(async () => {
    const list = await autocomplete(el.value.trim());
    const box = document.getElementById('aclist');
    if (!box) return;
    box.classList.toggle('hide', !list.length);
    box.innerHTML = list.map((n) => `<button data-act="ac-pick" data-name="${esc(n)}">${esc(n)}</button>`).join('');
  }, 220);
}

/* ═════════════════════ stats ═════════════════════ */

function statsView() {
  const S = computeStats(A.snap);
  const m = A.me && S.byId[A.me];
  const lb = S.leaderboard.filter((p) => p.games);
  const out = [topbar('// LIVE-STATISTIK')];
  out.push(`<div class="row" style="gap:14px">${sprite('trophy', 4, 'bob')}<div class="h1">LEADERBOARD</div></div>`);
  out.push(panel('PUNKTE · SIEG 3 · DRAW 1', lb.map((p, i) => leader(`${String(i + 1).padStart(2, '0')}  ${p.name}`, `${p.wins}W · ${p.points} PTS`, i === 0 ? 'gold' : p.pid === A.me ? '' : 'muted')).join('') || '<div class="dim small">NOCH KEINE SPIELE BEENDET.</div>'));
  if (m) out.push(panel(`DEINE STATS · ${m.name}`,
    leader('SPIELE', m.games) + leader('SIEGE', m.wins, 'gold') + leader('UNENTSCHIEDEN', m.draws) + leader('Ø PLATZ', m.avgPlace ? m.avgPlace.toFixed(1) : '—') +
    leader('AUSGESCHIEDEN', `${m.outs}×`) + leader('SCHNELLSTES AUS', m.fastestOut ? dur(m.fastestOut) : '—') + leader('SCHNELLSTER SIEG', m.fastestWin ? dur(m.fastestWin) : '—') +
    leader('ZEIT IM SPIEL', dur(m.inGame)) + leader('ZEIT AN DER BAR', dur(m.bar)) + leader('K.O.S VERURSACHT', m.kills) +
    leader('NEMESIS', m.nemesis ? `${pname(m.nemesis.pid)} (${m.nemesis.n}×)` : '—', 'alert') + leader('LIEBLINGSOPFER', m.victim ? `${pname(m.victim.pid)} (${m.victim.n}×)` : '—') +
    leader('CMD-SCHADEN AUSGETEILT', m.cmdDealt) + leader('LEBEN VERLOREN', m.lifeLost) + leader('HÖCHSTES LEBEN', m.maxLife), { cls: 'hi' }));
  if (S.awards.length) out.push(panel('AWARDS (LIVE)', S.awards.map((a) => `<div class="row" style="gap:12px;padding:6px 0;border-bottom:1px dotted var(--line)">
    <span style="width:44px;text-align:center">${sprite(a.sprite, 3)}</span><div style="flex:1;min-width:0"><div class="tag">${esc(a.title)}</div><div class="up">${esc(a.name)}</div></div><span class="small muted" style="text-align:right">${esc(a.value || '')}</span></div>`).join('')));
  if (S.commanders.length) out.push(panel('COMMANDER WINRATE', S.commanders.slice(0, 12).map((c) => leader(c.name, `${c.wins}/${c.games} · ${Math.round(c.rate * 100)}%`)).join('')));
  return `<div class="stack">${out.join('')}</div>`;
}

/* ═════════════════════ host ═════════════════════ */

function hostRound() {
  const s = A.snap;
  const out = [topbar(`// HOST · ${esc(s.config.name)}`)];
  const present = s.players.filter((p) => p.present !== false);
  out.push(`<div class="between"><div class="h1">${s.draft ? `RUNDE ${s.draft.n} · VORSCHAU` : s.live ? `RUNDE ${s.live.n}` : 'BEREIT'}</div><span class="tag">${present.length}/${s.players.length} DA</span></div>`);
  out.push(panel('MATCHING', `
    <div class="toggle ${s.config.smart ? 'on' : ''}" data-act="h-toggle" data-f="smart"><span><span class="small">INTELLIGENTES MATCHING</span><br><span class="tag">neue Konstellationen bevorzugen</span></span><span class="sw"></span></div>
    <div class="toggle ${s.config.autoTables ? 'on' : ''}" data-act="h-toggle" data-f="autoTables"><span><span class="small">AUTO-TISCHE</span><br><span class="tag">${s.config.tableSize} Ausgeschiedene → neuer Tisch</span></span><span class="sw"></span></div>`));
  if (s.draft) {
    const sc = scoreTables(s.draft.tables, s.rounds, s.draft.id);
    out.push(panel('PAIRING-SCAN', leader('NEUE PAARUNGEN', `${sc.pairsTotal - sc.repeats} / ${sc.pairsTotal}`) + leader('WIEDERHOLUNGEN', sc.repeats, sc.repeats ? 'gold' : '') + leader('MODUS', s.config.smart ? 'SMART · MIN. WIEDERHOLUNGEN' : 'PURER ZUFALL')));
    out.push(`<div class="tag">TIPP: ZWEI SPIELER ANTIPPEN = TAUSCHEN</div>`);
    for (const t of s.draft.tables) out.push(panel(`TISCH ${t.no} · ${t.players.length} SPIELER`, seatCards(null, t, { swap: true, sel: A.ui.swapSel?.p })));
    out.push(`<div class="row"><button class="btn" data-act="h-draw">↻ NEU</button><button class="btn pri grow" data-act="h-publish">→ VERÖFFENTLICHEN</button></div>
      <button class="btn warn block" data-act="h-discard">✕ VORSCHAU VERWERFEN</button>`);
  } else if (s.live) {
    const { ti } = timerLabel(s.live, s.config);
    const t = s.live.timer || {};
    out.push(panel('RUNDENTIMER', `${timerBlock(s.live)}<div class="grid2" style="margin-top:10px">
      ${ti.phase === 'idle' ? `<button class="btn pri" data-act="h-timer" data-k="start" style="grid-column:span 2">▶ TIMER STARTEN</button>` : ''}
      ${ti.phase === 'play' || ti.phase === 'ot' ? (t.pausedAt ? `<button class="btn pri" data-act="h-timer" data-k="resume">▶ WEITER</button>` : `<button class="btn" data-act="h-timer" data-k="pause">‖ PAUSE</button>`) : ''}
      ${ti.phase !== 'idle' && ti.phase !== 'ended' ? `<button class="btn" data-act="h-timer" data-k="add">+5 MIN</button><button class="btn" data-act="h-timer" data-k="sub">−5 MIN</button><button class="btn warn" data-act="h-timer" data-k="stop">■ BEENDEN</button>` : ''}
      ${ti.phase === 'ended' ? `<button class="btn" data-act="h-timer" data-k="reset" style="grid-column:span 2">↺ TIMER ZURÜCKSETZEN</button>` : ''}
      </div>`, { cls: 'hi', right: '<span class="notch"></span>' }));
    for (const tb of s.live.tables) {
      const g = s.G[gameId(s.live, tb)];
      out.push(panel(`TISCH ${tb.no}${tb.auto ? ' · BAR-TISCH' : ''}`, seatCards(s.live, tb) + `<div class="between" style="margin-top:8px"><span class="tag">${g ? (g.ended ? 'BEENDET' : 'LÄUFT · ' + esc(g.controllerName || '')) : 'COUNTER NICHT GESTARTET'}</span>
        <button class="chip" data-act="nav" data-to="game/${gameId(s.live, tb)}">ANSEHEN ›</button></div>`));
    }
    const free = freePlayers(s);
    out.push(panel('FREIE SPIELER', `<div class="row wrap">${free.map((f) => `<span class="chip">${esc(pname(f.pid))}</span>`).join('') || '<span class="dim small">NIEMAND</span>'}</div>
      ${free.length >= 3 ? `<button class="btn block" style="margin-top:8px" data-act="h-autotable">+ TISCH AUS FREIEN BILDEN</button>` : ''}`));
    out.push(`<button class="btn pri block" data-act="h-draw">⚄ NÄCHSTE RUNDE WÜRFELN</button>`);
  } else {
    out.push(panel('START', `<div class="row" style="gap:16px">${sprite('dice', 5, 'bob')}<div class="small muted">${present.length} anwesende Spieler werden auf Tische à ${s.config.tableSize} gelost.</div></div>`));
    out.push(`<button class="btn pri block" data-act="h-draw" ${present.length < 2 ? 'disabled' : ''}>⚄ RUNDE ${(s.rounds.at(-1)?.n || 0) + 1} WÜRFELN</button>`);
  }
  return `<div class="stack">${out.join('')}</div>`;
}

function hostPlayers() {
  const s = A.snap;
  const base = new URL('./', location.href).href;
  const join = `${base}?c=${encodeURIComponent(store.code)}`;
  const rows = s.players.map((p) => `<div class="deck"><div class="nm"><b class="up">${esc(p.name)}</b><span class="tag">${p.decks?.length || 0} DECKS${p.decks?.[0] ? ' · ' + esc(p.decks[0].name) : ''}</span></div>
    <button class="chip ${p.present !== false ? 'sel' : 'off'}" data-act="h-present" data-id="${p.id}">${p.present !== false ? 'DA' : 'WEG'}</button>
    <button class="chip" data-act="h-rename" data-id="${p.id}">✎</button>${p.pinHash ? `<button class="chip" data-act="h-resetpin" data-id="${p.id}" title="PIN zurücksetzen">⚿</button>` : ''}<button class="chip alert" data-act="h-delp" data-id="${p.id}">✕</button></div>`).join('');
  return `<div class="stack">${topbar('// HOST · SPIELER')}
    ${panel('EINLADEN', `<div class="row" style="gap:14px;align-items:flex-start"><div class="qr" data-qr="${esc(join)}"></div>
      <div class="small" style="min-width:0"><div class="tag">EVENT-CODE</div><div class="h1">${esc(store.code)}</div><div class="tag" style="margin-top:6px">LINK</div><div style="word-break:break-all">${esc(base)}</div></div></div>
      <div class="row" style="margin-top:10px"><button class="btn grow sm" data-act="copy" data-v="${esc(base)}">⧉ LINK</button><button class="btn grow sm" data-act="copy" data-v="${esc(join)}">⧉ LINK + CODE</button></div>`, { cls: 'hi' })}
    ${panel(`SPIELER · ${s.players.length}/${s.config.maxPlayers}`, rows || '<div class="dim small">NOCH NIEMAND ANGEMELDET.</div>')}
    ${panel('SPIELER OHNE HANDY HINZUFÜGEN', `<form data-form="addp" class="row"><input class="in grow" name="name" maxlength="16" placeholder="NAME" required><button class="btn">+</button></form>`)}
  </div>`;
}

function hostJoinView() {
  const s = A.snap;
  return `<div class="stack">${topbar('// HOST · ICH SPIELE MIT')}
    ${panel('SELBST MITSPIELEN', `<div class="row" style="gap:12px">${sprite('knight', 4, 'bob')}<div class="small muted">Als Host kannst du ganz normal mitspielen: eigener Tisch, Life Counter, Decks, Stats & Wrapped.</div></div>
      <form data-form="register" class="stack" style="margin-top:10px"><input class="in code" name="name" maxlength="16" autocomplete="off" placeholder="DEIN NAME" required><input class="in code" name="pin" type="password" inputmode="numeric" pattern="[0-9]{4,6}" maxlength="6" autocomplete="off" placeholder="PIN (4–6 ZIFFERN)" required><div class="tag" style="text-transform:none">Mit Name + PIN kommst du später (auch auf einem anderen Handy) wieder in dein Profil.</div>
      <button class="btn pri block">+ ALS SPIELER EINTRAGEN</button></form>`, { cls: 'hi' })}
    ${s.players.length ? panel('ODER: DAS BIN ICH', `<div class="row wrap">${s.players.map((p) => `<button class="chip" data-act="claim" data-id="${p.id}">${esc(p.name)}</button>`).join('')}</div>`) : ''}</div>`;
}

/** Funny live ticker built from all game logs. */
function feed(limit = 14) {
  const s = A.snap;
  const R = Object.fromEntries(s.rounds.map((r) => [r.id, r]));
  const ev = [];
  const N = (pid) => `<b>${esc(pname(pid))}</b>`;
  for (const g of s.games) {
    const T = `TISCH ${g.tableNo}`;
    const life = {}; for (const st of g.seats) life[st.pid] = 40;
    const warned = {}, poisonW = {}, cmdW = {};
    for (const e of g.log) {
      if (e.k === 'life') {
        const before = life[e.pid]; life[e.pid] += e.d;
        if (e.d <= -10) ev.push({ t: e.t, s: 'axe', c: 'alert', m: `${N(e.pid)} kassiert ${e.d} auf einen Schlag 💥`, T });
        else if (e.d >= 10) ev.push({ t: e.t, s: 'heart', m: `${N(e.pid)} heilt +${e.d}. Frech. ❤️`, T });
        if (before > 10 && life[e.pid] <= 10 && life[e.pid] > 0 && !warned[e.pid]) { warned[e.pid] = 1; ev.push({ t: e.t, s: 'potion', c: 'acc', m: `${N(e.pid)} kommt ins Schwitzen 💦 nur noch ${life[e.pid]} Leben`, T }); }
      } else if (e.k === 'cmd') {
        const seat = g.seats.find((x) => x.pid === e.pid);
        const v = Math.max(...(seat?.cmd[e.from] || [0]));
        if (v >= 15 && !cmdW[e.pid + e.from]) { cmdW[e.pid + e.from] = 1; ev.push({ t: e.t, s: 'sword', c: 'alert', m: `${N(e.from)}s Commander klopft bei ${N(e.pid)} an ⚔ ${v}/21`, T }); }
      } else if (e.k === 'poison') {
        const seat = g.seats.find((x) => x.pid === e.pid);
        if (seat?.poison >= 7 && !poisonW[e.pid]) { poisonW[e.pid] = 1; ev.push({ t: e.t, s: 'potion', c: 'alert', m: `${N(e.pid)} wird langsam grün im Gesicht ☠`, T }); }
      } else if (e.k === 'out') {
        ev.push({ t: e.t, s: 'skull', c: 'alert', m: `${N(e.pid)} ist raus${e.by ? ` – danke, ${N(e.by)}` : ''}. Ab an die Bar 🍺`, T });
      } else if (e.k === 'end') {
        const w = g.ended?.placements.find((x) => x.place === 1 && !x.draw);
        ev.push({ t: e.t, s: w ? 'trophy' : 'shield', c: 'gold', m: w ? `${N(w.pid)} gewinnt ${T}! 🏆` : `${T} endet unentschieden 🤝`, T });
      }
    }
    if (g.ended && !g.log.some((e) => e.k === 'end')) {
      const w = g.ended.placements.find((x) => x.place === 1 && !x.draw);
      if (w) ev.push({ t: g.ended.at, s: 'trophy', c: 'gold', m: `${N(w.pid)} gewinnt ${T}! 🏆`, T });
    }
    if (g.monarch && !g.ended) ev.push({ t: Date.now() - 2, s: 'crown', m: `${N(g.monarch)} trägt gerade die Krone 👑`, T, live: 1 });
    if (!g.ended && R[g.roundId]?.status === 'live') {
      const alive = g.seats.filter((x) => !x.out);
      if (alive.length >= 2) {
        const lead = [...alive].sort((a, b) => b.life - a.life)[0];
        if (lead.life >= 45) ev.push({ t: Date.now() - 1, s: 'shield', m: `${N(lead.pid)} ist der Tank an ${T} (${lead.life} ♥)`, T, live: 1 });
      }
    }
  }
  return ev.sort((a, b) => b.t - a.t).slice(0, limit);
}

function feedPanel(title = 'LIVE-TICKER') {
  const f = feed();
  const ago = (t) => { const m = Math.round((Date.now() - t) / 60000); return m < 1 ? 'JETZT' : `VOR ${m} MIN`; };
  return panel(title, f.map((e) => `<div class="row" style="gap:10px;padding:7px 0;border-bottom:1px solid var(--line);align-items:flex-start">
      <span style="width:34px;text-align:center;flex:none">${sprite(e.s, 2)}</span>
      <div style="flex:1;min-width:0"><div class="small">${e.m}</div><div class="tag">${e.T} · ${e.live ? 'LIVE' : ago(e.t)}</div></div></div>`).join('')
    || '<div class="dim small">NOCH RUHIG AUF DEM SCHLACHTFELD …</div>', { right: '<span class="chip acc" style="padding:2px 8px">● LIVE</span>' });
}

const lifeBar = (life) => `<div class="bar" style="height:8px;margin-top:4px"><i style="width:${Math.max(0, Math.min(100, (life / 40) * 100))}%"></i></div>`;

function liveView() {
  const s = A.snap;
  const S = computeStats(s);
  const games = s.games;
  const running = games.filter((g) => !g.ended).length;
  const done = games.filter((g) => g.ended).length;
  const kos = games.reduce((a, g) => a + g.seats.filter((x) => x.out).length, 0);
  const free = s.live ? freePlayers(s).length : 0;
  const kpi = (lbl, v, cls = '') => `<div class="panel ${cls}" style="padding:12px 14px"><div class="tag">${lbl}</div><div class="num" style="font-size:40px;line-height:1">${v}</div></div>`;
  const out = [topbar(MODE === 'host' ? '// HOST · LIVE-AUSWERTUNG' : '// LIVE-AUSWERTUNG')];
  out.push(`<div class="grid2">${kpi('LAUFENDE SPIELE', running, 'acc')}${kpi('BEENDET', done, 'hi')}${kpi('K.O.S HEUTE', kos)}${kpi('AN DER BAR', free)}</div>`);
  out.push(feedPanel());
  if (s.live) {
    out.push(panel(`RUNDE ${s.live.n} · TIMER`, timerBlock(s.live), { cls: 'hi' }));
    for (const t of s.live.tables) {
      const gid = gameId(s.live, t);
      const g = s.G[gid];
      const rows = t.players.map((pid, i) => {
        const seat = g?.seats.find((x) => x.pid === pid);
        const pl = g?.ended?.placements.find((x) => x.pid === pid);
        const right = pl ? `<span class="${pl.place === 1 ? 'gold' : seat?.out ? 'alert' : ''}">${pl.place}.${pl.draw ? ' ½' : ''}</span>` : seat?.out ? '<span class="alert">K.O.</span>' : seat ? `<span class="num" style="font-size:22px">${seat.life}</span>` : '<span class="dim">—</span>';
        const extra = seat ? [Math.max(0, ...Object.values(seat.cmd).flat()) ? `⚔${Math.max(...Object.values(seat.cmd).flat())}` : '', seat.poison ? `☠${seat.poison}` : '', g.monarch === pid ? '👑' : ''].filter(Boolean).join(' ') : '';
        return `<div style="padding:6px 0;border-bottom:1px solid var(--line)"><div class="between"><span class="row" style="gap:8px;min-width:0"><i style="width:10px;height:10px;border-radius:50%;background:var(--p${i % 6});flex:none"></i>
          <b class="up" style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(pname(pid))}</b><span class="tag">${esc(seat?.deckName || '')}</span></span><span class="row">${extra ? `<span class="tag">${extra}</span>` : ''}${right}</span></div>
          ${seat && !seat.out && !g.ended ? lifeBar(seat.life) : ''}</div>`;
      }).join('');
      const st = !g ? '<span class="chip off">NICHT GESTARTET</span>' : g.ended ? '<span class="chip gold">BEENDET</span>' : '<span class="chip acc">LIVE</span>';
      out.push(panel(`TISCH ${t.no}${t.auto ? ' · BAR-TISCH' : ''}`, `${rows}${g ? `<button class="btn sm block" style="margin-top:10px" data-act="nav" data-to="game/${gid}">${MODE === 'host' ? '♥ COUNTER ÖFFNEN' : '◉ LIVE ZUSCHAUEN'}</button>` : ''}`, { right: st }));
    }
  } else out.push(panel('LIVE', '<div class="dim">KEINE LAUFENDE RUNDE.</div>'));
  const lb = S.leaderboard.filter((p) => p.games).slice(0, 12);
  if (lb.length) out.push(panel('LEADERBOARD', lb.map((p, i) => leader(`${String(i + 1).padStart(2, '0')}  ${p.name}`, `${p.wins}W · ${p.draws}D · ${p.points} PTS`, i === 0 ? 'gold' : '')).join('')));
  if (S.awards.length) out.push(panel('AWARDS (LIVE)', S.awards.map((a) => `<div class="row" style="gap:12px;padding:6px 0;border-bottom:1px solid var(--line)">
    <span style="width:44px;text-align:center">${sprite(a.sprite, 3)}</span><div style="flex:1;min-width:0"><div class="tag">${esc(a.title)}</div><div class="up"><b>${esc(a.name)}</b></div></div><span class="small muted" style="text-align:right">${esc(a.value || '')}</span></div>`).join('')));
  const past = s.rounds.filter((r) => r.status === 'done').reverse();
  for (const r of past) {
    const res = r.tables.map((t) => {
      const g = s.G[gameId(r, t)];
      if (!g?.ended) return `<div class="small dim">TISCH ${t.no}: KEIN ERGEBNIS</div>`;
      return `<div class="small" style="padding:3px 0"><b>TISCH ${t.no}</b> · ${[...g.ended.placements].sort((a, b) => a.place - b.place).map((x) => `${x.place}. ${esc(pname(x.pid))}${x.draw ? '½' : ''}`).join(' · ')}</div>`;
    }).join('');
    out.push(panel(`RUNDE ${r.n} · ERGEBNISSE`, res));
  }
  return `<div class="stack">${out.join('')}</div>`;
}

function hostSetup() {
  const c = A.snap.config;
  const num = (f, l, min, max) => `<div><label class="lbl">${l}</label><input class="in" type="number" inputmode="numeric" min="${min}" max="${max}" data-cfg="${f}" value="${c[f]}"></div>`;
  return `<div class="stack">${topbar('// HOST · SETUP')}
    ${panel('EVENT', `<div class="stack"><div><label class="lbl">Eventname</label><input class="in" data-cfg="name" value="${esc(c.name)}"></div>
      <div class="grid2">${num('playMin', 'Spielzeit (min)', 10, 240)}${num('otMin', 'Overtime (min)', 0, 60)}${num('tableSize', 'Spieler pro Tisch', 2, 6)}${num('maxPlayers', 'Max. Spieler', 2, 40)}${num('autoMinLeft', 'Auto-Tisch nur wenn ≥ min übrig', 0, 120)}</div>
      <div class="toggle ${c.smart ? 'on' : ''}" data-act="h-toggle" data-f="smart"><span class="small">INTELLIGENTES MATCHING</span><span class="sw"></span></div>
      <div class="toggle ${c.autoTables ? 'on' : ''}" data-act="h-toggle" data-f="autoTables"><span class="small">AUTO-TISCHE AUS AUSGESCHIEDENEN</span><span class="sw"></span></div></div>`)}
    ${panel('WRAPPED', `<div class="row" style="gap:14px">${sprite('trophy', 4, 'bob')}<div class="small muted">Schickt jedem Spieler sein persönliches Commander-Wrapped mit Awards.</div></div>
      <div class="row" style="margin-top:10px">${c.wrappedAt ? `<button class="btn warn grow" data-act="h-wrapped" data-on="0">✕ ZURÜCKZIEHEN</button>` : `<button class="btn pri grow" data-act="h-wrapped" data-on="1">★ WRAPPED PUSHEN</button>`}
      <button class="btn" data-act="wr-open">VORSCHAU</button></div>`, { cls: c.wrappedAt ? 'hi' : '' })}
    ${panel('SICHERHEIT', `<div class="stack">${leader('EVENT-CODE', esc(store.code))}<button class="btn block" data-act="h-pin">⚿ HOST-PIN ÄNDERN</button></div>`)}
    ${panel('BACKUP', `<div class="row"><button class="btn grow" data-act="h-export">⇩ EXPORT</button><label class="btn grow">⇧ IMPORT<input type="file" accept="application/json" data-chg="h-import" class="hide"></label></div>`)}
    ${panel('DANGER ZONE', `<div class="stack"><button class="btn warn block" data-act="h-reset" data-k="games">✕ RUNDEN & SPIELE LÖSCHEN</button><button class="btn warn block" data-act="h-reset" data-k="all">✕ ALLES LÖSCHEN (INKL. SPIELER)</button></div>`, { cls: 'alert' })}
    <button class="btn block" data-act="logout">⏻ ABMELDEN</button>
    <div class="tag dim">DEVICE ${DEVICE} · SYNC ${store.status.join(' / ').toUpperCase()}</div></div>`;
}

/* ═════════════════════ tick ═════════════════════ */

let lastTick = 0;
function tick() {
  if (!store.prefix || !A.snap) return;
  refresh();
  // live timer text
  for (const el of document.querySelectorAll('[data-timer]')) {
    const r = A.snap.rounds.find((x) => x.id === el.dataset.timer);
    if (!r) continue;
    const { txt, ti } = timerLabel(r, A.snap.config);
    if (el.textContent !== txt) el.textContent = txt;
    el.classList.toggle('ot', ti.phase === 'ot');
    el.classList.toggle('alert', ti.phase === 'ot' && el.classList.contains('big'));
    const bar = document.querySelector(`[data-tbar="${r.id}"]`);
    if (bar) {
      const pct = ti.phase === 'idle' ? 0 : ti.phase === 'ended' ? 100 : ti.phase === 'ot' ? ((ti.otMs - ti.left) / ti.otMs) * 100 : (ti.el / ti.playMs) * 100;
      bar.firstElementChild.style.width = Math.min(100, pct) + '%';
      bar.classList.toggle('ot', ti.phase === 'ot');
    }
    const key = r.id + ti.phase;
    if (A.lastPhase && A.lastPhase !== key && r.id === A.snap.live?.id) {
      if (ti.phase === 'ot') { toast(`${sprite('skull', 3)} <b class="alert">OVERTIME!</b> NOCH ${A.snap.config.otMin} MINUTEN`, 5000); buzz([200, 100, 200]); }
      if (ti.phase === 'ended') { toast('<b class="alert">TIME OUT</b> · SPIEL BEENDET → UNENTSCHIEDEN', 5000); buzz([300, 100, 300]); }
    }
    if (r.id === A.snap.live?.id) A.lastPhase = key;
  }
  lifeTick();
  const now = Date.now();
  if (now - lastTick < 2000) return;
  lastTick = now;
  // assignment notification
  if (A.me && me()) {
    const ref = myTable();
    const key = ref ? ref.round.id + ':' + ref.table.id : '';
    const sk = `cz.seen.${store.prefix}`;
    if (key && ls.get(sk) !== key) {
      ls.set(sk, key);
      A.ui.assign = ref.gid;
      buzz([120, 60, 120]);
      render();
    }
  }
  autoTick();
}

function autoTick() {
  const s = A.snap;
  if (!s?.live || !s.config.autoTables) return;
  const prop = proposeAutoTable(s);
  if (!prop || s.live.tables.some((t) => t.id === prop.id)) return;
  if (MODE !== 'host' && !prop.players.includes(A.me)) return;
  if (A.autoPending === prop.id) return;
  A.autoPending = prop.id;
  setTimeout(() => {
    refresh();
    const s2 = A.snap;
    const p2 = proposeAutoTable(s2);
    if (p2?.id === prop.id && s2.live && !s2.live.tables.some((t) => t.id === prop.id)) addTable(s2.live, p2);
    A.autoPending = null;
  }, MODE === 'host' ? 300 : 800 + Math.random() * 2500);
}

function addTable(round, t) {
  const no = Math.max(0, ...round.tables.map((x) => x.no)) + 1;
  store.put('round/' + round.id, { ...round, tables: [...round.tables, { id: t.id, no, players: t.players, auto: true, createdAt: Date.now() }] });
}

/* ═════════════════════ actions ═════════════════════ */

const putPlayer = (p) => store.put('player/' + p.id, p);
const putCfg = (patch) => store.put('config', { ...A.snap.config, ...patch });
const putRound = (r) => store.put('round/' + r.id, r);

const actions = {
  ...lcActions, ...wrActions,
  nav(el) { A.ui.sheet = null; go(el.dataset.to); },
  logout() {
    if (!confirm('Abmelden?')) return;
    if (MODE === 'host') ls.del(hostKey());
    ls.del('cz.code'); store.close(); store.prefix = null; A.me = null; A.ui = {}; render();
  },
  async claim(el) {
    const p = A.snap.P[el.dataset.id];
    if (!p) return;
    if (p.pinHash) {
      if (MODE !== 'host') {
        const pin = prompt(`PIN für ${p.name}`);
        if (pin == null) return;
        if ((await sha(`ppin:${p.id}:${pin.trim()}`)) !== p.pinHash) return toast('<span class="alert">✕ FALSCHE PIN</span> · PIN VERGESSEN? FRAG DEN HOST.', 4000);
      } else if (!confirm(`Als ${p.name} mitspielen?`)) return;
    } else {
      const pin = prompt(`${p.name} hat noch keine PIN. Lege jetzt eine fest (4–6 Ziffern):`);
      if (pin == null) return;
      if (!/^\d{4,6}$/.test(pin.trim())) return toast('PIN: 4–6 ZIFFERN');
      putPlayer({ ...p, pinHash: await sha(`ppin:${p.id}:${pin.trim()}`) });
    }
    A.me = p.id; ls.set(meKey(), p.id); go(MODE === 'host' ? 'me' : 'home');
    toast(`WILLKOMMEN ZURÜCK, ${esc(p.name).toUpperCase()}`);
  },
  async 'set-pin'() {
    const m = me(); const pin = prompt('Neue PIN (4–6 Ziffern)');
    if (pin == null) return;
    if (!/^\d{4,6}$/.test(pin.trim())) return toast('PIN: 4–6 ZIFFERN');
    putPlayer({ ...m, pinHash: await sha(`ppin:${m.id}:${pin.trim()}`) }); toast('PIN GESPEICHERT');
  },
  'me-logout'() {
    if (!confirm('Von diesem Gerät abmelden? Mit Name + PIN kommst du jederzeit wieder rein.')) return;
    ls.del(meKey()); A.me = null; A.draft = null; go(MODE === 'host' ? 'me' : 'home');
  },
  'h-resetpin'(el) { const p = A.snap.P[el.dataset.id]; if (confirm(`PIN von ${p.name} zurücksetzen? Beim nächsten Login legt ${p.name} eine neue fest.`)) putPlayer({ ...p, pinHash: null }); },
  pause() { const m = me(); const id = A.snap.live?.id; putPlayer({ ...m, pauseRound: m.pauseRound === id ? null : id }); },
  'assign-ok'(el) { A.ui.assign = null; if (el.dataset.to) go(el.dataset.to); else render(); },
  copy(el) { navigator.clipboard?.writeText(el.dataset.v).then(() => toast('⧉ KOPIERT')); },
  rename() {
    const m = me(); const n = prompt('Neuer Name', m.name);
    if (n?.trim()) putPlayer({ ...m, name: n.trim().slice(0, 16) });
  },
  mana(el) { const c = el.dataset.c; const d = A.draft; d.colors = d.colors.includes(c) ? d.colors.replace(c, '') : 'WUBRG'.split('').filter((x) => d.colors.includes(x) || x === c).join(''); render(); },
  'draft-partner'() { A.draft.partner = !A.draft.partner; render(); },
  async 'ac-pick'(el) {
    const name = el.dataset.name;
    A.draft.name = name;
    document.getElementById('aclist')?.classList.add('hide');
    const info = await cardInfo(name);
    if (info) Object.assign(A.draft, { name: info.name, colors: info.colors, art: info.art, partner: info.partner || A.draft.partner });
    render();
  },
  async 'deck-save'() {
    const m = me(); const d = A.draft;
    const name = (document.getElementById('deckname')?.value || d.name).trim();
    if (!name) return toast('NAME FEHLT');
    if (!d.art && !d.colors) { const info = await cardInfo(name); if (info) Object.assign(d, { colors: info.colors, art: info.art, partner: info.partner || d.partner }); }
    const decks = [...(m.decks || [])];
    const rec = { id: d.editId || uid(5), name: name.slice(0, 40), colors: d.colors, partner: d.partner, art: d.art };
    if (d.editId) decks[decks.findIndex((x) => x.id === d.editId)] = rec;
    else if (decks.length >= MAX_DECKS) return toast(`MAX ${MAX_DECKS} DECKS`);
    else decks.push(rec);
    A.draft = emptyDraft();
    putPlayer({ ...m, decks });
    toast(`${sprite('sword', 2)} ${esc(rec.name)} GESPEICHERT`);
  },
  'deck-edit'(el) { const x = me().decks.find((y) => y.id === el.dataset.id); A.draft = { ...emptyDraft(), ...x, editId: x.id }; render(); document.getElementById('deckname')?.scrollIntoView({ block: 'center' }); },
  'deck-cancel'() { A.draft = emptyDraft(); render(); },
  'deck-del'(el) { const m = me(); const x = m.decks.find((y) => y.id === el.dataset.id); if (confirm(`${x.name} löschen?`)) putPlayer({ ...m, decks: m.decks.filter((y) => y.id !== x.id) }); },
  'deck-top'(el) { const m = me(); const x = m.decks.find((y) => y.id === el.dataset.id); putPlayer({ ...m, decks: [x, ...m.decks.filter((y) => y.id !== x.id)] }); },

  // host
  'h-toggle'(el) { putCfg({ [el.dataset.f]: !A.snap.config[el.dataset.f] }); },
  'h-draw'() {
    const s = A.snap;
    const pids = s.players.filter((p) => p.present !== false).map((p) => p.id);
    if (pids.length < 2) return toast('ZU WENIGE SPIELER');
    const res = makeTables(pids, s.rounds, { size: s.config.tableSize, smart: s.config.smart });
    const n = s.draft?.n || (s.rounds.at(-1)?.n || 0) + 1;
    const id = s.draft?.id || 'r' + n + uid(3);
    A.ui.swapSel = null;
    putRound({ id, n, status: 'draft', createdAt: Date.now(), tables: res.tables, timer: {} });
    buzz(20);
  },
  'h-swap'(el) {
    const sel = A.ui.swapSel; const t = el.dataset.t; const p = el.dataset.p;
    if (!sel) { A.ui.swapSel = { t, p }; return render(); }
    A.ui.swapSel = null;
    if (sel.p === p || sel.t === t) return render();
    const d = structuredClone(A.snap.draft);
    const ta = d.tables.find((x) => x.id === sel.t), tb = d.tables.find((x) => x.id === t);
    ta.players[ta.players.indexOf(sel.p)] = p; tb.players[tb.players.indexOf(p)] = sel.p;
    putRound(d);
  },
  'h-publish'() {
    const s = A.snap;
    if (s.live) {
      const ti = timerInfo(s.live, s.config);
      if (ti.phase !== 'ended' && ti.phase !== 'idle' && !confirm(`Runde ${s.live.n} läuft noch. Trotzdem beenden und neue Runde starten?`)) return;
      putRound({ ...s.live, status: 'done', timer: { ...s.live.timer, endedAt: s.live.timer?.endedAt || (s.live.timer?.startedAt ? Date.now() : null) } });
    }
    putRound({ ...s.draft, status: 'live', publishedAt: Date.now() });
    toast(`${sprite('sword', 2)} RUNDE ${s.draft.n} VERÖFFENTLICHT`);
  },
  'h-discard'() { if (confirm('Vorschau verwerfen?')) store.del('round/' + A.snap.draft.id); },
  'h-timer'(el) {
    const r = A.snap.live; const t = { ...(r.timer || {}) }; const now = Date.now(); const k = el.dataset.k;
    if (k === 'start') Object.assign(t, { startedAt: now, pausedAt: null, pausedTotal: 0, addMs: 0, endedAt: null });
    if (k === 'pause') t.pausedAt = now;
    if (k === 'resume') { t.pausedTotal = (t.pausedTotal || 0) + (now - t.pausedAt); t.pausedAt = null; }
    if (k === 'add') t.addMs = (t.addMs || 0) + 300000;
    if (k === 'sub') t.addMs = (t.addMs || 0) - 300000;
    if (k === 'stop') { if (!confirm('Runde jetzt beenden? Alle laufenden Spiele enden unentschieden.')) return; t.endedAt = now; }
    if (k === 'reset') { if (!confirm('Timer zurücksetzen?')) return; Object.assign(t, { startedAt: null, pausedAt: null, pausedTotal: 0, addMs: 0, endedAt: null }); }
    putRound({ ...r, timer: t });
  },
  'h-autotable'() {
    const s = A.snap;
    const prop = proposeAutoTable({ ...s, config: { ...s.config, autoTables: true, autoMinLeft: 0, tableSize: Math.min(s.config.tableSize, freePlayers(s).length) } });
    if (!prop) return toast('KEIN NEUER TISCH MÖGLICH (GLEICHER POD?)');
    addTable(s.live, prop);
  },
  'h-present'(el) { const p = A.snap.P[el.dataset.id]; putPlayer({ ...p, present: p.present === false }); },
  'h-rename'(el) { const p = A.snap.P[el.dataset.id]; const n = prompt('Name', p.name); if (n?.trim()) putPlayer({ ...p, name: n.trim().slice(0, 16) }); },
  'h-delp'(el) { const p = A.snap.P[el.dataset.id]; if (confirm(`${p.name} entfernen?`)) store.del('player/' + p.id); },
  'h-wrapped'(el) { putCfg({ wrappedAt: el.dataset.on === '1' ? Date.now() : null }); if (el.dataset.on === '1') toast(`${sprite('trophy', 2)} WRAPPED GEPUSHT`); },
  async 'h-pin'() {
    const p = prompt('Neue Host-PIN (min. 4 Zeichen)');
    if (!p || p.length < 4) return;
    const h = await sha('pin:' + p);
    ls.set(hostKey(), h); putCfg({ pinHash: h }); toast('PIN GEÄNDERT');
  },
  'h-export'() {
    const blob = new Blob([JSON.stringify({ code: store.code, at: Date.now(), data: store.dump() }, null, 1)], { type: 'application/json' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `commander-day-${new Date().toISOString().slice(0, 10)}.json`; a.click();
  },
  async 'h-import'(el) {
    const f = el.files?.[0]; if (!f) return;
    try { const j = JSON.parse(await f.text()); if (!confirm('Backup einspielen? Neuere Daten bleiben erhalten.')) return; store.restore(j.data || j); toast('BACKUP EINGESPIELT'); } catch { toast('UNGÜLTIGE DATEI'); }
  },
  'h-reset'(el) {
    const all = el.dataset.k === 'all';
    if (prompt(`Tippe RESET um ${all ? 'ALLES' : 'alle Runden & Spiele'} zu löschen`) !== 'RESET') return;
    for (const [k, r] of store.e) if (!r.d && (k.startsWith('round/') || k.startsWith('game/') || (all && k.startsWith('player/')))) store.del(k);
    if (all) putCfg({ wrappedAt: null });
    toast('GELÖSCHT');
  },
};

const forms = {
  async login(f) { await enter(f.code.value); },
  async create(f) {
    const pinHash = await sha('pin:' + f.pin.value);
    store.put('config', { ...DEFAULT_CONFIG, name: f.name.value.trim() || DEFAULT_CONFIG.name, pinHash, createdAt: Date.now() });
    ls.set(hostKey(), pinHash);
  },
  async pin(f) {
    const h = await sha('pin:' + f.pin.value);
    A.ui.pinErr = h !== A.snap.config.pinHash;
    if (!A.ui.pinErr) ls.set(hostKey(), h);
    render();
  },
  async register(f) {
    const s = A.snap;
    const name = f.name.value.trim().slice(0, 16);
    const pin = f.pin.value.trim();
    if (!name) return;
    if (!/^\d{4,6}$/.test(pin)) return toast('PIN: 4–6 ZIFFERN');
    if (s.players.some((p) => p.name.toLowerCase() === name.toLowerCase())) return toast('NAME SCHON VERGEBEN — UNTEN NAME WÄHLEN + PIN');
    if (s.players.length >= s.config.maxPlayers) return toast('EVENT VOLL');
    const id = uid(8);
    const p = { id, name, decks: [], present: true, joinedAt: Date.now(), pinHash: await sha(`ppin:${id}:${pin}`) };
    putPlayer(p);
    A.me = p.id; ls.set(meKey(), p.id);
    go('decks');
    toast(`WILLKOMMEN, ${esc(name).toUpperCase()}. TRAG DEINE COMMANDER EIN.`, 4000);
  },
  addp(f) {
    const name = f.name.value.trim().slice(0, 16);
    if (name) putPlayer({ id: uid(8), name, decks: [], present: true, joinedAt: Date.now(), byHost: true });
    f.reset();
  },
};

document.addEventListener('click', (e) => {
  const el = e.target.closest('[data-act]');
  if (!el || !actions[el.dataset.act]) return;
  if (el.tagName === 'A' || el.tagName === 'BUTTON') e.preventDefault();
  actions[el.dataset.act](el, e);
});
document.addEventListener('change', (e) => {
  const el = e.target;
  if (el.dataset.chg && actions[el.dataset.chg]) return actions[el.dataset.chg](el, e);
  if (el.dataset.cfg) {
    const f = el.dataset.cfg;
    const v = el.type === 'number' ? Math.max(+el.min || 0, Math.min(+el.max || 999, parseInt(el.value, 10) || 0)) : el.value.trim();
    putCfg({ [f]: v });
  }
});
document.addEventListener('input', (e) => { if (e.target.dataset.inp === 'deckname') onDeckInput(e.target); });
document.addEventListener('submit', (e) => {
  const f = e.target.closest('[data-form]');
  if (!f) return;
  e.preventDefault();
  forms[f.dataset.form]?.(f);
});
document.addEventListener('keydown', (e) => {
  if (A.route !== 'wrapped') return;
  if (e.key === 'ArrowRight' || e.key === ' ') actions['wr-next']();
  if (e.key === 'ArrowLeft') actions['wr-prev']();
});

window.__cz = { store, A }; // debug handle
boot();
