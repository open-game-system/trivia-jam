import { useEffect, useState } from "react";
import { createCountdown } from "~/timer";

/**
 * Hook that wraps createCountdown with state-awareness.
 * Returns 0 immediately when isQuestionActive becomes false
 * (server advanced past questionActive), fixing the stale timer bug.
 *
 * Uses performance.now() via createCountdown for clock-skew-safe
 * local countdown — no dependency on server timestamps.
 */
export function useQuestionTimer(
  currentQuestion: { questionId: string } | null,
  answerTimeWindow: number,
  isQuestionActive: boolean
): number {
  const [timeLeft, setTimeLeft] = useState(0);
  // Keyed on the id: every answer patches currentQuestion into a new object,
  // which must not restart the countdown.
  const questionId = currentQuestion?.questionId ?? null;

  useEffect(() => {
    if (questionId === null || !isQuestionActive) {
      setTimeLeft(0);
      return;
    }

    return createCountdown(answerTimeWindow, setTimeLeft, () => {});
  }, [questionId, answerTimeWindow, isQuestionActive]);

  return timeLeft;
}
