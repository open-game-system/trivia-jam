import { describe, expect, it } from "vitest";
import { countTicks, standingsFrame } from "./standings-frame";
import { buildStandings, type StandingRow } from "./tv-model";

const players = [
  { id: "sam", name: "Sam", score: 3 },
  { id: "mom", name: "Mom", score: 4 },
  { id: "grandpa", name: "Grandpa", score: 2 },
];
const afterQ1 = buildStandings(players, [
  { playerId: "sam", points: 3 },
  { playerId: "mom", points: 4 },
  { playerId: "grandpa", points: 2 },
]);

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

/** Every frame: rows sorted by the score on screen, and each rank numeral is that score's competition rank. */
const expectConsistent = (rows: StandingRow[], progress: number) => {
  const frame = standingsFrame(rows, progress);
  expect(frame).toHaveLength(rows.length);
  for (let i = 1; i < frame.length; i++) expect(frame[i - 1].shownScore).toBeGreaterThanOrEqual(frame[i].shownScore);
  for (const r of frame) expect(r.shownRank).toBe(1 + frame.filter((o) => o.shownScore > r.shownScore).length);
  frame.forEach((r, i) => expect(r.slot).toBe(i));
};

describe("standingsFrame", () => {
  it("starts on the old scores in the old order", () => {
    const frame = standingsFrame(afterQ2, 0);
    expect(frame.map((r) => [r.id, r.shownScore, r.shownRank])).toEqual([
      ["sam", 4, 1],
      ["mom", 3, 2],
      ["grandpa", 2, 3],
      ["lou", 0, 4],
    ]);
  });

  it("ends on the new scores, sorted, with true ranks", () => {
    const frame = standingsFrame(afterQ2, 1);
    expect(frame.map((r) => [r.id, r.shownScore, r.shownRank])).toEqual([
      ["sam", 6, 1],
      ["mom", 6, 1],
      ["lou", 4, 3],
      ["grandpa", 2, 4],
    ]);
  });

  it("never shows ranks that disagree with the scores on screen, at any frame", () => {
    for (let p = 0; p <= 1.0001; p += 0.05) {
      expectConsistent(afterQ2, p);
      expectConsistent(afterQ1, p);
    }
  });

  it("never shows 1/1/1 over unequal scores (the round-02 10f frame)", () => {
    for (let p = 0; p <= 1.0001; p += 0.05) {
      const frame = standingsFrame(afterQ1, p);
      const allFirst = frame.every((r) => r.shownRank === 1);
      if (allFirst) expect(new Set(frame.map((r) => r.shownScore)).size).toBe(1);
    }
    expect(standingsFrame(afterQ1, 1).map((r) => [r.name, r.shownRank])).toEqual([
      ["Mom", 1],
      ["Sam", 2],
      ["Grandpa", 3],
    ]);
  });

  it("clamps progress outside 0..1", () => {
    expect(standingsFrame(afterQ2, -1).map((r) => r.shownScore)).toEqual(standingsFrame(afterQ2, 0).map((r) => r.shownScore));
    expect(standingsFrame(afterQ2, 3).map((r) => r.shownScore)).toEqual(standingsFrame(afterQ2, 1).map((r) => r.shownScore));
  });

  it("marks the rows that changed place since the last question", () => {
    const moved = Object.fromEntries(standingsFrame(afterQ2, 1).map((r) => [r.id, r.move]));
    expect(moved).toEqual({ sam: 0, mom: 1, lou: 1, grandpa: -1 });
    // After question 1 nobody had an order yet: no arrows.
    expect(standingsFrame(afterQ1, 1).every((r) => r.move === 0)).toBe(true);
  });
});

describe("countTicks", () => {
  it("one tick per point of the biggest gain, capped, ending on 1", () => {
    expect(countTicks(afterQ2)).toEqual([0.25, 0.5, 0.75, 1]);
    expect(countTicks([])).toEqual([1]);
    const big = afterQ2.map((r) => ({ ...r, gained: 500 }));
    expect(countTicks(big).length).toBeLessThanOrEqual(24);
    expect(countTicks(big).at(-1)).toBe(1);
  });
});
