import { renderHook, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { useQuestionTimer } from "./use-question-timer";

type CurrentQuestion = {
  questionId: string;
  startTime: number;
  answers: Array<{
    playerId: string;
    playerName: string;
    value: number | string;
    timestamp: number;
  }>;
};

describe("useQuestionTimer", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns 0 when currentQuestion is null", () => {
    const { result } = renderHook(() =>
      useQuestionTimer(null, 30, true)
    );
    expect(result.current).toBe(0);
  });

  it("starts countdown when currentQuestion is provided", () => {
    const question: CurrentQuestion = {
      questionId: "q1",
      startTime: Date.now(),
      answers: [],
    };

    const { result } = renderHook(() =>
      useQuestionTimer(question, 30, true)
    );

    expect(result.current).toBe(30);

    act(() => {
      vi.advanceTimersByTime(1000);
    });

    expect(result.current).toBe(29);
  });

  it("stops and returns 0 when isQuestionActive becomes false", () => {
    const question: CurrentQuestion = {
      questionId: "q1",
      startTime: Date.now(),
      answers: [],
    };

    const { result, rerender } = renderHook(
      ({ question, answerTimeWindow, isQuestionActive }) =>
        useQuestionTimer(question, answerTimeWindow, isQuestionActive),
      {
        initialProps: {
          question: question as CurrentQuestion | null,
          answerTimeWindow: 30,
          isQuestionActive: true,
        },
      }
    );

    expect(result.current).toBe(30);

    act(() => {
      vi.advanceTimersByTime(5000);
    });

    expect(result.current).toBe(25);

    // Server advances past questionActive
    rerender({
      question,
      answerTimeWindow: 30,
      isQuestionActive: false,
    });

    expect(result.current).toBe(0);

    // Timer should not resume ticking
    act(() => {
      vi.advanceTimersByTime(1000);
    });

    expect(result.current).toBe(0);
  });

  it("restarts countdown when a new question starts", () => {
    const question1: CurrentQuestion = {
      questionId: "q1",
      startTime: Date.now(),
      answers: [],
    };

    const { result, rerender } = renderHook(
      ({ question, answerTimeWindow, isQuestionActive }) =>
        useQuestionTimer(question, answerTimeWindow, isQuestionActive),
      {
        initialProps: {
          question: question1 as CurrentQuestion | null,
          answerTimeWindow: 30,
          isQuestionActive: true,
        },
      }
    );

    act(() => {
      vi.advanceTimersByTime(10000);
    });

    expect(result.current).toBe(20);

    // New question starts
    const question2: CurrentQuestion = {
      questionId: "q2",
      startTime: Date.now(),
      answers: [],
    };

    rerender({
      question: question2,
      answerTimeWindow: 30,
      isQuestionActive: true,
    });

    expect(result.current).toBe(30);
  });

  it("cleans up interval on unmount", () => {
    const clearIntervalSpy = vi.spyOn(global, "clearInterval");

    const question: CurrentQuestion = {
      questionId: "q1",
      startTime: Date.now(),
      answers: [],
    };

    const { unmount } = renderHook(() =>
      useQuestionTimer(question, 30, true)
    );

    unmount();

    expect(clearIntervalSpy).toHaveBeenCalled();
    clearIntervalSpy.mockRestore();
  });
});
