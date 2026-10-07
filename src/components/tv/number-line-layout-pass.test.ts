import { describe, expect, it } from "vitest";
import { FLAG, type LineGuess, layoutNumberLine, PIN_ZONE, REVEAL_FRAME, speedWinner, STEM_MIN, stampText } from "./number-line-layout";

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

describe("number line: chips anchored to their values", () => {
  it("puts an off-scale guess's chip on its edge flag, not somewhere on the scale (round-02 14d)", () => {
    const layout = layoutNumberLine([guess("Mom", 60, { points: 4 }), guess("Grandpa", 60, { points: 3 }), guess("Sam", 100, { points: 2 })], 60, FRAME);
    const sam = layout.groups.find((g) => g.value === 100);
    expect(sam?.offScale).toBe("right");
    expect(Math.abs((sam?.x ?? 0) - (sam?.axisX ?? 0))).toBeLessThan(FLAG.width / 2);
    expect(sam?.axisX).toBeGreaterThan(layout.axisRight);
    expect(sam?.bottom).toBe(FRAME.axisY - FLAG.height / 2 - 6);
  });

  it("keeps an on-scale group's number above the puck channel, with a short leader", () => {
    const layout = layoutNumberLine([guess("a", 20), guess("b", 30), guess("c", 32)], 32, FRAME);
    for (const g of layout.groups) expect(g.bottom).toBeLessThanOrEqual(FRAME.axisY - STEM_MIN);
    expect(layout.groups.every((g) => g.lane === 0)).toBe(true);
  });

  it("keeps labels out of the answer pin's zone unless they guessed it", () => {
    for (const [values, correct] of [
      [[26, 28, 14], 27],
      [[29, 31, 35, 20], 30],
      [[7, 9, 2], 8],
    ] as Array<[number[], number]>) {
      const layout = layoutNumberLine(values.map((v, i) => guess(`player${i}`, v, { points: 1 })), correct, FRAME);
      for (const g of layout.groups.filter((g) => g.lane === 0 && Math.abs(g.axisX - layout.correctX) >= PIN_ZONE)) {
        const left = g.x - g.width / 2;
        const right = g.x + g.width / 2;
        expect(right <= layout.correctX - PIN_ZONE + 0.5 || left >= layout.correctX + PIN_ZONE - 0.5).toBe(true);
      }
    }
  });

  it("orders a tied group by points and names the speed winner", () => {
    const layout = layoutNumberLine([guess("Sam", 8, { points: 3, highlight: "exact" }), guess("Mom", 8, { points: 4, highlight: "exact" })], 8, FRAME);
    const eight = layout.groups[0];
    expect(eight.members.map((m) => m.playerId)).toEqual(["Mom", "Sam"]);
    expect(eight.fastest).toBe("Mom");
  });
});

describe("speedWinner", () => {
  it("is the one with more points on a shared guess", () => {
    expect(speedWinner([guess("a", 8, { points: 4 }), guess("b", 8, { points: 3 })])).toBe("a");
  });
  it("is nobody when the points are level or only one scored", () => {
    expect(speedWinner([guess("a", 8, { points: 3 }), guess("b", 8, { points: 3 })])).toBeNull();
    expect(speedWinner([guess("a", 8, { points: 3 }), guess("b", 8, { points: 0 })])).toBeNull();
    expect(speedWinner([guess("a", 8, { points: 3 })])).toBeNull();
  });
});

describe("stampText", () => {
  it("explains the tiebreak in-line", () => {
    expect(stampText(4, true)).toBe("+4 · fastest");
    expect(stampText(3, false)).toBe("+3");
  });
});
