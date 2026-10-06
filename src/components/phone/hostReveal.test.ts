import { describe, expect, it } from "vitest";
import { revealSchedule } from "~/components/tv/tv-model";
import { revealPhase } from "./hostReveal";

const base = { guessCount: 3, reducedMotion: false, skipped: false };
const at = revealSchedule(3, false);

describe("revealPhase", () => {
  it("holds the answer until the TV lands it", () => {
    const phase = revealPhase({ ...base, arrivedAt: 1000, now: 1000 + at.answer - 1 });
    expect(phase.name).toBe("hold");
    expect(phase.nextChangeMs).toBe(1);
  });

  it("shows the answer once it has landed, but keeps Next locked until the standings settle", () => {
    const phase = revealPhase({ ...base, arrivedAt: 1000, now: 1000 + at.answer });
    expect(phase.name).toBe("settling");
    expect(phase.nextChangeMs).toBe(at.end - at.answer);
  });

  it("settles at the end of the reveal", () => {
    const phase = revealPhase({ ...base, arrivedAt: 1000, now: 1000 + at.end });
    expect(phase).toEqual({ name: "settled", nextChangeMs: 0, elapsedMs: at.end, totalMs: at.end });
  });

  it("does not hold a host that arrived after the fact", () => {
    expect(revealPhase({ ...base, arrivedAt: null, now: 5 }).name).toBe("settled");
  });

  it("lets the host skip the reveal", () => {
    expect(revealPhase({ ...base, arrivedAt: 1000, now: 1001, skipped: true }).name).toBe("settled");
  });

  it("reports progress for the strip", () => {
    const phase = revealPhase({ ...base, arrivedAt: 1000, now: 1500 });
    expect(phase.elapsedMs).toBe(500);
    expect(phase.totalMs).toBe(at.end);
  });

  it("is twice as quick with reduced motion", () => {
    const quick = revealSchedule(3, true);
    expect(revealPhase({ ...base, reducedMotion: true, arrivedAt: 0, now: quick.end }).name).toBe("settled");
    expect(revealPhase({ ...base, reducedMotion: true, arrivedAt: 0, now: quick.end - 1 }).name).toBe("settling");
  });
});
