/**
 * Tiny Web Audio SFX engine — no assets, all synthesised.
 *
 * ── REPLACE WITH REAL AUDIO ─────────────────────────────────────────────
 * To use your own sounds, drop files in `public/sfx/` and swap the body of
 * each method below for:
 *
 *   const url = new URL("/sfx/coin.mp3", location.origin).href;
 *   const buf = await this.ctx.decodeAudioData(await (await fetch(url)).arrayBuffer());
 *   this.playBuffer(buf);
 *
 * Keep the method names the same and nothing else in the app changes.
 * ────────────────────────────────────────────────────────────────────────
 */

type OscType = OscillatorType;

class AudioEngine {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private noiseBuf: AudioBuffer | null = null;
  muted = false;

  /** Must be called from a user gesture at least once (browser autoplay rules). */
  unlock() {
    if (typeof window === "undefined") return;
    if (!this.ctx) {
      const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!Ctx) return;
      this.ctx = new Ctx();
      this.master = this.ctx.createGain();
      this.master.gain.value = this.muted ? 0 : 0.5;
      this.master.connect(this.ctx.destination);
    }
    if (this.ctx.state === "suspended") void this.ctx.resume();
  }

  setMuted(m: boolean) {
    this.muted = m;
    if (this.master && this.ctx) {
      this.master.gain.setTargetAtTime(m ? 0 : 0.5, this.ctx.currentTime, 0.01);
    }
  }

  private tone(freq: number, dur: number, opts: { type?: OscType; vol?: number; delay?: number; slide?: number } = {}) {
    if (!this.ctx || !this.master) return;
    const t0 = this.ctx.currentTime + (opts.delay ?? 0);
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = opts.type ?? "square";
    osc.frequency.setValueAtTime(freq, t0);
    if (opts.slide) osc.frequency.exponentialRampToValueAtTime(Math.max(30, opts.slide), t0 + dur);
    const vol = opts.vol ?? 0.18;
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(vol, t0 + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(g).connect(this.master);
    osc.start(t0);
    osc.stop(t0 + dur + 0.02);
  }

  private noise(dur: number, opts: { vol?: number; delay?: number; lowpass?: number } = {}) {
    if (!this.ctx || !this.master) return;
    if (!this.noiseBuf) {
      const len = Math.floor(this.ctx.sampleRate * 1);
      this.noiseBuf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
      const data = this.noiseBuf.getChannelData(0);
      for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
    }
    const t0 = this.ctx.currentTime + (opts.delay ?? 0);
    const src = this.ctx.createBufferSource();
    src.buffer = this.noiseBuf;
    const filt = this.ctx.createBiquadFilter();
    filt.type = "lowpass";
    filt.frequency.value = opts.lowpass ?? 900;
    const g = this.ctx.createGain();
    const vol = opts.vol ?? 0.3;
    g.gain.setValueAtTime(vol, t0);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    src.connect(filt).connect(g).connect(this.master);
    src.start(t0);
    src.stop(t0 + dur + 0.02);
  }

  // ── Public SFX ──────────────────────────────────────────────────────
  whoosh() { this.noise(0.22, { vol: 0.16, lowpass: 1400 }); }
  grab() { this.tone(220, 0.09, { type: "square", vol: 0.2 }); this.tone(330, 0.08, { type: "square", vol: 0.14, delay: 0.05 }); }
  reel() { this.tone(120, 0.045, { type: "triangle", vol: 0.08 }); }
  coin() { this.tone(660, 0.09, { type: "square", vol: 0.16 }); this.tone(880, 0.12, { type: "square", vol: 0.16, delay: 0.07 }); }
  bigCoin() { this.tone(523, 0.09, { vol: 0.16 }); this.tone(659, 0.09, { vol: 0.16, delay: 0.07 }); this.tone(784, 0.16, { vol: 0.18, delay: 0.14 }); }
  bad() { this.tone(160, 0.16, { type: "sawtooth", vol: 0.16, slide: 70 }); }
  boom() { this.noise(0.5, { vol: 0.42, lowpass: 500 }); this.tone(70, 0.4, { type: "sine", vol: 0.3, slide: 32 }); }
  buy() { this.tone(440, 0.07, { type: "square", vol: 0.15 }); this.tone(660, 0.07, { type: "square", vol: 0.15, delay: 0.06 }); this.tone(990, 0.12, { type: "square", vol: 0.16, delay: 0.12 }); }
  tick() { this.tone(1000, 0.05, { type: "square", vol: 0.1 }); }
  win() {
    [523, 659, 784, 1047].forEach((f, i) => this.tone(f, 0.16, { type: "square", vol: 0.17, delay: i * 0.11 }));
  }
  lose() {
    [392, 330, 262, 196].forEach((f, i) => this.tone(f, 0.22, { type: "triangle", vol: 0.17, delay: i * 0.16 }));
  }
  mystery() { this.tone(500, 0.08, { type: "triangle", vol: 0.15, slide: 900 }); }
}

/** Singleton — import { sfx } from "@/lib/game/audio". */
export const sfx = new AudioEngine();
