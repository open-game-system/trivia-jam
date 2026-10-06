import { quip } from "./competitive";
import { resultHeadline, type Outcome } from "./outcome";

type Question = { questionType: "numeric" | "multiple-choice"; correctAnswer: string | number };
export type Band = "dead-on" | "close" | "decent" | "fair" | "far";

/** How far off a numeric guess was, as a share of the answer (absolute distance when the answer is 0). */
export const relativeError = (question: Question, answer: string | number | undefined): number | null => {
  if (answer === undefined || question.questionType !== "numeric") return null;
  const guess = Number(answer);
  const truth = Number(question.correctAnswer);
  if (!Number.isFinite(guess) || !Number.isFinite(truth)) return null;
  const distance = Math.abs(guess - truth);
  return truth === 0 ? distance : distance / Math.abs(truth);
};

export const closenessBand = (error: number): Band => {
  if (error === 0) return "dead-on";
  if (error <= 0.05) return "close";
  if (error <= 0.2) return "decent";
  if (error <= 0.5) return "fair";
  return "far";
};

/**
 * The big word on the result card, matched to how close the guess really was.
 * The 20-50% band keeps "GOOD GUESS!" because e2e (flow-07) and a story pin it.
 */
export const honestHeadline = (
  outcome: Outcome,
  points: number,
  questionType: "numeric" | "multiple-choice",
  error: number | null,
): string => {
  if (outcome === "exact" || outcome === "none" || points <= 0 || error === null) {
    return resultHeadline(outcome, points, questionType);
  }
  switch (closenessBand(error)) {
    case "dead-on":
      return resultHeadline("exact", points, questionType);
    case "close":
      return "SO CLOSE!";
    case "decent":
      return "NOT BAD.";
    case "fair":
      return "GOOD GUESS!";
    case "far":
      return "WAY OFF.";
  }
};

const BAND_LINE: Record<Exclude<Band, "dead-on">, string> = {
  close: "A rounding error away.",
  decent: "Respectable. Not winning, but respectable.",
  fair: "Same neighbourhood. Different street.",
  far: "Points for showing up.",
};

/** One dry line under the result, true to the distance. */
export const honestQuip = (facts: {
  outcome: Outcome;
  points: number;
  place: number | null;
  beatenBy: readonly string[];
  relativeError: number | null;
}): string => {
  const { relativeError: error, ...plain } = facts;
  if (plain.outcome === "exact" || plain.outcome === "none" || error === null) return quip(plain);
  const band = closenessBand(error);
  if (band === "dead-on") return quip({ ...plain, outcome: "exact" });
  if (plain.points <= 0) {
    return band === "far" || band === "fair" ? "No points. Not even close." : "No points, but not far off.";
  }
  return BAND_LINE[band];
};
