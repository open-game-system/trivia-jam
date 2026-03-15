import { useEffect, useState } from "react";

type CurrentQuestion = {
  questionId: string;
  startTime: number;
  answers: Array<{
    playerId: string;
    playerName: string;
    value: number | string;
    timestamp: number;
  }>;
} | null;

export function useQuestionTimer(
  currentQuestion: CurrentQuestion,
  answerTimeWindow: number,
  isQuestionActive: boolean
): number {
  const [timeLeft, setTimeLeft] = useState(0);

  useEffect(() => {
    if (!currentQuestion || !isQuestionActive) {
      setTimeLeft(0);
      return;
    }

    const calculateTimeLeft = () =>
      Math.max(
        0,
        Math.ceil(
          (currentQuestion.startTime +
            answerTimeWindow * 1000 -
            Date.now()) /
            1000
        )
      );

    setTimeLeft(calculateTimeLeft());

    const timer = setInterval(() => {
      const newTimeLeft = calculateTimeLeft();
      setTimeLeft(newTimeLeft);

      if (newTimeLeft <= 0) {
        clearInterval(timer);
      }
    }, 100);

    return () => {
      clearInterval(timer);
    };
  }, [currentQuestion, answerTimeWindow, isQuestionActive]);

  return timeLeft;
}
