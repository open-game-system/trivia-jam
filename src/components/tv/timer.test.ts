import { describe, expect, it } from "vitest";
import { TICK_POP, TIMER_FACE, timerInnerDiameter, timerNumeralSize } from "./timer";

/** The numeral's ink box (tabular digits in the hero face) at a font size. */
const inkBox = (remaining: number, fontSize: number) => ({
  w: String(remaining).length * TIMER_FACE.digitEm * fontSize,
  h: TIMER_FACE.inkEm * fontSize,
});

describe("timerNumeralSize", () => {
  it("the ring's inner diameter is the ring's diameter less its stroke", () => {
    expect(timerInnerDiameter(260)).toBe(194);
    expect(timerInnerDiameter(130)).toBe(97);
  });

  it.each([0, 5, 9, 10, 18, 25, 60, 99])("fits %i inside the ring with clear space on every side", (remaining) => {
    for (const size of [200, 260]) {
      const f = timerNumeralSize(remaining, size);
      const { w, h } = inkBox(remaining, f);
      // The ink's corners stay inside the ring with a margin: never touching it.
      expect(Math.hypot(w, h)).toBeLessThanOrEqual(timerInnerDiameter(size) * 0.88);
      // Even at the top of each tick's pop.
      expect(Math.hypot(w, h) * TICK_POP).toBeLessThan(timerInnerDiameter(size));
    }
  });

  it("one digit sets at the full hero size, two digits smaller", () => {
    expect(timerNumeralSize(5, 260)).toBe(118);
    expect(timerNumeralSize(18, 260)).toBeLessThan(118);
    expect(timerNumeralSize(18, 260)).toBeGreaterThan(80);
  });
});
