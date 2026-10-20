// Test game ("?demo"): a self-contained sandbox with bot players, a running round,
// a bot table that plays itself, and a checklist that ticks off every feature the tester used.
import { A, store, DEVICE, render, toast, panel, esc, me, go } from './ctx.js';
import { DEFAULT_CONFIG, gameId, newGame, setLife, setCmd, settle, alive, endGame, timerInfo } from './logic.js';
import { cardInfo } from './art.js';
import { sprite } from './sprites.js';
import { ls, pick, buzz } from './util.js';

const ACTS = 'cz.demo.acts';
const BOTS = [
  ['Mira', "Yuriko, the Tiger's Shadow"], ['Jonas', 'Lathril, Blade of the Elves'], ['Lena', 'Kenrith, the Returned King'],
  ['Oskar', 'Edgar Markov'], ['Pia', 'Meren of Clan Nel Toth'], ['Tom', 'Krenko, Mob Boss'], ['Eva', 'Tatyova, Benthic Druid'],
];
const ROUND = 'rdemo';
const acts = () => new Set(ls.get(ACTS, []));
const addAct = (a) => { const s = acts(); if (!s.has(a)) { s.add(a); ls.set(ACTS, [...s]); } };

/* ───────────── seeding ───────────── */

export async function demoSeed() {
  if (store.get('config')) return;
  store.put('config', { ...DEFAULT_CONFIG, name: 'TESTSPIEL', maxPlayers: 16, autoTables: false, eventStart: Date.now() - 1000, eventDate: 'Testspiel', eventPlace: 'Dein Handy', eventTime: 'Jetzt', createdAt: Date.now() });
  BOTS.forEach(([name, cmdr], i) => store.put('player/bot' + i, { id: 'bot' + i, name, decks: [{ id: 'bd' + i, name: cmdr, colors: '', art: null }], present: true, joinedAt: Date.now(), bot: true }));
  // fetch commander art in the background (pixel portraits in the life counter)
  for (const [i, [, cmdr]] of BOTS.entries()) {
    const info = await cardInfo(cmdr).catch(() => null);
    const p = store.get('player/bot' + i);
    if (info && p) store.put('player/bot' + i, { ...p, decks: [{ id: 'bd' + i, ...info }] });
  }
}

function startRound() {
  if (store.get('round/' + ROUND) || !A.me) return;
  store.put('round/' + ROUND, {
    id: ROUND, n: 1, status: 'live', createdAt: Date.now(), publishedAt: Date.now(),
    tables: [{ id: 't1', no: 1, players: [A.me, 'bot0', 'bot1', 'bot2'] }, { id: 't2', no: 2, players: ['bot3', 'bot4', 'bot5', 'bot6'] }],
    timer: { startedAt: Date.now(), pausedTotal: 0, addMs: 0 },
  });
}

/* ───────────── bots ───────────── */

let lastBot = 0;
function botStep() {
  const r = store.get('round/' + ROUND);
  if (!r) return;
  const t = r.tables[1];
  const gid = gameId(r, t);
  let g = store.get('game/' + gid);
  if (!g) { store.put('game/' + gid, newGame(r, t, Object.fromEntries(A.snap.players.map((p) => [p.id, p])), { device: 'bot', name: 'BOTS' })); return; }
  if (g.ended) return;
  const mine = A.snap.G[gameId(r, r.tables[0])];
  const hurry = mine?.ended; // once the tester's game is over, let the bot table finish soon
  if (Date.now() - lastBot < (hurry ? 1500 : 5000 + Math.random() * 4000)) return;
  lastBot = Date.now();
  g = structuredClone(g);
  const al = alive(g);
  const victim = hurry ? [...al].sort((x, y) => x.life - y.life)[0] : pick(al);
  const roll = Math.random();
  if (!hurry && roll < 0.2 && al.length > 1) {
    const from = pick(al.filter((s) => s.pid !== victim.pid));
    setCmd(g, victim.pid, from.pid, 0, 3 + Math.floor(Math.random() * 5));
  } else if (!hurry && roll < 0.3) {
    victim.poison += 1 + Math.floor(Math.random() * 2);
    g.log.push({ t: Date.now(), pid: victim.pid, k: 'poison', d: 1 });
  } else {
    setLife(g, victim.pid, -(hurry ? 20 : 2 + Math.floor(Math.random() * 9)));
  }
  if (Math.random() < 0.1) g.monarch = pick(al).pid;
  const fresh = settle(g);
  for (const s of fresh) if (!s.out.by) s.out.by = pick(alive(g).length ? alive(g) : g.seats).pid;
  store.put('game/' + gid, g);
}

/* ───────────── checklist ───────────── */

