import { isCloseNumericAnswer } from "~/game/scoring-utils";

export type Outcome = "exact" | "close" | "miss" | "none";

export const describeOutcome = (
  question: { questionType: "numeric" | "multiple-choice"; correctAnswer: string | number },
  answer: string | number | undefined,
): Outcome => {
  if (answer === undefined) return "none";
  if (question.questionType === "multiple-choice") {
    return answer === question.correctAnswer ? "exact" : "miss";
  }
  if (Number(answer) === Number(question.correctAnswer)) return "exact";
  return isCloseNumericAnswer(answer, question.correctAnswer) ? "close" : "miss";
};

export const ordinal = (n: number): string => {
  const mod100 = n % 100;
  if (mod100 >= 11 && mod100 <= 13) return `${n}th`;
  const endings: Record<number, string> = { 1: "st", 2: "nd", 3: "rd" };
  return `${n}${endings[n % 10] ?? "th"}`;
};
