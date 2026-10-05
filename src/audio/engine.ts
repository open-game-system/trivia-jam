/**
 * The TV's sound: produced music beds (ElevenLabs, public/audio/music) crossfaded in a loop, and
 * synthesized one-shots tuned to one pentatonic scale so every hit harmonises with every other.
 * Mallets and wood for the print-shop feel; nothing square-edged (square waves click at 20 kHz).
 */
import type { Bed, Cue } from "./cues";

const BED_URLS: Record<Bed, string> = {
  lobby: "/audio/music/lobby.m4a",
  think: "/audio/music/think.m4a",
  finale: "/audio/music/finale.m4a",
};
const BED_LEVEL: Record<Bed, number> = { lobby: 0.55, think: 0.42, finale: 0.6 };
const XFADE = 1.6; // seconds of overlap at each loop seam
// C major pentatonic, mallet register.
const SCALE = [523.25, 587.33, 659.25, 783.99, 880.0, 1046.5, 1174.66, 1318.51, 1567.98, 1760.0];

type Ctx = AudioContext;

function audioSessionPlayback() {
  // iPhones mute Web Audio on silent unless the session says "playback".
  const nav: unknown = typeof navigator === "undefined" ? undefined : navigator;
  const session: unknown = nav && typeof nav === "object" ? Reflect.get(nav, "audioSession") : undefined;
  if (session && typeof session === "object") Reflect.set(session, "type", "playback");
}

export class TvAudio {
  private ctx: Ctx | null = null;
  private master: GainNode | null = null;
  private tapNode: MediaStreamAudioDestinationNode | null = null;
  private buffers = new Map<Bed, Promise<AudioBuffer | null>>();
  private bed: { name: Bed; gain: GainNode; timer: number; sources: AudioBufferSourceNode[] } | null = null;
  private wanted: Bed | null = null;
  private paused = false;

  private context(): { ctx: Ctx; out: GainNode } {
    if (!this.ctx || !this.master) {
      audioSessionPlayback();
      const ctx = new AudioContext({ latencyHint: "interactive" });
      const comp = ctx.createDynamicsCompressor();
      comp.threshold.value = -14;
      comp.ratio.value = 3;
      comp.attack.value = 0.004;
      comp.release.value = 0.2;
      const master = ctx.createGain();
      master.gain.value = 0.9;
      master.connect(comp);
      comp.connect(ctx.destination);
      this.ctx = ctx;
      this.master = master;
      this.comp = comp;
    }
    return { ctx: this.ctx, out: this.master };
  }
  private comp: DynamicsCompressorNode | null = null;

  /** Resume after a user gesture (or immediately where autoplay is allowed). */
  unlock() {
    const { ctx } = this.context();
    if (!this.paused && ctx.state === "suspended") void ctx.resume();
  }

  /** OGS parks the game: everything goes silent until it resumes. */
  setPaused(paused: boolean) {
    this.paused = paused;
    if (!this.ctx) return;
    if (paused) void this.ctx.suspend();
    else void this.ctx.resume();
  }

  /** The master mix as a MediaStream, for the evidence recorder. */
  tap(): MediaStream {
    const { ctx } = this.context();
    if (!this.tapNode && this.comp) {
      this.tapNode = ctx.createMediaStreamDestination();
      this.comp.connect(this.tapNode);
    }
    if (!this.tapNode) throw new Error("audio graph missing");
    return this.tapNode.stream;
  }

