import { describe, expect, it } from "vitest";
import { createTestActor, hostSend, playerSend, setupActiveGame } from "~/test/game-test-helpers";

const answers = (actor: ReturnType<typeof createTestActor>) =>
  actor.getSnapshot().context.public.currentQuestion?.answers.map((a) => [a.playerId, a.value]);
const score = (actor: ReturnType<typeof createTestActor>, id: string) =>
  actor.getSnapshot().context.public.players.find((p) => p.id === id)?.score;

describe("game machine: one answer per player per question (bug bash)", () => {
  it("a player's second answer to the same question is ignored, the first stands", () => {
    const actor = setupActiveGame(["Ada", "Ben"]);
    hostSend(actor, { type: "NEXT_QUESTION" });
    playerSend(actor, "player-1", { type: "SUBMIT_ANSWER", value: 4 });
    playerSend(actor, "player-1", { type: "SUBMIT_ANSWER", value: 9 });
    playerSend(actor, "player-1", { type: "SUBMIT_ANSWER", value: 4 });

    expect(answers(actor)).toEqual([["player-1", 4]]);
  });

  it("a triple tap scores the same as one tap", () => {
    const play = (taps: number) => {
      const actor = setupActiveGame(["Ada", "Ben"]);
      hostSend(actor, { type: "NEXT_QUESTION" });
      for (let i = 0; i < taps; i++) playerSend(actor, "player-1", { type: "SUBMIT_ANSWER", value: 4 });
      playerSend(actor, "player-2", { type: "SUBMIT_ANSWER", value: 5 });
      return actor;
    };
    const once = play(1);
    const thrice = play(3);

    expect(thrice.getSnapshot().context.public.questionResults[0]?.answers).toHaveLength(2);
    expect(score(thrice, "player-1")).toBe(score(once, "player-1"));
    expect(score(thrice, "player-2")).toBe(score(once, "player-2"));
  });

  it("an answer from someone who is not seated is ignored and cannot end the question", () => {
    const actor = setupActiveGame(["Ada"]);
    hostSend(actor, { type: "NEXT_QUESTION" });
    playerSend(actor, "stranger", { type: "SUBMIT_ANSWER", value: 4 });

    expect(answers(actor)).toEqual([]);
    expect(actor.getSnapshot().value).toEqual({ active: "questionActive" });
  });
});

describe("game machine: ending a game nobody is left in (bug bash)", () => {
  it("End Game with every player removed finishes the game with no winner", () => {
    const actor = setupActiveGame(["Ada"]);
    hostSend(actor, { type: "REMOVE_PLAYER", playerId: "player-1" });
    hostSend(actor, { type: "END_GAME" });

    expect(actor.getSnapshot().value).toBe("finished");
    expect(actor.getSnapshot().context.public.winner).toBeNull();
  });

  it("the last question ending with nobody seated finishes the game with no winner", () => {
    const actor = setupActiveGame(["Ada"]);
    hostSend(actor, { type: "NEXT_QUESTION" });
    hostSend(actor, { type: "SKIP_QUESTION" });
    hostSend(actor, { type: "NEXT_QUESTION" });
    hostSend(actor, { type: "REMOVE_PLAYER", playerId: "player-1" });
    hostSend(actor, { type: "SKIP_QUESTION" });

    expect(actor.getSnapshot().status).toBe("active");
    expect(actor.getSnapshot().context.public.questionNumber).toBe(2);
    expect(actor.getSnapshot().context.public.winner).toBeNull();
  });
});
