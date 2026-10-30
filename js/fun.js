// Just for fun: pixel effects in one consistent style – burning life, commander mascots walking across
// tiles, commander-specific K.O. stamps and win lines, mill gags and Herr Fugbaum's personal roast.
// Purely visual – nothing here ever writes data.
import { A, toast, esc, pname } from './ctx.js';
import { sprite } from './sprites.js';

const pickBy = (arr, n) => arr[Math.abs(Math.floor(n)) % arr.length];

/* ───────────── Herr Fugbaum (Filippo) ───────────── */

const FUGBAUM = /fu[cg]h?s?baum|filippo/i;
export function isFugbaum(pid) {
  const p = A.snap?.P[pid];
  return !!p && (FUGBAUM.test(p.name) || (p.decks || []).some((d) => /homer,? the hermit/i.test(d.name)));
}
export const isFuchsbaum = isFugbaum; // old name, kept for callers

/* ───────────── commander gags ─────────────
   re: matches the deck name chosen at the table · s: pixel sprite
   walk: lines when the mascot runs over an opponent losing life · ko: K.O. stamp lines · win: victory subtitle */
const GAGS = [
  { re: /homer,? the hermit/i, s: 'crab', walk: ['KNIPS!', 'MEINS!', 'SCHNAPP', 'FILIPPO WAR’S', 'HOMER KLAUT'], ko: ['HOMER HAT DICH INS MEER GEZOGEN', 'DANKE FÜR DEN GROSSEN SPASS, FILIPPO.'], win: 'HOMER HAT DEN TISCH LEERGEFISCHT. DANKE, FILIPPO. 🦀' },
  { re: /nekusar/i, s: 'eye', walk: ['LESEN TUT WEH', 'ZIEH. LEIDE.', 'BRAIN DAMAGE'], ko: ['NEKUSAR: KARTENZIEHEN GEFÄHRDET DIE GESUNDHEIT'], win: 'NEKUSAR HAT ALLEN DAS HIRN GEWASCHEN.' },
  { re: /kellan,? the kid/i, s: 'sword', walk: ['DER KID SCHLÄGT ZU', 'YEEHAW!'], ko: ['KELLAN: ZU JUNG ZUM VERLIEREN'], win: 'DER KID IST ERWACHSEN GEWORDEN.' },
  { re: /helga/i, s: 'eye', walk: ['HELGA HAT’S KOMMEN SEHEN', 'SKITTISH!'], ko: ['HELGA: ICH HAB’S GESAGT.'], win: 'HELGA SAH DEN SIEG VORAUS.' },
  { re: /breena/i, s: 'bird', walk: ['BLA BLA BLA', 'ABSTIMMUNG: DU VERLIERST'], ko: ['BREENA HAT DICH WEGGEPLAPPERT'], win: 'DIE DEMAGOGIN HAT DIE WAHL GEWONNEN.' },
  { re: /breya/i, s: 'cog', walk: ['THOPTER-ANGRIFF', 'KLICK-KLACK'], ko: ['BREYA HAT DICH ZERLEGT ⚙'], win: 'BREYA HAT DEN SIEG ZUSAMMENGESCHRAUBT.' },
  { re: /ognis/i, s: 'dragon', walk: ['EILE! FEUER!', 'SCHNELLER ALS DEIN MULLIGAN'], ko: ['OGNIS: ZU LANGSAM.'], win: 'OGNIS WAR SCHNELLER ALS ALLE.' },
  { re: /great goblin/i, s: 'goblin', walk: ['WAAAGH!', 'GOBLIN-ALARM', 'NOCH EIN GOBLIN'], ko: ['VON GOBLINS ÜBERRANNT'], win: 'DIE GOBLINS HABEN GEWONNEN. IRGENDWIE.' },
  { re: /kotis/i, s: 'wolf', walk: ['HAPS!', 'FANG!'], ko: ['KOTIS HAT ZUGEBISSEN'], win: 'KOTIS BEISST SICH DURCH.' },
  { re: /morcant/i, s: 'goblin', walk: ['ANTRAG ABGELEHNT', 'ELFEN-BÜROKRATIE'], ko: ['MORCANT: FORMULAR UNVOLLSTÄNDIG'], win: 'HIGH PERFECT. HIGH WIN.' },
  { re: /havi/i, s: 'bolt', walk: ['DER ALLVATER SPRICHT', 'WALHALLA RUFT'], ko: ['AB NACH WALHALLA'], win: 'DER ALLVATER HAT GESPROCHEN.' },
  { re: /brenard/i, s: 'cookie', walk: ['LEBKUCHEN-ATTACKE', 'KNUSPER KNUSPER'], ko: ['ZU LEBKUCHEN VERARBEITET 🍪'], win: 'BRENARD BACKT DEN SIEG.' },
  { re: /clement/i, s: 'frog', walk: ['CLEMENT MACHT SICH SORGEN', 'QUAK?!'], ko: ['CLEMENT: ICH HAB MIR SORGEN GEMACHT. ZU RECHT.'], win: 'CLEMENT IST ERLEICHTERT. ENDLICH.' },
  { re: /juri/i, s: 'star', walk: ['MANEGE FREI!', 'APPLAUS!'], ko: ['JURI: VORHANG ZU.'], win: 'STANDING OVATION FÜR JURI.' },
  { re: /golbez/i, s: 'gem', walk: ['KRISTALL GEKLAUT', 'IN DIE SAMMLUNG!'], ko: ['GOLBEZ HAT DICH EINGESAMMELT 💎'], win: 'GOLBEZ HAT ALLE KRISTALLE. UND DEN SIEG.' },
  { re: /sedris/i, s: 'crown', walk: ['VERRAT!', 'LANG LEBE DER KÖNIG'], ko: ['SEDRIS: VERRAT IST EINE KUNST'], win: 'DER VERRÄTERKÖNIG HERRSCHT.' },
  { re: /codie/i, s: 'book', walk: ['MAMPF', 'CODIE HAT HUNGER'], ko: ['VON CODIE GEFRESSEN 📖'], win: 'CODIE HAT ALLE AUFGEFRESSEN.' },
  { re: /niko/i, s: 'star', walk: ['HOFFNUNG!', 'SPLITTER!'], ko: ['NIKO: HOFFNUNG STIRBT ZULETZT. DU ZUERST.'], win: 'NIKO BRINGT DAS LICHT.' },
  { re: /faldorn/i, s: 'wolf', walk: ['AWOOO!', 'DAS RUDEL KOMMT'], ko: ['VOM RUDEL ERLEGT 🐺'], win: 'DAS RUDEL HEULT ZUM SIEG.' },
  { re: /zurgo/i, s: 'axe', walk: ['ZURGO SMASH!', 'STURM!'], ko: ['ZURGO HAT DICH ZERLEGT'], win: 'ZURGO: SMASH. SIEG. FERTIG.' },
  { re: /satya/i, s: 'bolt', walk: ['ENERGIE-RECHNUNG', 'AETHER!'], ko: ['SATYA HAT DIR DEN STROM ABGEDREHT ⚡'], win: 'SATYA: GENIE BLEIBT GENIE.' },
  { re: /valgavoth/i, s: 'demon', walk: ['SEELEN-SNACK', 'HUNGER …'], ko: ['VALGAVOTH FRISST SEELEN. DEINE WAR LECKER.'], win: 'VALGAVOTH IST SATT. VORERST.' },
  { re: /y.?shtola/i, s: 'star', walk: ['ZAUBEREI!', 'NIGHT’S BLESSING'], ko: ['Y’SHTOLA: KEIN ZUFALL. NUR MAGIE.'], win: 'Y’SHTOLA HAT ES BERECHNET.' },
  { re: /zoraline/i, s: 'bat', walk: ['FLEDERMAUS-GANG', 'FLATTER!'], ko: ['DIE FLEDERMÄUSE HABEN DICH GEHOLT 🦇'], win: 'ZORALINE UND DIE FLEDERMAUS-GANG.' },
  { re: /flubs/i, s: 'frog', walk: ['HIHI!', 'FLUBS DER NARR'], ko: ['VON EINEM NARREN BESIEGT. AUTSCH.'], win: 'WER ZULETZT LACHT: FLUBS.' },
  { re: /ultron/i, s: 'robot', walk: ['MENSCH: INEFFIZIENT', 'BEEP BOOP'], ko: ['ULTRON: ZIEL ELIMINIERT 🤖'], win: 'ULTRON HAT DIE MENSCHHEIT OPTIMIERT.' },
  { re: /ureni/i, s: 'dragon', walk: ['UNGESCHRIEBEN!', 'DRACHEN-SEITE'], ko: ['URENI HAT DICH AUS DER GESCHICHTE GESTRICHEN'], win: 'URENI SCHREIBT DIE GESCHICHTE.' },
  { re: /ashling/i, s: 'flame', walk: ['GRENZENLOS HEISS', 'FEUER FREI'], ko: ['ASHLING HAT DICH VERASCHT'], win: 'ASHLING BRENNT GRENZENLOS.' },
  { re: /ruric thar/i, s: 'axe', walk: ['KEINE ZAUBER!', 'RURIC MAG DAS NICHT'], ko: ['RURIC THAR: SELBER SCHULD, ZAUBERER'], win: 'RURIC THAR IST UNBEUGSAM.' },
  { re: /t.?challa/i, s: 'panther', walk: ['WAKANDA FOREVER', 'PANTHER-SPRUNG'], ko: ['T’CHALLA: WAKANDA FOREVER 🐾'], win: 'WAKANDA FOREVER!' },
  { re: /niv-mizzet/i, s: 'dragon', walk: ['GENIALE IDEE!', 'NIV HAT NACHGEDACHT'], ko: ['NIV-MIZZET HAT NACHGEDACHT. DU NICHT.'], win: 'NIV-MIZZET: ICH SAGTE JA, ICH BIN EIN GENIE.' },
  { re: /mogis/i, s: 'skull', walk: ['STEUER: 2 LEBEN', 'MOGIS KASSIERT'], ko: ['MOGIS HAT DIE STEUERN EINGETRIEBEN 💀'], win: 'MOGIS: GOTT DES GEMETZELS. UND DES SIEGS.' },
  { re: /zur the enchanter/i, s: 'star', walk: ['VERZAUBERT!', 'SIM SALA ZUR'], ko: ['ZUR HAT DICH WEGGEZAUBERT'], win: 'ZUR HAT DEN SIEG HERBEIGEZAUBERT.' },
  { re: /cloud/i, s: 'sword', walk: ['OMNISLASH!', 'BUSTER SWORD'], ko: ['CLOUD: OMNISLASH ⚔'], win: 'CLOUD STRIFE: EX-SOLDIER, NEU-CHAMPION.' },
  { re: /sauron/i, s: 'eye', walk: ['DAS AUGE SIEHT DICH', 'EIN RING …'], ko: ['DAS AUGE HAT DICH GEFUNDEN 👁'], win: 'EIN RING, SIE ZU KNECHTEN. UND ZU GEWINNEN.' },
  { re: /urza/i, s: 'cog', walk: ['KONSTRUKT!', 'URZA BAUT UND BAUT'], ko: ['URZA HAT DICH WEGKONSTRUIERT ⚙'], win: 'URZA: CHEFINGENIEUR DES SIEGS.' },
  { re: /yuma/i, s: 'shield', walk: ['BESCHÜTZT. DICH NICHT.', 'STOLZ!'], ko: ['YUMA BESCHÜTZT. NUR NICHT DICH.'], win: 'YUMA: STOLZ UND UNBESIEGT.' },
];
export const gagFor = (deckName) => (deckName ? GAGS.find((g) => g.re.test(deckName)) : null);
const gagOf = (g, pid) => gagFor(g.seats.find((s) => s.pid === pid)?.deckName);

