import { describe, expect, it } from "vitest";
import { sittingReport } from "./sitting";

const base = { gameId: "g1", origin: "https://triviajam.tv", questionNumber: 0, totalQuestions: 5, winnerName: null };

describe("sittingReport", () => {
  it("labels the lobby", () => {
    expect(sittingReport({ ...base, phase: "lobby" })).toEqual({
      instanceId: "trivia-jam:g1",
      appId: "trivia-jam",
      status: "lobby",
      title: "Getting ready",
      resumeUrl: "https://triviajam.tv/games/g1",
    });
  });

  it("labels a game in progress with the question it's on", () => {
    expect(sittingReport({ ...base, phase: "active", questionNumber: 3 })).toMatchObject({ status: "active", title: "Question 3 of 5" });
  });

  it("says who won when it's over", () => {
    expect(sittingReport({ ...base, phase: "finished", questionNumber: 5, winnerName: "Mom" })).toMatchObject({
      status: "completed",
      title: "Mom won",
    });
  });

  it("before the first question starts, says the game has started", () => {
    expect(sittingReport({ ...base, phase: "active", questionNumber: 0 })).toMatchObject({ status: "active", title: "Starting" });
  });
});
