/**
 * The standings board as one choreographed beat, frame by frame. Pure: given the standings and the
 * milliseconds since the board appeared, what the board shows.
 *
 *   0          rows in the PREVIOUS order with previous totals and previous ranks (level start: joint 1st,
 *              in the order they will finish, so the reorder is a no-op)
 *   chipsAt    each "+N" chip pops beside its total
 *   flyAt      the chips fly into the totals, which roll up (rows and ranks held still)
 *   reorderAt  ONE reorder (a 450 ms slide); the rank numerals change with it
 *   + reorderMs the move pills land and the leader starts a slow pulse; the settled board holds >= 2 s
 *   upNextAt   the "Up next" card
 *
 * Every frame prints a rank numeral on every row: no placeholders, no gaps.
 */
import type { StandingRow } from "./tv-model";

export const BOARD = {
  chipsAt: 300,
  flyAt: 800,
  rollMs: 800,
  rollEnd: 1600,
  reorderAt: 1700,
  reorderMs: 450,
  upNextAt: 4150,
} as const;

const MAX_TICKS = 24;

export type BoardChips = "none" | "shown" | "flying";

export type BoardRowFrame = StandingRow & {
  /** Position on the board, top first. */
  slot: number;
  shownScore: number;
  shownRank: number;
  /** Places climbed (+) or dropped (-) since the last question; 0 on a level start. */
  move: number;
};

export type BoardFrame = {
  rows: BoardRowFrame[];
  chips: BoardChips;
  movesShown: boolean;
  leaderPulse: boolean;
  upNext: boolean;
};

const rollTicks = (rows: ReadonlyArray<StandingRow>): Array<{ at: number; progress: number }> => {
  const biggest = Math.max(0, ...rows.map((r) => Math.abs(r.gained)));
  const n = Math.max(1, Math.min(MAX_TICKS, biggest));
  // Quick at first, slowing into the final totals; the last tick lands exactly at rollEnd.
  return Array.from({ length: n }, (_, i) => ({
    at: Math.round(BOARD.flyAt + 120 + (BOARD.rollMs - 120) * Math.pow((i + 1) / n, 1.5)),
    progress: (i + 1) / n,
  }));
};

const rollProgress = (rows: ReadonlyArray<StandingRow>, t: number): number => {
  let p = 0;
  for (const tick of rollTicks(rows)) if (t >= tick.at) p = tick.progress;
  return p;
};

const openingOrder = (rows: ReadonlyArray<StandingRow>) =>
  [...rows].sort((a, b) => b.prevScore - a.prevScore || b.score - a.score || a.inkIndex - b.inkIndex);

const settledOrder = (rows: ReadonlyArray<StandingRow>) =>
  [...rows].sort((a, b) => b.score - a.score || b.prevScore - a.prevScore || a.inkIndex - b.inkIndex);

export const boardFrame = (rows: ReadonlyArray<StandingRow>, t: number): BoardFrame => {
  const reordered = t >= BOARD.reorderAt;
  const level = new Set(rows.map((r) => r.prevScore)).size <= 1;
  const order = reordered ? settledOrder(rows) : openingOrder(rows);
  const p = reordered ? 1 : rollProgress(rows, t);
  const landed = t >= BOARD.reorderAt + BOARD.reorderMs;
  const framed = order.map((r, slot) => ({
    ...r,
    slot,
    shownScore: p >= 1 ? r.score : r.prevScore + Math.round(r.gained * p),
    shownRank: reordered ? r.rank : r.prevRank,
    move: level ? 0 : r.prevRank - r.rank,
  }));
  // Rows keep their identity order (as built) so React keys never shuffle; `slot` says where each sits.
  const byId = new Map(framed.map((r) => [r.id, r]));
  const out = rows.flatMap((r) => {
    const f = byId.get(r.id);
    return f ? [f] : [];
  });
  const chips: BoardChips = t < BOARD.chipsAt || reordered ? "none" : t < BOARD.flyAt ? "shown" : "flying";
  const leaderScore = Math.max(0, ...rows.map((r) => r.score));
  return { rows: out, chips, movesShown: landed, leaderPulse: landed && leaderScore > 0, upNext: t >= BOARD.upNextAt };
};

/** Every moment the board's frame changes, in order (for timers). */
export const boardTicks = (rows: ReadonlyArray<StandingRow>): number[] => {
  const all = [BOARD.chipsAt, BOARD.flyAt, ...rollTicks(rows).map((x) => x.at), BOARD.reorderAt, BOARD.reorderAt + BOARD.reorderMs, BOARD.upNextAt];
  return [...new Set(all)].sort((a, b) => a - b);
};
