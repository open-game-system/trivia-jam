import { describe, expect, it } from "vitest";
import { fitText } from "./fit-text";

describe("fitText: names fit their box, never an ellipsis", () => {
  it("keeps the full size when the text already fits", () => {
    expect(fitText({ naturalWidth: 300, max: 80, floor: 40, box: 360 })).toEqual({ size: 80, wrap: false });
  });
  it("shrinks in proportion to the overflow, rounded down", () => {
    expect(fitText({ naturalWidth: 480, max: 80, floor: 40, box: 360 })).toEqual({ size: 60, wrap: false });
  });
  it("stops at the floor and wraps to a second line instead of shrinking further", () => {
    expect(fitText({ naturalWidth: 1000, max: 80, floor: 40, box: 360 })).toEqual({ size: 40, wrap: true });
  });
  it("lands exactly on the floor without wrapping when that is enough", () => {
    expect(fitText({ naturalWidth: 720, max: 80, floor: 40, box: 360 })).toEqual({ size: 40, wrap: false });
  });
  it("treats an unmeasured box as fitting", () => {
    expect(fitText({ naturalWidth: 0, max: 80, floor: 40, box: 360 })).toEqual({ size: 80, wrap: false });
    expect(fitText({ naturalWidth: 400, max: 80, floor: 40, box: 0 })).toEqual({ size: 80, wrap: false });
  });
  it("never breaks a single word: a one-word name below the floor shrinks to fit instead", () => {
    expect(fitText({ naturalWidth: 1000, max: 80, floor: 40, box: 360, words: 1 })).toEqual({ size: 28, wrap: false });
  });
  it("still wraps a several-word name at the floor", () => {
    expect(fitText({ naturalWidth: 1000, max: 80, floor: 40, box: 360, words: 2 })).toEqual({ size: 40, wrap: true });
  });
});