  play(cue: Cue) {
    switch (cue.type) {
      case "bed":
        this.setBed(cue.bed);
        return;
      case "join":
        this.mallet(SCALE[(cue.count * 2) % 5] ?? 523.25, 0.32, 0.5);
        this.mallet((SCALE[(cue.count * 2) % 5] ?? 523.25) * 1.5, 0.18, 0.4, 0.07);
        return;
      case "question":
        this.stamp(0);
        this.bell(0.12);
        return;
      case "lockIn": {
        // Each answer climbs the scale, so the room hears the answers filling up.
        const step = Math.min(SCALE.length - 1, Math.round(((cue.count - 1) / Math.max(1, cue.of - 1)) * 6) + 2);
        this.stamp(0, 0.55);
        this.mallet(SCALE[step] ?? 880, 0.3, 0.45, 0.03);
        if (cue.count === cue.of) this.arp([5, 7, 9], 0.12, 0.22, 0.18);
        return;
      }
      case "reveal":
        this.drumroll(0, 2.6);
        this.hit(2.65);
        return;
      case "gameOver":
        this.hit(0);
        this.arp([0, 2, 4, 5, 7, 9], 0.09, 0.3, 0.15);
        this.arp([5, 7, 9], 0.0, 0.32, 0.9);
        return;
    }
  }

  /** The last seconds of the timer: a soft woodblock, brighter on the final three. */
  tick(secondsLeft: number) {
    this.wood(secondsLeft <= 3 ? 1900 : 1500, secondsLeft <= 3 ? 0.42 : 0.3);
    if (secondsLeft === 0) this.timeUp();
  }

  // ---------- beds ----------

  private load(name: Bed): Promise<AudioBuffer | null> {
    const cached = this.buffers.get(name);
    if (cached) return cached;
    const { ctx } = this.context();
    const p = fetch(BED_URLS[name])
      .then((r) => (r.ok ? r.arrayBuffer() : Promise.reject(new Error(`bed ${name}: ${r.status}`))))
      .then((data) => ctx.decodeAudioData(data))
      .catch((e: unknown) => {
        console.warn(String(e));
        return null;
      });
    this.buffers.set(name, p);
    return p;
  }

