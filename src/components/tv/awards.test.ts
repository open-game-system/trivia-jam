import { describe, expect, it } from "vitest";
import type { Question, QuestionResult } from "~/game.types";
import { computeAwards } from "./awards";

const questions: Record<string, Question> = {
  q1: { id: "q1", text: "Legs on a spider?", correctAnswer: 8, questionType: "numeric" },
  q2: { id: "q2", text: "Days in a week?", correctAnswer: 7, questionType: "numeric" },
  q3: { id: "q3", text: "Biggest planet?", correctAnswer: "Jupiter", questionType: "multiple-choice", options: ["Mars", "Jupiter"] },
  q4: { id: "q4", text: "Minutes in an hour?", correctAnswer: 60, questionType: "numeric" },
};

const result = (
  questionId: string,
  rows: Array<[id: string, name: string, value: number | string, points: number, seconds: number]>,
): QuestionResult => ({
  questionId,
  questionNumber: 1,
  answers: rows.map(([playerId, playerName, value]) => ({ playerId, playerName, value, timestamp: 0 })),
  scores: rows.map(([playerId, playerName, , points, timeTaken], i) => ({ playerId, playerName, points, position: i + 1, timeTaken })),
});

const GAME = [
  result("q1", [
    ["mom", "Mom", 8, 4, 6.2],
    ["sam", "Sam", 8, 3, 9.0],
    ["gp", "Grandpa", 6, 2, 4.0],
  ]),
  result("q2", [
    ["mom", "Mom", 7, 4, 3.1],
    ["sam", "Sam", 9, 2, 1.8],
    ["gp", "Grandpa", 8, 3, 5.0],
  ]),
  result("q3", [
    ["mom", "Mom", "Jupiter", 4, 2.5],
    ["sam", "Sam", "Mars", 0, 1.2],
    ["gp", "Grandpa", "B", 3, 7.0],
  ]),
  result("q4", [
    ["mom", "Mom", 60, 4, 5.0],
    ["gp", "Grandpa", 60, 3, 6.0],
    ["sam", "Sam", 100, 2, 3.0],
  ]),
];

describe("computeAwards", () => {
  it("names who got the most questions bang on, counting right choices", () => {
    const most = computeAwards(GAME, questions).find((a) => a.id === "most-exact");
    expect(most?.names).toEqual(["Mom"]);
    expect(most?.detail).toBe("×4");
  });

  it("names the closest miss with how far off it was", () => {
    const closest = computeAwards(GAME, questions).find((a) => a.id === "closest-call");
    expect(closest?.names).toEqual(["Grandpa"]);
    expect(closest?.detail).toBe("off by 1");
  });

  it("names the fastest answer that scored", () => {
    const fastest = computeAwards(GAME, questions).find((a) => a.id === "fastest");
    expect(fastest?.names).toEqual(["Sam"]);
    expect(fastest?.detail).toBe("1.8 s");
  });

  it("shares an award on a tie", () => {
    const tied = [
      result("q1", [
        ["mom", "Mom", 8, 4, 2],
        ["sam", "Sam", 8, 3, 3],
      ]),
    ];
    expect(computeAwards(tied, questions).find((a) => a.id === "most-exact")?.names).toEqual(["Mom", "Sam"]);
  });

  it("gives no award nobody earned", () => {
    const flop = [result("q1", [["sam", "Sam", 3, 0, 4]])];
    const awards = computeAwards(flop, questions);
    expect(awards.find((a) => a.id === "most-exact")).toBeUndefined();
    expect(awards.find((a) => a.id === "fastest")).toBeUndefined();
    expect(awards.find((a) => a.id === "closest-call")?.detail).toBe("off by 5");
  });

  it("is empty for a game with no results", () => {
    expect(computeAwards([], questions)).toEqual([]);
  });

  it("ignores results whose question is gone", () => {
    expect(computeAwards([result("zz", [["a", "A", 1, 3, 1]])], questions).find((a) => a.id === "most-exact")).toBeUndefined();
  });
});
