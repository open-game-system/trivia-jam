import { describe, expect, it } from "vitest";
import { choiceMisses, MAX_MISSES_SHOWN, numericMisses } from "./misses";

const g = (playerId: string, value: number) => ({ playerId, name: playerId.toUpperCase(), inkIndex: 0, value });

describe("numericMisses: the guesses that did not win, nearest first", () => {
  it("leaves the winners out and orders the rest by distance", () => {
    const m = numericMisses([g("a", 8), g("b", 30), g("c", 6), g("d", 11)], 8, new Set(["a"]));
    expect(m.rows.map((r) => r.playerId)).toEqual(["c", "d", "b"]);
    expect(m.rows.map((r) => r.tag)).toEqual(["6 · off by 2", "11 · off by 3", "30 · off by 22"]);
  });
  it("gives the nearest miss (every one of them on a tie) the consolation stamp", () => {
    const m = numericMisses([g("a", 8), g("b", 6), g("c", 10), g("d", 2)], 8, new Set(["a"]));
    expect(m.rows.filter((r) => r.nearest).map((r) => r.playerId)).toEqual(["b", "c"]);
  });
  it("has no consolation without a winner to console against, or with nobody missing", () => {
    expect(numericMisses([g("a", 8)], 8, new Set(["a"])).rows).toEqual([]);
    expect(numericMisses([g("a", 6), g("b", 10)], 8, new Set()).rows.some((r) => r.nearest)).toBe(false);
  });
  it("shows at most a row's worth and counts the rest", () => {
    const many = Array.from({ length: 10 }, (_, i) => g(`p${i}`, i));
    const m = numericMisses(many, 100, new Set(["p9"]));
    expect(m.rows).toHaveLength(MAX_MISSES_SHOWN);
    expect(m.more).toBe(9 - MAX_MISSES_SHOWN);
  });
  it("prints decimals and big numbers the way the axis does", () => {
    const m = numericMisses([g("a", 12500), g("b", 1.5)], 10000, new Set());
    expect(m.rows[0].tag).toBe("12,500 · off by 2500");
    expect(m.rows[1].tag).toBe("1.5 · off by 9998.5");
  });
});

describe("choiceMisses: who picked a wrong tile, and which", () => {
  it("names the tile each wrong pick landed on, in tile order", () => {
    const options = ["Mars", "Jupiter", "Saturn", "Neptune"];
    const m = choiceMisses(
      [
        { playerId: "a", name: "A", inkIndex: 0, value: "Saturn" },
        { playerId: "b", name: "B", inkIndex: 1, value: "Jupiter" },
        { playerId: "c", name: "C", inkIndex: 2, value: "A" },
      ],
      options,
      1,
    );
    expect(m.rows.map((r) => [r.playerId, r.tag])).toEqual([
      ["c", "picked A · Mars"],
      ["a", "picked C · Saturn"],
    ]);
    expect(m.rows.some((r) => r.nearest)).toBe(false);
  });
});