function myGame() {
  const r = store.get('round/' + ROUND);
  return r ? A.snap.G[gameId(r, r.tables[0])] : null;
}

export function demoChecks() {
  const a = acts();
  const g = myGame();
  const log = g?.log || [];
  const m = me();
  return [
    ['reg', 'Mit Name + PIN angemeldet', 'Startseite: Name & PIN eingeben', !!m],
    ['deck', 'Commander eingetragen', 'Tab DECKS → Commander suchen & hinzufügen', !!m?.decks?.length],
    ['assign', 'Tisch-Popup gesehen', 'Kommt nach dem Auslosen automatisch', a.has('assign-ok')],
    ['start', 'Life Counter gestartet', 'TISCH → Life Counter starten', !!g],
    ['tap', 'Leben ±1 getippt', 'Links/rechts auf eine Kachel tippen', log.some((e) => e.k === 'life' && Math.abs(e.d) < 10)],
    ['hold', 'Leben ±10 (Finger halten)', 'Finger auf einer Kachel halten', log.some((e) => e.k === 'life' && Math.abs(e.d) >= 10)],
    ['cmd', 'Commander-Schaden eingetragen', '⋯ an einer Kachel → Commander-Schaden +', log.some((e) => e.k === 'cmd')],
    ['ctr', 'Gift / Energie / Counter genutzt', '⋯ → Gift, Energie, Erfahrung oder Rad', log.some((e) => ['poison', 'energy', 'exp', 'rad'].includes(e.k))],
    ['mon', 'Monarch oder Initiative vergeben', '⋯ → 👑 Monarch / ⇡ Initiative', a.has('lc-mon') || a.has('lc-init')],
    ['dice', 'Würfel / Münze benutzt', '☰ Menü → W6, W20, Münze, Wer startet', a.has('lc-roll')],
    ['log', 'Verlauf angesehen', '☰ Menü → Verlauf', a.has('lc-sheet:log')],
    ['undo', 'Rückgängig benutzt', '↶ in der Mitte', a.has('lc-undo')],
    ['ko', 'Jemanden K.O. gesetzt', 'Leben auf 0, 10 Gift oder 21 Cmd-Schaden', !!g?.seats.some((s) => s.out)],
    ['win', 'Spiel beendet & Siegerscreen gesehen', 'Alle anderen rauswerfen (oder ☰ → Spiel beenden)', a.has('lc-dismiss')],
    ['live', 'LIVE-Tab mit Ticker angesehen', 'Tab LIVE', a.has('route:live')],
    ['stats', 'Statistiken angesehen', 'Tab STATS', a.has('route:stats')],
    ['wrapped', 'Wrapped angesehen', 'Erscheint nach dem Spiel auf TISCH', a.has('wr-open')],
    ['relogin', 'Abgemeldet & mit PIN wieder rein', 'DECKS → Abmelden, dann Name wählen + PIN', a.has('me-logout') && a.has('claim')],
  ].map(([id, label, hint, done]) => ({ id, label, hint, done }));
}

export function demoRecord(el) {
  const act = el.dataset.act;
  if (!act) return;
  addAct(act);
  if (act === 'lc-sheet' && el.dataset.k) addAct('lc-sheet:' + el.dataset.k);
}
export function demoRoute(route) { if (route) addAct('route:' + route.split('/')[0]); }

let prevDone = null;
export function demoTick() {
  if (!A.snap) return;
  // after registering and adding a deck (or pressing "jetzt auslosen") the round starts
  if (me() && me().decks?.length) startRound();
  botStep();
  // unlock Wrapped once the tester's game is over and the bot table finished
  const r = store.get('round/' + ROUND);
  if (r && !A.snap.config.wrappedAt) {
    const gs = r.tables.map((t) => A.snap.G[gameId(r, t)]);
    if (gs.every((g) => g?.ended)) { store.put('config', { ...store.get('config'), wrappedAt: Date.now() }); toast(`${sprite('trophy', 2)} WRAPPED IST FREIGESCHALTET`, 4000); }
  }
  // tick-off feedback
  const done = demoChecks().filter((c) => c.done).map((c) => c.id);
  if (prevDone) for (const id of done) if (!prevDone.includes(id)) {
    const c = demoChecks().find((x) => x.id === id);
    toast(`✓ TEST: ${esc(c.label)} · ${done.length}/${demoChecks().length}`, 2200);
    buzz(20);
  }
  prevDone = done;
}

/* ───────────── UI ───────────── */

export function demoBanner() {
  const all = demoChecks(); const n = all.filter((c) => c.done).length;
  return `<div class="demobar" data-act="nav" data-to="home">🧪 TESTSPIEL · ${n}/${all.length} GETESTET · NICHTS HIER ZÄHLT</div>`;
}

