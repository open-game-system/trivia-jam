import { describe, expect, it } from "vitest";
import { CHOICE_FRAME, eliminationOrder, eliminationTimes, layoutChoiceColumns } from "./choice-columns";

describe("layoutChoiceColumns", () => {
  it("fills the frame below the question with full-height columns, one per option, equal widths", () => {
    const l = layoutChoiceColumns(4, [1, 2, 0, 0]);
    expect(l.columns).toHaveLength(4);
    expect(l.columns[0].x).toBe(CHOICE_FRAME.left);
    const last = l.columns[3];
    expect(last.x + last.width).toBeCloseTo(CHOICE_FRAME.right, 5);
    for (const c of l.columns) {
      expect(c.width).toBeCloseTo(l.columns[0].width, 5);
      expect(c.top).toBe(CHOICE_FRAME.top);
      expect(c.bottom).toBe(CHOICE_FRAME.bottom);
    }
    // The columns use most of the stage height (round 05 left the bottom two-thirds empty).
    expect(CHOICE_FRAME.bottom - CHOICE_FRAME.top).toBeGreaterThanOrEqual(640);
    expect(CHOICE_FRAME.bottom).toBeLessThanOrEqual(1080 - 54);
  });

  it("stacks each pick from the bottom of its column up, inside the column, never under the header", () => {
    const l = layoutChoiceColumns(4, [3, 1, 0, 2]);
    for (const [oi, n] of [[0, 3], [1, 1], [3, 2]] as const) {
      const col = l.columns[oi];
      const spots = Array.from({ length: n }, (_, k) => l.chipAt(oi, k));
      for (const s of spots) {
        expect(s.x - l.chip / 2).toBeGreaterThanOrEqual(col.x);
        expect(s.x + l.chip / 2).toBeLessThanOrEqual(col.x + col.width);
        expect(s.y - l.chip / 2).toBeGreaterThanOrEqual(col.top + l.header);
        expect(s.y + l.chip / 2).toBeLessThanOrEqual(col.bottom);
      }
      for (let k = 1; k < n; k++) expect(spots[k].y).toBeLessThanOrEqual(spots[k - 1].y);
    }
  });

  it("shows names beside the chips while they fit (list), and goes to an initials grid for a crowd", () => {
    expect(layoutChoiceColumns(4, [2, 1, 1, 0]).mode).toBe("list");
    const crowd = layoutChoiceColumns(4, [10, 0, 0, 0]);
    expect(crowd.mode).toBe("grid");
    const spots = Array.from({ length: 10 }, (_, k) => crowd.chipAt(0, k));
    expect(new Set(spots.map((s) => `${s.x},${s.y}`)).size).toBe(10);
    for (const s of spots) expect(s.y - crowd.chip / 2).toBeGreaterThanOrEqual(CHOICE_FRAME.top + crowd.header);
  });

  it("keeps names at the TV floor or above in list mode", () => {
    for (const n of [2, 3, 4, 5, 6]) {
      const l = layoutChoiceColumns(n, Array.from({ length: n }, () => 2));
      if (l.mode === "list") expect(l.nameMin).toBeGreaterThanOrEqual(28);
    }
  });
});

describe("elimination: wrong options drop away one by one, then the right one slams", () => {
  it("drops the emptiest wrong option first and the most-picked wrong option last", () => {
    expect(eliminationOrder([1, 3, 0, 2], 0)).toEqual([2, 3, 1]);
    expect(eliminationOrder([0, 0, 0, 0], 3)).toEqual([0, 1, 2]);
  });

  it("drops nothing when the right option is unknown", () => {
    expect(eliminationOrder([1, 2], -1)).toEqual([]);
  });

  it("schedules every drop inside the suspense beat, in order, the last one landing before the answer", () => {
    for (const suspenseMs of [2500, 1250]) {
      for (const wrong of [1, 3, 5]) {
        const times = eliminationTimes(wrong, suspenseMs);
        expect(times).toHaveLength(wrong);
        for (let i = 1; i < times.length; i++) expect(times[i]).toBeGreaterThan(times[i - 1]);
        expect(times[0]).toBeGreaterThanOrEqual(suspenseMs * 0.4);
        expect((times.at(-1) ?? 0) + 250).toBeLessThanOrEqual(suspenseMs);
      }
    }
  });
});
