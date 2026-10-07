import { useState } from "react";

type Arrival = { questionId: string; at: number };

/**
 * When did the result of the question this phone was watching arrive?
 * Null for a phone that opened after the fact (no staged reveal to wait for).
 */
export const useResultArrival = (
  activeQuestionId: string | null,
  latestResultQuestionId: string | null,
): number | null => {
  const [watched, setWatched] = useState<string | null>(null);
  const [arrival, setArrival] = useState<Arrival | null>(null);
  if (activeQuestionId !== null && watched !== activeQuestionId) setWatched(activeQuestionId);
  if (
    activeQuestionId === null &&
    latestResultQuestionId !== null &&
    watched === latestResultQuestionId &&
    arrival?.questionId !== latestResultQuestionId
  ) {
    setArrival({ questionId: latestResultQuestionId, at: Date.now() });
  }
  return arrival !== null && arrival.questionId === latestResultQuestionId ? arrival.at : null;
};
