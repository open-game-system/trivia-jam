import { useEffect, useState } from "react";
import { createCountdown } from "~/timer";

/**
 * Hook that wraps createCountdown with state-awareness.
 * Returns 0 immediately when isQuestionActive becomes false
 * (server advanced past questionActive), fixing the stale timer bug.
 *
 * Uses performance.now() via createCountdown for clock-skew-safe
 * local countdown — no dependency on server timestamps.
 *
 * Until the countdown's first tick for a question lands (it runs in an effect,
 * after paint), the full window is shown: never a stale 0 or the previous
 * question's remaining time.
 */
export function useQuestionTimer(
  currentQuestion: { questionId: string } | null,
  answerTimeWindow: number,
  isQuestionActive: boolean
): number {
  // Keyed on the id: every answer patches currentQuestion into a new object,
  // which must not restart the countdown.
  const questionId = currentQuestion?.questionId ?? null;
  const key = questionId !== null && isQuestionActive ? `${questionId}:${answerTimeWindow}` : null;
  const [tick, setTick] = useState<{ key: string | null; left: number }>({ key: null, left: 0 });

  useEffect(() => {
    if (key === null) return;
    return createCountdown(answerTimeWindow, (left) => setTick({ key, left }), () => {});
  }, [key, answerTimeWindow]);

  if (key === null) return 0;
  return tick.key === key ? tick.left : answerTimeWindow;
}