/* ───────────── lines ───────────── */

const MILL = ['BIBLIOTHEK: 0 · FRIEDHOF: ALLES', 'WER BRAUCHT SCHON KARTEN?', 'DECK ALLE. LEBEN EGAL.', 'IN DEN FRIEDHOF GESCHAUFELT', 'ZIEH DOCH NOCH EINE … OH.', 'AB IN DIE ALTPAPIER-TONNE'];
const FUGBAUM_MILL = [
  'DANKE FÜR DEN GROSSEN SPASS, FILIPPO.', 'HOMER HAT DEINE BIBLIOTHEK INS MEER GESPÜLT', 'HERR FUGBAUM 1 · DEINE BIBLIOTHEK 0',
  'DIE KRABBE HAT HUNGER. AUF KARTEN.', 'SCHON WIEDER FILIPPO …', 'HERR FUGBAUM BEDANKT SICH FÜR IHRE BÜCHERSPENDE',
  'HOMER SAMMELT. DU VERLIERST.', 'MAGIC? NEIN. LESEZIRKEL IM FRIEDHOF.', 'EIN APPLAUS FÜR DEN ALTPAPIER-KÖNIG',
];

/** Line shown on a knocked-out tile (null = use the default quips). */
export function koQuip(g, s) {
  if (s.out?.cause === 'mill') return s.out.by && isFugbaum(s.out.by) ? pickBy(FUGBAUM_MILL, s.out.at) : pickBy(MILL, s.out?.at || 0);
  const gag = s.out?.by && gagOf(g, s.out.by);
  return gag ? pickBy(gag.ko, s.out.at) : null;
}
export const millQuip = (s) => (s.out?.by && isFugbaum(s.out.by) ? pickBy(FUGBAUM_MILL, s.out.at) : pickBy(MILL, s.out?.at || 0));
/** Victory subtitle for the winner's commander (null = default line). */
export function winSub(pid, g) {
  const gag = g && gagOf(g, pid);
  if (isFugbaum(pid) && (!gag || gag.s === 'crab')) return '> FILIPPO HAT ALLE BIBLIOTHEKEN GELEERT. DANKE FÜR DEN GROSSEN SPASS. 🦀';
  return gag ? `> ${gag.win}` : null;
}
/** Extra ticker text for a K.O. (null = default). */
export function feedKo(g, e) {
  if (e.cause === 'mill' && e.by && isFugbaum(e.by)) return 'Danke für den großen Spaß, Filippo. 🦀';
  const gag = e.by && g && gagOf(g, e.by);
  return gag ? pickBy(gag.ko, e.t).toLowerCase().replace(/^./, (c) => c.toUpperCase()) : null;
}
export const feedSprite = (g, e) => (e.cause === 'mill' ? 'crab' : (e.by && g && gagOf(g, e.by)?.s) || 'skull');

