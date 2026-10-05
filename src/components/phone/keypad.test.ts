import { describe, expect, it } from "vitest";
import { MAX_DIGITS, keypadReducer, toAnswerNumber } from "./keypad";

describe("keypadReducer", () => {
  it("appends digits", () => {
    expect(keypadReducer("", { type: "digit", digit: 4 })).toBe("4");
    expect(keypadReducer("4", { type: "digit", digit: 2 })).toBe("42");
  });

  it("replaces a lone zero instead of building leading zeros", () => {
    expect(keypadReducer("0", { type: "digit", digit: 7 })).toBe("7");
  });

  it("keeps a single zero when zero is pressed on zero or empty", () => {
    expect(keypadReducer("", { type: "digit", digit: 0 })).toBe("0");
    expect(keypadReducer("0", { type: "digit", digit: 0 })).toBe("0");
  });

  it("allows zeros inside and at the end of a number", () => {
    expect(keypadReducer("10", { type: "digit", digit: 0 })).toBe("100");
  });

  it("stops accepting digits at the maximum length", () => {
    const full = "1".repeat(MAX_DIGITS);
    expect(keypadReducer(full, { type: "digit", digit: 2 })).toBe(full);
  });

  it("deletes the last digit and tolerates empty", () => {
    expect(keypadReducer("42", { type: "delete" })).toBe("4");
    expect(keypadReducer("4", { type: "delete" })).toBe("");
    expect(keypadReducer("", { type: "delete" })).toBe("");
  });

  it("clears", () => {
    expect(keypadReducer("123", { type: "clear" })).toBe("");
  });

  it("sets from text: keeps digits only, trims zeros and length", () => {
    expect(keypadReducer("", { type: "set", value: "1,776" })).toBe("1776");
    expect(keypadReducer("", { type: "set", value: "007" })).toBe("7");
    expect(keypadReducer("", { type: "set", value: "000" })).toBe("0");
    expect(keypadReducer("", { type: "set", value: "abc" })).toBe("");
    expect(
      keypadReducer("", { type: "set", value: "9".repeat(MAX_DIGITS + 3) }),
    ).toBe("9".repeat(MAX_DIGITS));
  });
});

describe("toAnswerNumber", () => {
  it("parses a typed number", () => {
    expect(toAnswerNumber("1776")).toBe(1776);
    expect(toAnswerNumber("0")).toBe(0);
  });
  it("returns null when nothing typed", () => {
    expect(toAnswerNumber("")).toBeNull();
  });
});
