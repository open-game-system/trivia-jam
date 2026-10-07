import { describe, expect, it } from "vitest";
import { HOLD_MS, LEAVE_MS, beatTimeline } from "./results-beat";

describe("beatTimeline: the takeover hands the stage to the standings", () => {
  it.each([0, 5200, 9000])("after a reveal ending at %i ms, the takeover starts leaving after the hold", (end) => {
    expect(beatTimeline(end).leaveAt).toBe(end + HOLD_MS - LEAVE_MS);
    expect(beatTimeline(end).goneAt).toBe(end + HOLD_MS);
  });

  it("the standings rise while the takeover is still leaving: no empty frame between them", () => {
    const t = beatTimeline(5200);
    expect(t.boardAt).toBeLessThan(t.goneAt);
  });

  it("but only once the takeover has started leaving: never two layers fully overlapping", () => {
    const t = beatTimeline(5200);
    expect(t.boardAt).toBeGreaterThan(t.leaveAt);
    // The rows (a 300 ms rise) are mostly in by the time the takeover is gone.
    expect(t.goneAt - t.boardAt).toBeGreaterThanOrEqual(300);
  });
});
