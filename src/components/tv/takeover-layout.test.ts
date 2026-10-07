import { describe, expect, it } from "vitest";
import { cardToStage, SAFE, takeoverLayout } from "./takeover-layout";

describe("takeoverLayout: the takeover is composed once, from its first frame", () => {
  it("with misses, splits the stage: winners and the answer on the left, the rest of the room down the right third", () => {
    const t = takeoverLayout(3);
    expect(t.misses).not.toBeNull();
    expect(t.misses?.left).toBeGreaterThanOrEqual(1180);
    expect((t.misses?.left ?? 0) + (t.misses?.width ?? 0)).toBeLessThanOrEqual(SAFE.right);
    expect(t.answer.cx).toBeLessThan(t.misses?.left ?? 0);
  });

  it("without misses, centres everything and leaves no empty slot", () => {
    const t = takeoverLayout(0);
    expect(t.misses).toBeNull();
    expect(t.answer.cx).toBe(960);
    expect(t.card.scale).toBeGreaterThan(takeoverLayout(3).card.scale);
    expect(t.card.x).toBe(0);
  });

  it("keeps the answer the hero: at least 240 px and inside title-safe", () => {
    for (const n of [0, 1, 3, 6]) {
      const t = takeoverLayout(n);
      expect(t.answer.size).toBeGreaterThanOrEqual(240);
      expect(t.answer.top).toBeGreaterThanOrEqual(SAFE.top);
      expect(t.answer.top + t.answer.size * 0.8).toBeLessThanOrEqual(SAFE.bottom);
    }
  });

  it("puts the answer under the winners card, never over it", () => {
    for (const n of [0, 4]) {
      const t = takeoverLayout(n);
      const cardBottom = cardToStage({ x: 960, y: t.cardBottom }, t.card).y;
      expect(t.answer.top).toBeGreaterThan(cardBottom);
    }
  });

  it("fits six misses down the right column inside title-safe", () => {
    const t = takeoverLayout(6);
    const m = t.misses;
    expect(m).not.toBeNull();
    if (!m) return;
    expect(m.top + m.labelHeight + 6 * m.rowHeight + 5 * m.rowGap).toBeLessThanOrEqual(SAFE.bottom);
  });

  it("centres a short column of misses on the winners and answer instead of hanging it from the top", () => {
    const one = takeoverLayout(1).misses;
    const six = takeoverLayout(6).misses;
    expect(one?.top ?? 0).toBeGreaterThan(six?.top ?? 0);
    expect(six?.top).toBeGreaterThanOrEqual(SAFE.top);
  });
});

describe("cardToStage", () => {
  it("is the identity at scale 1 with no offset", () => {
    expect(cardToStage({ x: 300, y: 400 }, { x: 0, y: 0, scale: 1 })).toEqual({ x: 300, y: 400 });
  });
  it("scales about the card's top centre, then offsets", () => {
    expect(cardToStage({ x: 1960, y: 100 }, { x: -320, y: 50, scale: 0.5 })).toEqual({ x: 960 + 500 - 320, y: 100 });
  });
});
