/**
 * Recap awards for the finale, worked out from the game's question results.
 * Pure, so the TV and its tests agree on who earned what.
 */
import type { Question, QuestionResult } from "~/game.types";
import { matchOptionIndex, toNumber } from "./tv-model";

export type AwardId = "most-exact" | "closest-call" | "fastest";

export type Award = { id: AwardId; title: string; names: string[]; playerIds: string[]; detail: string };

type Hit = { playerId: string; name: string };

const isRight = (question: Question, value: string | number): boolean => {
  if (question.questionType === "multiple-choice" && question.options && question.options.length > 0) {
    const right = matchOptionIndex(question.correctAnswer, question.options);
    return right >= 0 && matchOptionIndex(value, question.options) === right;
  }
  const guess = toNumber(value);
  const target = toNumber(question.correctAnswer);
  return guess !== null && target !== null && guess === target;
};

/** Everyone tied on the best score, in the order they first appear. */
const best = (scores: Map<string, { hit: Hit; value: number }>, better: (a: number, b: number) => boolean) => {
  let top: number | null = null;
  for (const { value } of scores.values()) if (top === null || better(value, top)) top = value;
  if (top === null) return null;
  const winners = [...scores.values()].filter((s) => s.value === top).map((s) => s.hit);
  return { value: top, winners };
};

const award = (id: AwardId, title: string, winners: Hit[], detail: string): Award => ({
  id,
  title,
  names: winners.map((w) => w.name),
  playerIds: winners.map((w) => w.playerId),
  detail,
});

const roundTo = (n: number, places: number) => Number(n.toFixed(places));

export const computeAwards = (results: ReadonlyArray<QuestionResult>, questions: Readonly<Record<string, Question>>): Award[] => {
  const exact = new Map<string, { hit: Hit; value: number }>();
  const nearMiss = new Map<string, { hit: Hit; value: number }>();
  const fastest = new Map<string, { hit: Hit; value: number }>();
  for (const result of results) {
    const question = questions[result.questionId];
    if (!question) continue;
    const target = question.questionType === "numeric" ? toNumber(question.correctAnswer) : null;
    for (const a of result.answers) {
      const hit = { playerId: a.playerId, name: a.playerName };
      if (isRight(question, a.value)) {
        exact.set(a.playerId, { hit, value: (exact.get(a.playerId)?.value ?? 0) + 1 });
      }
      const guess = toNumber(a.value);
      if (target !== null && guess !== null && guess !== target) {
        const miss = Math.abs(guess - target);
        const prev = nearMiss.get(a.playerId)?.value;
        if (prev === undefined || miss < prev) nearMiss.set(a.playerId, { hit, value: miss });
      }
    }
    for (const s of result.scores) {
      if (s.points <= 0 || !(s.timeTaken > 0)) continue;
      const prev = fastest.get(s.playerId)?.value;
      if (prev === undefined || s.timeTaken < prev) fastest.set(s.playerId, { hit: { playerId: s.playerId, name: s.playerName }, value: s.timeTaken });
    }
  }
  const awards: Award[] = [];
  const mostExact = best(exact, (a, b) => a > b);
  if (mostExact) awards.push(award("most-exact", "Most exact", mostExact.winners, `×${mostExact.value}`));
  const closest = best(nearMiss, (a, b) => a < b);
  if (closest) awards.push(award("closest-call", "Closest call", closest.winners, `off by ${roundTo(closest.value, 2)}`));
  const quickest = best(fastest, (a, b) => a < b);
  if (quickest) awards.push(award("fastest", "Fastest finger", quickest.winners, `${roundTo(quickest.value, 1)} s`));
  return awards;
};
