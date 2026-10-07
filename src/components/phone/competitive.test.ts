import { describe, expect, it } from "vitest";
import { beatenBy, finishMargin, formatNumber, offBy, placeOnQuestion, quip, standingFact } from "./competitive";

const scores = [
  { playerId: "a", playerName: "Ada", points: 4, timeTaken: 5 },
  { playerId: "b", playerName: "Ben", points: 3, timeTaken: 2 },
  { playerId: "c", playerName: "Cy", points: 3, timeTaken: 9 },
  { playerId: "d", playerName: "Di", points: 0, timeTaken: 1 },
];

describe("offBy", () => {
  const numeric = { questionType: "numeric" as const, correctAnswer: 8 };
  it("is the absolute distance for numeric answers", () => {
    expect(offBy(numeric, 5)).toBe(3);
    expect(offBy(numeric, "11")).toBe(3);
    expect(offBy(numeric, 8)).toBe(0);
  });
  it("is null for multiple choice and for no answer", () => {
    expect(offBy({ questionType: "multiple-choice", correctAnswer: "Blue" }, "Red")).toBeNull();
    expect(offBy(numeric, undefined)).toBeNull();
  });
});

describe("placeOnQuestion", () => {
  it("ranks by points, then speed", () => {
    expect(placeOnQuestion(scores, "a")).toEqual({ place: 1, of: 4 });
    expect(placeOnQuestion(scores, "b")).toEqual({ place: 2, of: 4 });
    expect(placeOnQuestion(scores, "c")).toEqual({ place: 3, of: 4 });
    expect(placeOnQuestion(scores, "d")).toEqual({ place: 4, of: 4 });
  });
  it("is null when the player has no score on this question", () => {
    expect(placeOnQuestion(scores, "zed")).toBeNull();
  });
});

describe("beatenBy", () => {
  it("lists everyone ranked above you, best first", () => {
    expect(beatenBy(scores, "c")).toEqual(["Ada", "Ben"]);
    expect(beatenBy(scores, "a")).toEqual([]);
  });
});

describe("standingFact", () => {
  it("says how far off a numeric guess was", () => {
    expect(standingFact("miss", 2, "numeric")).toBe("Off by 2");
    expect(standingFact("close", 25000, "numeric")).toBe("Off by 25,000");
    expect(standingFact("exact", 0, "numeric")).toBe("Dead on");
  });
  it("has nothing to add for multiple choice or no answer", () => {
    expect(standingFact("miss", null, "multiple-choice")).toBeNull();
    expect(standingFact("none", null, "numeric")).toBeNull();
  });
});

describe("quip", () => {
  it("is smug about the win and names who beat you otherwise", () => {
    expect(quip({ outcome: "exact", points: 4, place: 1, beatenBy: [] })).toBe("Nobody got closer.");
    expect(quip({ outcome: "miss", points: 2, place: 2, beatenBy: ["Mom"] })).toBe("Mom was closer.");
    expect(quip({ outcome: "exact", points: 3, place: 2, beatenBy: ["Mom"] })).toBe("On the number, but Mom was faster.");
  });
  it("handles no points and no answer", () => {
    expect(quip({ outcome: "miss", points: 0, place: 4, beatenBy: ["A", "B", "C"] })).toBe("No points. Moving on.");
    expect(quip({ outcome: "miss", points: 0, place: 1, beatenBy: [] })).toBe("No points. Moving on.");
    expect(quip({ outcome: "none", points: 0, place: null, beatenBy: [] })).toBe("The clock won this one.");
  });
});

describe("formatNumber", () => {
  it("groups thousands of digit strings and numbers", () => {
    expect(formatNumber("1000000")).toBe("1,000,000");
    expect(formatNumber(123456)).toBe("123,456");
    expect(formatNumber("12")).toBe("12");
    expect(formatNumber("")).toBe("");
  });
  it("leaves years and other 4-digit numbers plain", () => {
    expect(formatNumber(1776)).toBe("1776");
    expect(formatNumber("2020")).toBe("2020");
    expect(formatNumber(9999)).toBe("9999");
    expect(formatNumber(10000)).toBe("10,000");
  });
  it("keeps decimals and leaves non-numbers alone", () => {
    expect(formatNumber(12345.5)).toBe("12,345.5");
    expect(formatNumber("Blue whale")).toBe("Blue whale");
  });
});

describe("finishMargin", () => {
  const table = [
    { id: "a", name: "Ada", score: 20 },
    { id: "b", name: "Ben", score: 13 },
    { id: "c", name: "Cy", score: 13 },
  ];
  it("states the winning margin", () => {
    expect(finishMargin(table, "a")).toBe("Won by 7.");
  });
  it("states the gap to the winner", () => {
    expect(finishMargin(table, "b")).toBe("7 behind Ada.");
  });
  it("has nothing to say alone", () => {
    expect(finishMargin([table[0]!], "a")).toBeNull();
  });
});
