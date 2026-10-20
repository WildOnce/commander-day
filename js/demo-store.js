// Offline sandbox store for the test game (?demo): same API as the MQTT Store, but local-only.
import { ls } from './util.js';
import { DEVICE } from './sync.js';

const KEY = 'cz.demo.state';

export class DemoStore extends EventTarget {
  constructor() {
    super();
    this.e = new Map();
    this.status = ['online', 'online'];
    this.prefix = 'demo/';
    this.code = 'TESTSPIEL';
    this.timers = new Map();
  }

  async open() {
    this.e = new Map(Object.entries(ls.get(KEY, {})));
    this.dispatchEvent(new CustomEvent('change'));
  }

  close() {}
  get online() { return true; }
  stableOnline() { return true; }

  put(key, v, { deleted = false } = {}) {
    const cur = this.e.get(key);
    this.e.set(key, { v: deleted ? null : v, t: Math.max(Date.now(), (cur?.t || 0) + 1), by: DEVICE, d: deleted ? 1 : 0 });
    this.dirty(key);
  }

  del(key) { this.put(key, null, { deleted: true }); }
  get(key) { const r = this.e.get(key); return r && !r.d ? r.v : null; }

  list(prefix) {
    const out = [];
    for (const [k, r] of this.e) if (k.startsWith(prefix) && !r.d && r.v) out.push(r.v);
    return out;
  }

  dirty() {
    clearTimeout(this._emitT);
    this._emitT = setTimeout(() => this.dispatchEvent(new CustomEvent('change')), 20);
    clearTimeout(this._saveT);
    this._saveT = setTimeout(() => ls.set(KEY, Object.fromEntries(this.e)), 300);
  }

  waitFor(key) { return Promise.resolve(this.get(key)); }
  dump() { return Object.fromEntries(this.e); }
  restore() { return 0; }

  wipe() { this.e = new Map(); ls.del(KEY); this.dispatchEvent(new CustomEvent('change')); }
}