export function demoPanel() {
  const all = demoChecks(); const n = all.filter((c) => c.done).length;
  const r = store.get('round/' + ROUND);
  const rows = all.map((c) => `<div class="row" style="gap:10px;padding:6px 0;border-bottom:1px solid var(--line);align-items:flex-start">
      <span class="chip ${c.done ? 'acc' : 'off'}" style="flex:none;min-width:28px;justify-content:center">${c.done ? '✓' : '·'}</span>
      <div><div class="small" style="font-weight:700">${esc(c.label)}</div>${c.done ? '' : `<div class="tag" style="text-transform:none">${esc(c.hint)}</div>`}</div></div>`).join('');
  return panel(`TESTMISSION · ${n}/${all.length}`, `
    <div class="small" style="margin-bottom:8px">${n === all.length ? '🎉 <b>Alles getestet – danke!</b> Schick das Ergebnis zurück.' : 'Probier alles einmal aus – jeder Punkt hakt sich automatisch ab. Die Mitspieler sind simuliert.'}</div>
    <div class="bar" style="margin-bottom:8px"><i style="width:${(n / all.length) * 100}%"></i></div>
    ${rows}
    <label class="lbl" style="margin-top:12px">Notizen / Fehler (optional)</label>
    <textarea class="in" id="demonotes" rows="3" placeholder="z.B. Halten für ±10 reagiert langsam …">${esc(ls.get('cz.demo.notes', ''))}</textarea>
    <div class="grid2" style="margin-top:10px">
      ${!r && me() ? '<button class="btn sm" data-act="demo-draw">⚄ JETZT AUSLOSEN</button>' : ''}
      ${r ? '<button class="btn sm" data-act="demo-skip">⏩ +10 MIN ZEIT</button>' : ''}
      <button class="btn sm pri" data-act="demo-share">↗ ERGEBNIS SENDEN</button>
      <button class="btn sm warn" data-act="demo-reset">↺ NEU STARTEN</button>
    </div>`, { cls: 'hi', right: '<span class="chip acc" style="padding:2px 8px">TEST</span>' });
}

function resultText() {
  const all = demoChecks(); const n = all.filter((c) => c.done).length;
  const ua = navigator.userAgent;
  const dev = /iPhone|iPad/.test(ua) ? 'iPhone/iPad' : /Android/.test(ua) ? 'Android' : 'Desktop';
  const standalone = matchMedia('(display-mode: standalone)').matches || navigator.standalone ? ' · als App installiert' : ' · im Browser';
  const notes = (document.getElementById('demonotes')?.value || ls.get('cz.demo.notes', '')).trim();
  return `🧪 COMMAND//ZONE Testspiel – ${n}/${all.length} getestet\n` +
    `👤 ${me()?.name || '?'} · 📱 ${dev}${standalone}\n\n` +
    all.map((c) => `${c.done ? '✅' : '❌'} ${c.label}`).join('\n') +
    (notes ? `\n\n📝 ${notes}` : '');
}

export const demoActions = {
  'demo-draw'() { if (!me()) return; startRound(); },
  'demo-skip'() {
    const r = store.get('round/' + ROUND); if (!r) return;
    store.put('round/' + ROUND, { ...r, timer: { ...r.timer, startedAt: r.timer.startedAt - 10 * 60000 } });
    const ti = timerInfo(store.get('round/' + ROUND), A.snap.config);
    toast(ti.phase === 'ot' ? '⏩ OVERTIME!' : ti.phase === 'ended' ? '⏩ ZEIT ABGELAUFEN' : '⏩ +10 MINUTEN');
  },
  async 'demo-share'() {
    ls.set('cz.demo.notes', document.getElementById('demonotes')?.value || '');
    const text = resultText();
    try { if (navigator.share) { await navigator.share({ text }); return; } } catch { return; }
    try { await navigator.clipboard.writeText(text); toast('⧉ ERGEBNIS KOPIERT – IN WHATSAPP EINFÜGEN'); }
    catch { prompt('Zum Kopieren gedrückt halten:', text); }
  },
  'demo-reset'() {
    if (!confirm('Testspiel komplett neu starten?')) return;
    store.wipe(); ls.del(ACTS); ls.del('cz.demo.notes'); ls.del(`cz.me.${store.prefix}`); ls.del(`cz.seen.${store.prefix}`);
    A.me = null; A.ui = {}; A.dismissed = {}; A.celebrated = {}; A.undo = {}; prevDone = null;
    demoSeed().then(() => go('home'));
  },
};

document.addEventListener('input', (e) => { if (e.target.id === 'demonotes') ls.set('cz.demo.notes', e.target.value); });
export const DEMO_DEVICE = DEVICE;
