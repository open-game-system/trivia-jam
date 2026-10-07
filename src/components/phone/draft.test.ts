import { describe, expect, it } from "vitest";
import { draftFor, type Draft } from "./draft";

describe("draftFor", () => {
  it("shows what was typed for the current question", () => {
    const draft: Draft = { questionId: "q1", value: "42" };
    expect(draftFor(draft, "q1")).toBe("42");
  });

  it("starts empty on a new question even if the last one timed out mid-typing", () => {
    expect(draftFor({ questionId: "q1", value: "8" }, "q2")).toBe("");
  });

  it("is empty with no question", () => {
    expect(draftFor({ questionId: "q1", value: "8" }, null)).toBe("");
  });
});
