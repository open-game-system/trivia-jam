/**
 * Motion presets for the TV. Pure data, so every keyframe list is tested to match its time offsets:
 * framer-motion applies one `times` to every property in a transition, and a two-value `opacity`
 * under a three-value `times` interpolates 0 -> 1 -> NaN, which hid the round-05 EXACT! stamp for
 * half a second mid-slam. Each preset animates ONE `transform` string plus `opacity`, which framer
 * hands to the compositor (WAAPI), so a busy main thread cannot skip the motion.
 */
import { EASE_OUT } from "./glass";

type Bezier = readonly [number, number, number, number];

/** The stamp slam: down from 1.4, a small undershoot, settle. */
export const SLAM = {
  scales: [1.4, 0.93, 1.03, 1],
  opacity: [0, 1, 1, 1],
  times: [0, 0.5, 0.78, 1],
  duration: 0.5,
} as const;

/** Pills and badges: up from small with a little overshoot. */
export const POP = {
  scales: [0.3, 1.12, 1],
  opacity: [0, 1, 1],
  times: [0, 0.6, 1],
  duration: 0.4,
} as const;

/** The takeover stepping up to make room for the misses strip. */
export const STEP = { duration: 0.4, ease: EASE_OUT } as const;

type Keyframed = {
  initial: { transform: string; opacity: number };
  animate: { transform: string[]; opacity: number[] };
  transition: { delay: number; duration: number; times: number[]; ease: Bezier };
};

const keyframed = (
  preset: { scales: readonly number[]; opacity: readonly number[]; times: readonly number[]; duration: number },
  { delay, rotate = 0 }: { delay: number; rotate?: number },
): Keyframed => {
  const last = preset.scales.length - 1;
  // The tilt eases in over the slam (no tilt at the first frame, full tilt at rest).
  const transform = preset.scales.map((s, i) => `scale(${s}) rotate(${Number(((rotate * i) / last).toFixed(3))}deg)`);
  const opacity = [...preset.opacity];
  return {
    initial: { transform: transform[0], opacity: opacity[0] },
    animate: { transform, opacity },
    transition: { delay, duration: preset.duration, times: [...preset.times], ease: EASE_OUT },
  };
};

export const slamIn = (o: { delay: number; rotate?: number }): Keyframed => keyframed(SLAM, o);
export const popIn = (o: { delay: number; rotate?: number }): Keyframed => keyframed(POP, o);

export const stepTo = ({ scale, y }: { scale: number; y: number }) => ({
  animate: { transform: `translateY(${y}px) scale(${scale})` },
  transition: { duration: STEP.duration, ease: STEP.ease },
});
