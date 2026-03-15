import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { createCountdown } from "./timer";

describe("createCountdown", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("calls onTick immediately with the full time window", () => {
    const onTick = vi.fn();
    const onComplete = vi.fn();

    const cleanup = createCountdown(25, onTick, onComplete);

    expect(onTick).toHaveBeenCalledWith(25);
    expect(onComplete).not.toHaveBeenCalled();

    cleanup();
  });

  it("counts down to 0 and calls onComplete", () => {
    const onTick = vi.fn();
    const onComplete = vi.fn();

    const cleanup = createCountdown(5, onTick, onComplete);

    // Advance 5 seconds
    vi.advanceTimersByTime(5000);

    expect(onTick).toHaveBeenLastCalledWith(0);
    expect(onComplete).toHaveBeenCalled();

    cleanup();
  });

  it("ticks every 100ms with decreasing values", () => {
    const ticks: number[] = [];
    const onTick = (remaining: number) => ticks.push(remaining);
    const onComplete = vi.fn();

    const cleanup = createCountdown(3, onTick, onComplete);

    // Advance 1 second (10 ticks)
    vi.advanceTimersByTime(1000);

    // Initial call + 10 interval ticks = 11 calls
    expect(ticks.length).toBe(11);
    // First value should be 3
    expect(ticks[0]).toBe(3);
    // After 1 second, should be 2
    expect(ticks[ticks.length - 1]).toBe(2);

    cleanup();
  });

  it("never goes below 0", () => {
    const onTick = vi.fn();
    const onComplete = vi.fn();

    const cleanup = createCountdown(2, onTick, onComplete);

    // Advance way past the time window
    vi.advanceTimersByTime(10000);

    // All calls after the time window should be 0
    const lastCall = onTick.mock.calls[onTick.mock.calls.length - 1];
    expect(lastCall[0]).toBe(0);

    cleanup();
  });

  it("cleanup stops the interval", () => {
    const onTick = vi.fn();
    const onComplete = vi.fn();

    const cleanup = createCountdown(10, onTick, onComplete);

    const callCountBefore = onTick.mock.calls.length;
    cleanup();

    vi.advanceTimersByTime(5000);

    // No additional calls after cleanup
    expect(onTick.mock.calls.length).toBe(callCountBefore);
  });
});
