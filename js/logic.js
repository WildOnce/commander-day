// Pure game logic: pairing, timer, life-counter rules, stats & awards.
import { shuffle, uid } from './util.js';

export const DEFAULT_CONFIG = {
  name: 'COMMANDER DAY', playMin: 80, otMin: 10, tableSize: 4, maxPlayers: 12,
  smart: true, autoTables: true, autoMinLeft: 20, wrappedAt: null,
};
export const MAX_DECKS = 15;
export const START_LIFE = 40;

/* ───────────────────────── data access ───────────────────────── */

export function snapshot(store) {
  const config = { ...DEFAULT_CONFIG, ...(store.get('config') || {}) };
  const players = store.list('player/').sort((a, b) => a.name.localeCompare(b.name));
  const rounds = store.list('round/').sort((a, b) => a.n - b.n);
  const games = store.list('game/');
  const live = [...rounds].reverse().find((r) => r.status === 'live') || null;
  const draft = rounds.find((r) => r.status === 'draft') || null;
  const last = [...rounds].reverse().find((r) => r.status !== 'draft') || null;
  const P = Object.fromEntries(players.map((p) => [p.id, p]));
  const G = Object.fromEntries(games.map((g) => [g.id, g]));
  return { config, players, rounds, games, live, draft, last, P, G };
}

export const gameId = (round, table) => `${round.id}-${table.id}`;

/* ───────────────────────── pairing ───────────────────────── */

export function pairCounts(rounds, excludeId) {
  const c = {};
  for (const r of rounds) {
    if (r.status === 'draft' || r.id === excludeId) continue;
    for (const t of r.tables) for (const a of t.players) for (const b of t.players) {
      if (a < b) c[a + '|' + b] = (c[a + '|' + b] || 0) + 1;
    }
  }
  return c;
}
const pc = (c, a, b) => c[a < b ? a + '|' + b : b + '|' + a] || 0;

export function tableSizes(n, size = 4) {
  if (n <= 0) return [];
  let k = Math.ceil(n / size);
  while (k > 1 && Math.floor(n / k) < 3) k--;
  const base = Math.floor(n / k), extra = n % k;
  return Array.from({ length: k }, (_, i) => base + (i < extra ? 1 : 0));
}

function costOf(groups, counts) {
  let cost = 0, repeats = 0;
  for (const g of groups) for (let i = 0; i < g.length; i++) for (let j = i + 1; j < g.length; j++) {
    const n = pc(counts, g[i], g[j]);
    cost += n * n; if (n) repeats++;
  }
  return { cost, repeats };
}

/** Shuffle players into tables. smart=true: random restarts + swap hill-climbing to minimise repeated pairings. */
export function makeTables(pids, rounds, { size = 4, smart = true, tries = 400 } = {}) {
  const counts = pairCounts(rounds);
  const sizes = tableSizes(pids.length, size);
  const split = (s) => { const g = []; let o = 0; for (const z of sizes) { g.push(s.slice(o, o + z)); o += z; } return g; };
  const climb = (groups) => {
    let cur = costOf(groups, counts).cost, improved = true;
    while (improved && cur > 0) {
      improved = false;
      for (let a = 0; a < groups.length; a++) for (let b = a + 1; b < groups.length; b++)
        for (let i = 0; i < groups[a].length; i++) for (let j = 0; j < groups[b].length; j++) {
          [groups[a][i], groups[b][j]] = [groups[b][j], groups[a][i]];
          const c = costOf(groups, counts).cost;
          if (c < cur) { cur = c; improved = true; } else [groups[a][i], groups[b][j]] = [groups[b][j], groups[a][i]];
        }
    }
    return groups;
  };
  let best = null;
  for (let k = 0; k < (smart ? tries : 1); k++) {
    const groups = smart ? climb(split(shuffle(pids))) : split(shuffle(pids));
    const sc = costOf(groups, counts);
    if (!best || sc.cost < best.cost) best = { groups, ...sc };
    if (best.cost === 0) break;
  }
  const pairsTotal = best.groups.reduce((a, g) => a + (g.length * (g.length - 1)) / 2, 0);
  return {
    tables: best.groups.map((g, i) => ({ id: uid(4), no: i + 1, players: g })),
    repeats: best.repeats, pairsTotal,
  };
}

