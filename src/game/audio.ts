// Tiny WebAudio synth for game feedback — no assets, instant load.
export class Sfx {
  private ac: AudioContext | null = null;
  private master: GainNode | null = null;
  private noise: AudioBuffer | null = null;
  private rainSrc: AudioBufferSourceNode | null = null;
  private rainGain: GainNode | null = null;
  muted = false;

  ensure() {
    if (this.ac) {
      if (this.ac.state === 'suspended') void this.ac.resume();
      return;
    }
    type WinAudio = Window & { webkitAudioContext?: typeof AudioContext };
    const AC = window.AudioContext || (window as WinAudio).webkitAudioContext;
    if (!AC) return;
    const ac = new AC();
    const master = ac.createGain();
    master.gain.value = this.muted ? 0 : 0.5;
    master.connect(ac.destination);
    const len = ac.sampleRate * 2;
    const buf = ac.createBuffer(1, len, ac.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    this.ac = ac;
    this.master = master;
    this.noise = buf;
  }

  setMuted(m: boolean) {
    this.muted = m;
    if (this.master) this.master.gain.value = m ? 0 : 0.5;
  }

  private tone(
    freq: number,
    dur: number,
    type: OscillatorType = 'sine',
    gain = 0.2,
    delay = 0,
    slide = 0,
  ) {
    const ac = this.ac, m = this.master;
    if (!ac || !m) return;
    const t = ac.currentTime + delay;
    const o = ac.createOscillator();
    const g = ac.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, freq + slide), t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(gain, t + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(m);
    o.start(t);
    o.stop(t + dur + 0.05);
  }

  private hiss(dur: number, gain = 0.2, freq = 1200, delay = 0, q = 1) {
    const ac = this.ac, m = this.master, n = this.noise;
    if (!ac || !m || !n) return;
    const t = ac.currentTime + delay;
    const s = ac.createBufferSource();
    s.buffer = n;
    s.loop = true;
    const f = ac.createBiquadFilter();
    f.type = 'bandpass';
    f.frequency.value = freq;
    f.Q.value = q;
    const g = ac.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(gain, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(f).connect(g).connect(m);
    s.start(t);
    s.stop(t + dur + 0.05);
  }

  ui() { this.tone(660, 0.08, 'triangle', 0.16); this.tone(880, 0.1, 'triangle', 0.12, 0.06); }
  step(out = false) { this.hiss(0.09, out ? 0.07 : 0.05, out ? 480 : 260, 0, 0.8); }
  pickup() {
    this.tone(740, 0.09, 'square', 0.12);
    this.tone(1100, 0.1, 'square', 0.1, 0.06);
    this.tone(1480, 0.14, 'triangle', 0.1, 0.12);
  }
  deny() { this.tone(180, 0.16, 'sawtooth', 0.12, 0, -60); this.hiss(0.1, 0.05, 300); }
  drop() { this.tone(170, 0.12, 'sine', 0.16, 0, -70); this.hiss(0.1, 0.08, 420, 0.02); }
  tick() { this.tone(1500, 0.03, 'square', 0.05); }
  complete(combo: number) {
    const base = 523.25 * Math.pow(1.0595, Math.min(12, combo) * 2);
    [0, 4, 7, 12].forEach((s, i) => this.tone(base * Math.pow(2, s / 12), 0.28, 'triangle', 0.16, i * 0.045));
    this.hiss(0.22, 0.12, 2600, 0, 0.7);
    this.tone(90, 0.16, 'sine', 0.22, 0, -30);
  }
  splash() { this.hiss(0.4, 0.14, 900, 0, 0.5); this.tone(320, 0.2, 'sine', 0.08, 0, -140); }
  fire() { this.hiss(0.5, 0.1, 1800, 0, 0.4); }
  moo() { this.tone(150, 0.55, 'sawtooth', 0.13, 0, -50); this.tone(226, 0.5, 'triangle', 0.07, 0.05, -60); }
  crow() { this.tone(720, 0.1, 'sawtooth', 0.07, 0, -300); this.tone(640, 0.13, 'sawtooth', 0.06, 0.11, -260); }
  chirp() {
    for (let i = 0; i < 3; i++) this.tone(2200 + Math.random() * 900, 0.05, 'sine', 0.045, i * 0.09, 400);
  }
  thunder() {
    this.hiss(1.5, 0.22, 160, 0, 0.4);
    this.tone(60, 1.1, 'sine', 0.2, 0, -25);
  }
  zap() {
    this.hiss(0.25, 0.16, 3000, 0, 0.6);
    this.tone(1400, 0.2, 'square', 0.1, 0, -1100);
  }
  upgrade() {
    // Joyous fanfare when inventory capacity unlocks
    [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => {
      this.tone(f, 0.35, 'triangle', 0.16, i * 0.08);
      this.tone(f * 1.5, 0.25, 'sine', 0.09, i * 0.08 + 0.02);
    });
    this.hiss(0.3, 0.1, 3200, 0.25, 1);
  }
  chapter() {
    // Grand brass temple bell gong for story chapters
    this.tone(196, 1.8, 'sine', 0.28, 0, -10);
    this.tone(392, 1.4, 'triangle', 0.18, 0.04);
    this.tone(587.33, 1.2, 'sine', 0.14, 0.08);
    this.hiss(0.6, 0.08, 1800, 0, 0.4);
  }
  guest() {
    // Pleasant doorstep greeting chime
    this.tone(880, 0.2, 'sine', 0.18);
    this.tone(1174.66, 0.3, 'triangle', 0.16, 0.12);
  }
  drum() {
    // Temple chenda drum roll for the deepam evening
    for (let i = 0; i < 7; i++) {
      this.hiss(0.09, 0.16, 190 + i * 22, i * 0.1, 2);
      this.tone(96 + i * 6, 0.12, 'sine', 0.18, i * 0.1, -30);
    }
    this.tone(146.83, 1.5, 'triangle', 0.14, 0.75);
    this.tone(220, 1.2, 'sine', 0.1, 0.8);
  }
  triviaCorrect() {
    this.tone(659.25, 0.16, 'triangle', 0.17);
    this.tone(880, 0.18, 'triangle', 0.16, 0.1);
    this.tone(1318.51, 0.28, 'sine', 0.14, 0.2);
    this.hiss(0.18, 0.08, 2800, 0.08, 0.8);
  }
  triviaWrong() {
    this.tone(230, 0.18, 'triangle', 0.14, 0, -70);
    this.tone(170, 0.22, 'sine', 0.1, 0.09, -45);
  }
  gameOver() {
    [0, -3, -7, -12].forEach((s, i) => this.tone(440 * Math.pow(2, s / 12), 0.5, 'triangle', 0.16, i * 0.14));
    this.hiss(1.2, 0.08, 400, 0.2);
  }
  rain(on: boolean) {
    const ac = this.ac, m = this.master, n = this.noise;
    if (!ac || !m || !n) return;
    if (on && !this.rainSrc) {
      const s = ac.createBufferSource();
      s.buffer = n;
      s.loop = true;
      const f = ac.createBiquadFilter();
      f.type = 'highpass';
      f.frequency.value = 900;
      const g = ac.createGain();
      g.gain.setValueAtTime(0.0001, ac.currentTime);
      g.gain.exponentialRampToValueAtTime(0.11, ac.currentTime + 1.2);
      s.connect(f).connect(g).connect(m);
      s.start();
      this.rainSrc = s;
      this.rainGain = g;
    } else if (!on && this.rainSrc) {
      const g = this.rainGain, s = this.rainSrc;
      this.rainSrc = null;
      this.rainGain = null;
      if (g) g.gain.exponentialRampToValueAtTime(0.0001, ac.currentTime + 0.8);
      setTimeout(() => { try { s.stop(); } catch { /* noop */ } }, 900);
    }
  }
}

export const sfx = new Sfx();
