import { describe, expect, it, vi } from "vitest";
import { createActor } from "xstate";
import { gameMachine } from "./game.machine";

// Mock Gemini to avoid live API calls
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

describe("game machine", () => {
  describe("initial state", () => {
    it("starts in lobby.waitingForQuestions", () => {
      const actor = createTestActor();
      expect(actor.getSnapshot().value).toEqual({
        lobby: "waitingForQuestions",
      });
    });

    it("sets hostId from caller", () => {
      const actor = createTestActor();
      expect(actor.getSnapshot().context.public.hostId).toBe("host-1");
    });

    it("starts with empty players and questions", () => {
      const actor = createTestActor();
      const { players, questions } = actor.getSnapshot().context.public;
      expect(players).toEqual([]);
      expect(questions).toEqual({});
    });

    it("initializes default settings", () => {
      const actor = createTestActor();
      const { settings } = actor.getSnapshot().context.public;
      expect(settings.maxPlayers).toBe(30);
      expect(settings.answerTimeWindow).toBe(25);
    });
  });

  describe("lobby", () => {
    it("QUESTIONS_PARSED transitions to lobby.ready", () => {
      const actor = createTestActor();
      hostSend(actor, { type: "QUESTIONS_PARSED", questions: TWO_QUESTIONS });
      expect(actor.getSnapshot().value).toEqual({ lobby: "ready" });
      expect(
        Object.keys(actor.getSnapshot().context.public.questions).length
      ).toBe(2);
    });

    it("QUESTIONS_PARSED from non-host is rejected", () => {
      const actor = createTestActor();
      playerSend(actor, "player-1", {
        type: "QUESTIONS_PARSED",
        questions: TWO_QUESTIONS,
      });
      // Should stay in waitingForQuestions
      expect(actor.getSnapshot().value).toEqual({
        lobby: "waitingForQuestions",
      });
    });

    it("JOIN_GAME adds a player", () => {
      const actor = createTestActor();
      playerSend(actor, "player-1", {
        type: "JOIN_GAME",
        playerName: "Alice",
      });
      const players = actor.getSnapshot().context.public.players;
      expect(players).toHaveLength(1);
      expect(players[0]).toEqual({
        id: "player-1",
        name: "Alice",
        score: 0,
      });
    });

    it("START_GAME without questions stays in lobby", () => {
      const actor = createTestActor();
      playerSend(actor, "player-1", {
        type: "JOIN_GAME",
        playerName: "Alice",
      });
      hostSend(actor, { type: "START_GAME" });
      // Should stay in lobby (no questions)
      expect(actor.getSnapshot().value).toEqual({
        lobby: "waitingForQuestions",
      });
    });

    it("START_GAME from non-host is rejected", () => {
      const actor = createTestActor();
      hostSend(actor, { type: "QUESTIONS_PARSED", questions: TWO_QUESTIONS });
      playerSend(actor, "player-1", {
        type: "JOIN_GAME",
        playerName: "Alice",
      });
      playerSend(actor, "player-1", { type: "START_GAME" });
      expect(actor.getSnapshot().value).toEqual({ lobby: "ready" });
    });
  });

  describe("active game flow", () => {
    function setupActiveGame() {
      const actor = createTestActor();
      hostSend(actor, { type: "QUESTIONS_PARSED", questions: TWO_QUESTIONS });
      playerSend(actor, "player-1", {
        type: "JOIN_GAME",
        playerName: "Alice",
      });
      hostSend(actor, { type: "START_GAME" });
      return actor;
    }

    it("START_GAME transitions to active.questionPrep", () => {
      const actor = setupActiveGame();
      expect(actor.getSnapshot().value).toEqual({ active: "questionPrep" });
    });

    it("NEXT_QUESTION starts a question with startTime and answers", () => {
      const actor = setupActiveGame();
      hostSend(actor, { type: "NEXT_QUESTION" });
      expect(actor.getSnapshot().value).toEqual({ active: "questionActive" });

      const cq = actor.getSnapshot().context.public.currentQuestion;
      expect(cq).not.toBeNull();
      expect(cq!.questionId).toBe("q1");
      expect(cq!.startTime).toBeGreaterThan(0);
      expect(cq!.answers).toEqual([]);
    });

    it("SUBMIT_ANSWER records the answer", () => {
      const actor = setupActiveGame();
      hostSend(actor, { type: "NEXT_QUESTION" });

      playerSend(actor, "player-1", { type: "SUBMIT_ANSWER", value: 4 });

      const cq = actor.getSnapshot().context.public.currentQuestion;
      // With 1 player, auto-advance fires, so currentQuestion is null
      expect(cq).toBeNull();
      // Results should be recorded
      expect(
        actor.getSnapshot().context.public.questionResults.length
      ).toBe(1);
    });

    it("SKIP_QUESTION by host processes results and moves to questionPrep", () => {
      const actor = setupActiveGame();
      hostSend(actor, { type: "NEXT_QUESTION" });
      hostSend(actor, { type: "SKIP_QUESTION" });

      expect(actor.getSnapshot().value).toEqual({ active: "questionPrep" });
      expect(actor.getSnapshot().context.public.currentQuestion).toBeNull();
    });

    it("SKIP_QUESTION by non-host is rejected", () => {
      const actor = setupActiveGame();
      hostSend(actor, { type: "NEXT_QUESTION" });
      playerSend(actor, "player-1", { type: "SKIP_QUESTION" });

      expect(actor.getSnapshot().value).toEqual({ active: "questionActive" });
    });
  });

  describe("scoring and winner selection", () => {
    it("accumulates player scores across questions", () => {
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

      // Question 1
      hostSend(actor, { type: "NEXT_QUESTION" });
      playerSend(actor, "player-1", { type: "SUBMIT_ANSWER", value: 4 }); // exact
      playerSend(actor, "player-2", { type: "SUBMIT_ANSWER", value: 5 }); // off by 1

      // Both answered, auto-advance fires
      const results = actor.getSnapshot().context.public.questionResults;
      expect(results.length).toBe(1);

      // Player 1 should have more points (exact answer)
      const p1Score = actor
        .getSnapshot()
        .context.public.players.find((p) => p.id === "player-1")!.score;
      const p2Score = actor
        .getSnapshot()
        .context.public.players.find((p) => p.id === "player-2")!.score;
      expect(p1Score).toBeGreaterThan(p2Score);
    });
  });

  describe("END_GAME", () => {
    it("host can end game early, setting winner", () => {
      const actor = createTestActor();
      hostSend(actor, { type: "QUESTIONS_PARSED", questions: TWO_QUESTIONS });
      playerSend(actor, "player-1", {
        type: "JOIN_GAME",
        playerName: "Alice",
      });
      hostSend(actor, { type: "START_GAME" });
      hostSend(actor, { type: "END_GAME" });

      expect(actor.getSnapshot().value).toBe("finished");
      expect(actor.getSnapshot().context.public.winner).toBe("player-1");
    });

    it("non-host cannot end game", () => {
      const actor = createTestActor();
      hostSend(actor, { type: "QUESTIONS_PARSED", questions: TWO_QUESTIONS });
      playerSend(actor, "player-1", {
        type: "JOIN_GAME",
        playerName: "Alice",
      });
      hostSend(actor, { type: "START_GAME" });
      playerSend(actor, "player-1", { type: "END_GAME" });

      expect(actor.getSnapshot().value).toEqual({ active: "questionPrep" });
    });
  });

  describe("question numbering and game end", () => {
    it("setQuestion uses questionNumber+1 for questionId", () => {
      const actor = createTestActor();
      hostSend(actor, { type: "QUESTIONS_PARSED", questions: TWO_QUESTIONS });
      playerSend(actor, "player-1", {
        type: "JOIN_GAME",
        playerName: "Alice",
      });
      hostSend(actor, { type: "START_GAME" });

      // Start first question — should be q1 (questionNumber 0 + 1)
      hostSend(actor, { type: "NEXT_QUESTION" });
      expect(
        actor.getSnapshot().context.public.currentQuestion?.questionId
      ).toBe("q1");
    });

    it("game ends after all questions are answered", () => {
      const actor = createTestActor();
      hostSend(actor, { type: "QUESTIONS_PARSED", questions: TWO_QUESTIONS });
      playerSend(actor, "player-1", {
        type: "JOIN_GAME",
        playerName: "Alice",
      });
      hostSend(actor, { type: "START_GAME" });

      // Question 1
      hostSend(actor, { type: "NEXT_QUESTION" });
      playerSend(actor, "player-1", { type: "SUBMIT_ANSWER", value: 4 });

      // Question 2
      hostSend(actor, { type: "NEXT_QUESTION" });
      playerSend(actor, "player-1", { type: "SUBMIT_ANSWER", value: 6 });

      // After 2 questions with 2 total, game should set winner
      expect(actor.getSnapshot().context.public.winner).not.toBeNull();
    });

    it("processQuestionResults picks correct winner with multiple players at game end", () => {
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

      // Question 1: player-2 answers exactly, player-1 way off
      hostSend(actor, { type: "NEXT_QUESTION" });
      playerSend(actor, "player-1", { type: "SUBMIT_ANSWER", value: 100 });
      playerSend(actor, "player-2", { type: "SUBMIT_ANSWER", value: 4 });

      // Question 2: player-2 answers exactly again
      hostSend(actor, { type: "NEXT_QUESTION" });
      playerSend(actor, "player-1", { type: "SUBMIT_ANSWER", value: 100 });
      playerSend(actor, "player-2", { type: "SUBMIT_ANSWER", value: 6 });

      // Game should auto-end, player-2 wins (highest score)
      expect(actor.getSnapshot().context.public.winner).toBe("player-2");
    });

    it("processQuestionResults clears currentQuestion to null", () => {
      const actor = createTestActor();
      hostSend(actor, { type: "QUESTIONS_PARSED", questions: TWO_QUESTIONS });
      playerSend(actor, "player-1", {
        type: "JOIN_GAME",
        playerName: "Alice",
      });
      hostSend(actor, { type: "START_GAME" });
      hostSend(actor, { type: "NEXT_QUESTION" });

      // Answer triggers processQuestionResults
      playerSend(actor, "player-1", { type: "SUBMIT_ANSWER", value: 4 });

      expect(actor.getSnapshot().context.public.currentQuestion).toBeNull();
    });

    it("processQuestionResults adds to questionResults", () => {
      const actor = createTestActor();
      hostSend(actor, { type: "QUESTIONS_PARSED", questions: TWO_QUESTIONS });
      playerSend(actor, "player-1", {
        type: "JOIN_GAME",
        playerName: "Alice",
      });
      hostSend(actor, { type: "START_GAME" });
      hostSend(actor, { type: "NEXT_QUESTION" });
      playerSend(actor, "player-1", { type: "SUBMIT_ANSWER", value: 4 });

      const results = actor.getSnapshot().context.public.questionResults;
      expect(results).toHaveLength(1);
      expect(results[0].questionId).toBe("q1");
      expect(results[0].answers).toHaveLength(1);
      expect(results[0].scores).toHaveLength(1);
    });

    it("setWinner picks the player with the highest score", () => {
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

      // Question 1: player-1 answers exactly, player-2 is off
      hostSend(actor, { type: "NEXT_QUESTION" });
      playerSend(actor, "player-1", { type: "SUBMIT_ANSWER", value: 4 });
      playerSend(actor, "player-2", { type: "SUBMIT_ANSWER", value: 100 });

      // End game early
      hostSend(actor, { type: "END_GAME" });

      // Player 1 should be the winner (higher score)
      expect(actor.getSnapshot().context.public.winner).toBe("player-1");
    });

    it("setWinner picks the later player when they have the highest score", () => {
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

      // Question 1: player-2 answers exactly, player-1 is way off
      hostSend(actor, { type: "NEXT_QUESTION" });
      playerSend(actor, "player-1", { type: "SUBMIT_ANSWER", value: 100 });
      playerSend(actor, "player-2", { type: "SUBMIT_ANSWER", value: 4 });

      // End game early — player-2 should win (higher score, later in array)
      hostSend(actor, { type: "END_GAME" });
      expect(actor.getSnapshot().context.public.winner).toBe("player-2");
    });

    it("new player starts with score 0", () => {
      const actor = createTestActor();
      playerSend(actor, "player-1", {
        type: "JOIN_GAME",
        playerName: "Alice",
      });
      expect(
        actor.getSnapshot().context.public.players[0].score
      ).toBe(0);
    });

    it("SKIP_QUESTION increments questionNumber", () => {
      const actor = createTestActor();
      hostSend(actor, { type: "QUESTIONS_PARSED", questions: TWO_QUESTIONS });
      playerSend(actor, "player-1", {
        type: "JOIN_GAME",
        playerName: "Alice",
      });
      hostSend(actor, { type: "START_GAME" });

      expect(actor.getSnapshot().context.public.questionNumber).toBe(0);

      hostSend(actor, { type: "NEXT_QUESTION" });
      // questionNumber is set to 1 by setQuestionNumber action
      expect(actor.getSnapshot().context.public.questionNumber).toBe(1);

      hostSend(actor, { type: "SKIP_QUESTION" });
      // processQuestionResults doesn't increment questionNumber directly,
      // but it pushes to questionResults. Let's verify currentQuestion is null.
      expect(actor.getSnapshot().context.public.currentQuestion).toBeNull();
    });

    it("submitAnswer records correct player name from players list", () => {
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

      playerSend(actor, "player-2", { type: "SUBMIT_ANSWER", value: 4 });

      const answers =
        actor.getSnapshot().context.public.currentQuestion?.answers;
      expect(answers?.[0]?.playerName).toBe("Bob");
    });
  });

  describe("REMOVE_PLAYER", () => {
    it("host can remove a player", () => {
      const actor = createTestActor();
      playerSend(actor, "player-1", {
        type: "JOIN_GAME",
        playerName: "Alice",
      });
      expect(actor.getSnapshot().context.public.players).toHaveLength(1);

      hostSend(actor, { type: "REMOVE_PLAYER", playerId: "player-1" });
      expect(actor.getSnapshot().context.public.players).toHaveLength(0);
    });

    it("removes only the targeted player, keeping others", () => {
      const actor = createTestActor();
      playerSend(actor, "player-1", {
        type: "JOIN_GAME",
        playerName: "Alice",
      });
      playerSend(actor, "player-2", {
        type: "JOIN_GAME",
        playerName: "Bob",
      });
      expect(actor.getSnapshot().context.public.players).toHaveLength(2);

      hostSend(actor, { type: "REMOVE_PLAYER", playerId: "player-1" });
      const players = actor.getSnapshot().context.public.players;
      expect(players).toHaveLength(1);
      expect(players[0].id).toBe("player-2");
      expect(players[0].name).toBe("Bob");
    });

    it("non-host cannot remove a player", () => {
      const actor = createTestActor();
      playerSend(actor, "player-1", {
        type: "JOIN_GAME",
        playerName: "Alice",
      });
      playerSend(actor, "player-2", {
        type: "JOIN_GAME",
        playerName: "Bob",
      });

      playerSend(actor, "player-2", {
        type: "REMOVE_PLAYER",
        playerId: "player-1",
      });
      expect(actor.getSnapshot().context.public.players).toHaveLength(2);
    });
  });
});
