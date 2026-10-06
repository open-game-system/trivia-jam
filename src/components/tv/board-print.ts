/**
 * What each standings row prints in a frame. After question 1 the whole room is level on 0: the
 * model's opening frame (joint first, all zeros) is true but reads as a bug on a TV ("1 1 1 / 0 0 0").
 * So on a level start the rows open on names only: no rank until the reorder lands the real ones, and
 * a total only once it has rolled off zero. Otherwise the frame prints as it is.
 */
import { BOARD, type BoardFrame } from "./standings-choreo";
import type { StandingRow } from "./tv-model";

export type PrintedRow = { id: string; rank: number | null; score: number | null };

export const isLevelStart = (rows: ReadonlyArray<StandingRow>): boolean => new Set(rows.map((r) => r.prevScore)).size <= 1;

export const boardPrint = (rows: ReadonlyArray<StandingRow>, frame: BoardFrame, t: number): PrintedRow[] => {
  const opening = isLevelStart(rows) && t < BOARD.reorderAt;
  return frame.rows.map((r) => ({
    id: r.id,
    rank: opening ? null : r.shownRank,
    score: opening && r.shownScore === r.prevScore ? null : r.shownScore,
  }));
};