export function scoreTables(tables, rounds, excludeId) {
  const counts = pairCounts(rounds, excludeId);
  const r = costOf(tables.map((t) => t.players), counts);
  const pairsTotal = tables.reduce((a, t) => a + (t.players.length * (t.players.length - 1)) / 2, 0);
  return { ...r, pairsTotal };
}

/* ───────────────────────── timer ───────────────────────── */

export function timerInfo(round, cfg) {
  const t = round?.timer;
  const playMs = cfg.playMin * 60000 + (t?.addMs || 0);
  const otMs = cfg.otMin * 60000;
  if (!t?.startedAt) return { phase: 'idle', playMs, otMs, left: playMs, el: 0 };
  const now = t.endedAt || t.pausedAt || Date.now();
  const el = now - t.startedAt - (t.pausedTotal || 0);
  if (t.endedAt || el >= playMs + otMs) return { phase: 'ended', el, playMs, otMs, left: 0 };
  if (el >= playMs) return { phase: 'ot', left: playMs + otMs - el, el, playMs, otMs, paused: !!t.pausedAt };
  return { phase: 'play', left: playMs - el, el, playMs, otMs, paused: !!t.pausedAt };
}

/* ───────────────────────── life counter rules ───────────────────────── */

export function newGame(round, table, P, by) {
  return {
    id: gameId(round, table), roundId: round.id, tableId: table.id, tableNo: table.no,
    controller: by.device, controllerName: by.name, startedAt: Date.now(),
    seats: table.players.map((pid) => {
      const deck = P[pid]?.decks?.[0];
      return {
        pid, deckId: deck?.id || null, deckName: deck?.name || '', partner: !!deck?.partner,
        life: START_LIFE, minLife: START_LIFE, maxLife: START_LIFE,
        poison: 0, energy: 0, exp: 0, rad: 0, tax: [0, 0], cmd: {}, out: null,
      };
    }),
    monarch: null, initiative: null, day: null, log: [], ended: null,
  };
}

export const alive = (g) => g.seats.filter((s) => !s.out);
export const cmdFrom = (s, fromPid) => s.cmd[fromPid] || [0, 0];

export function logPush(g, e) {
  const last = g.log[g.log.length - 1];
  if (last && e.k === 'life' && last.k === 'life' && last.pid === e.pid && e.t - last.t < 2500) {
    last.d += e.d; last.t = e.t;
  } else g.log.push(e);
  if (g.log.length > 600) g.log.splice(0, g.log.length - 600);
}

export function setLife(g, pid, delta, now = Date.now()) {
  const s = g.seats.find((x) => x.pid === pid);
  if (!s) return;
  s.life += delta;
  s.minLife = Math.min(s.minLife ?? s.life, s.life);
  s.maxLife = Math.max(s.maxLife ?? s.life, s.life);
  logPush(g, { t: now, pid, k: 'life', d: delta });
}

export function setCmd(g, pid, fromPid, idx, delta, now = Date.now()) {
  const s = g.seats.find((x) => x.pid === pid);
  const arr = [...cmdFrom(s, fromPid)];
  const nv = Math.max(0, arr[idx] + delta);
  const real = nv - arr[idx];
  if (!real) return;
  arr[idx] = nv; s.cmd[fromPid] = arr;
  g.log.push({ t: now, pid, k: 'cmd', d: real, from: fromPid });
  setLife(g, pid, -real, now);
}

/** Auto-detect eliminations and game end. Returns list of newly eliminated seats. */
export function settle(g, now = Date.now()) {
  const fresh = [];
  for (const s of g.seats) {
    let cause = null, by = null;
    if (s.life <= 0) cause = 'life';
    if (s.poison >= 10) cause = 'poison';
    for (const [from, arr] of Object.entries(s.cmd)) if (arr[0] >= 21 || arr[1] >= 21) { cause = 'cmd'; by = from; }
    if (!s.out && cause) {
      s.out = { at: now, cause, by, auto: true };
      fresh.push(s);
      g.log.push({ t: now, pid: s.pid, k: 'out', cause, by });
      if (g.monarch === s.pid) g.monarch = null;
      if (g.initiative === s.pid) g.initiative = null;
    } else if (s.out?.auto && !cause) {
      s.out = null; // corrected
      g.log.push({ t: now, pid: s.pid, k: 'revive' });
    }
  }
  const a = alive(g);
  if (!g.ended && g.seats.length > 1 && a.length <= 1) {
    g.ended = { at: now, reason: a.length === 1 ? 'win' : 'draw', placements: placements(g, 'win') };
  } else if (g.ended && g.ended.reason !== 'time' && g.ended.reason !== 'manual' && a.length > 1) {
    g.ended = null;
  }
  return fresh;
}