/* ───────────── effects layer (outside the re-rendered DOM, so nothing restarts) ───────────── */

export function playFx(i, kind, { sprite: spr = 'crab', label = '' } = {}) {
  const t = document.querySelector(`.tile[data-fx="${i}"]`);
  if (!t) return;
  const r = t.getBoundingClientRect();
  const el = document.createElement('div');
  el.className = `fxl fx-${kind}${t.closest('.flip') ? ' flip' : ''}`;
  Object.assign(el.style, { left: r.left + 'px', top: r.top + 'px', width: r.width + 'px', height: r.height + 'px' });
  const lbl = label ? `<div class="lbl"><span>${esc(label)}</span></div>` : '';
  if (kind === 'walk') {
    el.innerHTML = `<span class="walker">${sprite(spr, 5, 'mono', true)}<b>${esc(label)}</b></span>`;
  } else if (kind === 'stamp') {
    el.innerHTML = `<div class="stamp">${sprite(spr, 9, 'mono', true)}</div>${lbl}`;
  } else if (kind === 'mill') {
    el.innerHTML = `<span class="walker">${sprite('crab', 6, 'mono', true)}</span>${[0, 1, 2, 3].map((k) => `<span class="bk" style="left:${16 + k * 18}%;animation-delay:${0.3 + k * 0.15}s">${sprite('book', 4, 'mono', true)}</span>`).join('')}<div class="lbl"><span>GEMILLT!</span>${label ? `<span class="sub">${esc(label)}</span>` : ''}</div>`;
  }
  document.body.appendChild(el);
  setTimeout(() => el.remove(), kind === 'mill' || kind === 'stamp' ? 3200 : 2400);
}

