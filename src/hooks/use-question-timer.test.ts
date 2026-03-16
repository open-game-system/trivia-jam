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
});