export function placements(g, reason) {
  const a = alive(g);
  const outs = g.seats.filter((s) => s.out).sort((x, y) => y.out.at - x.out.at);
  const res = [];
  if (a.length) {
    const sorted = [...a].sort((x, y) => y.life - x.life);
    for (const s of sorted) res.push({ pid: s.pid, place: 1, draw: a.length > 1 });
  }
  let place = a.length + 1;
  if (!a.length && outs.length) {
    const lastAt = outs[0].out.at;
    const tied = outs.filter((s) => s.out.at === lastAt);
    for (const s of tied) res.push({ pid: s.pid, place: 1, draw: tied.length > 1 });
    place = tied.length + 1;
    outs.splice(0, tied.length);
  }
  for (const s of outs) res.push({ pid: s.pid, place: place++, draw: false });
  return res;
}

export function endGame(g, reason = 'time', now = Date.now()) {
  if (g.ended) return;
  g.ended = { at: now, reason, placements: placements(g, reason) };
  g.log.push({ t: now, k: 'end', reason });
}

/* ───────────────────────── rolling tables ───────────────────────── */

/** Players who are present and currently not playing (eliminated, finished table, or unseated). */
export function freePlayers(snap) {
  const { live, players, G } = snap;
  if (!live) return [];
  const busy = new Set(), freedAt = {}, lastTable = {};
  for (const t of live.tables) {
    const g = G[gameId(live, t)];
    for (const pid of t.players) {
      lastTable[pid] = t.id;
      const seat = g?.seats.find((s) => s.pid === pid);
      if (!g || (!g.ended && !seat?.out)) { busy.add(pid); delete freedAt[pid]; continue; }
      if (!busy.has(pid)) freedAt[pid] = seat?.out?.at || g.ended?.at || 0;
    }
  }
  return players
    .filter((p) => p.present !== false && !busy.has(p.id) && freedAt[p.id] !== undefined && p.pauseRound !== live.id)
    .map((p) => ({ pid: p.id, at: freedAt[p.id], table: lastTable[p.id] }))
    .sort((a, b) => a.at - b.at || a.pid.localeCompare(b.pid));
}

/** Deterministic proposal for an auto table (identical on every device given the same data). */
export function proposeAutoTable(snap) {
  const { config, live } = snap;
  if (!config.autoTables || !live) return null;
  const ti = timerInfo(live, config);
  if (ti.phase === 'ended' || ti.phase === 'ot') return null;
  if (ti.phase === 'play' && ti.left < config.autoMinLeft * 60000) return null;
  const free = freePlayers(snap);
  const size = config.tableSize;
  if (free.length < size) return null;
  const counts = pairCounts(snap.rounds);
  // all combinations is overkill; free pool is small (≤ 12). Use first `size` by time, or best combo when smart.
  let best = null;
  const pool = free.slice(0, Math.min(free.length, 8));
  const combos = [];
  const rec = (start, acc) => {
    if (acc.length === size) { combos.push([...acc]); return; }
    for (let i = start; i < pool.length; i++) { acc.push(pool[i]); rec(i + 1, acc); acc.pop(); }
  };
  if (config.smart) rec(0, []); else combos.push(pool.slice(0, size));
  for (const c of combos) {
    if (new Set(c.map((x) => x.table)).size === 1) continue; // never re-form the same pod
    const pids = c.map((x) => x.pid).sort();
    const { cost } = costOf([pids], counts);
    const wait = c.reduce((a, x) => a + x.at, 0);
    if (!best || cost < best.cost || (cost === best.cost && wait < best.wait)) best = { pids, cost, wait };
  }
  if (!best) return null;
  let h = 5381; for (const ch of best.pids.join(',')) h = ((h * 33) ^ ch.charCodeAt(0)) >>> 0;
  return { id: 'x' + h.toString(36), players: best.pids, auto: true };
}

/* ───────────────────────── stats ───────────────────────── */

export function gameStart(g, round) {
  const ts = round?.timer?.startedAt || 0;
  return Math.max(g.startedAt || 0, ts && ts < (g.ended?.at || Infinity) ? ts : 0);
}

