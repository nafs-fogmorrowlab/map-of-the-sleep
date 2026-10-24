// A quiet night ambience and two small sounds, made in the browser (no files). Off until switched on.
export class Sound {
  constructor() { this.on = false; this.ctx = null; }

  start() {
    if (this.ctx) return;
    const ctx = (this.ctx = new (window.AudioContext || window.webkitAudioContext)());
    this.master = ctx.createGain(); this.master.gain.value = 0; this.master.connect(ctx.destination);
    // wind: brown noise through a slow, wandering low-pass
    const len = ctx.sampleRate * 4, buf = ctx.createBuffer(1, len, ctx.sampleRate), d = buf.getChannelData(0);
    let last = 0;
    for (let i = 0; i < len; i++) { last = (last + 0.02 * (Math.random() * 2 - 1)) / 1.02; d[i] = last * 3.2; }
    const noise = ctx.createBufferSource(); noise.buffer = buf; noise.loop = true;
    const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 420;
    const lfo = ctx.createOscillator(), lfoGain = ctx.createGain(); lfo.frequency.value = 0.07; lfoGain.gain.value = 180;
    lfo.connect(lfoGain); lfoGain.connect(lp.frequency);
    const windGain = ctx.createGain(); windGain.gain.value = 0.32;
    noise.connect(lp); lp.connect(windGain); windGain.connect(this.master);
    // a low, soft drone
    for (const f of [55, 82.4]) {
      const o = ctx.createOscillator(), g = ctx.createGain(); o.type = 'sine'; o.frequency.value = f; g.gain.value = 0.035;
      o.connect(g); g.connect(this.master); o.start();
    }
    noise.start(); lfo.start();
  }

  toggle() {
    this.on = !this.on;
    if (this.on) this.start();
    if (this.ctx) {
      this.ctx.resume();
      this.master.gain.setTargetAtTime(this.on ? 0.6 : 0, this.ctx.currentTime, 0.4);
    }
    return this.on;
  }

  blip(freq, dur, type = 'triangle', vol = 0.18) {
    if (!this.on || !this.ctx) return;
    const ctx = this.ctx, o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type; o.frequency.value = freq;
    g.gain.setValueAtTime(vol, ctx.currentTime); g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + dur);
    o.connect(g); g.connect(this.master); o.start(); o.stop(ctx.currentTime + dur);
  }

  tick() { this.blip(1400 + Math.random() * 200, 0.06, 'square', 0.05); }
  chime() { this.blip(880, 1.4, 'sine', 0.16); setTimeout(() => this.blip(1318, 1.6, 'sine', 0.1), 120); }
  low() { this.blip(110, 2.2, 'sine', 0.22); }
}
