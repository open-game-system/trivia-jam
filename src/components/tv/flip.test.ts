import { describe, expect, it } from "vitest";
import { flipFrom } from "./flip";

describe("flipFrom: the transform that puts an element back where its predecessor was", () => {
  it("is the identity when the boxes match", () => {
    const r = { x: 96, y: 136, w: 800, h: 160 };
    expect(flipFrom(r, r)).toEqual({ x: 0, y: 0, scale: 1 });
  });
  it("translates and scales uniformly by width, from the top-left corner", () => {
    expect(flipFrom({ x: 96, y: 400, w: 1200, h: 300 }, { x: 96, y: 136, w: 800, h: 200 })).toEqual({ x: 0, y: 264, scale: 1.5 });
  });
});
