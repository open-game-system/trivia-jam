/**
 * One frame of the standings count-up. Pure: given the standings and how far the
 * count has run (0..1), what each row shows, in what order, with what rank. The
 * order and the rank numerals always follow the scores on screen, so a frame can
 * never show "1 / 1 / 1" over unequal scores.
 */
import { rankMove, type StandingRow } from "./tv-model";

export type FrameRow = StandingRow & {
  /** The score printed on the row in this frame. */
  shownScore: number;
  /** Competition rank of `shownScore` among the scores on screen. */
  shownRank: number;
  /** Position on the board, top first. */
  slot: number;
  /** Places climbed (+) or dropped (-) since the last question; 0 when nobody had an order yet. */
  move: number;
};

const MAX_TICKS = 24;

export const standingsFrame = (rows: ReadonlyArray<StandingRow>, progress: number): FrameRow[] => {
  const p = Math.min(1, Math.max(0, progress));
  const all = [...rows];
  const shown = all.map((r) => ({ row: r, shownScore: p >= 1 ? r.score : r.prevScore + Math.round(r.gained * p) }));
  const ordered = shown.sort(
    (a, b) => b.shownScore - a.shownScore || b.row.prevScore - a.row.prevScore || a.row.inkIndex - b.row.inkIndex,
  );
  return ordered.map((s, slot) => ({
    ...s.row,
    shownScore: s.shownScore,
    shownRank: 1 + ordered.filter((o) => o.shownScore > s.shownScore).length,
    slot,
    move: rankMove(s.row, all),
  }));
};

/** The progress values the counter ticks through: one tick per point of the biggest gain (capped), ending on 1. */
export const countTicks = (rows: ReadonlyArray<StandingRow>): number[] => {
  const biggest = Math.max(0, ...rows.map((r) => Math.abs(r.gained)));
  const n = Math.max(1, Math.min(MAX_TICKS, biggest));
  return Array.from({ length: n }, (_, i) => (i + 1) / n);
};
