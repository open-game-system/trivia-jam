import { describe, expect, it } from "vitest";
import { POP, popIn, SLAM, slamIn, STEP, stepTo } from "./motion-presets";

const scaleOf = (t: string) => Number(/scale\(([\d.]+)\)/.exec(t)?.[1] ?? "1");

describe("slamIn: the EXACT / GOT IT / CLOSEST stamp", () => {
  const s = slamIn({ delay: 0.35, rotate: -2 });

  it("has one keyframe per time offset for every property (a mismatch made the round-05 stamp vanish mid-slam)", () => {
    expect(s.animate.transform).toHaveLength(SLAM.times.length);
    expect(s.animate.opacity).toHaveLength(SLAM.times.length);
    expect(s.transition.times).toEqual(SLAM.times);
  });

  it("comes down from 1.4, overshoots below 1, and settles on exactly 1 at the stamp's tilt", () => {
    const scales = s.animate.transform.map(scaleOf);
    expect(scales[0]).toBe(1.4);
    expect(Math.min(...scales)).toBeLessThan(1);
    expect(scales.at(-1)).toBe(1);
    expect(s.animate.transform.at(-1)).toContain("rotate(-2deg)");
  });

  it("never fades back out once it is visible", () => {
    const o = s.animate.opacity;
    for (let i = 1; i < o.length; i++) expect(o[i]).toBeGreaterThanOrEqual(o[i - 1]);
    expect(o.at(-1)).toBe(1);
  });

  it("starts where its first keyframe is, so the first painted frame is the big faint stamp", () => {
    expect(s.initial).toEqual({ transform: s.animate.transform[0], opacity: s.animate.opacity[0] });
    expect(s.transition.delay).toBe(0.35);
  });

  it("is a short slam: 0.4-0.6 s", () => {
    expect(s.transition.duration).toBeGreaterThanOrEqual(0.4);
    expect(s.transition.duration).toBeLessThanOrEqual(0.6);
  });
});

describe("popIn: small pills and badges", () => {
  const p = popIn({ delay: 0.1 });
  it("matches its keyframes to its times and never fades out", () => {
    expect(p.animate.transform).toHaveLength(POP.times.length);
    expect(p.animate.opacity).toHaveLength(POP.times.length);
    for (let i = 1; i < p.animate.opacity.length; i++) expect(p.animate.opacity[i]).toBeGreaterThanOrEqual(p.animate.opacity[i - 1]);
    expect(scaleOf(p.animate.transform.at(-1) ?? "")).toBe(1);
  });
});

describe("stepTo: the takeover stepping up for the misses beat", () => {
  it("is a 350-450 ms tween on one transform (never a spring that a busy frame can skip)", () => {
    const t = stepTo({ scale: 0.62, y: -14 });
    expect(t.animate.transform).toBe("translateY(-14px) scale(0.62)");
    expect(t.transition.duration).toBeGreaterThanOrEqual(0.35);
    expect(t.transition.duration).toBeLessThanOrEqual(0.45);
    expect(STEP.duration).toBe(t.transition.duration);
  });

  it("at rest is the identity", () => {
    expect(stepTo({ scale: 1, y: 0 }).animate.transform).toBe("translateY(0px) scale(1)");
  });
});
