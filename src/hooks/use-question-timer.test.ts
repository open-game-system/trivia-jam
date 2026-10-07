import { renderHook } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { useQuestionTimer } from "./use-question-timer";

// Mock createCountdown — its internals are tested in timer.test.ts.
// Here we test the hook's state-awareness logic.
vi.mock("~/timer", () => ({
  createCountdown: vi.fn(
    (timeWindow: number, onTick: (n: number) => void, _onComplete: () => void) => {
      // Simulate initial tick
      onTick(timeWindow);
      // Return cleanup function
      return vi.fn();
    }
  ),
}));

import { createCountdown } from "~/timer";

const makeQuestion = (id = "q1") => ({ questionId: id });

describe("useQuestionTimer", () => {
  const mockCreateCountdown = vi.mocked(createCountdown);

  beforeEach(() => {
    mockCreateCountdown.mockClear();
  });

  it("returns 0 when currentQuestion is null", () => {
    const { result } = renderHook(() =>
      useQuestionTimer(null, 30, true)
    );
    expect(result.current).toBe(0);
    expect(mockCreateCountdown).not.toHaveBeenCalled();
  });

  it("starts countdown when currentQuestion is provided", () => {
    const { result } = renderHook(() =>
      useQuestionTimer(makeQuestion(), 30, true)
    );

    expect(mockCreateCountdown).toHaveBeenCalledWith(30, expect.any(Function), expect.any(Function));
    expect(result.current).toBe(30);
  });

  it("returns 0 when isQuestionActive is false even with a currentQuestion", () => {
    const { result } = renderHook(() =>
      useQuestionTimer(makeQuestion(), 30, false)
    );

    expect(result.current).toBe(0);
    expect(mockCreateCountdown).not.toHaveBeenCalled();
  });

  it("stops and returns 0 when isQuestionActive becomes false", () => {
    const cleanup = vi.fn();
    mockCreateCountdown.mockImplementation(
      (timeWindow: number, onTick: (n: number) => void) => {
        onTick(timeWindow);
        return cleanup;
      }
    );

    const question = makeQuestion();

    const { result, rerender } = renderHook(
      ({ question, answerTimeWindow, isQuestionActive }) =>
        useQuestionTimer(question, answerTimeWindow, isQuestionActive),
      {
        initialProps: {
          question: question as { questionId: string } | null,
          answerTimeWindow: 30,
          isQuestionActive: true,
        },
      }
    );

    expect(result.current).toBe(30);

    // Server advances past questionActive
    rerender({
      question,
      answerTimeWindow: 30,
      isQuestionActive: false,
    });

    expect(result.current).toBe(0);
    // Cleanup should have been called
    expect(cleanup).toHaveBeenCalled();
  });

  it("restarts countdown when a new question starts", () => {
    const question1 = makeQuestion("q1");

    const { result, rerender } = renderHook(
      ({ question, answerTimeWindow, isQuestionActive }) =>
        useQuestionTimer(question, answerTimeWindow, isQuestionActive),
      {
        initialProps: {
          question: question1 as { questionId: string } | null,
          answerTimeWindow: 25,
          isQuestionActive: true,
        },
      }
    );

    expect(result.current).toBe(25);
    expect(mockCreateCountdown).toHaveBeenCalledTimes(1);

    // New question starts
    const question2 = makeQuestion("q2");

    rerender({
      question: question2,
      answerTimeWindow: 25,
      isQuestionActive: true,
    });

    // createCountdown called again for the new question
    expect(mockCreateCountdown).toHaveBeenCalledTimes(2);
    expect(result.current).toBe(25);
  });

  it("cleans up interval on unmount", () => {
    const cleanup = vi.fn();
    mockCreateCountdown.mockImplementation(
      (timeWindow: number, onTick: (n: number) => void) => {
        onTick(timeWindow);
        return cleanup;
      }
    );

    const { unmount } = renderHook(() =>
      useQuestionTimer(makeQuestion(), 30, true)
    );

    unmount();

    expect(cleanup).toHaveBeenCalled();
  });

  it("keeps counting when the same question re-renders as a new object (an answer arrived)", () => {
    const { rerender } = renderHook(
      ({ q }) => useQuestionTimer(q, 30, true),
      { initialProps: { q: makeQuestion("q1") } }
    );
    expect(mockCreateCountdown).toHaveBeenCalledTimes(1);

    rerender({ q: makeQuestion("q1") });

    expect(mockCreateCountdown).toHaveBeenCalledTimes(1);
  });

  it("restarts the countdown for the next question", () => {
    const { rerender } = renderHook(
      ({ q }) => useQuestionTimer(q, 30, true),
      { initialProps: { q: makeQuestion("q1") } }
    );

    rerender({ q: makeQuestion("q2") });

    expect(mockCreateCountdown).toHaveBeenCalledTimes(2);
  });
});

describe("useQuestionTimer: no stale frame before the countdown's first tick", () => {
  const mockCreateCountdown = vi.mocked(createCountdown);

  beforeEach(() => {
    mockCreateCountdown.mockClear();
  });

  it("the very first render of a live question shows the full window, never 0", () => {
    // The TV rendered "0 seconds left" (urgent pink) for a frame at question start:
    // state started at 0 and the countdown only ticks in an effect, after paint.
    const rendered: number[] = [];
    renderHook(() => {
      const left = useQuestionTimer(makeQuestion("q1"), 8, true);
      rendered.push(left);
      return left;
    });
    expect(rendered[0]).toBe(8);
    expect(rendered).not.toContain(0);
  });

  it("switching to the next question never renders the previous question's remaining time", () => {
    mockCreateCountdown.mockImplementation((_timeWindow: number, onTick: (n: number) => void) => {
      onTick(3);
      return vi.fn();
    });
    const rendered: number[] = [];
    const { rerender } = renderHook(
      ({ q }) => {
        const left = useQuestionTimer(q, 20, true);
        rendered.push(left);
        return left;
      },
      { initialProps: { q: makeQuestion("q1") } }
    );
    expect(rendered.at(-1)).toBe(3);
    rendered.length = 0;
    mockCreateCountdown.mockImplementation((timeWindow: number, onTick: (n: number) => void) => {
      onTick(timeWindow);
      return vi.fn();
    });

    rerender({ q: makeQuestion("q2") });

    expect(rendered[0]).toBe(20);
    expect(rendered).not.toContain(3);
  });
});
