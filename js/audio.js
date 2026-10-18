// Retro sound effects synthesized with WebAudio; no audio files needed.
// Browsers only allow audio after a user gesture, so unlock() is called on the first input.

const Sound = {
  ctx: null,
  master: null,
  noise: null,
  muted: false,
  volume: 0.25,

  unlock() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') this.ctx.resume();
      return;
    }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    this.ctx = new AC();
    this.master = this.ctx.createGain();
    this.master.gain.value = this.muted ? 0 : this.volume;
    this.master.connect(this.ctx.destination);
    const len = Math.floor(this.ctx.sampleRate * 0.5);
    this.noise = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const data = this.noise.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
  },

  toggleMute() {
    this.muted = !this.muted;
    if (this.master) this.master.gain.value = this.muted ? 0 : this.volume;
  },

  tone(type, f0, f1, dur, vol, delay = 0) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime + delay;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(f0, t);
    osc.frequency.exponentialRampToValueAtTime(Math.max(f1, 1), t + dur);
    gain.gain.setValueAtTime(vol, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + dur);
    osc.connect(gain).connect(this.master);
    osc.start(t);
    osc.stop(t + dur + 0.02);
  },

  burst(dur, vol, cutoff) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const src = this.ctx.createBufferSource();
    const filter = this.ctx.createBiquadFilter();
    const gain = this.ctx.createGain();
    src.buffer = this.noise;
    filter.type = 'lowpass';
    filter.frequency.value = cutoff;
    gain.gain.setValueAtTime(vol, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + dur);
    src.connect(filter).connect(gain).connect(this.master);
    src.start(t);
    src.stop(t + dur + 0.02);
  },

  shoot() { this.tone('square', 900, 200, 0.08, 0.12); },
  hit() { this.burst(0.05, 0.25, 3000); },
  kill() {
    this.burst(0.18, 0.4, 1200);
    this.tone('square', 300, 60, 0.15, 0.15);
  },
  hurt() {
    this.tone('sawtooth', 220, 55, 0.3, 0.35);
    this.burst(0.2, 0.3, 800);
  },
  enemyShot() { this.tone('triangle', 400, 150, 0.15, 0.25); },
  pickup() {
    this.tone('square', 660, 660, 0.06, 0.18);
    this.tone('square', 990, 990, 0.1, 0.18, 0.06);
  },
  select() { this.tone('square', 440, 880, 0.08, 0.2); },
  levelUp() {
    [523, 659, 784, 1047].forEach((f, i) => this.tone('square', f, f, 0.12, 0.18, i * 0.1));
  },
  bossRoar() {
    this.tone('sawtooth', 120, 40, 0.8, 0.4);
    this.burst(0.6, 0.3, 500);
  },
  gameOver() {
    [392, 330, 262, 196].forEach((f, i) => this.tone('triangle', f, f * 0.98, 0.25, 0.3, i * 0.2));
  },
};
