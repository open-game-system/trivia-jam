import { describe, expect, it } from "vitest";
import { type LineGuess, type LineLayout, layoutNumberLine, packRow, REVEAL_FRAME, sweepStops } from "./number-line-layout";

const FRAME = REVEAL_FRAME;

const guess = (playerId: string, value: number, extra: Partial<LineGuess> = {}): LineGuess => ({
  playerId,
  name: playerId,
  value,
  inkIndex: 0,
  points: 0,
  highlight: undefined,
  ...extra,
});

const overlapsInLane = (layout: LineLayout): boolean =>
  layout.groups.some((a) =>
    layout.groups.some(
      (b) => a !== b && a.lane === b.lane && Math.abs(a.x - b.x) < (a.width + b.width) / 2,
    ),
  );

describe("packRow", () => {
  it("leaves items that already fit where they want to be", () => {
    expect(packRow([{ want: 100, width: 50 }, { want: 400, width: 50 }], 0, 1000, 10)).toEqual([100, 400]);
  });
  it("pushes two colliding items apart symmetrically around their wish", () => {
    const [a, b] = packRow([{ want: 500, width: 100 }, { want: 500, width: 100 }], 0, 1000, 20);
    expect(b - a).toBe(120);
    expect((a + b) / 2).toBe(500);
  });
  it("moves light items, not heavy ones, when they collide", () => {
    const [a, b] = packRow([{ want: 500, width: 100 }, { want: 520, width: 100, weight: 25 }], 0, 1000, 20);
    expect(Math.abs(b - 520)).toBeLessThan(10);
    expect(b - a).toBe(120);
  });
  it("keeps items inside the bounds", () => {
    const [a] = packRow([{ want: 10, width: 100 }], 0, 1000, 10);
    expect(a).toBe(50);
    const [b] = packRow([{ want: 990, width: 100 }], 0, 1000, 10);
    expect(b).toBe(950);
  });
});

