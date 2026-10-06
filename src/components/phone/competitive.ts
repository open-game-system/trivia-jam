import type { Outcome } from "./outcome";

type Scored = { playerId: string; playerName: string; points: number; timeTaken: number };

const GROUPING = new Intl.NumberFormat("en-US", { maximumFractionDigits: 20 });

/** 1000000 -> "1,000,000". Anything that is not a plain number is returned as it came. */
export const formatNumber = (value: string | number): string => {
  if (value === "") return "";
  const n = typeof value === "number" ? value : /^-?\d+(\.\d+)?$/.test(value) ? Number(value) : NaN;
  return Number.isFinite(n) ? GROUPING.format(n) : String(value);
};

/** How far a numeric guess was from the answer; null when there is no distance to talk about. */
export const offBy = (
  question: { questionType: "numeric" | "multiple-choice"; correctAnswer: string | number },
  answer: string | number | undefined,
): number | null => {
  if (answer === undefined || question.questionType !== "numeric") return null;
  const distance = Math.abs(Number(answer) - Number(question.correctAnswer));
  return Number.isFinite(distance) ? distance : null;
};

const ranked = (scores: readonly Scored[]): Scored[] =>
  [...scores].sort((a, b) => (b.points !== a.points ? b.points - a.points : a.timeTaken - b.timeTaken));

/** Where you finished on this one question (points, then speed). */
export const placeOnQuestion = (
  scores: readonly Scored[],
  playerId: string,
): { place: number; of: number } | null => {
  const order = ranked(scores);
  const index = order.findIndex((s) => s.playerId === playerId);
  return index < 0 ? null : { place: index + 1, of: order.length };
};

/** Everyone who finished above you on this question, best first. */
export const beatenBy = (scores: readonly Scored[], playerId: string): string[] => {
  const order = ranked(scores);
  const index = order.findIndex((s) => s.playerId === playerId);
  return index < 0 ? [] : order.slice(0, index).map((s) => s.playerName);
};

/** The one number that matters after "did I score": how far off. */
export const standingFact = (
  outcome: Outcome,
  distance: number | null,
  questionType: "numeric" | "multiple-choice",
): string | null => {
  if (questionType !== "numeric" || outcome === "none" || distance === null) return null;
  return distance === 0 ? "Dead on" : `Off by ${formatNumber(distance)}`;
};

/** One dry line under the result, built from the facts. */
export const quip = ({
  outcome,
  points,
  place,
  beatenBy: beaten,
}: {
  outcome: Outcome;
  points: number;
  place: number | null;
  beatenBy: readonly string[];
}): string => {
  if (outcome === "none") return "The clock won this one.";
  if (points <= 0) return "No points. Moving on.";
  const rival = beaten[0];
  if (place === 1 || rival === undefined) {
    return outcome === "exact" ? "Nobody got closer." : "Closest in the room.";
  }
  if (outcome === "exact") return `On the number, but ${rival} was faster.`;
  return `${rival} was closer.`;
};

/** Game over: the margin that decides bragging rights. `table` is sorted best first. */
export const finishMargin = (
  table: readonly { id: string; name: string; score: number }[],
  meId: string,
): string | null => {
  const index = table.findIndex((p) => p.id === meId);
  const me = table[index];
  const winner = table[0];
  if (!me || !winner || table.length < 2) return null;
  if (index === 0) {
    const lead = me.score - (table[1]?.score ?? 0);
    return lead === 0 ? "Tied on points." : `Won by ${formatNumber(lead)}.`;
  }
  const gap = winner.score - me.score;
  return gap === 0 ? `Tied with ${winner.name}.` : `${formatNumber(gap)} behind ${winner.name}.`;
};
