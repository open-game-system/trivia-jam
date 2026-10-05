import { describe, expect, it } from "vitest";
import { revealSchedule } from "./tv-model";

describe("revealSchedule: each beat owns the screen", () => {
  it("lets the answer land alone before the winners break forward", () => {
    const s = revealSchedule(4, false);
    expect(s.spotlight - s.answer).toBeGreaterThanOrEqual(1000);
  });
  it("gives the winners' break-forward its own beat before the points travel", () => {
    const s = revealSchedule(4, false);
    expect(s.points - s.spotlight).toBeGreaterThanOrEqual(1200);
    expect(s.standings - s.points).toBeGreaterThanOrEqual(1000);
  });
  it("keeps the answer where the phones expect it and adds at most 1.5 s overall", () => {
    // Round 02: answer at 5050 ms, end at 8050 ms for a family of four.
    const s = revealSchedule(4, false);
    expect(s.answer).toBe(5050);
    expect(s.end - 8050).toBeLessThanOrEqual(1500);
  });
});
