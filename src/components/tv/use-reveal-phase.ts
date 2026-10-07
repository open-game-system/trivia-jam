import { useEffect, useState } from "react";
import type { RevealSchedule } from "./tv-model";

/** Beats of the reveal, in order. */
export const PHASE = {
  axis: 0,
  drops: 1,
  suspense: 2,
  answer: 3,
  spotlight: 4,
  points: 5,
  standings: 6,
  done: 7,
} as const;

/**
 * Steps through the reveal beats on a client-side clock. A TV that joins (or
 * refreshes) after the results arrived is not `live`: it starts on the last beat.
 */
export const useRevealPhase = (live: boolean, schedule: RevealSchedule, guessCount: number): number => {
  const [phase, setPhase] = useState<number>(live ? PHASE.axis : PHASE.done);
  const lastDropEnd = schedule.firstDrop + Math.max(0, guessCount - 1) * schedule.stagger + schedule.dropDuration;
  useEffect(() => {
    if (!live) return;
    const beats: Array<[number, number]> = [
      [schedule.firstDrop, PHASE.drops],
      [lastDropEnd, PHASE.suspense],
      [schedule.answer, PHASE.answer],
      [schedule.spotlight, PHASE.spotlight],
      [schedule.points, PHASE.points],
      [schedule.standings, PHASE.standings],
      [schedule.end, PHASE.done],
    ];
    const timers = beats.map(([at, beat]) => setTimeout(() => setPhase(beat), at));
    return () => timers.forEach(clearTimeout);
  }, [live, schedule.firstDrop, schedule.answer, schedule.spotlight, schedule.points, schedule.standings, schedule.end, lastDropEnd]);
  return phase;
};
