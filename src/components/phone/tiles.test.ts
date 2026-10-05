import { describe, expect, it } from "vitest";
import { isDense } from "./ChoiceTiles";

describe("isDense", () => {
  it("four short options get the huge disc", () => {
    expect(isDense(["Suez Canal", "Panama Canal", "Erie Canal", "English Channel"])).toBe(false);
  });
  it("five options or a long one keep the compact layout", () => {
    expect(isDense(["a", "b", "c", "d", "e"])).toBe(true);
    expect(isDense(["a", "b", "c", "Robotic-assisted angioplasty"])).toBe(true);
  });
});
