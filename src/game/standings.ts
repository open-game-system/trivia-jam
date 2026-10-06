import { produce } from "immer";
import type { GamePublicContext } from "../game.types";
import { calculateScores } from "./scoring";

/**
 * Standings: how a game's players, question results and winner change when a
 * question closes or the host ends the game. Pure; the game machine calls these
 * from its actions.
 */

/**
 * Close the question being asked: score its answers, add each seated player's
 * (rounded) points to their score, record the question result, and clear the
 * current question. After the last question, the leader is named winner; a tie
 * goes to the earliest joiner.
 *
 * Returns the same game when no question is being asked.
 */
export function settleQuestion(game: GamePublicContext): GamePublicContext {
  return produce(game, (draft) => {
    if (!draft.currentQuestion) return;

    const question = draft.questions[draft.currentQuestion.questionId];
    const scores = calculateScores(
      draft.currentQuestion.answers,
      question,
      draft.currentQuestion.startTime
    );

    scores.forEach((score) => {
      const player = draft.players.find((p) => p.id === score.playerId);
      if (player) {
        player.score += Math.round(score.points);
      }
    });

    draft.questionResults.push({
      questionId: draft.currentQuestion.questionId,
      questionNumber: draft.questionNumber,
      answers: draft.currentQuestion.answers,
      scores,
    });

    draft.currentQuestion = null;

    if (draft.questionNumber >= Object.keys(draft.questions).length) {
      const maxScore = Math.max(...draft.players.map((p) => p.score));
      const winners = draft.players.filter((p) => p.score === maxScore);
      draft.winner = winners[0].id;
    }
  });
}

/**
 * Name the leader as winner when the host ends the game. A tie goes to the
 * latest joiner (unlike settleQuestion, whose tie goes to the earliest).
 */
export function declareWinner(game: GamePublicContext): GamePublicContext {
  return produce(game, (draft) => {
    draft.winner = draft.players.reduce((a, b) => (a.score > b.score ? a : b)).id;
  });
}
