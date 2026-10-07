import { describe, expect, it } from "vitest";
import { layoutWinners, MAX_WINNERS_SHOWN } from "./winners-layout";

const w = (name: string) => ({ id: name.toLowerCase(), name });

describe("layoutWinners", () => {
  it("puts a lone winner dead centre, huge", () => {
    const l = layoutWinners([w("Mom")]);
    expect(l.spots).toEqual([{ id: "mom", x: 960 }]);
    expect(l.chip).toBeGreaterThanOrEqual(220);
    expect(l.name).toBeGreaterThanOrEqual(120);
  });
  it("centres a group and shrinks as it grows, names never below 48 px", () => {
    const two = layoutWinners([w("Mom"), w("Sam")]);
    const three = layoutWinners([w("Mom"), w("Sam"), w("Grandpa")]);
    expect((two.spots[0].x + two.spots[1].x) / 2).toBeCloseTo(960, 0);
    expect(three.chip).toBeLessThan(two.chip);
    const crowd = layoutWinners(["Auntie Bea", "Maximiliana", "Uncle Ray", "Grandpa", "Nana", "Ollie", "Dad"].map(w));
    expect(crowd.name).toBeGreaterThanOrEqual(48);
    expect(crowd.spots).toHaveLength(MAX_WINNERS_SHOWN);
    expect(crowd.more).toBe(1);
  });
  it("stays inside the poster's margins", () => {
    for (const names of [["Maximiliana", "Auntie Bea", "Uncle Ray"], ["A", "B", "C", "D", "E", "F"]]) {
      const l = layoutWinners(names.map(w));
      for (const s of l.spots) {
        expect(s.x - l.chip / 2).toBeGreaterThanOrEqual(96);
        expect(s.x + l.chip / 2).toBeLessThanOrEqual(1824);
      }
    }
  });
  it("handles nobody", () => {
    expect(layoutWinners([]).spots).toEqual([]);
  });
});
