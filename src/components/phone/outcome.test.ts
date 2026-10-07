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

import { resultHeadline } from "./outcome";

describe("resultHeadline", () => {
  it("never says NOT THIS TIME to someone who scored", () => {
    expect(resultHeadline("miss", 2, "numeric")).not.toBe("NOT THIS TIME");
    expect(resultHeadline("miss", 2, "numeric")).toBe("GOOD GUESS!");
  });

  it("says NOT THIS TIME only for an answered question worth 0", () => {
    expect(resultHeadline("miss", 0, "numeric")).toBe("NOT THIS TIME");
    expect(resultHeadline("close", 0, "numeric")).toBe("NOT THIS TIME");
  });

  it("says TIME'S UP when nothing was submitted", () => {
    expect(resultHeadline("none", 0, "numeric")).toBe("TIME'S UP");
  });

  it("celebrates exact and close answers", () => {
    expect(resultHeadline("exact", 4, "numeric")).toBe("EXACT!");
    expect(resultHeadline("exact", 4, "multiple-choice")).toBe("YES!");
    expect(resultHeadline("close", 3, "numeric")).toBe("SO CLOSE!");
  });
});

import { finishStamp } from "./outcome";

describe("finishStamp", () => {
  it("names the podium and invites a rematch below it", () => {
    expect(finishStamp(1)).toBe("CHAMPION");
    expect(finishStamp(2)).toBe("RUNNER-UP");
    expect(finishStamp(3)).toBe("PODIUM");
    expect(finishStamp(4)).toBe("REMATCH?");
    expect(finishStamp(12)).toBe("REMATCH?");
  });
});
