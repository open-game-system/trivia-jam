import { describe, expect, it, vi } from "vitest";
import { createActor } from "xstate";
import { gameMachine } from "./game.machine";

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

vi.mock("./gemini", () => ({
  parseQuestions: vi.fn().mockResolvedValue({
    q1: {
      id: "q1",
      text: "What is 2+2?",
      correctAnswer: 4,
      questionType: "numeric",
    },
    q2: {
      id: "q2",
      text: "What is 3+3?",
      correctAnswer: 6,
      questionType: "numeric",
    },
  }),
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

function hostSend(actor: ReturnType<typeof createTestActor>, event: any) {
  actor.send({
    ...event,
    caller: { type: "client" as const, id: "host-1" },
    env: { GEMINI_API_KEY: "test-key" } as any,
  });
}

describe("game machine — PARSE_QUESTIONS flow", () => {
  it("PARSE_QUESTIONS transitions to parsingDocument", () => {
    const actor = createTestActor();
    expect(actor.getSnapshot().value).toEqual({ lobby: "waitingForQuestions" });

    hostSend(actor, {
      type: "PARSE_QUESTIONS",
      documentContent: "Test questions",
    });

    expect(actor.getSnapshot().value).toEqual({ lobby: "parsingDocument" });
  });

  it("successful parse transitions to ready with questions", async () => {
    const actor = createTestActor();

    hostSend(actor, {
      type: "PARSE_QUESTIONS",
      documentContent: "Test questions",
    });

    await vi.waitFor(() => {
      expect(actor.getSnapshot().value).toEqual({ lobby: "ready" });
    });

    const questions = actor.getSnapshot().context.public.questions;
    expect(Object.keys(questions)).toEqual(["q1", "q2"]);
    expect(questions.q1.correctAnswer).toBe(4);
  });

  it("non-host cannot trigger PARSE_QUESTIONS", () => {
    const actor = createTestActor();

    actor.send({
      type: "PARSE_QUESTIONS",
      documentContent: "Test questions",
      caller: { type: "client" as const, id: "player-1" },
      env: { GEMINI_API_KEY: "test-key" },
    } as any);

    expect(actor.getSnapshot().value).toEqual({ lobby: "waitingForQuestions" });
  });

  it("parse error transitions back to waitingForQuestions with error message", async () => {
    const { parseQuestions } = await import("./gemini");
    vi.mocked(parseQuestions).mockRejectedValueOnce(
      new Error("API rate limit exceeded")
    );

    const actor = createTestActor();

    hostSend(actor, {
      type: "PARSE_QUESTIONS",
      documentContent: "Test questions",
    });

    await vi.waitFor(() => {
      expect(actor.getSnapshot().value).toEqual({
        lobby: "waitingForQuestions",
      });
    });

    // Error message should be preserved for the user to see
    expect(
      actor.getSnapshot().context.public.parsingErrorMessage
    ).toBe("API rate limit exceeded");
  });

  it("error message is cleared when re-attempting parse", async () => {
    const { parseQuestions } = await import("./gemini");
    vi.mocked(parseQuestions).mockRejectedValueOnce(
      new Error("First attempt failed")
    );

    const actor = createTestActor();

    // First attempt fails
    hostSend(actor, {
      type: "PARSE_QUESTIONS",
      documentContent: "Test questions",
    });

    await vi.waitFor(() => {
      expect(
        actor.getSnapshot().context.public.parsingErrorMessage
      ).toBe("First attempt failed");
    });

    // Second attempt — clearParsingError should run on PARSE_QUESTIONS transition
    hostSend(actor, {
      type: "PARSE_QUESTIONS",
      documentContent: "Retry",
    });

    expect(
      actor.getSnapshot().context.public.parsingErrorMessage
    ).toBeUndefined();
  });

  it("PARSE_QUESTIONS from ready state re-parses", async () => {
    const actor = createTestActor();

    hostSend(actor, {
      type: "QUESTIONS_PARSED",
      questions: TWO_QUESTIONS,
    });
    expect(actor.getSnapshot().value).toEqual({ lobby: "ready" });

    hostSend(actor, {
      type: "PARSE_QUESTIONS",
      documentContent: "New questions",
    });
    expect(actor.getSnapshot().value).toEqual({ lobby: "parsingDocument" });

    await vi.waitFor(() => {
      expect(actor.getSnapshot().value).toEqual({ lobby: "ready" });
    });
  });
});