export function computeStats(snap) {
  const { players, games, rounds, P } = snap;
  const R = Object.fromEntries(rounds.map((r) => [r.id, r]));
  const st = {};
  for (const p of players) st[p.id] = {
    pid: p.id, name: p.name, games: 0, finished: 0, wins: 0, draws: 0, points: 0, placeSum: 0,
    outs: 0, fastestOut: null, fastestWin: null, kills: 0, killedBy: {}, victims: {},
    inGame: 0, bar: 0, cmdDealt: 0, poison: 0, maxLife: 0, minLife: 999, comeback: 0,
    decks: {}, lifeLost: 0, lifeGained: 0, taps: 0,
  };
  const cmdrs = {};
  for (const g of games) {
    const r = R[g.roundId];
    const start = gameStart(g, r);
    const endAt = g.ended?.at || r?.timer?.endedAt || null;
    const now = Date.now();
    for (const s of g.seats) {
      const p = st[s.pid]; if (!p) continue;
      p.games++;
      p.maxLife = Math.max(p.maxLife, s.maxLife ?? s.life);
      p.minLife = Math.min(p.minLife, s.minLife ?? s.life);
      p.poison += s.poison;
      const leftAt = s.out?.at || endAt || now;
      p.inGame += Math.max(0, leftAt - start);
      if (s.out) {
        p.outs++;
        const t = s.out.at - start;
        if (t > 0 && (p.fastestOut == null || t < p.fastestOut)) p.fastestOut = t;
        p.bar += Math.max(0, (endAt || now) - s.out.at);
        if (s.out.by && st[s.out.by] && s.out.by !== s.pid) {
          st[s.out.by].kills++;
          p.killedBy[s.out.by] = (p.killedBy[s.out.by] || 0) + 1;
          st[s.out.by].victims[s.pid] = (st[s.out.by].victims[s.pid] || 0) + 1;
        }
      }
      for (const [from, arr] of Object.entries(s.cmd)) if (st[from]) st[from].cmdDealt += arr[0] + arr[1];
      const dname = s.deckName || '—';
      const dk = (p.decks[dname] ||= { name: dname, games: 0, wins: 0 });
      dk.games++;
      const c = (cmdrs[dname] ||= { name: dname, games: 0, wins: 0, owners: new Set() });
      c.games++; c.owners.add(s.pid);
    }
    for (const e of g.log) if (e.k === 'life' && st[e.pid]) {
      if (e.d < 0) st[e.pid].lifeLost -= e.d; else st[e.pid].lifeGained += e.d;
      st[e.pid].taps++;
    }
    if (g.ended) for (const pl of g.ended.placements) {
      const p = st[pl.pid]; if (!p) continue;
      const seat = g.seats.find((s) => s.pid === pl.pid);
      p.finished++; p.placeSum += pl.place;
      if (pl.place === 1 && !pl.draw) {
        p.wins++; p.points += 3;
        const t = g.ended.at - start;
        if (t > 0 && (p.fastestWin == null || t < p.fastestWin)) p.fastestWin = t;
        if ((seat?.minLife ?? 40) <= 10) p.comeback++;
        const dname = seat?.deckName || '—';
        p.decks[dname].wins++; cmdrs[dname].wins++;
      } else if (pl.place === 1 && pl.draw) { p.draws++; p.points += 1; }
    }
  }
  // round-level bar time for unseated present players is ignored (kein Stress)
  const list = Object.values(st);
  for (const p of list) {
    p.avgPlace = p.finished ? p.placeSum / p.finished : null;
    p.nemesis = topKey(p.killedBy);
    p.victim = topKey(p.victims);
    p.favDeck = Object.values(p.decks).sort((a, b) => b.games - a.games || b.wins - a.wins)[0]?.name || null;
    if (p.minLife === 999) p.minLife = null;
  }
  const leaderboard = [...list].sort((a, b) => b.points - a.points || b.wins - a.wins || (a.avgPlace ?? 9) - (b.avgPlace ?? 9) || a.name.localeCompare(b.name));
  const commanders = Object.values(cmdrs).filter((c) => c.name !== '—')
    .map((c) => ({ ...c, owners: [...c.owners], rate: c.games ? c.wins / c.games : 0 }))
    .sort((a, b) => b.wins - a.wins || b.rate - a.rate || b.games - a.games);
  return { byId: st, list, leaderboard, commanders, awards: awards(list, commanders, P) };
}

function topKey(o) {
  const e = Object.entries(o).sort((a, b) => b[1] - a[1])[0];
  return e ? { pid: e[0], n: e[1] } : null;
}

