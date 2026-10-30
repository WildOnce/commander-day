// Realtime sync over MQTT (WebSockets), mirrored on two free public brokers.
// Every entity is one retained message: { v: data, t: updatedAt, by: device, d: deleted }.
// Merge rule: last-write-wins on t (tie-break by device id). Each device caches everything
// locally and re-publishes entries a broker is missing or has older ("healing").
import { sha, uid, ls } from './util.js';

const BROKERS = ['wss://broker.emqx.io:8084/mqtt', 'wss://broker.hivemq.com:8884/mqtt'];
const SALT = 'czday-v1';

export const DEVICE = ls.get('cz.device') || (() => { const d = uid(12); ls.set('cz.device', d); return d; })();

export class Store extends EventTarget {
  constructor() {
    super();
    this.e = new Map();
    this.clients = [];
    this.seen = [];
    this.status = [];
    this.timers = new Map();
  }

  async open(code) {
    this.close();
    this.code = code.trim().toUpperCase();
    this.prefix = `czday/${(await sha(`${SALT}:${this.code}`)).slice(0, 32)}/`;
    this.cacheKey = `cz.cache.${this.prefix}`;
    this.e = new Map(Object.entries(ls.get(this.cacheKey, {})));
    BROKERS.forEach((url, i) => {
      this.seen[i] = new Map();
      this.status[i] = 'connecting';
      const c = window.mqtt.connect(url, {
        clientId: `cz_${uid(10)}`, keepalive: 30, reconnectPeriod: 2500, connectTimeout: 8000, clean: true,
      });
      c.on('connect', () => {
        if (!this.online) this.onlineSince = Date.now();
        this.status[i] = 'online';
        this.seen[i].clear();
        c.subscribe(`${this.prefix}#`, { qos: 1 });
        this.emit('status');
        clearTimeout(this[`heal${i}`]);
        this[`heal${i}`] = setTimeout(() => this.heal(i), 2500 + Math.random() * 2500);
      });
      c.on('close', () => { if (this.status[i] !== 'offline') { this.status[i] = 'offline'; this.emit('status'); } });
      c.on('message', (topic, buf) => this.onMsg(i, topic, buf));
      this.clients[i] = c;
    });
    this.emit('change');
  }

  close() {
    this.clients.forEach((c) => c?.end(true));
    this.clients = [];
  }

  get online() { return this.status.some((s) => s === 'online'); }
  /** online for at least `ms` – long enough for retained messages to have arrived */
  stableOnline(ms = 3000) { return this.online && Date.now() - (this.onlineSince || Date.now()) >= ms; }

  onMsg(i, topic, buf) {
    if (!buf?.length) return;
    const key = topic.slice(this.prefix.length);
    let rec;
    try { rec = JSON.parse(new TextDecoder().decode(buf)); } catch { return; }
    if (!rec || typeof rec.t !== 'number') return;
    this.seen[i].set(key, Math.max(rec.t, this.seen[i].get(key) ?? -1));
    const cur = this.e.get(key);
    if (!cur || rec.t > cur.t || (rec.t === cur.t && String(rec.by) > String(cur.by))) {
      // a newer remote write beats our still-pending local one (e.g. someone took over the table)
      if (this.timers.has(key)) { clearTimeout(this.timers.get(key)); this.timers.delete(key); }
      this.e.set(key, rec);
      this.dirty(key);
    }
  }

  heal(i) {
    const c = this.clients[i];
    if (!c?.connected) return;
    for (const [k, rec] of this.e) {
      if ((this.seen[i].get(k) ?? -1) < rec.t) c.publish(this.prefix + k, JSON.stringify(rec), { qos: 1, retain: true });
    }
  }

  /** Re-fetch the retained state from every broker and re-publish whatever a broker has lost (free public
   *  brokers may drop retained messages). Same rules as on connect: only records newer than the broker's win. */
  resync() {
    this.clients.forEach((c, i) => {
      if (!c?.connected) return;
      this.seen[i].clear();
      c.unsubscribe(`${this.prefix}#`, () => c.subscribe(`${this.prefix}#`, { qos: 1 }));
      clearTimeout(this[`heal${i}`]);
      this[`heal${i}`] = setTimeout(() => this.heal(i), 5000);
    });
  }
  dirty(key) {
    clearTimeout(this._emitT);
    this._changed = this._changed || new Set();
    this._changed.add(key);
    this._emitT = setTimeout(() => {
      const keys = this._changed; this._changed = null;
      this.dispatchEvent(new CustomEvent('change', { detail: keys }));
    }, 20);
    clearTimeout(this._saveT);
    this._saveT = setTimeout(() => ls.set(this.cacheKey, Object.fromEntries(this.e)), 400);
  }

  emit(type) { this.dispatchEvent(new CustomEvent(type)); }

  /** Write an entity. Local state updates immediately; network publish can be debounced. */
  put(key, v, { debounce = 0, deleted = false } = {}) {
    const cur = this.e.get(key);
    const rec = { v: deleted ? null : v, t: Math.max(Date.now(), (cur?.t || 0) + 1), by: DEVICE, d: deleted ? 1 : 0 };
    this.e.set(key, rec);
    this.dirty(key);
    const send = () => {
      clearTimeout(this.timers.get(key));
      this.timers.delete(key);
      const r = this.e.get(key);
      this.clients.forEach((c) => c?.publish(this.prefix + key, JSON.stringify(r), { qos: 1, retain: true }));
    };
    // throttle (not debounce): during rapid tapping the latest state still goes out at least every `debounce` ms
    if (debounce) { if (!this.timers.has(key)) this.timers.set(key, setTimeout(send, debounce)); }
    else send();
  }

  /** Send every throttled write right now and persist the cache (page is being hidden/closed/reloaded). */
  flush() {
    for (const key of [...this.timers.keys()]) {
      clearTimeout(this.timers.get(key));
      this.timers.delete(key);
      const r = this.e.get(key);
      this.clients.forEach((c) => c?.publish(this.prefix + key, JSON.stringify(r), { qos: 1, retain: true }));
    }
    if (this.cacheKey) ls.set(this.cacheKey, Object.fromEntries(this.e));
  }

  del(key) { this.put(key, null, { deleted: true }); }

  get(key) { const r = this.e.get(key); return r && !r.d ? r.v : null; }

  list(prefix) {
    const out = [];
    for (const [k, r] of this.e) if (k.startsWith(prefix) && !r.d && r.v) out.push(r.v);
    return out;
  }

  /** Wait until config arrives (or timeout). */
  waitFor(key, ms = 6000) {
    return new Promise((res) => {
      if (this.get(key)) return res(this.get(key));
      const done = () => { clearTimeout(to); this.removeEventListener('change', on); res(this.get(key)); };
      const on = () => { if (this.get(key)) done(); };
      const to = setTimeout(done, ms);
      this.addEventListener('change', on);
    });
  }

  dump() { return Object.fromEntries(this.e); }

  /** Merge a backup: only records newer than what we have win, with their original timestamps. */
  restore(obj) {
    let n = 0;
    for (const [k, rec] of Object.entries(obj)) {
      if (!rec || typeof rec.t !== 'number' || (this.e.get(k)?.t ?? -1) >= rec.t) continue;
      this.e.set(k, rec); this.dirty(k); n++;
      this.clients.forEach((c) => c?.publish(this.prefix + k, JSON.stringify(rec), { qos: 1, retain: true }));
    }
    return n;
  }
}
