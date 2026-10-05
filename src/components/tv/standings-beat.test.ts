import { describe, expect, it } from "vitest";
import { standingsBeat } from "./standings-beat";
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

const view = (rows: ReturnType<typeof standingsBeat>) => rows.map((r) => [r.id, r.shownScore, r.shownRank, r.slot]);

describe("standingsBeat: open on the old board, roll, reorder once, hold", () => {
  it("after question 1 opens with everyone on 0 in join order, a tie with no rank numerals", () => {
    expect(view(standingsBeat(afterQ1, { progress: 0, settled: false }))).toEqual([
      ["sam", 0, null, 0],
      ["mom", 0, null, 1],
      ["grandpa", 0, null, 2],
      ["lou", 0, null, 3],
    ]);
  });

  it("opens on the previous totals in the previous order, with the previous ranks", () => {
    expect(view(standingsBeat(afterQ2, { progress: 0, settled: false }))).toEqual([
      ["sam", 4, 1, 0],
      ["mom", 3, 2, 1],
      ["grandpa", 2, 3, 2],
      ["lou", 0, 4, 3],
    ]);
  });

  it("rolls the totals without moving any row, and hides the ranks while they are in flux", () => {
    const half = standingsBeat(afterQ2, { progress: 0.5, settled: false });
    expect(view(half)).toEqual([
      ["sam", 5, null, 0],
      ["mom", 5, null, 1],
      ["grandpa", 2, null, 2],
      ["lou", 2, null, 3],
    ]);
    const rolled = standingsBeat(afterQ2, { progress: 1, settled: false });
    expect(rolled.map((r) => r.id)).toEqual(["sam", "mom", "grandpa", "lou"]);
    expect(rolled.map((r) => r.shownScore)).toEqual([6, 6, 2, 4]);
  });

  it("reorders once when settled: new totals, sorted, with true ranks", () => {
    expect(view(standingsBeat(afterQ2, { progress: 1, settled: true }))).toEqual([
      ["sam", 6, 1, 0],
      ["mom", 6, 1, 1],
      ["lou", 4, 3, 2],
      ["grandpa", 2, 4, 3],
    ]);
  });

  it("settled always shows the final totals, whatever the progress", () => {
    expect(standingsBeat(afterQ1, { progress: 0, settled: true }).map((r) => [r.id, r.shownScore, r.shownRank])).toEqual([
      ["mom", 4, 1],
      ["lou", 3, 2],
      ["sam", 2, 3],
      ["grandpa", 0, 4],
    ]);
  });

  it("keeps the moves since the last question on the settled rows", () => {
    const moved = Object.fromEntries(standingsBeat(afterQ2, { progress: 1, settled: true }).map((r) => [r.id, r.move]));
    expect(moved).toEqual({ sam: 0, mom: 1, lou: 1, grandpa: -1 });
  });
});
