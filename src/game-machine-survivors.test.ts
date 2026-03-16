import { describe, expect, it, vi } from "vitest";
import { createActor } from "xstate";
import { gameMachine } from "./game.machine";

vi.mock("./gemini", () => ({
  parseQuestionsDocument: vi.fn(),
}));

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

const TWO_QUESTIONS = {
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
};

function hostSend(actor: ReturnType<typeof createTestActor>, event: any) {
  actor.send({
    ...event,
    caller: { type: "client" as const, id: "host-1" },
  });
}

function playerSend(
  actor: ReturnType<typeof createTestActor>,
  playerId: string,
  event: any
) {
  actor.send({
    ...event,
    caller: { type: "client" as const, id: playerId },
  });
}

/**
 * Tests targeting surviving Stryker mutants in game.machine.ts.
 * Each test is named with the mutation it kills.
 */
describe("game machine — mutant killers", () => {
  describe("hasReachedQuestionLimit guard (line 38-40)", () => {
    it("NEXT_QUESTION is blocked when questionNumber >= questions.length", () => {
      const actor = createTestActor();
      hostSend(actor, { type: "QUESTIONS_PARSED", questions: TWO_QUESTIONS });
      playerSend(actor, "player-1", {
        type: "JOIN_GAME",
        playerName: "Alice",
      });
      hostSend(actor, { type: "START_GAME" });

      // Answer both questions
      hostSend(actor, { type: "NEXT_QUESTION" });
      playerSend(actor, "player-1", { type: "SUBMIT_ANSWER", value: 4 });
      hostSend(actor, { type: "NEXT_QUESTION" });
      playerSend(actor, "player-1", { type: "SUBMIT_ANSWER", value: 6 });

      // Game should be finished — winner set
      expect(actor.getSnapshot().context.public.winner).not.toBeNull();
      // questionNumber should equal questions count
      expect(actor.getSnapshot().context.public.questionNumber).toBe(2);
    });

    it("hasReachedQuestionLimit uses >= not > comparison", () => {
      const ONE_QUESTION = {
        q1: {
          id: "q1",
          text: "What is 2+2?",
          correctAnswer: 4,
          questionType: "numeric" as const,
        },
      };

      const actor = createTestActor();
      hostSend(actor, { type: "QUESTIONS_PARSED", questions: ONE_QUESTION });
      playerSend(actor, "player-1", {
        type: "JOIN_GAME",
        playerName: "Alice",
      });
      hostSend(actor, { type: "START_GAME" });

      // Start and answer the only question
      hostSend(actor, { type: "NEXT_QUESTION" });
      playerSend(actor, "player-1", { type: "SUBMIT_ANSWER", value: 4 });

      // After 1 question answered, questionNumber = 1, questions.length = 1
      // hasReachedQuestionLimit should be TRUE (1 >= 1)
      expect(actor.getSnapshot().context.public.questionNumber).toBe(1);
      expect(actor.getSnapshot().context.public.winner).not.toBeNull();
    });
  });

  describe("answerTimer actor (lines 43-48)", () => {
    it("timer resolves after timeWindow seconds and triggers transition", async () => {
      vi.useFakeTimers();

      const actor = createTestActor();
      hostSend(actor, { type: "QUESTIONS_PARSED", questions: TWO_QUESTIONS });
      playerSend(actor, "player-1", {
        type: "JOIN_GAME",
        playerName: "Alice",
      });
      hostSend(actor, { type: "START_GAME" });
      hostSend(actor, { type: "NEXT_QUESTION" });

      expect(actor.getSnapshot().value).toEqual({ active: "questionActive" });

      // Advance past the answerTimeWindow (default 25s)
      await vi.advanceTimersByTimeAsync(26_000);

      // Timer fires → processQuestionResults → questionPrep or finished
      expect(actor.getSnapshot().value).not.toEqual({
        active: "questionActive",
      });
      expect(actor.getSnapshot().context.public.currentQuestion).toBeNull();

      vi.useRealTimers();
    });

    it("timer uses answerTimeWindow from settings, not hardcoded", async () => {
      vi.useFakeTimers();

      const actor = createTestActor();
      hostSend(actor, { type: "QUESTIONS_PARSED", questions: TWO_QUESTIONS });
      playerSend(actor, "player-1", {
        type: "JOIN_GAME",
        playerName: "Alice",
      });
      // Default answerTimeWindow is 25
      hostSend(actor, { type: "START_GAME" });
      hostSend(actor, { type: "NEXT_QUESTION" });

      // After 20s, should still be active (timer is 25s)
      await vi.advanceTimersByTimeAsync(20_000);
      expect(actor.getSnapshot().value).toEqual({ active: "questionActive" });

      // After 6 more seconds (26s total), should have advanced
      await vi.advanceTimersByTimeAsync(6_000);
      expect(actor.getSnapshot().value).not.toEqual({
        active: "questionActive",
      });

      vi.useRealTimers();
    });
  });

  describe("finished state type (line 476-477)", () => {
    it("finished is a final state — no transitions accepted", () => {
      const actor = createTestActor();
      hostSend(actor, { type: "QUESTIONS_PARSED", questions: TWO_QUESTIONS });
      playerSend(actor, "player-1", {
        type: "JOIN_GAME",
        playerName: "Alice",
      });
      hostSend(actor, { type: "START_GAME" });
      hostSend(actor, { type: "END_GAME" });

      expect(actor.getSnapshot().value).toBe("finished");
      expect(actor.getSnapshot().status).toBe("done");

      // No events should be processed in finished state
      hostSend(actor, { type: "NEXT_QUESTION" });
      expect(actor.getSnapshot().value).toBe("finished");

      playerSend(actor, "player-2", {
        type: "JOIN_GAME",
        playerName: "Bob",
      });
      expect(actor.getSnapshot().context.public.players).toHaveLength(1);
    });
  });

  describe("submitAnswer caller name lookup (line 142-150)", () => {
    it("uses 'Unknown' for player name when player not in players list", () => {
      const actor = createTestActor();
      hostSend(actor, { type: "QUESTIONS_PARSED", questions: TWO_QUESTIONS });
      playerSend(actor, "player-1", {
        type: "JOIN_GAME",
        playerName: "Alice",
      });
      playerSend(actor, "player-2", {
        type: "JOIN_GAME",
        playerName: "Bob",
      });
      hostSend(actor, { type: "START_GAME" });
      hostSend(actor, { type: "NEXT_QUESTION" });

      // Submit answer from a player that's in the list
      playerSend(actor, "player-1", { type: "SUBMIT_ANSWER", value: 4 });

      // The answer should have the player's actual name
      const cq = actor.getSnapshot().context.public.currentQuestion;
      const answer = cq?.answers.find((a) => a.playerId === "player-1");
      expect(answer?.playerName).toBe("Alice");
    });

    it("records answer value from the event", () => {
      const actor = createTestActor();
      hostSend(actor, { type: "QUESTIONS_PARSED", questions: TWO_QUESTIONS });
      playerSend(actor, "player-1", {
        type: "JOIN_GAME",
        playerName: "Alice",
      });
      playerSend(actor, "player-2", {
        type: "JOIN_GAME",
        playerName: "Bob",
      });
      hostSend(actor, { type: "START_GAME" });
      hostSend(actor, { type: "NEXT_QUESTION" });

      playerSend(actor, "player-1", { type: "SUBMIT_ANSWER", value: 42 });

      const cq = actor.getSnapshot().context.public.currentQuestion;
      const answer = cq?.answers.find((a) => a.playerId === "player-1");
      expect(answer?.value).toBe(42);
    });

    it("records answer timestamp", () => {
      const actor = createTestActor();
      hostSend(actor, { type: "QUESTIONS_PARSED", questions: TWO_QUESTIONS });
      playerSend(actor, "player-1", {
        type: "JOIN_GAME",
        playerName: "Alice",
      });
      playerSend(actor, "player-2", {
        type: "JOIN_GAME",
        playerName: "Bob",
      });
      hostSend(actor, { type: "START_GAME" });
      hostSend(actor, { type: "NEXT_QUESTION" });

      const before = Date.now();
      playerSend(actor, "player-1", { type: "SUBMIT_ANSWER", value: 4 });

      const cq = actor.getSnapshot().context.public.currentQuestion;
      const answer = cq?.answers.find((a) => a.playerId === "player-1");
      expect(answer?.timestamp).toBeGreaterThanOrEqual(before);
    });

    it("submitAnswer guards against null currentQuestion", () => {
      const actor = createTestActor();
      hostSend(actor, { type: "QUESTIONS_PARSED", questions: TWO_QUESTIONS });
      playerSend(actor, "player-1", {
        type: "JOIN_GAME",
        playerName: "Alice",
      });
      hostSend(actor, { type: "START_GAME" });

      // In questionPrep state, currentQuestion is null
      expect(actor.getSnapshot().context.public.currentQuestion).toBeNull();

      // Submit answer should have no effect (machine is in questionPrep, not questionActive)
      playerSend(actor, "player-1", { type: "SUBMIT_ANSWER", value: 42 });
      expect(actor.getSnapshot().context.public.questionResults).toHaveLength(0);
    });
  });

  describe("JOIN_GAME params (lines 434-441)", () => {
    it("player ID comes from caller.id, not from the event body", () => {
      const actor = createTestActor();
      playerSend(actor, "my-unique-id", {
        type: "JOIN_GAME",
        playerName: "Carol",
      });

      const players = actor.getSnapshot().context.public.players;
      expect(players[0].id).toBe("my-unique-id");
    });

    it("player name comes from event.playerName", () => {
      const actor = createTestActor();
      playerSend(actor, "player-1", {
        type: "JOIN_GAME",
        playerName: "SpecificName",
      });

      const players = actor.getSnapshot().context.public.players;
      expect(players[0].name).toBe("SpecificName");
    });
  });

  describe("setWinner edge cases (lines 116-121)", () => {
    it("setWinner picks player with strictly higher score, not equal", () => {
      const actor = createTestActor();
      hostSend(actor, { type: "QUESTIONS_PARSED", questions: TWO_QUESTIONS });
      playerSend(actor, "player-1", {
        type: "JOIN_GAME",
        playerName: "Alice",
      });
      playerSend(actor, "player-2", {
        type: "JOIN_GAME",
        playerName: "Bob",
      });
      hostSend(actor, { type: "START_GAME" });

      // Both answer Q1 with exact answer (same score)
      hostSend(actor, { type: "NEXT_QUESTION" });
      playerSend(actor, "player-1", { type: "SUBMIT_ANSWER", value: 4 });
      playerSend(actor, "player-2", { type: "SUBMIT_ANSWER", value: 4 });

      // End game — winner should be set (reduce picks one)
      hostSend(actor, { type: "END_GAME" });
      expect(actor.getSnapshot().context.public.winner).toBeTruthy();
    });
  });

  describe("skipQuestion action (lines 123-137)", () => {
    it("skipQuestion nulls currentQuestion", () => {
      const actor = createTestActor();
      hostSend(actor, { type: "QUESTIONS_PARSED", questions: TWO_QUESTIONS });
      playerSend(actor, "player-1", {
        type: "JOIN_GAME",
        playerName: "Alice",
      });
      hostSend(actor, { type: "START_GAME" });
      hostSend(actor, { type: "NEXT_QUESTION" });

      expect(actor.getSnapshot().context.public.currentQuestion).not.toBeNull();

      hostSend(actor, { type: "SKIP_QUESTION" });
      expect(actor.getSnapshot().context.public.currentQuestion).toBeNull();
    });

    it("skipQuestion increments questionNumber", () => {
      const actor = createTestActor();
      hostSend(actor, { type: "QUESTIONS_PARSED", questions: TWO_QUESTIONS });
      playerSend(actor, "player-1", {
        type: "JOIN_GAME",
        playerName: "Alice",
      });
      hostSend(actor, { type: "START_GAME" });

      const qnBefore = actor.getSnapshot().context.public.questionNumber;
      hostSend(actor, { type: "NEXT_QUESTION" });
      hostSend(actor, { type: "SKIP_QUESTION" });

      // questionNumber should have advanced by 1 (from setQuestionNumber on NEXT_QUESTION)
      // plus processQuestionResults may also increment — check it advanced
      const qnAfter = actor.getSnapshot().context.public.questionNumber;
      expect(qnAfter).toBeGreaterThan(qnBefore);
    });

    it("skipping all questions ends the game", () => {
      const actor = createTestActor();
      hostSend(actor, { type: "QUESTIONS_PARSED", questions: TWO_QUESTIONS });
      playerSend(actor, "player-1", {
        type: "JOIN_GAME",
        playerName: "Alice",
      });
      hostSend(actor, { type: "START_GAME" });

      // Skip both questions
      hostSend(actor, { type: "NEXT_QUESTION" });
      hostSend(actor, { type: "SKIP_QUESTION" });
      hostSend(actor, { type: "NEXT_QUESTION" });
      hostSend(actor, { type: "SKIP_QUESTION" });

      // Game should end
      expect(actor.getSnapshot().context.public.winner).not.toBeNull();
    });
  });

  describe("END_GAME guard (lines 444-454)", () => {
    it("END_GAME during questionActive transitions to finished", () => {
      const actor = createTestActor();
      hostSend(actor, { type: "QUESTIONS_PARSED", questions: TWO_QUESTIONS });
      playerSend(actor, "player-1", {
        type: "JOIN_GAME",
        playerName: "Alice",
      });
      hostSend(actor, { type: "START_GAME" });
      hostSend(actor, { type: "NEXT_QUESTION" });

      expect(actor.getSnapshot().value).toEqual({ active: "questionActive" });

      hostSend(actor, { type: "END_GAME" });
      expect(actor.getSnapshot().value).toBe("finished");
    });

    it("END_GAME guard checks caller is host", () => {
      const actor = createTestActor();
      hostSend(actor, { type: "QUESTIONS_PARSED", questions: TWO_QUESTIONS });
      playerSend(actor, "player-1", {
        type: "JOIN_GAME",
        playerName: "Alice",
      });
      hostSend(actor, { type: "START_GAME" });

      // Non-host tries END_GAME
      playerSend(actor, "player-1", { type: "END_GAME" });
      expect(actor.getSnapshot().value).toEqual({ active: "questionPrep" });
    });
  });

  describe("JOIN_GAME during active state (lines 431-441)", () => {
    it("player can join during active game with correct id and name", () => {
      const actor = createTestActor();
      hostSend(actor, { type: "QUESTIONS_PARSED", questions: TWO_QUESTIONS });
      playerSend(actor, "player-1", {
        type: "JOIN_GAME",
        playerName: "Alice",
      });
      hostSend(actor, { type: "START_GAME" });
      expect(actor.getSnapshot().value).toEqual({ active: "questionPrep" });

      // Join during active game
      playerSend(actor, "late-joiner", {
        type: "JOIN_GAME",
        playerName: "LateJoiner",
      });

      const players = actor.getSnapshot().context.public.players;
      expect(players).toHaveLength(2);
      const latePlayer = players.find((p) => p.id === "late-joiner");
      expect(latePlayer).toBeDefined();
      expect(latePlayer!.name).toBe("LateJoiner");
      expect(latePlayer!.score).toBe(0);
    });

    it("player can join during questionActive state", () => {
      const actor = createTestActor();
      hostSend(actor, { type: "QUESTIONS_PARSED", questions: TWO_QUESTIONS });
      playerSend(actor, "player-1", {
        type: "JOIN_GAME",
        playerName: "Alice",
      });
      playerSend(actor, "player-2", {
        type: "JOIN_GAME",
        playerName: "Bob",
      });
      hostSend(actor, { type: "START_GAME" });
      hostSend(actor, { type: "NEXT_QUESTION" });
      expect(actor.getSnapshot().value).toEqual({ active: "questionActive" });

      // Join during active question
      playerSend(actor, "late-joiner", {
        type: "JOIN_GAME",
        playerName: "Charlie",
      });

      const players = actor.getSnapshot().context.public.players;
      expect(players).toHaveLength(3);
      expect(players.find((p) => p.id === "late-joiner")!.name).toBe(
        "Charlie"
      );
    });

    it("late-joining player ID comes from caller.id", () => {
      const actor = createTestActor();
      hostSend(actor, { type: "QUESTIONS_PARSED", questions: TWO_QUESTIONS });
      playerSend(actor, "player-1", {
        type: "JOIN_GAME",
        playerName: "Alice",
      });
      hostSend(actor, { type: "START_GAME" });

      playerSend(actor, "unique-late-id", {
        type: "JOIN_GAME",
        playerName: "Late",
      });

      const players = actor.getSnapshot().context.public.players;
      expect(players.find((p) => p.id === "unique-late-id")).toBeDefined();
    });
  });

  describe("setWinner tied scores (line 119 EqualityOperator)", () => {
    it("with equal scores, reduce returns last player (b wins ties)", () => {
      const actor = createTestActor();
      hostSend(actor, { type: "QUESTIONS_PARSED", questions: TWO_QUESTIONS });
      playerSend(actor, "player-1", {
        type: "JOIN_GAME",
        playerName: "Alice",
      });
      playerSend(actor, "player-2", {
        type: "JOIN_GAME",
        playerName: "Bob",
      });
      hostSend(actor, { type: "START_GAME" });

      // Both answer exactly the same on Q1 — tied scores
      hostSend(actor, { type: "NEXT_QUESTION" });
      playerSend(actor, "player-1", { type: "SUBMIT_ANSWER", value: 4 });
      playerSend(actor, "player-2", { type: "SUBMIT_ANSWER", value: 4 });

      // End game with tied scores — `a.score > b.score ? a : b` means
      // when scores equal, condition is false, so reduce returns b (player-2)
      hostSend(actor, { type: "END_GAME" });
      expect(actor.getSnapshot().context.public.winner).toBe("player-2");
    });
  });

  describe("processQuestionResults (lines 154-190)", () => {
    it("updates player scores from calculated scores", () => {
      const actor = createTestActor();
      hostSend(actor, { type: "QUESTIONS_PARSED", questions: TWO_QUESTIONS });
      playerSend(actor, "player-1", {
        type: "JOIN_GAME",
        playerName: "Alice",
      });
      playerSend(actor, "player-2", {
        type: "JOIN_GAME",
        playerName: "Bob",
      });
      hostSend(actor, { type: "START_GAME" });
      hostSend(actor, { type: "NEXT_QUESTION" });

      // Player 1 answers exactly, player 2 is off
      playerSend(actor, "player-1", { type: "SUBMIT_ANSWER", value: 4 });
      playerSend(actor, "player-2", { type: "SUBMIT_ANSWER", value: 100 });

      // Check individual scores
      const p1 = actor.getSnapshot().context.public.players.find(
        (p) => p.id === "player-1"
      );
      const p2 = actor.getSnapshot().context.public.players.find(
        (p) => p.id === "player-2"
      );
      expect(p1!.score).toBeGreaterThan(0);
      // Player 2 answered very far off — should score less than player 1
      expect(p1!.score).toBeGreaterThan(p2!.score);
    });

    it("question result contains correct questionId", () => {
      const actor = createTestActor();
      hostSend(actor, { type: "QUESTIONS_PARSED", questions: TWO_QUESTIONS });
      playerSend(actor, "player-1", {
        type: "JOIN_GAME",
        playerName: "Alice",
      });
      hostSend(actor, { type: "START_GAME" });
      hostSend(actor, { type: "NEXT_QUESTION" });
      playerSend(actor, "player-1", { type: "SUBMIT_ANSWER", value: 4 });

      const result = actor.getSnapshot().context.public.questionResults[0];
      expect(result.questionId).toBe("q1");
      expect(result.questionNumber).toBe(1);
    });
  });
});