  private setBed(name: Bed | null) {
    this.wanted = name;
    if (this.bed?.name === name) return;
    const { ctx } = this.context();
    const old = this.bed;
    if (old) {
      old.gain.gain.cancelScheduledValues(ctx.currentTime);
      old.gain.gain.setValueAtTime(old.gain.gain.value, ctx.currentTime);
      old.gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.7);
      window.clearTimeout(old.timer);
      for (const s of old.sources) s.stop(ctx.currentTime + 0.8);
      this.bed = null;
    }
    if (!name) return;
    void this.load(name).then((buffer) => {
      if (!buffer || this.wanted !== name || this.bed) return;
      const { ctx, out } = this.context();
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(BED_LEVEL[name], ctx.currentTime + 1.2);
      gain.connect(out);
      const bed = { name, gain, timer: 0, sources: [] as AudioBufferSourceNode[] };
      this.bed = bed;
      // Each copy fades in over XFADE while the previous one fades out: no seam, no silent dip.
      const schedule = (at: number, first: boolean) => {
        if (this.bed !== bed) return;
        const src = ctx.createBufferSource();
        src.buffer = buffer;
        const env = ctx.createGain();
        env.gain.setValueAtTime(first ? 1 : 0, at);
        if (!first) env.gain.linearRampToValueAtTime(1, at + XFADE);
        const end = at + buffer.duration;
        env.gain.setValueAtTime(1, end - XFADE);
        env.gain.linearRampToValueAtTime(0, end);
        src.connect(env);
        env.connect(gain);
        src.start(at);
        src.stop(end + 0.05);
        bed.sources = [...bed.sources.slice(-1), src];
        const next = end - XFADE;
        bed.timer = window.setTimeout(() => schedule(next, false), Math.max(0, (next - ctx.currentTime - 1) * 1000));
      };
      schedule(ctx.currentTime + 0.02, true);
    });
  }

  // ---------- instruments ----------

  private voice(freq: number, type: OscillatorType, level: number, decay: number, delay: number, attack = 0.004) {
    const { ctx, out } = this.context();
    const t = ctx.currentTime + delay;
    const osc = ctx.createOscillator();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(level, t + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t + decay);
    osc.connect(g);
    g.connect(out);
    osc.start(t);
    osc.stop(t + decay + 0.05);
    return osc;
  }

  /** A marimba-ish mallet: fundamental plus a soft 4th partial that dies fast. */
  private mallet(freq: number, level: number, decay: number, delay = 0) {
    this.voice(freq, "sine", level, decay, delay);
    this.voice(freq * 3.99, "sine", level * 0.12, decay * 0.25, delay);
  }

  private arp(steps: number[], gap: number, level: number, delay: number) {
    steps.forEach((s, i) => this.mallet(SCALE[s] ?? 880, level, 0.6, delay + i * gap));
  }

  private bell(delay: number) {
    for (const [f, l] of [[1318.51, 0.22], [1567.98, 0.18]] as const) {
      this.voice(f, "sine", l, 1.1, delay);
      this.voice(f * 2.76, "sine", l * 0.25, 0.5, delay);
    }
    for (const [f, l] of [[1318.51, 0.18], [1567.98, 0.15]] as const) this.voice(f, "sine", l, 0.9, delay + 0.22);
  }

  private noise(seconds: number): AudioBufferSourceNode {
    const { ctx } = this.context();
    const buf = ctx.createBuffer(1, Math.max(1, Math.floor(ctx.sampleRate * seconds)), ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    const src = ctx.createBufferSource();
    src.buffer = buf;
    return src;
  }

  /** A filtered noise burst through a band-pass: wood, paper, snare, depending on the band. */
  private burst(delay: number, seconds: number, band: number, q: number, level: number) {
    const { ctx, out } = this.context();
    const t = ctx.currentTime + delay;
    const src = this.noise(seconds);
    const f = ctx.createBiquadFilter();
    f.type = "bandpass";
    f.frequency.value = band;
    f.Q.value = q;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(level, t + 0.006);
    g.gain.exponentialRampToValueAtTime(0.0001, t + seconds);
    src.connect(f);
    f.connect(g);
    g.connect(out);
    src.start(t);
    src.stop(t + seconds + 0.02);
  }

  /** The printing-press stamp: a soft low thump with a papery slap on top. */
  private stamp(delay: number, level = 0.7) {
    const { ctx, out } = this.context();
    const t = ctx.currentTime + delay;
    const osc = ctx.createOscillator();
    osc.frequency.setValueAtTime(150, t);
    osc.frequency.exponentialRampToValueAtTime(55, t + 0.12);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(level, t + 0.005);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.18);
    osc.connect(g);
    g.connect(out);
    osc.start(t);
    osc.stop(t + 0.2);
    this.burst(delay, 0.06, 900, 0.8, level * 0.35);
  }

  private wood(band: number, level: number) {
    this.burst(0, 0.05, band, 6, level);
    this.voice(band / 2, "sine", level * 0.5, 0.06, 0);
  }

  private drumroll(delay: number, seconds: number) {
    const hits = Math.floor(seconds / 0.055);
    for (let i = 0; i < hits; i++) {
      const p = i / hits;
      this.burst(delay + i * 0.055, 0.07, 1700, 1.2, 0.05 + 0.2 * p * p);
    }
  }

  /** The answer lands: a deep thump, a bright chord and a short shimmer. */
  private hit(delay: number) {
    this.stamp(delay, 0.95);
    this.voice(65.41, "sine", 0.6, 0.7, delay);
    for (const s of [0, 2, 4, 7]) this.mallet(SCALE[s] ?? 523.25, 0.24, 1.2, delay + 0.01);
    this.burst(delay + 0.01, 0.9, 6500, 0.7, 0.05);
  }

  private timeUp() {
    // A soft two-note "time's up" on a triangle with a gentle attack (no click).
    this.voice(392.0, "triangle", 0.28, 0.35, 0.05, 0.012);
    this.voice(261.63, "triangle", 0.3, 0.5, 0.3, 0.012);
  }
}

let shared: TvAudio | null = null;
export function tvAudio(): TvAudio {
  shared ??= new TvAudio();
  return shared;
}
