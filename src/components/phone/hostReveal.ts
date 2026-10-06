import { revealSchedule } from "~/components/tv/tv-model";

export type RevealPhaseInput = {
  /** When this phone saw the result arrive; null when it opened after the reveal. */
  arrivedAt: number | null;
  now: number;
  guessCount: number;
  reducedMotion: boolean;
  /** The host chose "Skip reveal". */
  skipped: boolean;
};

export type RevealPhase = {
  /** hold: the TV has not shown the answer yet. settling: answer shown, standings still moving. */
  name: "hold" | "settling" | "settled";
  /** Milliseconds until the phase changes (0 when settled). */
  nextChangeMs: number;
  elapsedMs: number;
  totalMs: number;
};

/** Where the TV's staged reveal is, as far as the host's phone is concerned. */
export const revealPhase = ({ arrivedAt, now, guessCount, reducedMotion, skipped }: RevealPhaseInput): RevealPhase => {
  const schedule = revealSchedule(guessCount, reducedMotion);
  if (arrivedAt === null || skipped) {
    return { name: "settled", nextChangeMs: 0, elapsedMs: schedule.end, totalMs: schedule.end };
  }
  const elapsedMs = Math.max(0, now - arrivedAt);
  const progress = { elapsedMs: Math.min(elapsedMs, schedule.end), totalMs: schedule.end };
  if (elapsedMs < schedule.answer) {
    return { name: "hold", nextChangeMs: schedule.answer - elapsedMs, ...progress };
  }
  if (elapsedMs < schedule.end) {
    return { name: "settling", nextChangeMs: schedule.end - elapsedMs, ...progress };
  }
  return { name: "settled", nextChangeMs: 0, ...progress };
};