/** Fire effects only for things the app actually knows: K.O. with "who did it", mill, and commander
    damage entered with its source. Compares with what this device last saw, so it works for viewers too. */
export function fxScan(g) {
  if (!g) return;
  A.fxPrev ||= {}; A.fxCmd ||= {};
  const prev = A.fxPrev[g.id];
  A.fxPrev[g.id] = { outs: g.seats.map((s) => s.out?.at || 0), bys: g.seats.map((s) => s.out?.by || ''), logT: g.log.length ? g.log[g.log.length - 1].t : 0 };
  if (!prev || prev.outs.length !== g.seats.length) return; // first look at this game: nothing to animate
  const fresh = g.log.filter((e) => e.t > prev.logT);
  let shown = false;
  // 1) knock-outs: cause and "by" are entered by the players. "Wer war's?" is often answered a moment
  //    after the K.O., so the stamp fires when the killer becomes known (within a minute of the K.O.).
  g.seats.forEach((s, i) => {
    if (!s.out) return;
    const isNew = !prev.outs[i];
    const byNew = s.out.by && !prev.bys[i] && Date.now() - s.out.at < 60000;
    if (isNew && s.out.cause === 'mill') { shown = true; playFx(i, 'mill', { label: millQuip(s) }); return; }
    if (s.out.cause === 'mill' || !(isNew || byNew) || !s.out.by) return;
    const gag = gagOf(g, s.out.by);
    if (gag) { shown = true; playFx(i, 'stamp', { sprite: gag.s, label: pickBy(gag.ko, s.out.at) }); }
  });
  if (shown) return;
  // 2) commander damage with a known source (entered as "von wem"): the attacker's mascot runs over the hit tile.
  //    Once per pair a warning at 15+, the K.O. at 21 is handled above. Max. one run per pair every 6 s.
  for (const e of fresh) {
    if (e.k !== 'cmd' || !(e.d > 0) || !e.from) continue;
    const i = g.seats.findIndex((x) => x.pid === e.pid);
    if (i < 0 || g.seats[i].out) continue;
    const total = Math.max(0, ...(g.seats[i].cmd[e.from] || [0]));
    const gag = gagOf(g, e.from) || { s: 'sword', walk: ['COMMANDER-SCHADEN'] };
    const pair = g.id + e.pid + e.from;
    if (total >= 15 && !A.fxCmd[pair + ':warn']) {
      A.fxCmd[pair + ':warn'] = 1; A.fxCmd[pair] = Date.now();
      playFx(i, 'stamp', { sprite: gag.s, label: `⚔ ${total}/21 · NOCH ${21 - total} BIS ZUM K.O.` });
      break;
    }
    if (Date.now() - (A.fxCmd[pair] || 0) < 6000) continue;
    A.fxCmd[pair] = Date.now();
    playFx(i, 'walk', { sprite: gag.s, label: `${pickBy(gag.walk, e.t)} · ⚔${total}` });
    break;
  }
}
export { GAGS };
