import { describe, expect, it } from "vitest";
import { chipTint } from "./chip-tint";

describe("chipTint", () => {
  it("cycles the four aurora hues so neighbours on the line read apart", () => {
    const names = [0, 1, 2, 3].map((i) => chipTint(i).name);
    expect(names).toEqual(["indigo", "purple", "pink", "lavender"]);
    expect(new Set(names).size).toBe(4);
  });
  it("wraps after four and survives negative or fractional indexes", () => {
    expect(chipTint(4).name).toBe("indigo");
    expect(chipTint(5).name).toBe("purple");
    expect(chipTint(-3).name).toBe("indigo");
    expect(chipTint(2.7).name).toBe("pink");
  });
  it("gives every hue a rim colour and a translucent fill", () => {
    for (let i = 0; i < 4; i++) {
      const t = chipTint(i);
      expect(t.rim).toMatch(/^var\(--/);
      expect(t.fill).toMatch(/^rgba\(/);
    }
  });
});