describe("layoutNumberLine", () => {
  it("collapses identical guesses into one labelled group", () => {
    const layout = layoutNumberLine([guess("sam", 8), guess("mom", 8), guess("grandpa", 6)], 8, FRAME);
    expect(layout.groups).toHaveLength(2);
    const eight = layout.groups.find((g) => g.value === 8);
    expect(eight?.members.map((m) => m.playerId)).toEqual(["sam", "mom"]);
  });

  it("draws an out-of-range guess as an edge tab with its true value, inside the frame", () => {
    const layout = layoutNumberLine([guess("mom", 60), guess("grandpa", 60), guess("sam", 100)], 60, FRAME);
    const sam = layout.groups.find((g) => g.members[0]?.playerId === "sam");
    expect(sam?.value).toBe(100);
    expect(sam?.offScale).toBe("right");
    expect(layout.axis.max).toBeLessThan(100);
    expect((sam?.x ?? 0) + (sam?.width ?? 0) / 2).toBeLessThanOrEqual(FRAME.right);
    expect(sam?.axisX).toBeGreaterThan(layout.axisRight);
  });

  it("puts an off-scale low guess on the left edge", () => {
    const layout = layoutNumberLine([guess("a", 1000), guess("b", 1010), guess("c", 1005), guess("d", 1)], 1004, FRAME);
    const d = layout.groups.find((g) => g.value === 1);
    expect(d?.offScale).toBe("left");
    expect((d?.x ?? 0) - (d?.width ?? 0) / 2).toBeGreaterThanOrEqual(FRAME.left);
    expect(d?.axisX).toBeLessThan(layout.axisLeft);
  });

  it("never overlaps labels in a lane, even in a crowded room", () => {
    const crowd = [30, 28, 14, 27, 29, 26, 31, 100, 27, 25].map((v, i) => guess(`p${i}-long-name`, v));
    const layout = layoutNumberLine(crowd, 27, FRAME);
    expect(overlapsInLane(layout)).toBe(false);
    for (const g of layout.groups) {
      expect(g.x - g.width / 2).toBeGreaterThanOrEqual(FRAME.left - 0.5);
      expect(g.x + g.width / 2).toBeLessThanOrEqual(FRAME.right + 0.5);
      expect(g.bottom - g.height).toBeGreaterThanOrEqual(FRAME.top - 0.5);
    }
  });

  it("keeps the type big enough for a couch", () => {
    const crowd = [30, 28, 14, 27, 29, 26, 31, 100, 27, 25].map((v, i) => guess(`p${i}`, v));
    for (const layout of [layoutNumberLine(crowd, 27, FRAME), layoutNumberLine([guess("a", 3)], 3, FRAME)]) {
      expect(layout.size.value).toBeGreaterThanOrEqual(56);
      expect(layout.size.name).toBeGreaterThanOrEqual(40);
    }
  });

  it("uses most of the frame's width for the line", () => {
    const layout = layoutNumberLine([guess("a", 6), guess("b", 8)], 8, FRAME);
    expect(layout.axisRight - layout.axisLeft).toBeGreaterThanOrEqual(0.75 * (FRAME.right - FRAME.left));
  });

  it("keeps the spotlit group on its value in a crowded room", () => {
    const crowd = [30, 28, 14, 27, 29, 26, 31, 100, 27, 25].map((v, i) =>
      guess(`p${i}-name`, v, { highlight: v === 27 ? "exact" : undefined, points: 2 }),
    );
    const layout = layoutNumberLine(crowd, 27, FRAME);
    const lit = layout.groups.find((g) => g.value === 27);
    expect(Math.abs((lit?.x ?? 0) - (lit?.axisX ?? 0))).toBeLessThan(40);
  });

  it("gives the spotlit group the lane nearest the line", () => {
    const layout = layoutNumberLine(
      [guess("a", 26), guess("b", 27, { highlight: "exact" }), guess("c", 28), guess("d", 27.5)],
      27,
      FRAME,
    );
    expect(layout.groups.find((g) => g.value === 27)?.lane).toBe(0);
  });

  it("places groups at their value on the line when there is room", () => {
    const layout = layoutNumberLine([guess("a", 2), guess("b", 8)], 5, FRAME);
    for (const g of layout.groups) expect(g.x).toBeCloseTo(g.axisX, 5);
    expect(layout.groups.every((g) => g.lane === 0)).toBe(true);
  });

  it("maps the answer onto the line", () => {
    const layout = layoutNumberLine([guess("a", 2), guess("b", 8)], 5, FRAME);
    expect(layout.correctX).toBeGreaterThan(layout.axisLeft);
    expect(layout.correctX).toBeLessThan(layout.axisRight);
  });

  it("marks the group as highlighted when any member is", () => {
    const layout = layoutNumberLine([guess("a", 8, { highlight: "exact" }), guess("b", 8)], 8, FRAME);
    expect(layout.groups[0]?.highlight).toBe("exact");
  });

  it("handles nobody guessing", () => {
    const layout = layoutNumberLine([], 8, FRAME);
    expect(layout.groups).toEqual([]);
    expect(layout.ticks.length).toBeGreaterThan(1);
  });
});

describe("sweepStops", () => {
  it("visits every guess, outside in, and ends on a guess (never on the hidden answer)", () => {
    const stops = sweepStops([400, 1200, 800]);
    expect(stops).toEqual(expect.arrayContaining([400, 800, 1200]));
    expect(stops[0]).toBe(400);
    expect(stops[1]).toBe(1200);
    expect(stops[stops.length - 1]).toBe(800);
  });
  it("still swings when everyone guessed the same", () => {
    const stops = sweepStops([900, 900]);
    expect(stops.length).toBeGreaterThanOrEqual(4);
    expect(new Set(stops).size).toBeGreaterThan(1);
    expect(stops[stops.length - 1]).toBe(900);
  });
  it("swings across the middle of the line with no guesses", () => {
    expect(sweepStops([]).length).toBeGreaterThanOrEqual(4);
  });
});
