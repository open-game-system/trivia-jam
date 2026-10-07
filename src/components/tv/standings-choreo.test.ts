import { describe, expect, it } from "vitest";
import { BOARD, boardFrame, boardTicks } from "./standings-choreo";
import { buildStandings } from "./tv-model";

// Join order: Sam, Mom, Grandpa, Lou.
const afterQ1 = buildStandings(
  [
    { id: "sam", name: "Sam", score: 2 },
    { id: "mom", name: "Mom", score: 4 },
    { id: "grandpa", name: "Grandpa", score: 0 },
    { id: "lou", name: "Lou", score: 3 },
  ],
  [
    { playerId: "sam", points: 2 },
    { playerId: "mom", points: 4 },
    { playerId: "lou", points: 3 },
  ],
);

const afterQ2 = buildStandings(
  [
    { id: "sam", name: "Sam", score: 6 },
    { id: "mom", name: "Mom", score: 6 },
    { id: "grandpa", name: "Grandpa", score: 2 },
    { id: "lou", name: "Lou", score: 4 },
  ],
  [
    { playerId: "sam", points: 2 },
    { playerId: "mom", points: 3 },
    { playerId: "lou", points: 4 },
  ],
);

type Frame = ReturnType<typeof boardFrame>;
const view = (f: Frame) => [...f.rows].sort((a, b) => a.slot - b.slot).map((r) => [r.id, r.shownScore, r.shownRank]);
const everyMs = (to: number) => Array.from({ length: Math.ceil(to / 25) + 1 }, (_, i) => i * 25);

describe("boardFrame: old board -> chips fly in and roll -> one reorder -> hold", () => {
  it("opens on the previous order, previous totals and previous ranks", () => {
    expect(view(boardFrame(afterQ2, 0))).toEqual([
      ["sam", 4, 1],
      ["mom", 3, 2],
      ["grandpa", 2, 3],
      ["lou", 0, 4],
    ]);
  });

  it("after question 1 (everyone level on 0) opens joint first in the order they will finish, so the reorder is a no-op", () => {
    const open = boardFrame(afterQ1, 0);
    expect(view(open)).toEqual([
      ["mom", 0, 1],
      ["lou", 0, 1],
      ["sam", 0, 1],
      ["grandpa", 0, 1],
    ]);
    const settled = boardFrame(afterQ1, BOARD.reorderAt);
    expect(settled.rows.map((r) => [r.id, r.slot])).toEqual(open.rows.map((r) => [r.id, r.slot]));
    expect(view(settled).map((r) => r[2])).toEqual([1, 2, 3, 4]);
  });

  it("always prints a rank numeral on every row (never a placeholder) and every slot is filled once", () => {
    for (const rows of [afterQ1, afterQ2]) {
      for (const t of everyMs(BOARD.upNextAt + 500)) {
        const f = boardFrame(rows, t);
        for (const r of f.rows) expect(Number.isInteger(r.shownRank) && r.shownRank >= 1).toBe(true);
        expect(f.rows.map((r) => r.slot).sort()).toEqual(rows.map((_, i) => i));
      }
    }
  });

  it("holds the rows and ranks still while the chips fly and the totals roll", () => {
    const open = view(boardFrame(afterQ2, 0));
    for (const t of everyMs(BOARD.reorderAt).filter((x) => x < BOARD.reorderAt)) {
      const f = view(boardFrame(afterQ2, t));
      expect(f.map((r) => [r[0], r[2]])).toEqual(open.map((r) => [r[0], r[2]]));
    }
  });

  it("shows the +N chips before the roll, flying while it runs, and none after", () => {
    expect(boardFrame(afterQ2, 0).chips).toBe("none");
    expect(boardFrame(afterQ2, BOARD.chipsAt).chips).toBe("shown");
    expect(boardFrame(afterQ2, BOARD.flyAt).chips).toBe("flying");
    expect(boardFrame(afterQ2, BOARD.reorderAt).chips).toBe("none");
  });

  it("rolls each total from its old value to its new one, never backwards", () => {
    const seen = new Map<string, number>();
    for (const t of everyMs(BOARD.reorderAt)) {
      for (const r of boardFrame(afterQ2, t).rows) {
        const before = seen.get(r.id) ?? r.prevScore;
        expect(r.shownScore).toBeGreaterThanOrEqual(before);
        expect(r.shownScore).toBeLessThanOrEqual(r.score);
        seen.set(r.id, r.shownScore);
      }
    }
    for (const r of boardFrame(afterQ2, BOARD.rollEnd).rows) expect(r.shownScore).toBe(r.score);
  });

  it("reorders once, ranks landing with the move, into the settled board", () => {
    expect(view(boardFrame(afterQ2, BOARD.reorderAt))).toEqual([
      ["sam", 6, 1],
      ["mom", 6, 1],
      ["lou", 4, 3],
      ["grandpa", 2, 4],
    ]);
    const slotsAfter = (t: number) => boardFrame(afterQ2, t).rows.map((r) => `${r.id}:${r.slot}:${r.shownRank}`).join();
    const changes = everyMs(BOARD.upNextAt + 500).filter((t, i, all) => i > 0 && slotsAfter(t) !== slotsAfter(all[i - 1]));
    expect(changes).toHaveLength(1);
  });

  it("holds the settled order at least 2 s, the leader pulsing, before the Up next card", () => {
    expect(BOARD.upNextAt - (BOARD.reorderAt + BOARD.reorderMs)).toBeGreaterThanOrEqual(2000);
    expect(boardFrame(afterQ2, BOARD.reorderAt + BOARD.reorderMs).leaderPulse).toBe(true);
    expect(boardFrame(afterQ2, BOARD.reorderAt - 1).leaderPulse).toBe(false);
    expect(boardFrame(afterQ2, BOARD.upNextAt - 1).upNext).toBe(false);
    expect(boardFrame(afterQ2, BOARD.upNextAt).upNext).toBe(true);
  });

  it("lands the reorder early in the beat (inside 2 s of the board appearing)", () => {
    expect(BOARD.reorderAt + BOARD.reorderMs).toBeLessThanOrEqual(2200);
  });

  it("shows the up/down pills only once the reorder has landed", () => {
    expect(boardFrame(afterQ2, BOARD.reorderAt - 1).movesShown).toBe(false);
    expect(boardFrame(afterQ2, BOARD.reorderAt + BOARD.reorderMs).movesShown).toBe(true);
  });

  it("a TV that loads late (not live) sees the settled board at once", () => {
    const f = boardFrame(afterQ2, Number.POSITIVE_INFINITY);
    expect(view(f)[0]).toEqual(["sam", 6, 1]);
    expect(f.upNext).toBe(true);
  });
});

describe("boardTicks", () => {
  it("lists every moment the frame changes, in order, ending at the Up next card", () => {
    const ticks = boardTicks(afterQ2);
    for (let i = 1; i < ticks.length; i++) expect(ticks[i]).toBeGreaterThan(ticks[i - 1]);
    expect(ticks).toContain(BOARD.chipsAt);
    expect(ticks).toContain(BOARD.reorderAt);
    expect(ticks.at(-1)).toBe(BOARD.upNextAt);
    // Between ticks the frame does not change.
    for (let i = 1; i < ticks.length; i++) {
      const a = JSON.stringify(boardFrame(afterQ2, ticks[i - 1]));
      const b = JSON.stringify(boardFrame(afterQ2, ticks[i] - 1));
      expect(b).toBe(a);
    }
  });
});
