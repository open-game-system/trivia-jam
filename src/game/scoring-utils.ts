/**
 * Determines if a numeric answer is "close" to the correct answer (within 10%).
 * When correctAnswer is 0, uses absolute threshold of ±0.1 instead of percentage.
 */
export const isCloseNumericAnswer = (
  answerValue: string | number,
  correctAnswer: string | number,
): boolean => {
  const numAnswer = Number(answerValue);
  const numCorrect = Number(correctAnswer);

  if (!Number.isFinite(numAnswer) || !Number.isFinite(numCorrect)) return false;

  if (numCorrect === 0) {
    return Math.abs(numAnswer) < 0.1;
  }

  return Math.abs(numAnswer - numCorrect) / Math.abs(numCorrect) < 0.1;
};
