import { describe, expect, it } from "vitest";
import { closenessBand, honestHeadline, honestQuip, relativeError } from "./honesty";

const numeric = (correctAnswer: number) => ({ questionType: "numeric" as const, correctAnswer });

describe("relativeError", () => {
  it("is the share of the answer you were off by", () => {
    expect(relativeError(numeric(32), 20)).toBeCloseTo(0.375);
    expect(relativeError(numeric(100), "95")).toBeCloseTo(0.05);
    expect(relativeError(numeric(100), 100)).toBe(0);
  });
  it("is absolute distance when the answer is zero", () => {
    expect(relativeError(numeric(0), 3)).toBe(3);
  });
  it("is null with no guess or for multiple choice", () => {
    expect(relativeError(numeric(5), undefined)).toBeNull();
    expect(relativeError({ questionType: "multiple-choice", correctAnswer: "A" }, "B")).toBeNull();
  });
});

describe("closenessBand", () => {
  it("cuts at exact, 5%, 20% and 50%", () => {
    expect([0, 0.05, 0.051, 0.2, 0.21, 0.5, 0.51, 3].map(closenessBand)).toEqual([
      "dead-on", "close", "decent", "decent", "fair", "fair", "far", "far",
    ]);
  });
});

describe("honestHeadline", () => {
  it("is honest about how far off a scoring guess was", () => {
    expect(honestHeadline("close", 3, "numeric", 0.04)).toBe("SO CLOSE!");
    expect(honestHeadline("close", 3, "numeric", 0.09)).toBe("NOT BAD.");
    expect(honestHeadline("miss", 2, "numeric", 0.375)).toBe("GOOD GUESS!");
    expect(honestHeadline("miss", 1, "numeric", 0.8)).toBe("WAY OFF.");
  });
  it("keeps the pinned words for exact, nothing scored and no guess", () => {
    expect(honestHeadline("exact", 4, "numeric", 0)).toBe("EXACT!");
    expect(honestHeadline("exact", 4, "multiple-choice", null)).toBe("YES!");
    expect(honestHeadline("miss", 0, "numeric", 0.8)).toBe("NOT THIS TIME");
    expect(honestHeadline("none", 0, "numeric", null)).toBe("TIME'S UP");
  });
  it("falls back to the plain headline when there is no distance", () => {
    expect(honestHeadline("miss", 2, "multiple-choice", null)).toBe("GOOD GUESS!");
  });
});

describe("honestQuip", () => {
  const base = { place: 2, beatenBy: ["Mom"] };
  it("matches the line to the distance", () => {
    expect(honestQuip({ ...base, outcome: "close", points: 3, relativeError: 0.03 })).toBe("A rounding error away.");
    expect(honestQuip({ ...base, outcome: "miss", points: 2, relativeError: 0.15 })).toBe("Respectable. Not winning, but respectable.");
    expect(honestQuip({ ...base, outcome: "miss", points: 2, relativeError: 0.375 })).toBe("Same neighbourhood. Different street.");
    expect(honestQuip({ ...base, outcome: "miss", points: 1, relativeError: 2 })).toBe("Points for showing up.");
  });
  it("is honest about zero points and the clock", () => {
    expect(honestQuip({ ...base, outcome: "miss", points: 0, relativeError: 0.15 })).toBe("No points, but not far off.");
    expect(honestQuip({ ...base, outcome: "miss", points: 0, relativeError: 2 })).toBe("No points. Not even close.");
    expect(honestQuip({ ...base, outcome: "none", points: 0, relativeError: null })).toBe("The clock won this one.");
  });
  it("keeps the exact-answer lines", () => {
    expect(honestQuip({ outcome: "exact", points: 4, place: 1, beatenBy: [], relativeError: 0 })).toBe("Nobody got closer.");
    expect(honestQuip({ outcome: "exact", points: 3, place: 2, beatenBy: ["Mom"], relativeError: 0 })).toBe("On the number, but Mom was faster.");
  });
  it("falls back to the plain quip for multiple choice", () => {
    expect(honestQuip({ outcome: "miss", points: 2, place: 2, beatenBy: ["Mom"], relativeError: null })).toBe("Mom was closer.");
  });
});
