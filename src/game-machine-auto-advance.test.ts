import { describe, expect, it, vi } from "vitest";
import {
  createTestActor,
  hostSend,
  playerSend,
  TWO_QUESTIONS,
} from "~/test/game-test-helpers";

// Mock the Gemini parseQuestionsDocument actor to avoid live API calls
vi.mock("./gemini", () => ({
  parseQuestionsDocument: vi.fn(),
}));

describe("game machine auto-advance", () => {
  it("advances to questionPrep when all players have answered", async () => {
    const actor = createTestActor();

    // Seed questions and join 2 players
    hostSend(actor, { type: "QUESTIONS_PARSED", questions: TWO_QUESTIONS });
    playerSend(actor, "player-1", { type: "JOIN_GAME", playerName: "Alice" });
    playerSend(actor, "player-2", { type: "JOIN_GAME", playerName: "Bob" });

    // Start game
    hostSend(actor, { type: "START_GAME" });

    // Start first question
    hostSend(actor, { type: "NEXT_QUESTION" });

    // Verify we're in questionActive
    expect(actor.getSnapshot().value).toEqual({ active: "questionActive" });

    // Player 1 submits
    playerSend(actor, "player-1", { type: "SUBMIT_ANSWER", value: 4 });

    // Should still be in questionActive (1 of 2 players answered)
    expect(actor.getSnapshot().value).toEqual({ active: "questionActive" });
    expect(
      actor.getSnapshot().context.public.currentQuestion?.answers.length
    ).toBe(1);

    // Player 2 submits
    playerSend(actor, "player-2", { type: "SUBMIT_ANSWER", value: 5 });

    // Should auto-advance to questionPrep (all players answered)
    expect(actor.getSnapshot().value).toEqual({ active: "questionPrep" });
    // currentQuestion should be null after processing
    expect(actor.getSnapshot().context.public.currentQuestion).toBeNull();
    // questionResults should have 1 entry
    expect(actor.getSnapshot().context.public.questionResults.length).toBe(1);
  });

  it("still auto-advances even if a player submits a duplicate answer", () => {
    const actor = createTestActor();

    hostSend(actor, { type: "QUESTIONS_PARSED", questions: TWO_QUESTIONS });
    playerSend(actor, "player-1", { type: "JOIN_GAME", playerName: "Alice" });
    playerSend(actor, "player-2", { type: "JOIN_GAME", playerName: "Bob" });

    hostSend(actor, { type: "START_GAME" });

    hostSend(actor, { type: "NEXT_QUESTION" });

    // Player 1 submits
    playerSend(actor, "player-1", { type: "SUBMIT_ANSWER", value: 4 });

    // Should still be in questionActive (only 1 unique player answered)
    expect(actor.getSnapshot().value).toEqual({ active: "questionActive" });

    // Player 1 submits AGAIN (duplicate)
    playerSend(actor, "player-1", { type: "SUBMIT_ANSWER", value: 5 });

    // Should STILL be in questionActive — player-2 hasn't answered yet.
    // Bug: the current guard counts answers.length (2) + 1 = 3 !== 2,
    // but on the FIRST duplicate it was answers.length (1) + 1 = 2 === 2
    // which triggers premature auto-advance.
    // Fix: count unique player IDs in answers instead of answers.length.
    expect(actor.getSnapshot().value).toEqual({ active: "questionActive" });

    // Player 2 submits — now all unique players have answered
    playerSend(actor, "player-2", { type: "SUBMIT_ANSWER", value: 6 });

    // Should now auto-advance (all unique players answered)
    expect(actor.getSnapshot().value).toEqual({ active: "questionPrep" });
  });

  it("does not advance when only some players have answered", () => {
    const actor = createTestActor();

    hostSend(actor, { type: "QUESTIONS_PARSED", questions: TWO_QUESTIONS });
    playerSend(actor, "player-1", { type: "JOIN_GAME", playerName: "Alice" });
    playerSend(actor, "player-2", { type: "JOIN_GAME", playerName: "Bob" });
    playerSend(actor, "player-3", { type: "JOIN_GAME", playerName: "Charlie" });

    hostSend(actor, { type: "START_GAME" });

    hostSend(actor, { type: "NEXT_QUESTION" });

    // Player 1 submits
    playerSend(actor, "player-1", { type: "SUBMIT_ANSWER", value: 4 });

    // Should still be in questionActive (1 of 3)
    expect(actor.getSnapshot().value).toEqual({ active: "questionActive" });

    // Player 2 submits
    playerSend(actor, "player-2", { type: "SUBMIT_ANSWER", value: 4 });

    // Should still be in questionActive (2 of 3)
    expect(actor.getSnapshot().value).toEqual({ active: "questionActive" });

    // Player 3 submits
    playerSend(actor, "player-3", { type: "SUBMIT_ANSWER", value: 4 });

    // Now should advance (3 of 3)
    expect(actor.getSnapshot().value).toEqual({ active: "questionPrep" });
  });
});
