// Tiny 8-bit sound effects, synthesised with WebAudio (no audio files). On/off: life counter ☰ → SOUND.
import { ls } from './util.js';

let ac = null;
// browsers only allow audio after a user gesture: create/resume the context on the first touch
// iOS only unlocks on touchend/click (not touchstart) and only if a sound is started inside the gesture;
// audioSession 'playback' (iOS 17+) lets the sounds play even with the silent switch on.
const unlock = () => {
  try {
    try { if (navigator.audioSession && navigator.audioSession.type !== 'playback') navigator.audioSession.type = 'playback'; } catch {}
    ac ||= new (window.AudioContext || window.webkitAudioContext)();
    if (ac.state === 'running' && ac.__ok) return;
    ac.resume?.().catch?.(() => {});
    const src = ac.createBufferSource(); src.buffer = ac.createBuffer(1, 1, 22050); src.connect(ac.destination); src.start(0);
    if (ac.state === 'running') ac.__ok = true;
  } catch {}
};
for (const ev of ['pointerdown', 'pointerup', 'touchend', 'click', 'keydown', 'keyup']) document.addEventListener(ev, unlock, { capture: true, passive: true }); // keys: TV remote
export const sfxReady = () => ac?.state === 'running';

export const sfxOn = () => ls.get('cz.sfx', true) !== false;
export function toggleSfx() { ls.set('cz.sfx', !sfxOn()); unlock(); sfx('assign'); }

// [frequency Hz (0 = rest), duration s, wave]
const SFX = {
  ko: [[392, 0.09], [311, 0.09], [247, 0.09], [165, 0.32, 'triangle']],
  mill: [[523, 0.05], [494, 0.05], [466, 0.05], [440, 0.05], [415, 0.05], [392, 0.05], [370, 0.05], [110, 0.3, 'triangle']],
  revive: [[262, 0.07], [330, 0.07], [392, 0.07], [523, 0.07], [659, 0.2]],
  win: [[523, 0.1], [659, 0.1], [784, 0.1], [1047, 0.18], [0, 0.06], [784, 0.08], [1047, 0.35]],
  ot: [[880, 0.14], [0, 0.07], [880, 0.14], [0, 0.07], [1175, 0.3]],
  end: [[784, 0.15], [622, 0.15], [523, 0.15], [392, 0.4, 'triangle']],
  assign: [[659, 0.08], [784, 0.08], [988, 0.2]],
  remind: [[784, 0.12], [0, 0.05], [988, 0.12], [0, 0.05], [784, 0.12], [0, 0.05], [988, 0.25]],
  tick: [[1047, 0.06]],
  tick0: [[1568, 0.12]],
  draw: [[330, 0.05], [392, 0.05], [330, 0.05], [392, 0.05], [330, 0.05], [392, 0.05], [440, 0.05], [494, 0.05],
    [523, 0.05], [587, 0.05], [659, 0.05], [698, 0.05], [0, 0.08], [523, 0.12], [659, 0.12], [784, 0.12], [1047, 0.45]],
  dice: [[1200, 0.03], [900, 0.03], [1400, 0.03], [700, 0.03], [1100, 0.03], [1568, 0.12]],
};

export function sfx(name) {
  if (!sfxOn() || !ac) return;
  if (ac.state !== 'running') { ac.resume?.().then(() => { if (ac.state === 'running') sfx(name); }).catch?.(() => {}); return; } // e.g. iOS 'interrupted' after backgrounding
  try {
    let t = ac.currentTime + 0.01;
    for (const [f, d, wave = 'square'] of SFX[name] || []) {
      if (f) {
        const o = ac.createOscillator(), g = ac.createGain();
        o.type = wave; o.frequency.value = f;
        g.gain.setValueAtTime(wave === 'square' ? 0.14 : 0.3, t);
        g.gain.exponentialRampToValueAtTime(0.0001, t + d);
        o.connect(g).connect(ac.destination);
        o.start(t); o.stop(t + d + 0.02);
      }
      t += d;
    }
  } catch {}
}
