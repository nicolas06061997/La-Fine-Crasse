// MYTHORIA — sons synthétisés (Web Audio) : aucun fichier audio à télécharger.
let ac = null, enabled = true, last = {};

export function setSound(on) { enabled = on; }
export function unlockAudio() {
  if (!ac) { try { ac = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { ac = null; } }
  if (ac && ac.state === 'suspended') ac.resume();
}

function tone(f, dur, type = 'sine', vol = 0.15, slide = 0, delay = 0) {
  if (!ac || !enabled) return;
  const t = ac.currentTime + delay, o = ac.createOscillator(), g = ac.createGain();
  o.type = type; o.frequency.setValueAtTime(f, t);
  if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, f * slide), t + dur);
  g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(ac.destination); o.start(t); o.stop(t + dur + 0.05);
}
function noise(dur, vol = 0.2, freq = 800, delay = 0) {
  if (!ac || !enabled) return;
  const t = ac.currentTime + delay, n = Math.floor(ac.sampleRate * dur), b = ac.createBuffer(1, n, ac.sampleRate), d = b.getChannelData(0);
  for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n);
  const s = ac.createBufferSource(), f = ac.createBiquadFilter(), g = ac.createGain();
  s.buffer = b; f.type = 'lowpass'; f.frequency.value = freq; g.gain.value = vol;
  s.connect(f).connect(g).connect(ac.destination); s.start(t);
}

const SFX = {
  click: () => tone(660, 0.06, 'triangle', 0.08),
  deploy: () => { tone(300, 0.15, 'triangle', 0.12, 1.8); noise(0.12, 0.08, 1500); },
  hit: () => noise(0.05, 0.06, 900),
  arrow: () => tone(1200, 0.05, 'square', 0.025, 0.5),
  boom: () => { noise(0.35, 0.3, 500); tone(110, 0.3, 'sine', 0.2, 0.4); },
  tower: () => { noise(0.8, 0.4, 350); tone(80, 0.7, 'sawtooth', 0.12, 0.3); },
  spell: () => { tone(880, 0.25, 'sine', 0.1, 1.5); tone(1320, 0.25, 'sine', 0.06, 1.5, 0.05); },
  freeze: () => { for (let i = 0; i < 5; i++) tone(1500 + i * 300, 0.12, 'sine', 0.05, 1, i * 0.04); },
  heal: () => { tone(523, 0.3, 'sine', 0.08); tone(784, 0.3, 'sine', 0.08, 1, 0.08); },
  zap: () => { noise(0.15, 0.12, 4000); tone(1800, 0.12, 'sawtooth', 0.05, 0.3); },
  fuse: () => { [523, 659, 784, 1046].forEach((f, i) => tone(f, 0.18, 'triangle', 0.1, 1, i * 0.07)); },
  reject: () => tone(180, 0.15, 'square', 0.06),
  tick: () => tone(880, 0.08, 'square', 0.06),
  go: () => { tone(523, 0.12, 'square', 0.08); tone(1046, 0.3, 'square', 0.08, 1, 0.1); },
  win: () => { [523, 659, 784, 1046, 1318].forEach((f, i) => tone(f, 0.35, 'triangle', 0.12, 1, i * 0.12)); },
  lose: () => { [392, 349, 311, 262].forEach((f, i) => tone(f, 0.4, 'triangle', 0.1, 1, i * 0.18)); },
  coin: () => { tone(988, 0.08, 'square', 0.05); tone(1318, 0.15, 'square', 0.05, 1, 0.07); },
};

export function sfx(name, gap = 0) {
  if (!ac || !enabled || !SFX[name]) return;
  const now = performance.now();
  if (gap && last[name] && now - last[name] < gap) return;
  last[name] = now;
  try { SFX[name](); } catch (e) {}
}
