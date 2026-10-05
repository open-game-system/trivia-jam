/**
 * The standings as one beat. Pure: the board opens on the PREVIOUS order and totals, the totals roll
 * with the rows held still (no rank numerals while the scores are in flux), then the rows reorder once,
 * into the settled board with true ranks. A tie at the start (after question 1, everyone on 0) shows
 * no rank numerals at all.
 */
import { type FrameRow, standingsFrame } from "./standings-frame";
import type { StandingRow } from "./tv-model";

export type BeatRow = Omit<FrameRow, "shownRank"> & {
  /** Rank numeral to print, or null for "—" (a level start, or scores still rolling). */
  shownRank: number | null;
};

export const standingsBeat = (rows: ReadonlyArray<StandingRow>, at: { progress: number; settled: boolean }): BeatRow[] => {
  if (at.settled) return standingsFrame(rows, 1);
  const p = Math.min(1, Math.max(0, at.progress));
  const opening = standingsFrame(rows, 0);
  const level = new Set(rows.map((r) => r.prevScore)).size <= 1;
  return opening.map((r) => ({
    ...r,
    shownScore: p >= 1 ? r.score : r.prevScore + Math.round(r.gained * p),
    shownRank: p === 0 && !level ? r.shownRank : null,
  }));
};
