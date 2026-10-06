import { describe, expect, it } from "vitest";
import type { Answer, GamePublicContext, Question } from "../game.types";
import { declareWinner, settleQuestion } from "./standings";

const START = 1_000;

const NUMERIC: Record<string, Question> = {
  q1: { id: "q1", text: "2+2?", correctAnswer: 4, questionType: "numeric" },
  q2: { id: "q2", text: "3+3?", correctAnswer: 6, questionType: "numeric" },
};

function answer(playerId: string, value: number | string, afterMs: number): Answer {
  return { playerId, playerName: playerId.toUpperCase(), value, timestamp: START + afterMs };
}

function game(overrides: Partial<GamePublicContext> = {}): GamePublicContext {
  return {
    id: "g",
    hostId: "host",
    hostName: "Host",
    players: [
      { id: "a", name: "A", score: 0 },
      { id: "b", name: "B", score: 0 },
      { id: "c", name: "C", score: 0 },
    ],
    currentQuestion: null,
    winner: null,
    settings: { maxPlayers: 30, answerTimeWindow: 25 },
    questions: NUMERIC,
    questionResults: [],
    questionNumber: 1,
    ...overrides,
  };
}

function asked(answers: Answer[], questionNumber = 1, overrides: Partial<GamePublicContext> = {}) {
  return game({
    questionNumber,
    currentQuestion: { questionId: `q${questionNumber}`, startTime: START, answers },
    ...overrides,
  });
}

const scoreOf = (g: GamePublicContext, id: string) => g.players.find((p) => p.id === id)?.score;

describe("settleQuestion", () => {
  it("returns the same game when no question is being asked", () => {
    const before = game();
    expect(settleQuestion(before)).toBe(before);
  });

  it("adds each player's points for the question to their score", () => {
    const after = settleQuestion(
      asked([answer("a", 4, 1_000), answer("b", 5, 2_000), answer("c", 9, 3_000)], 1, {
        players: [
          { id: "a", name: "A", score: 10 },
          { id: "b", name: "B", score: 0 },
          { id: "c", name: "C", score: 1 },
        ],
      })
    );
    expect(scoreOf(after, "a")).toBe(14);
    expect(scoreOf(after, "b")).toBe(3);
    expect(scoreOf(after, "c")).toBe(3);
  });

  it("leaves the score of a player who did not answer unchanged", () => {
    const after = settleQuestion(asked([answer("a", 4, 1_000)]));
    expect(scoreOf(after, "b")).toBe(0);
    expect(scoreOf(after, "c")).toBe(0);
  });

  it("ignores points for an answer from someone no longer in the game", () => {
    const after = settleQuestion(asked([answer("gone", 4, 500), answer("a", 4, 1_000)]));
    expect(after.players.map((p) => p.id)).toEqual(["a", "b", "c"]);
    expect(after.questionResults[0].scores.map((s) => s.playerId)).toEqual(["gone", "a"]);
    expect(scoreOf(after, "a")).toBe(3);
  });

  it("records the question result with its answers and scores", () => {
    const answers = [answer("a", 4, 1_000), answer("b", 3, 2_000)];
    const after = settleQuestion(asked(answers));
    expect(after.questionResults).toEqual([
      {
        questionId: "q1",
        questionNumber: 1,
        answers,
        scores: [
          { playerId: "a", playerName: "A", points: 4, position: 1, timeTaken: 1 },
          { playerId: "b", playerName: "B", points: 3, position: 2, timeTaken: 2 },
        ],
      },
    ]);
  });

  it("appends to earlier question results", () => {
    const earlier = { questionId: "q1", questionNumber: 1, answers: [], scores: [] };
    const after = settleQuestion(asked([], 2, { questionResults: [earlier] }));
    expect(after.questionResults.map((r) => r.questionId)).toEqual(["q1", "q2"]);
  });

  it("clears the current question", () => {
    expect(settleQuestion(asked([answer("a", 4, 1_000)])).currentQuestion).toBeNull();
  });

  it("does not name a winner before the last question", () => {
    expect(settleQuestion(asked([answer("a", 4, 1_000)], 1)).winner).toBeNull();
  });

  it("names the leader as winner after the last question", () => {
    const after = settleQuestion(asked([answer("b", 6, 1_000), answer("a", 7, 2_000)], 2));
    expect(after.winner).toBe("b");
  });

  it("breaks a tie after the last question in favour of the earliest joiner", () => {
    const after = settleQuestion(
      asked([], 2, {
        players: [
          { id: "a", name: "A", score: 1 },
          { id: "b", name: "B", score: 5 },
          { id: "c", name: "C", score: 5 },
        ],
      })
    );
    expect(after.winner).toBe("b");
  });

  it("scores a multiple-choice question by correctness and speed", () => {
    const after = settleQuestion(
      asked([answer("a", "Paris", 2_000), answer("b", "Paris", 1_000), answer("c", "Rome", 500)], 1, {
        questions: {
          q1: {
            id: "q1",
            text: "Capital of France?",
            correctAnswer: "Paris",
            questionType: "multiple-choice",
            options: ["Paris", "Rome"],
          },
        },
      })
    );
    expect(scoreOf(after, "b")).toBe(4);
    expect(scoreOf(after, "a")).toBe(3);
    expect(scoreOf(after, "c")).toBe(0);
    expect(after.winner).toBe("b");
  });

  it("does not modify the game it was given", () => {
    const before = asked([answer("a", 4, 1_000)], 2);
    const snapshot = structuredClone(before);
    settleQuestion(before);
    expect(before).toEqual(snapshot);
  });
});

describe("declareWinner", () => {
  it("names the player with the highest score", () => {
    const after = declareWinner(
      game({
        players: [
          { id: "a", name: "A", score: 3 },
          { id: "b", name: "B", score: 9 },
          { id: "c", name: "C", score: 4 },
        ],
      })
    );
    expect(after.winner).toBe("b");
  });

  it("breaks a tie in favour of the latest joiner", () => {
    const after = declareWinner(
      game({
        players: [
          { id: "a", name: "A", score: 5 },
          { id: "b", name: "B", score: 5 },
          { id: "c", name: "C", score: 1 },
        ],
      })
    );
    expect(after.winner).toBe("b");
  });

  it("does not modify the game it was given", () => {
    const before = game();
    const snapshot = structuredClone(before);
    declareWinner(before);
    expect(before).toEqual(snapshot);
  });
});
