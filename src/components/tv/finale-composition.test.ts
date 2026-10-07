import { describe, expect, it } from "vitest";
import { FINALE_FINAL, TITLE_SAFE, awardsColumn, steppedPodium } from "./finale-layout";
import { FINALE_AT as AT } from "./finale-timeline";
import { landsAt } from "./finale-layout";

describe("finale composition (awards beat): podium + awards as one centred block inside title-safe", () => {
  const podium = steppedPodium();
  const awards = awardsColumn(3);

  it("puts the podium on the left and the AWARDS column in the right third, side by side", () => {
    expect(podium.right).toBeLessThan(awards.left);
    expect(awards.left).toBeGreaterThanOrEqual(1920 * 0.55);
  });

  it("centres the block (podium + gap + awards) on the frame", () => {
    expect((podium.left + awards.right) / 2).toBeCloseTo(960, 0);
  });

  it("keeps everything inside the 5% title-safe area", () => {
    for (const box of [podium, awards]) {
      expect(box.left).toBeGreaterThanOrEqual(TITLE_SAFE.left);
      expect(box.right).toBeLessThanOrEqual(TITLE_SAFE.right);
      expect(box.top).toBeGreaterThanOrEqual(TITLE_SAFE.top);
      expect(box.bottom).toBeLessThanOrEqual(TITLE_SAFE.bottom);
    }
    expect(awardsColumn(1).bottom).toBeLessThanOrEqual(TITLE_SAFE.bottom);
  });

  it("aligns the awards column with the top of the stepped-back podium", () => {
    expect(awards.top).toBe(Math.round(podium.top));
  });

  it("keeps award cards readable: at least 150 px tall", () => {
    expect(FINALE_FINAL.cardHeight).toBeGreaterThanOrEqual(150);
  });
});

describe("finale: scores count from the moment each block lands", () => {
  it("2nd and 3rd start counting as their block settles, not seconds later", () => {
    expect(landsAt(AT.third, false)).toBeCloseTo(AT.third + 0.75, 5);
    expect(landsAt(AT.second, false)).toBeLessThan(AT.count);
    expect(landsAt(AT.third, false, 0.5)).toBeCloseTo(AT.third * 0.5 + 0.75 * 0.6, 5);
  });
});
