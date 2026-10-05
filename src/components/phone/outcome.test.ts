import { describe, expect, it } from "vitest";
import { describeOutcome, ordinal } from "./outcome";

const numeric = { questionType: "numeric" as const, correctAnswer: 100 };
const choice = { questionType: "multiple-choice" as const, correctAnswer: "Blue" };

describe("describeOutcome", () => {
  it("numeric exact", () => {
    expect(describeOutcome(numeric, 100)).toBe("exact");
    expect(describeOutcome(numeric, "100")).toBe("exact");
  });
  it("numeric close is within the scoring tolerance", () => {
    expect(describeOutcome(numeric, 95)).toBe("close");
  });
  it("numeric far is a miss", () => {
    expect(describeOutcome(numeric, 50)).toBe("miss");
  });
  it("multiple choice right and wrong", () => {
    expect(describeOutcome(choice, "Blue")).toBe("exact");
    expect(describeOutcome(choice, "Red")).toBe("miss");
  });
  it("no answer", () => {
    expect(describeOutcome(numeric, undefined)).toBe("none");
  });
});

describe("ordinal", () => {
  it("handles the teens and the usual endings", () => {
    expect([1, 2, 3, 4, 11, 12, 13, 21, 22, 103].map(ordinal)).toEqual([
      "1st", "2nd", "3rd", "4th", "11th", "12th", "13th", "21st", "22nd", "103rd",
    ]);
  });
});
