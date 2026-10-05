import { describe, expect, it } from "vitest";
import { starsFor } from "./outcome";

describe("starsFor", () => {
  it("exact is 3 stars, whatever the points", () => {
    expect(starsFor("exact", 4)).toBe(3);
    expect(starsFor("exact", 0)).toBe(3);
  });
  it("scored but not exact is 2 stars", () => {
    expect(starsFor("close", 3)).toBe(2);
    expect(starsFor("miss", 2)).toBe(2);
  });
  it("answered but 0 points is 1 star", () => {
    expect(starsFor("miss", 0)).toBe(1);
    expect(starsFor("close", 0)).toBe(1);
  });
  it("no answer is 0 stars", () => {
    expect(starsFor("none", 0)).toBe(0);
  });
});
