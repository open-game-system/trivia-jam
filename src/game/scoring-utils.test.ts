import { describe, it, expect } from "vitest";
import { isCloseNumericAnswer } from "./scoring-utils";

describe("isCloseNumericAnswer", () => {
  it("returns true when answer is close to zero (within ±0.1)", () => {
    expect(isCloseNumericAnswer(0.05, 0)).toBe(true);
  });

  it("returns false when answer is far from zero", () => {
    expect(isCloseNumericAnswer(0.5, 0)).toBe(false);
  });

  it("returns true when answer is within 10% of correct answer", () => {
    expect(isCloseNumericAnswer(7.5, 8)).toBe(true);
  });

  it("returns false when answer is more than 10% off", () => {
    expect(isCloseNumericAnswer(6, 8)).toBe(false);
  });

  it("returns false for non-numeric answer strings", () => {
    expect(isCloseNumericAnswer("abc", 8)).toBe(false);
  });

  it("handles negative correct answers correctly", () => {
    expect(isCloseNumericAnswer(-9.5, -10)).toBe(true); // 5% of |-10| = 0.5
    expect(isCloseNumericAnswer(-5, -10)).toBe(false); // 50% off
  });

  it("returns false for Infinity", () => {
    expect(isCloseNumericAnswer(Infinity, 8)).toBe(false);
  });

  it("returns true for exact zero answer when correct is zero", () => {
    expect(isCloseNumericAnswer(0, 0)).toBe(true);
  });
});
