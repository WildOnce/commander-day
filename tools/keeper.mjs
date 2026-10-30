// COMMAND//ZONE keeper: stays connected to an event, keeps a merged copy on disk and
// re-publishes anything a broker is missing (or has older). Never overwrites newer data:
// last-write-wins on t, exactly like the app's own heal().
import mqtt from 'mqtt';
import { createHash } from 'crypto';
import fs from 'fs';

const CODE = (process.argv[2] || '').toUpperCase();
if (!CODE) { console.error('usage: node keeper.mjs <EVENT-CODE> [--seed-only]'); process.exit(1); }
const PRE = `czday/${createHash('sha256').update('czday-v1:' + CODE).digest('hex').slice(0, 32)}/`;
const FILE = new URL(`./keeper-${CODE}.json`, import.meta.url);
const BROKERS = ['wss://broker.emqx.io:8084/mqtt', 'wss://broker.hivemq.com:8884/mqtt'];

let E = {};
try { E = JSON.parse(fs.readFileSync(FILE, 'utf8')); } catch {}
const save = () => fs.writeFileSync(FILE, JSON.stringify(E));
const log = (...a) => console.log(new Date().toISOString().slice(11, 19), ...a);
const newer = (a, b) => !b || a.t > b.t || (a.t === b.t && String(a.by) > String(b.by));

const clients = BROKERS.map((url, i) => {
  const tag = url.includes('emqx') ? 'EMQX' : 'HIVE';
  const seen = new Map();
  const c = mqtt.connect(url, { clientId: `cz_keeper_${tag}_${Math.random().toString(36).slice(2, 8)}`, keepalive: 30, reconnectPeriod: 3000, clean: true });
  c.on('connect', () => { seen.clear(); c.subscribe(PRE + '#', { qos: 1 }); log(tag, 'connected'); setTimeout(() => heal(), 4000); });
  c.on('close', () => log(tag, 'disconnected'));
  c.on('error', (e) => log(tag, 'error', e.message));
  c.on('message', (topic, buf) => {
    if (!buf.length) return;
    let rec; try { rec = JSON.parse(buf.toString()); } catch { return; }
    if (!rec || typeof rec.t !== 'number') return;
    const k = topic.slice(PRE.length);
    seen.set(k, Math.max(rec.t, seen.get(k) ?? -1));
    if (newer(rec, E[k])) { E[k] = rec; dirty = true; }
  });
  function heal() {
    if (!c.connected) return;
    let n = 0;
    for (const [k, rec] of Object.entries(E)) {
      if ((seen.get(k) ?? -1) < rec.t) { c.publish(PRE + k, JSON.stringify(rec), { qos: 1, retain: true }); n++; }
    }
    if (n) log(tag, `healed ${n} entr${n === 1 ? 'y' : 'ies'}`);
  }
  // ask the broker for its full retained set again, then fill the gaps
  function recheck() {
    if (!c.connected) return;
    seen.clear();
    c.unsubscribe(PRE + '#', () => c.subscribe(PRE + '#', { qos: 1 }, () => setTimeout(heal, 4000)));
  }
  return { heal, recheck, tag, seen };
});

let dirty = false;
setInterval(() => { if (dirty) { save(); dirty = false; } }, 2000);
// Every 60 s: resubscribe (broker resends what it still has), then re-publish whatever it lost.
setInterval(() => {
  const keys = Object.keys(E).length;
  log(`status: ${keys} entries on disk · config ${E.config && !E.config.d ? 'OK' : 'MISSING'} · players ${Object.keys(E).filter((k) => k.startsWith('player/') && !E[k].d).length}`);
  clients.forEach((cl) => cl.recheck());
}, 60000);
process.on('SIGINT', () => { save(); process.exit(0); });
log(`keeper for ${CODE} · ${Object.keys(E).length} entries loaded from disk`);
