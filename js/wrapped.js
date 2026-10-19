// "Commander Wrapped" — story slides with pixel sprites.
import { A, render, esc, pname, go, MODE } from './ctx.js';
import { computeStats } from './logic.js';
import { sprite, confetti } from './sprites.js';
import { dur } from './util.js';
import { drawArt } from './art.js';

const SLIDE_MS = 7000;

function slides() {
  const S = computeStats(A.snap);
  const me = A.me && S.byId[A.me];
  const out = [];
  const year = new Date().getFullYear();
  out.push({
    fx: 'ride',
    html: `<div class="tag">// SCAN COMPLETE · ${esc(A.snap.config.name)}</div>
      <div class="h1" style="font-size:56px">COMMANDER<br>WRAPPED ${year}</div>
      <div style="position:relative;height:80px;width:100%;overflow:hidden"><div class="ride" style="position:absolute;bottom:0">${sprite('rider', 5)}</div></div>
      <div class="tag">> RESTORING CHRONOLOGY ........ OK</div>`,
  });
  if (me && me.games) {
    out.push({
      html: `<div class="tag">// DEIN TAG, ${esc(me.name).toUpperCase()}</div>${sprite('knight', 7, 'bob')}
        <div class="who" data-count="${me.games}">${me.games}</div><div class="h2">SPIELE GESPIELT</div>
        <div class="panel" style="width:100%;text-align:left">
          <div class="leader"><span class="l">SIEGE</span><span class="d"></span><span class="r gold">${me.wins}</span></div>
          <div class="leader"><span class="l">UNENTSCHIEDEN</span><span class="d"></span><span class="r">${me.draws}</span></div>
          <div class="leader"><span class="l">PUNKTE</span><span class="d"></span><span class="r">${me.points}</span></div>
          <div class="leader"><span class="l">Ø PLATZ</span><span class="d"></span><span class="r">${me.avgPlace ? me.avgPlace.toFixed(1) : '—'}</span></div></div>`,
    });
    const fav = me.favDeck && me.decks[me.favDeck];
    const deck = A.snap.P[A.me]?.decks?.find((d) => d.name === me.favDeck);
    if (fav) out.push({
      html: `<div class="tag">// DEIN MEISTGESPIELTER COMMANDER</div>
        ${deck?.art ? `<canvas class="art" data-art="${esc(deck.art)}" width="56" height="41" style="width:224px;height:164px;image-rendering:pixelated;border:1px solid var(--fg)"></canvas>` : sprite('sword', 8, 'float')}
        <div class="h1">${esc(fav.name)}</div><div class="h2 muted">${fav.wins} SIEGE IN ${fav.games} SPIELEN</div>
        <div class="small muted">${fav.wins ? 'Ein treuer Begleiter.' : 'Es geht nicht ums Gewinnen. Oder?'}</div>`,
    });
    const tot = me.inGame + me.bar || 1;
    out.push({
      html: `<div class="tag">// ZEITANALYSE</div>${sprite('beer', 7, 'bob')}
        <div class="panel" style="width:100%;text-align:left">
          <div class="tag">IM SPIEL</div><div class="h2">${dur(me.inGame)}</div><div class="bar"><i style="width:${(me.inGame / tot) * 100}%"></i></div>
          <div class="tag" style="margin-top:10px">AN DER BAR</div><div class="h2 gold">${dur(me.bar)}</div><div class="bar"><i style="width:${(me.bar / tot) * 100}%;background:var(--gold)"></i></div></div>
        <div class="small muted">${me.bar > me.inGame ? 'Ehrlich gesagt: mehr Bar als Battlefield.' : 'Kampfmaschine. Kaum Zeit für Bier.'}</div>
        ${me.fastestOut ? `<div class="tag">SCHNELLSTES AUS: ${dur(me.fastestOut)}</div>` : ''}`,
    });
    if (me.nemesis || me.victim) out.push({
      html: `<div class="tag">// BEZIEHUNGSSTATUS</div>${sprite('ghost', 7, 'float')}
        ${me.nemesis ? `<div class="tag">DEINE NEMESIS</div><div class="who alert" style="font-size:64px">${esc(pname(me.nemesis.pid))}</div><div class="small">hat dich ${me.nemesis.n}× rausgehauen.</div>` : ''}
        ${me.victim ? `<div class="tag" style="margin-top:12px">DEIN LIEBLINGSOPFER</div><div class="h1">${esc(pname(me.victim.pid))}</div><div class="small">${me.victim.n}× von dir erledigt.</div>` : ''}`,
    });
  }
  out.push({ html: `<div class="tag">// AND NOW…</div>${sprite('star', 8, 'pop')}<div class="h1">DIE AWARDS</div><div class="small muted">Ehre, wem Ehre gebührt.</div>` });
  for (const a of S.awards) {
    out.push({
      fx: a.key === 'best' ? 'confetti' : '',
      html: `<div class="tag">// ${esc(a.title)}</div>${sprite(a.sprite, 8, 'pop bob')}
        <div class="who ${a.key === 'fastout' ? 'alert' : a.key === 'best' ? 'gold' : ''}">${esc(a.name)}</div>
        <div class="h2">${esc(a.value || '')}</div><div class="small muted">${esc(a.quip)}</div>`,
    });
  }
  const lb = S.leaderboard.filter((p) => p.games).slice(0, 8);
  out.push({
    fx: 'confetti',
    html: `<div class="tag">// FINAL LEADERBOARD</div>${sprite('trophy', 6, 'bob')}
      <div class="panel" style="width:100%;text-align:left">${lb.map((p, i) => `<div class="rank"><span class="p ${i === 0 ? 'gold' : ''}">${i + 1}.</span><span class="up" style="flex:1">${esc(p.name)}</span><span class="small muted">${p.wins}W · ${p.points} PTS</span></div>`).join('') || '<div class="dim">KEINE DATEN</div>'}</div>`,
  });
  out.push({
    html: `<div class="tag">> BATTLEFIELD STATUS ........ SILENT</div>${sprite('rider', 6, 'bob')}
      <div class="h2">LOWER YOUR BLADE,<br>LEAVE THE FALLEN,<br>RIDE ON.</div>
      <div class="small muted">Danke für einen großartigen Commander-Tag. 🤘</div>
      <button class="btn pri" data-act="wr-close" style="position:relative;z-index:6">→ CONTINUE RIDING INTO DARK<span class="cursor"></span></button>`,
  });
  return out;
}

