// Tiny 8-bit sound effects, synthesised with WebAudio (no audio files). On/off: life counter ☰ → SOUND.
import { ls } from './util.js';

let ac = null;
// browsers only allow audio after a user gesture: create/resume the context on the first touch
const unlock = () => {
  try {
    ac ||= new (window.AudioContext || window.webkitAudioContext)();
    if (ac.state === 'suspended') ac.resume();
  } catch {}
};
document.addEventListener('pointerdown', unlock, { capture: true, passive: true });

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
  dice: [[1200, 0.03], [900, 0.03], [1400, 0.03], [700, 0.03], [1100, 0.03], [1568, 0.12]],
};

export function sfx(name) {
  if (!sfxOn() || !ac || ac.state !== 'running') return;
  try {
    let t = ac.currentTime + 0.01;
    for (const [f, d, wave = 'square'] of SFX[name] || []) {
      if (f) {
        const o = ac.createOscillator(), g = ac.createGain();
        o.type = wave; o.frequency.value = f;
        g.gain.setValueAtTime(0.07, t);
        g.gain.exponentialRampToValueAtTime(0.0001, t + d);
        o.connect(g).connect(ac.destination);
        o.start(t); o.stop(t + d + 0.02);
      }
      t += d;
    }
  } catch {}
}
