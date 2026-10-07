import { describe, expect, it } from "vitest";
import { boardPrint } from "./board-print";
import { BOARD, boardFrame } from "./standings-choreo";
import { buildStandings } from "./tv-model";

const q1 = buildStandings(
  [
    { id: "a", name: "A", score: 4 },
    { id: "b", name: "B", score: 3 },
    { id: "c", name: "C", score: 0 },
  ],
  [
    { playerId: "a", points: 4 },
    { playerId: "b", points: 3 },
  ],
);
const q2 = buildStandings(
  [
    { id: "a", name: "A", score: 6 },
    { id: "b", name: "B", score: 7 },
  ],
  [
    { playerId: "a", points: 2 },
    { playerId: "b", points: 4 },
  ],
);
const everyMs = (to: number) => Array.from({ length: Math.ceil(to / 25) + 1 }, (_, i) => i * 25);

describe("boardPrint: what the rows print", () => {
  it("after question 1 never prints a row of joint-first zeros: no rank until the reorder, no total until it rolls off zero", () => {
    for (const t of everyMs(BOARD.upNextAt)) {
      const f = boardFrame(q1, t);
      const printed = boardPrint(q1, f, t);
      const zeros = printed.filter((p) => p.score === 0 && p.rank === 1);
      if (t < BOARD.reorderAt) expect(zeros).toHaveLength(0);
      for (const p of printed) if (t < BOARD.reorderAt) expect(p.rank).toBeNull();
    }
  });
  it("after question 1 prints true ranks and totals once the rows have reordered", () => {
    const f = boardFrame(q1, BOARD.reorderAt);
    expect(boardPrint(q1, f, BOARD.reorderAt).map((p) => [p.id, p.rank, p.score])).toEqual([
      ["a", 1, 4],
      ["b", 2, 3],
      ["c", 3, 0],
    ]);
  });
  it("shows a rolling total on question 1 as soon as it leaves zero", () => {
    const t = BOARD.rollEnd;
    const p = boardPrint(q1, boardFrame(q1, t), t).find((r) => r.id === "a");
    expect(p?.score).toBe(4);
  });
  it("prints the frame unchanged when the room was not level", () => {
    for (const t of [0, BOARD.flyAt, BOARD.reorderAt]) {
      const f = boardFrame(q2, t);
      expect(boardPrint(q2, f, t).map((p) => [p.id, p.rank, p.score])).toEqual(f.rows.map((r) => [r.id, r.shownRank, r.shownScore]));
    }
  });
});
