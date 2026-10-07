/**
 * The TV's sound: produced music beds (ElevenLabs, public/audio/music) crossfaded in a loop, and
 * synthesized one-shots tuned to one pentatonic scale so every hit harmonises with every other.
 * Mallets and wood for the print-shop feel; nothing square-edged (square waves click at 20 kHz).
 */
import type { Bed, Cue } from "./cues";
import { finaleTakeoverMs } from "~/components/tv/finale-timeline";

const BED_URLS: Record<Bed, string> = {
  lobby: "/audio/music/lobby.m4a",
  think: "/audio/music/think.m4a",
  finale: "/audio/music/finale.m4a",
};
// Beds sit well under the moments: thinking ~4 dB under the lobby, so the reveal hit lands ~8 LU over it.
const BED_LEVEL: Record<Bed, number> = { lobby: 0.45, think: 0.4, finale: 0.67 };
/** The Trivia Jam motif (scale steps): the question bell states it, the finale fanfare answers it. */
const MOTIF = [0, 2, 4, 7, 4];
// The thinking bed steps key each question (whole-tone up, down, up a third…) so no two questions sound the same.
const THINK_RATES = [1, 1.1225, 0.8909, 1.2599, 0.9439];
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

  private context(): { ctx: Ctx; out: GainNode; beds: GainNode } {
    if (!this.ctx || !this.master || !this.sfx) {
      audioSessionPlayback();
      const ctx = new AudioContext({ latencyHint: "interactive" });
      // Glue compressor, then a fast brickwall-style limiter so stacked hits never clip (peaks < -1 dBFS).
      const comp = ctx.createDynamicsCompressor();
      comp.threshold.value = -16;
      comp.ratio.value = 3;
      comp.attack.value = 0.004;
      comp.release.value = 0.2;
      const limiter = ctx.createDynamicsCompressor();
      limiter.threshold.value = -4;
      limiter.knee.value = 0;
      limiter.ratio.value = 20;
      limiter.attack.value = 0.001;
      limiter.release.value = 0.08;
      const trim = ctx.createGain();
      trim.gain.value = 0.7;
      const master = ctx.createGain();
      master.gain.value = 0.9;
      // Sound effects sit ~2 LU over the music, not 6.
      const sfx = ctx.createGain();
      sfx.gain.value = 0.6;
      sfx.connect(master);
      master.connect(comp);
      comp.connect(limiter);
      limiter.connect(trim);
      trim.connect(ctx.destination);
      this.ctx = ctx;
      this.master = master;
      this.sfx = sfx;
      this.comp = trim;
    }
    return { ctx: this.ctx, out: this.sfx, beds: this.master };
  }
  private sfx: GainNode | null = null;
  /** The final output node (after the limiter): what the speakers and the recording tap hear. */
  private comp: AudioNode | null = null;

  private reducedMotion(): boolean {
    return typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;
  }

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
        // The TV's reveal scores itself to its own animation clock: see revealScore().
        return;
      case "gameOver": {
        // Scored to the TV finale: a soft stamp per podium block, a roll under the build, and the big
        // hit + fanfare exactly on the winner takeover (finale-timeline.ts).
        const takeover = finaleTakeoverMs(this.reducedMotion()) / 1000;
        this.stamp(takeover * 0.23, 0.5);
        this.stamp(takeover * 0.36, 0.55);
        this.stamp(takeover * 0.52, 0.6);
        this.drumroll(takeover * 0.68, takeover * 0.32);
        this.hit(takeover);
        this.arp(MOTIF.map((m) => m + 2), 0.11, 0.44, takeover + 0.15);
        this.arp([5, 7, 9], 0.0, 0.45, takeover + 0.9);
        return;
      }
    }
  }

  /**
   * The number-line reveal, in step with the TV's animation (src/components/tv/tv-model revealSchedule, ms):
   * a mallet per guess dropping in, a drumroll through the suspense, the answer hit, a fanfare on the
   * spotlight (brighter for an exact guess), and a counting run as points stamp on.
   */
  private finalReveal = false;
  /** The next reveal is the last question's: a longer, bigger build and a heavier hit. */
  setFinalReveal(final: boolean) {
    this.finalReveal = final;
  }

  revealScore(beats: { firstDrop: number; stagger: number; guesses: number; answer: number; spotlight: number; points: number; standings: number; exact: boolean }) {
    const at = (ms: number) => ms / 1000;
    for (let i = 0; i < beats.guesses; i++) {
      this.mallet(SCALE[Math.min(SCALE.length - 1, 2 + i)] ?? 880, 0.26, 0.35, at(beats.firstDrop + i * beats.stagger + 380));
      this.burst(at(beats.firstDrop + i * beats.stagger + 380), 0.05, 900, 0.8, 0.12);
    }
    const lastDrop = beats.firstDrop + Math.max(0, beats.guesses - 1) * beats.stagger + 500;
    // The drone starts at once, under the outgoing bed's fade, so results never land in a hole.
    this.drone(0, Math.max(0.5, at(beats.answer)));
    this.drumroll(at(lastDrop), Math.max(0.4, at(beats.answer - lastDrop)));
    if (this.finalReveal) {
      // Last question: a second, lower roll layer and a sub boom under the hit.
      this.drumroll(at(lastDrop) + 0.03, Math.max(0.4, at(beats.answer - lastDrop)));
      this.voice(41.2, "sine", 0.55, 1.4, at(beats.answer), 0.015);
    }
    this.hit(at(beats.answer));
    this.arp(beats.exact ? [4, 5, 7, 9] : [2, 4, 5], 0.1, 0.24, at(beats.spotlight));
    this.arp([5, 6, 7], 0.07, 0.16, at(beats.points));
    // No dead air after the answer: a warm chord holds under the spotlight, then the lobby groove comes
    // back for the standings (unless the next question or the finale has already taken over).
    this.pad(at(beats.answer) + 0.05, Math.max(2.4, at(beats.standings - beats.answer)));
    window.setTimeout(() => {
      if (this.wanted === null) this.setBed("lobby");
    }, Math.max(0, beats.standings - 600));
  }

  /** The last seconds of the timer: a soft woodblock, brighter on the final three. */
  tick(secondsLeft: number) {
    // The last five seconds climb: each tick higher and louder, with a pulse under the last three.
    const step = Math.max(0, 5 - secondsLeft);
    this.wood(1400 + step * 160, 0.26 + step * 0.05);
    if (secondsLeft <= 3 && secondsLeft > 0) this.voice(98 * (1 + step * 0.06), "sine", 0.22, 0.25, 0);
    if (secondsLeft === 0) this.timeUp();
  }
  private thinkCount = 0;

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
      old.gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 1.2);
      window.clearTimeout(old.timer);
      for (const s of old.sources) s.stop(ctx.currentTime + 1.3);
      this.bed = null;
    }
    if (!name) return;
    void this.load(name).then((buffer) => {
      if (!buffer || this.wanted !== name || this.bed) return;
      const { ctx, beds } = this.context();
      const rate = name === "think" ? (THINK_RATES[this.thinkCount++ % THINK_RATES.length] ?? 1) : 1;
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0, ctx.currentTime);
      if (name === "finale") {
        // The finale bed holds back under the podium build and swells into the winner takeover.
        const takeover = finaleTakeoverMs(this.reducedMotion()) / 1000;
        gain.gain.linearRampToValueAtTime(BED_LEVEL.finale * 0.4, ctx.currentTime + 1.2);
        gain.gain.setValueAtTime(BED_LEVEL.finale * 0.4, ctx.currentTime + Math.max(1.3, takeover - 0.6));
        gain.gain.linearRampToValueAtTime(BED_LEVEL.finale, ctx.currentTime + takeover + 0.2);
      } else gain.gain.linearRampToValueAtTime(BED_LEVEL[name], ctx.currentTime + 1.2);
      if (name === "think") {
        // The generated thinking bed is dull above ~5 kHz: lift the air a little.
        const shelf = ctx.createBiquadFilter();
        shelf.type = "highshelf";
        shelf.frequency.value = 4500;
        shelf.gain.value = 8;
        gain.connect(shelf);
        shelf.connect(beds);
      } else gain.connect(beds);
      const bed = { name, gain, timer: 0, sources: [] as AudioBufferSourceNode[] };
      this.bed = bed;
      // Each copy fades in over XFADE while the previous one fades out: no seam, no silent dip.
      const schedule = (at: number, first: boolean) => {
        if (this.bed !== bed) return;
        const src = ctx.createBufferSource();
        src.buffer = buffer;
        src.playbackRate.value = rate;
        const env = ctx.createGain();
        env.gain.setValueAtTime(first ? 1 : 0, at);
        if (!first) env.gain.linearRampToValueAtTime(1, at + XFADE);
        const end = at + buffer.duration / rate;
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

  /** The question bell: the Trivia Jam motif on bright mallets, with a soft shimmer. */
  private bell(delay: number) {
    MOTIF.forEach((step, k) => this.mallet((SCALE[step + 3] ?? 1046.5), 0.22, 0.5, delay + k * 0.085));
    this.voice(1567.98 * 2.76, "sine", 0.03, 0.6, delay + 0.34);
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

  /** A snare roll: band-limited noise (no fizz above ~6 kHz), 18 strokes a second, rising into the answer. */
  private drumroll(delay: number, seconds: number) {
    const { ctx, out } = this.context();
    const hits = Math.floor(seconds * 18);
    const lp = ctx.createBiquadFilter();
    lp.type = "lowpass";
    lp.frequency.value = 5500;
    lp.connect(out);
    for (let i = 0; i < hits; i++) {
      const p = i / hits;
      const t = ctx.currentTime + delay + i / 18;
      const src = this.noise(0.06);
      const bp = ctx.createBiquadFilter();
      bp.type = "bandpass";
      bp.frequency.value = 1300 + 500 * p;
      bp.Q.value = 1.6;
      const g = ctx.createGain();
      const level = (0.12 + 0.24 * p * p) * (i % 2 ? 0.8 : 1);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(level, t + 0.004);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.055);
      src.connect(bp);
      bp.connect(g);
      g.connect(lp);
      src.start(t);
      src.stop(t + 0.07);
    }
  }

  /** The answer lands: a deep thump, a bright chord and a short shimmer. */
  private hit(delay: number) {
    this.stamp(delay, 0.7);
    this.voice(65.41, "sine", 0.42, 0.7, delay, 0.012);
    for (const s of [0, 2, 4, 7]) this.mallet(SCALE[s] ?? 523.25, 0.24, 1.2, delay + 0.01);
    this.burst(delay + 0.01, 0.9, 6500, 0.7, 0.05);
  }

  /** Suspense under the guesses: a low fifth whose tremolo speeds up and swells into the answer. */
  private drone(delay: number, seconds: number) {
    const { ctx, out } = this.context();
    const t = ctx.currentTime + delay;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.12, t + seconds * 0.6);
    g.gain.exponentialRampToValueAtTime(0.2, t + seconds);
    g.gain.exponentialRampToValueAtTime(0.0001, t + seconds + 0.08);
    const trem = ctx.createGain();
    trem.gain.value = 0.6;
    const lfo = ctx.createOscillator();
    lfo.frequency.setValueAtTime(3, t);
    lfo.frequency.linearRampToValueAtTime(11, t + seconds);
    const depth = ctx.createGain();
    depth.gain.value = 0.4;
    lfo.connect(depth);
    depth.connect(trem.gain);
    for (const f of [65.41, 98.0, 130.81]) {
      const osc = ctx.createOscillator();
      osc.type = "triangle";
      osc.frequency.setValueAtTime(f, t);
      osc.frequency.linearRampToValueAtTime(f * 1.06, t + seconds);
      osc.connect(trem);
      osc.start(t);
      osc.stop(t + seconds + 0.1);
    }
    trem.connect(g);
    g.connect(out);
    lfo.start(t);
    lfo.stop(t + seconds + 0.1);
  }

  /** A soft sustained chord (C major add 9) with a slow swell, under a settled moment. */
  private pad(delay: number, seconds: number) {
    for (const f of [261.63, 329.63, 392.0, 587.33]) {
      const { ctx, out } = this.context();
      const t = ctx.currentTime + delay;
      const osc = ctx.createOscillator();
      osc.type = "triangle";
      osc.frequency.setValueAtTime(f, t);
      const lp = ctx.createBiquadFilter();
      lp.type = "lowpass";
      lp.frequency.value = 1800;
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.linearRampToValueAtTime(0.085, t + 0.25);
      g.gain.setValueAtTime(0.085, t + Math.max(0.7, seconds - 0.8));
      g.gain.linearRampToValueAtTime(0.0001, t + seconds);
      osc.connect(lp);
      lp.connect(g);
      g.connect(out);
      osc.start(t);
      osc.stop(t + seconds + 0.05);
    }
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