export function wrappedView() {
  const list = (A.ui.wrSlides ||= slides());
  const i = Math.min(A.ui.wr ?? 0, list.length - 1);
  const s = list[i];
  const prog = list.map((_, k) => `<i class="${k < i ? 'done' : k === i ? 'cur' : ''}"></i>`).join('');
  return `<div class="wr"><div class="prog">${prog}</div>
    <div class="between" style="margin-top:8px"><span class="tag">COMMANDER//WRAPPED</span><button class="chip" data-act="wr-close">✕</button></div>
    <div class="slide s${i % 4}" data-fx="${s.fx || ''}" data-i="${i}">${s.html}
      <div class="nav l" data-act="wr-prev"></div><div class="nav r" data-act="wr-next"></div></div>
    <div class="tag" style="text-align:center">TAP ▸ WEITER · ◂ ZURÜCK</div></div>`;
}

export function afterWrapped() {
  const sl = document.querySelector('.wr .slide');
  if (!sl) return;
  const key = sl.dataset.i;
  if (sl.dataset.fx === 'confetti' && A.ui.wrFx !== key) confetti(sl, 60);
  A.ui.wrFx = key;
  document.querySelectorAll('canvas[data-art]').forEach((c) => drawArt(c, c.dataset.art));
  // progress + auto advance
  clearInterval(A.ui.wrT);
  const t0 = Date.now();
  const cur = document.querySelector('.wr .prog i.cur');
  A.ui.wrT = setInterval(() => {
    const p = (Date.now() - t0) / SLIDE_MS;
    cur?.style.setProperty('--p', Math.min(100, p * 100) + '%');
    if (p >= 1) { clearInterval(A.ui.wrT); wrActions['wr-next'](); }
  }, 100);
}

export const wrActions = {
  'wr-next'() {
    const n = (A.ui.wrSlides || []).length;
    if ((A.ui.wr ?? 0) < n - 1) { A.ui.wr = (A.ui.wr ?? 0) + 1; render(); }
    else clearInterval(A.ui.wrT);
  },
  'wr-prev'() { A.ui.wr = Math.max(0, (A.ui.wr ?? 0) - 1); render(); },
  'wr-open'() { A.ui.wr = 0; A.ui.wrSlides = null; go('wrapped'); },
  'wr-close'() { clearInterval(A.ui.wrT); A.ui.wrSlides = null; go(MODE === 'host' ? 'setup' : 'home'); },
};
