import { describe, expect, it } from "vitest";
import {
  assignLanes,
  buildAxis,
  buildStandings,
  findHighlights,
  inkForIndex,
  initialOf,
  matchOptionIndex,
  revealSchedule,
  xOnAxis,
} from "./tv-model";

describe("buildAxis", () => {
  it("spans every guess and the answer with round ticks", () => {
    const axis = buildAxis([6, 8, 10], 8);
    expect(axis.min).toBeLessThanOrEqual(6);
    expect(axis.max).toBeGreaterThanOrEqual(10);
    expect(axis.ticks[0]).toBe(axis.min);
    expect(axis.ticks[axis.ticks.length - 1]).toBe(axis.max);
    expect(axis.ticks.length).toBeGreaterThanOrEqual(3);
    expect(axis.ticks.length).toBeLessThanOrEqual(9);
  });

  it("gives a usable range when everyone guessed the answer", () => {
    const axis = buildAxis([1776, 1776], 1776);
    expect(axis.max).toBeGreaterThan(axis.min);
    expect(axis.min).toBeLessThan(1776);
    expect(axis.max).toBeGreaterThan(1776);
  });

  it("uses year-like ticks for years", () => {
    const axis = buildAxis([1700, 1800], 1776);
    for (const t of axis.ticks) expect(Number.isInteger(t)).toBe(true);
  });

  it("handles no guesses", () => {
    const axis = buildAxis([], 0);
    expect(axis.max).toBeGreaterThan(axis.min);
  });
});

describe("xOnAxis", () => {
  it("maps min to 0 and max to the width", () => {
    const axis = { min: 0, max: 10, ticks: [0, 10] };
    expect(xOnAxis(0, axis, 1000)).toBe(0);
    expect(xOnAxis(10, axis, 1000)).toBe(1000);
    expect(xOnAxis(5, axis, 1000)).toBe(500);
  });
  it("clamps values outside the axis", () => {
    const axis = { min: 0, max: 10, ticks: [0, 10] };
    expect(xOnAxis(-5, axis, 1000)).toBe(0);
    expect(xOnAxis(50, axis, 1000)).toBe(1000);
  });
});

describe("assignLanes", () => {
  it("keeps far-apart items in lane 0", () => {
    expect(assignLanes([0, 500, 1000], 200)).toEqual([0, 0, 0]);
  });
  it("stacks colliding items into new lanes", () => {
    expect(assignLanes([0, 50, 100, 600], 200)).toEqual([0, 1, 2, 0]);
  });
  it("reuses a freed lane", () => {
    expect(assignLanes([0, 100, 300], 200)).toEqual([0, 1, 0]);
  });
});

describe("findHighlights", () => {
  it("marks exact guesses", () => {
    const h = findHighlights(
      [
        { playerId: "a", value: 8 },
        { playerId: "b", value: 6 },
      ],
      8,
    );
    expect(h.get("a")).toBe("exact");
    expect(h.get("b")).toBeUndefined();
  });
  it("marks every closest guess when nobody was exact", () => {
    const h = findHighlights(
      [
        { playerId: "a", value: 7 },
        { playerId: "b", value: 9 },
        { playerId: "c", value: 3 },
      ],
      8,
    );
    expect(h.get("a")).toBe("closest");
    expect(h.get("b")).toBe("closest");
    expect(h.get("c")).toBeUndefined();
  });
  it("ignores non-numeric guesses", () => {
    const h = findHighlights([{ playerId: "a", value: "abc" }], 8);
    expect(h.size).toBe(0);
  });
});

describe("buildStandings", () => {
  const players = [
    { id: "a", name: "Ann", score: 5 },
    { id: "b", name: "Bob", score: 4 },
    { id: "c", name: "Cy", score: 1 },
  ];
  it("ranks by score and works out the previous rank from the last result", () => {
    const rows = buildStandings(players, [
      { playerId: "a", points: 4 },
      { playerId: "b", points: 0 },
    ]);
    expect(rows.map((r) => r.id)).toEqual(["a", "b", "c"]);
    const ann = rows[0];
    expect(ann.prevScore).toBe(1);
    expect(ann.prevRank).toBe(2);
    expect(ann.rank).toBe(1);
    expect(ann.gained).toBe(4);
    expect(rows[1].prevRank).toBe(1);
  });
  it("shares a rank on a tie", () => {
    const rows = buildStandings(
      [
        { id: "a", name: "A", score: 3 },
        { id: "b", name: "B", score: 3 },
      ],
      [],
    );
    expect(rows.map((r) => r.rank)).toEqual([1, 1]);
  });
  it("keeps the ink of each player's join position", () => {
    const rows = buildStandings(players, []);
    expect(rows.find((r) => r.id === "c")?.inkIndex).toBe(2);
  });
});

describe("tokens", () => {
  it("cycles the four inks", () => {
    expect(inkForIndex(0).name).toBe("blue");
    expect(inkForIndex(1).name).toBe("pink");
    expect(inkForIndex(4).name).toBe("blue");
    expect(inkForIndex(4).halftone).toBe(true);
    expect(inkForIndex(0).halftone).toBe(false);
  });
  it("takes the first letter of the name", () => {
    expect(initialOf("  juneau")).toBe("J");
    expect(initialOf("")).toBe("?");
  });
});

describe("matchOptionIndex", () => {
  const options = ["Mars", "Jupiter", "Saturn", "Neptune"];
  it("matches option text", () => {
    expect(matchOptionIndex("Jupiter", options)).toBe(1);
  });
  it("matches a letter", () => {
    expect(matchOptionIndex("C", options)).toBe(2);
    expect(matchOptionIndex("c", options)).toBe(2);
  });
  it("returns -1 for anything else", () => {
    expect(matchOptionIndex("Pluto", options)).toBe(-1);
  });
});

describe("revealSchedule", () => {
  it("runs the beats in order and lands in 7-9 s for a family of four", () => {
    const s = revealSchedule(4, false);
    expect(s.axis).toBe(0);
    expect(s.firstDrop).toBeGreaterThan(s.axis);
    expect(s.answer).toBeGreaterThan(s.firstDrop + 3 * s.stagger);
    expect(s.spotlight).toBeGreaterThan(s.answer);
    expect(s.points).toBeGreaterThan(s.spotlight);
    expect(s.standings).toBeGreaterThan(s.points);
    expect(s.end).toBeGreaterThan(s.standings);
    expect(s.end).toBeGreaterThanOrEqual(7000);
    expect(s.end).toBeLessThanOrEqual(9500);
  });
  it("keeps a big room under 11 s by tightening the stagger", () => {
    expect(revealSchedule(10, false).end).toBeLessThanOrEqual(11000);
  });
  it("is shorter, not absent, with reduced motion", () => {
    const full = revealSchedule(4, false);
    const reduced = revealSchedule(4, true);
    expect(reduced.end).toBeLessThan(full.end);
    expect(reduced.end).toBeGreaterThan(2000);
  });
});
