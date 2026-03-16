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

  useEffect(() => {
    if (!currentQuestion || !isQuestionActive) {
      setTimeLeft(0);
      return;
    }

    return createCountdown(answerTimeWindow, setTimeLeft, () => {});
  }, [currentQuestion, answerTimeWindow, isQuestionActive]);

  return timeLeft;
}