const minBy = (arr, f) => arr.filter((x) => f(x) != null).sort((a, b) => f(a) - f(b))[0];
const maxBy = (arr, f) => arr.filter((x) => f(x) != null && f(x) > 0).sort((a, b) => f(b) - f(a))[0];

function awards(list, commanders, P) {
  const A = [];
  const add = (key, sprite, title, quip, p, value) => p && A.push({ key, sprite, title, quip, pid: p.pid, name: p.name, value });
  const played = list.filter((p) => p.games);
  const best = [...played].sort((a, b) => b.points - a.points || b.wins - a.wins)[0];
  if (best?.points) add('best', 'trophy', 'BESTER SPIELER', 'Hat den Tag dominiert.', best, `${best.points} PUNKTE · ${best.wins} SIEGE`);
  const c = commanders[0];
  if (c?.wins) A.push({ key: 'cmdr', sprite: 'sword', title: 'STÄRKSTER COMMANDER', quip: 'Bitte auf die Bannliste setzen.', name: c.name, pid: c.owners[0], value: `${c.wins}/${c.games} SIEGE` });
  const fw = minBy(played, (p) => p.fastestWin);
  add('fastwin', 'rider', 'SCHNELLSTER SIEG', 'Kam, sah, kombote.', fw, fw && clockish(fw.fastestWin));
  const fo = minBy(played, (p) => p.fastestOut);
  add('fastout', 'skull', 'SPEEDRUN ZUM TRESEN', 'Das Bier war noch nicht mal kalt.', fo, fo && clockish(fo.fastestOut));
  const roach = maxBy(played, (p) => p.inGame);
  add('roach', 'roach', 'KAKERLAKE', 'Längste Zeit im Spiel. Unkaputtbar.', roach, roach && hours(roach.inGame));
  const bar = maxBy(played, (p) => p.bar);
  add('bar', 'beer', 'STAMMGAST', 'Längste Zeit an der Bar.', bar, bar && hours(bar.bar));
  const k = maxBy(played, (p) => p.kills);
  add('kills', 'crosshair', 'KOPFGELDJÄGER', 'Meiste K.O.s verursacht.', k, k && `${k.kills} K.O.`);
  const cd = maxBy(played, (p) => p.cmdDealt);
  add('cmd', 'axe', 'COMMANDER-SCHLÄCHTER', 'Meister Commander-Schaden ausgeteilt.', cd, cd && `${cd.cmdDealt} SCHADEN`);
  const po = maxBy(played, (p) => p.poison);
  add('poison', 'potion', 'GIFTSCHLUCKER', 'Meiste Giftmarker kassiert.', po, po && `${po.poison} GIFT`);
  const ml = maxBy(played, (p) => p.maxLife > 40 ? p.maxLife : null);
  add('life', 'heart', 'LEBENSKÜNSTLER', 'Höchstes Leben des Tages.', ml, ml && `${ml.maxLife} LEBEN`);
  const cb = maxBy(played, (p) => p.comeback);
  add('comeback', 'zombie', 'COMEBACK-KID', 'Gewonnen nach ≤ 10 Leben.', cb, cb && `${cb.comeback}× AUFERSTANDEN`);
  const tap = maxBy(played, (p) => p.lifeLost);
  add('punch', 'shield', 'PUNCHINGBALL', 'Meiste Lebenspunkte verloren.', tap, tap && `−${tap.lifeLost} LEBEN`);
  const nem = played.map((p) => p.nemesis && { p, n: p.nemesis }).filter(Boolean).sort((a, b) => b.n.n - a.n.n)[0];
  if (nem && P[nem.n.pid]) A.push({ key: 'nemesis', sprite: 'ghost', title: 'FEHDE DES TAGES', quip: `${P[nem.n.pid].name} hat ${nem.p.name} ${nem.n.n}× rausgehauen.`, pid: nem.n.pid, name: `${P[nem.n.pid].name} → ${nem.p.name}`, value: `${nem.n.n}× K.O.` });
  return A;
}
const clockish = (ms) => { const m = Math.floor(ms / 60000), s = Math.floor((ms % 60000) / 1000); return `${m}:${String(s).padStart(2, '0')} MIN`; };
const hours = (ms) => { const m = Math.round(ms / 60000); return m >= 60 ? `${Math.floor(m / 60)}H ${m % 60}M` : `${m} MIN`; };
