import { describe, expect, it } from "vitest";
import { FINALE_AT as AT, FINALE_TAKEOVER_MS, finaleTakeoverMs } from "./finale-timeline";
import { PODIUM_LAYOUT, podiumHeights } from "./finale-layout";

describe("finale blocking: when", () => {
  it("opens on a title card that clears before the first block rises (no bare opener)", () => {
    expect(AT.opener).toBe(0);
    expect(AT.openerOut).toBeGreaterThan(0.8);
    expect(AT.openerOut + 0.3).toBeLessThanOrEqual(AT.third);
  });
  it("keeps 1st a mystery until the winner takeover, and reveals them as the takeover clears", () => {
    expect(AT.reveal).toBe(AT.title);
    expect(AT.reveal).toBeGreaterThan(AT.takeover);
  });
  it("brings the awards in as a second beat, after the podium has its winner", () => {
    expect(AT.awards).toBeGreaterThanOrEqual(AT.reveal + 0.8);
  });
  it("exports the takeover moment for the audio, in ms from game over", () => {
    expect(FINALE_TAKEOVER_MS).toBe(AT.takeover * 1000);
    expect(finaleTakeoverMs(false)).toBe(FINALE_TAKEOVER_MS);
    expect(finaleTakeoverMs(true)).toBe(FINALE_TAKEOVER_MS / 2);
  });
});

describe("finale blocking: where", () => {
  it("centres the podium on the frame", () => {
    expect(PODIUM_LAYOUT.left + PODIUM_LAYOUT.width / 2).toBe(960);
  });
  it("makes the blocks' heights follow the scores: 1st tallest, gaps in proportion", () => {
    const h = podiumHeights([20, 13, 10]);
    expect(h[0]).toBe(PODIUM_LAYOUT.maxHeight);
    expect(h[0]).toBeGreaterThan(h[1]);
    expect(h[1]).toBeGreaterThan(h[2]);
    // Above the base every block needs for its player, height grows linearly with the score.
    const above = h.map((x) => x - PODIUM_LAYOUT.baseHeight);
    expect(above[1] / above[0]).toBeCloseTo(13 / 20, 5);
    expect(above[2] / above[0]).toBeCloseTo(10 / 20, 5);
  });
  it("keeps every block tall enough for its player, even on 0 points or an all-zero game", () => {
    expect(podiumHeights([9, 0, 0])[1]).toBe(PODIUM_LAYOUT.baseHeight);
    expect(podiumHeights([0, 0, 0])).toEqual([PODIUM_LAYOUT.maxHeight, PODIUM_LAYOUT.baseHeight, PODIUM_LAYOUT.baseHeight]);
  });
  it("ties stand level", () => {
    const h = podiumHeights([12, 12, 9]);
    expect(h[0]).toBe(h[1]);
  });
});
