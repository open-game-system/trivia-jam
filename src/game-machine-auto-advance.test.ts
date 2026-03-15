import { describe, expect, it, vi } from "vitest";
import { createActor } from "xstate";
import { gameMachine } from "./game.machine";

// Mock the Gemini parseQuestionsDocument actor to avoid live API calls
vi.mock("./gemini", () => ({
  parseQuestionsDocument: vi.fn(),
}));

describe("game machine auto-advance", () => {
  function createTestActor() {
    const actor = createActor(gameMachine, {
      input: {
        id: "test-game",
        hostName: "TestHost",
        caller: { type: "client" as const, id: "host-1" },
      } as any,
    });
    actor.start();
    return actor;
  }

  function seedQuestions(actor: ReturnType<typeof createTestActor>) {
    actor.send({
      type: "QUESTIONS_PARSED",
      questions: {
        q1: {
          id: "q1",
          text: "What is 2+2?",
          correctAnswer: 4,
          questionType: "numeric" as const,
        },
        q2: {
          id: "q2",
          text: "What is 3+3?",
          correctAnswer: 6,
          questionType: "numeric" as const,
        },
      },
      caller: { type: "client" as const, id: "host-1" },
    } as any);
  }

  function joinPlayer(
    actor: ReturnType<typeof createTestActor>,
    playerId: string,
    playerName: string
  ) {
    actor.send({
      type: "JOIN_GAME",
      playerName,
      caller: { type: "client" as const, id: playerId },
    } as any);
  }

  it("advances to questionPrep when all players have answered", async () => {
    const actor = createTestActor();

    // Seed questions and join 2 players
    seedQuestions(actor);
    joinPlayer(actor, "player-1", "Alice");
    joinPlayer(actor, "player-2", "Bob");

    // Start game
    actor.send({
      type: "START_GAME",
      caller: { type: "client" as const, id: "host-1" },
    } as any);

    // Start first question
    actor.send({
      type: "NEXT_QUESTION",
      caller: { type: "client" as const, id: "host-1" },
    } as any);

    // Verify we're in questionActive
    expect(actor.getSnapshot().value).toEqual({ active: "questionActive" });

    // Player 1 submits
    actor.send({
      type: "SUBMIT_ANSWER",
      value: 4,
      caller: { type: "client" as const, id: "player-1" },
    } as any);

    // Should still be in questionActive (1 of 2 players answered)
    expect(actor.getSnapshot().value).toEqual({ active: "questionActive" });
    expect(
      actor.getSnapshot().context.public.currentQuestion?.answers.length
    ).toBe(1);

    // Player 2 submits
    actor.send({
      type: "SUBMIT_ANSWER",
      value: 5,
      caller: { type: "client" as const, id: "player-2" },
    } as any);

    // Should auto-advance to questionPrep (all players answered)
    expect(actor.getSnapshot().value).toEqual({ active: "questionPrep" });
    // currentQuestion should be null after processing
    expect(actor.getSnapshot().context.public.currentQuestion).toBeNull();
    // questionResults should have 1 entry
    expect(actor.getSnapshot().context.public.questionResults.length).toBe(1);
  });

  it("still auto-advances even if a player submits a duplicate answer", () => {
    const actor = createTestActor();

    seedQuestions(actor);
    joinPlayer(actor, "player-1", "Alice");
    joinPlayer(actor, "player-2", "Bob");

    actor.send({
      type: "START_GAME",
      caller: { type: "client" as const, id: "host-1" },
    } as any);

    actor.send({
      type: "NEXT_QUESTION",
      caller: { type: "client" as const, id: "host-1" },
    } as any);

    // Player 1 submits
    actor.send({
      type: "SUBMIT_ANSWER",
      value: 4,
      caller: { type: "client" as const, id: "player-1" },
    } as any);

    // Should still be in questionActive (only 1 unique player answered)
    expect(actor.getSnapshot().value).toEqual({ active: "questionActive" });

    // Player 1 submits AGAIN (duplicate)
    actor.send({
      type: "SUBMIT_ANSWER",
      value: 5,
      caller: { type: "client" as const, id: "player-1" },
    } as any);

    // Should STILL be in questionActive — player-2 hasn't answered yet.
    // Bug: the current guard counts answers.length (2) + 1 = 3 !== 2,
    // but on the FIRST duplicate it was answers.length (1) + 1 = 2 === 2
    // which triggers premature auto-advance.
    // Fix: count unique player IDs in answers instead of answers.length.
    expect(actor.getSnapshot().value).toEqual({ active: "questionActive" });

    // Player 2 submits — now all unique players have answered
    actor.send({
      type: "SUBMIT_ANSWER",
      value: 6,
      caller: { type: "client" as const, id: "player-2" },
    } as any);

    // Should now auto-advance (all unique players answered)
    expect(actor.getSnapshot().value).toEqual({ active: "questionPrep" });
  });

  it("does not advance when only some players have answered", () => {
    const actor = createTestActor();

    seedQuestions(actor);
    joinPlayer(actor, "player-1", "Alice");
    joinPlayer(actor, "player-2", "Bob");
    joinPlayer(actor, "player-3", "Charlie");

    actor.send({
      type: "START_GAME",
      caller: { type: "client" as const, id: "host-1" },
    } as any);

    actor.send({
      type: "NEXT_QUESTION",
      caller: { type: "client" as const, id: "host-1" },
    } as any);

    // Player 1 submits
    actor.send({
      type: "SUBMIT_ANSWER",
      value: 4,
      caller: { type: "client" as const, id: "player-1" },
    } as any);

    // Should still be in questionActive (1 of 3)
    expect(actor.getSnapshot().value).toEqual({ active: "questionActive" });

    // Player 2 submits
    actor.send({
      type: "SUBMIT_ANSWER",
      value: 4,
      caller: { type: "client" as const, id: "player-2" },
    } as any);

    // Should still be in questionActive (2 of 3)
    expect(actor.getSnapshot().value).toEqual({ active: "questionActive" });

    // Player 3 submits
    actor.send({
      type: "SUBMIT_ANSWER",
      value: 4,
      caller: { type: "client" as const, id: "player-3" },
    } as any);

    // Now should advance (3 of 3)
    expect(actor.getSnapshot().value).toEqual({ active: "questionPrep" });
  });
});
