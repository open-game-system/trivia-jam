import { describe, expect, it } from "vitest";
import { badgeSize, overlaps, placeBadge, type Rect, winnerCardRects } from "./badge-place";
import { layoutWinners } from "./winners-layout";

const w = (name: string, points = 4) => ({ id: name.toLowerCase(), name, points });

/** Every badge the winners card prints, with every name, total and other token it must clear. */
const check = (names: string[]) => {
  const winners = names.map((n) => w(n));
  const layout = layoutWinners(winners);
  const rects = winnerCardRects(winners, layout, 270);
  return rects;
};

describe("overlaps", () => {
  it("is true for rects that share area and false for rects that only touch", () => {
    expect(overlaps({ x: 0, y: 0, w: 10, h: 10 }, { x: 5, y: 5, w: 10, h: 10 })).toBe(true);
    expect(overlaps({ x: 0, y: 0, w: 10, h: 10 }, { x: 10, y: 0, w: 10, h: 10 })).toBe(false);
    expect(overlaps({ x: 0, y: 0, w: 10, h: 10 }, { x: 0, y: 10, w: 10, h: 10 })).toBe(false);
  });
});

describe("badgeSize", () => {
  it("scales with the chip and the digits, never below a couch-readable 44 px", () => {
    const big = badgeSize(4, 240);
    const small = badgeSize(4, 116);
    expect(big.font).toBeGreaterThan(small.font);
    expect(small.font).toBeGreaterThanOrEqual(44);
    expect(badgeSize(12, 240).w).toBeGreaterThan(big.w);
  });
});

describe("placeBadge", () => {
  const token = { cx: 960, top: 290, size: 240 };
  it("anchors top-right of the token when nothing is in the way", () => {
    const b = placeBadge(token, { w: 140, h: 100 }, []);
    expect(b.x).toBeGreaterThan(token.cx);
    expect(b.y).toBeLessThan(token.top + token.size / 2);
  });
  it("never covers the token's own initial", () => {
    const b = placeBadge(token, { w: 140, h: 100 }, []);
    const letter: Rect = { x: token.cx - token.size * 0.28, y: token.top + token.size * 0.22, w: token.size * 0.56, h: token.size * 0.56 };
    expect(overlaps(b, letter)).toBe(false);
  });
  it("moves off an obstacle in its first-choice spot", () => {
    const first = placeBadge(token, { w: 140, h: 100 }, []);
    const moved = placeBadge(token, { w: 140, h: 100 }, [first]);
    expect(overlaps(moved, first)).toBe(false);
  });
});

describe("winners card: a +N badge never covers a name, a total or another token", () => {
  const rooms = [
    ["Mom"],
    ["Mom", "Sam"],
    ["Mom", "Sam", "Grandpa"],
    ["Sam", "Mom", "Grandpa", "Lou"],
    ["Maximiliana", "Auntie Bea", "Uncle Ray"],
    ["A", "B", "C", "D", "E", "F"],
    ["Grandpa Augustus", "Christopher"],
  ];
  for (const names of rooms) {
    it(names.join(", "), () => {
      const rects = check(names);
      for (const r of rects) {
        for (const other of rects) {
          for (const name of [other.name, other.total]) expect(overlaps(r.badge, name)).toBe(false);
          if (other.id !== r.id) expect(overlaps(r.badge, other.token)).toBe(false);
          if (other.id !== r.id) expect(overlaps(r.badge, other.badge)).toBe(false);
        }
        expect(overlaps(r.badge, r.letter)).toBe(false);
        expect(r.badge.x).toBeGreaterThanOrEqual(0);
        expect(r.badge.x + r.badge.w).toBeLessThanOrEqual(1920);
      }
    });
  }
});
