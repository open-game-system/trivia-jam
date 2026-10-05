import { describe, expect, it, vi } from "vitest";
import type { OgsJoinGameEvent } from "~/game.types";
import {
  createTestActor,
  hostSend,
  playerSend,
  sendAsClient,
  setupActiveGame,
  TWO_QUESTIONS,
} from "~/test/game-test-helpers";

const players = (actor: ReturnType<typeof createTestActor>) =>
  actor.getSnapshot().context.public.players;

describe("game machine: joining", () => {
  it("a second JOIN_GAME from a seated player does not seat them again", () => {
    const actor = createTestActor();
    playerSend(actor, "player-1", { type: "JOIN_GAME", playerName: "Ada" });
    playerSend(actor, "player-1", { type: "JOIN_GAME", playerName: "Ada" });

    expect(players(actor)).toEqual([{ id: "player-1", name: "Ada", score: 0 }]);
  });

  it("a second join from a seated player mid-game keeps their one seat and score", () => {
    const actor = setupActiveGame(["Ada"]);
    playerSend(actor, "player-1", { type: "JOIN_GAME", playerName: "Ada again" });

    expect(players(actor)).toEqual([{ id: "player-1", name: "Ada", score: 0 }]);
  });

  it("a second OGS join from a seated player does not seat them again", () => {
    const actor = createTestActor();
    const join: OgsJoinGameEvent = { type: "OGS_JOIN_GAME", profile: { id: "p", name: "Ada", avatar: "owl" } };
    sendAsClient(actor, "player-1", join);
    sendAsClient(actor, "player-1", join);

    expect(players(actor)).toHaveLength(1);
  });

  it("two different players with the same name are two seats", () => {
    const actor = createTestActor();
    playerSend(actor, "player-1", { type: "JOIN_GAME", playerName: "Sam" });
    playerSend(actor, "player-2", { type: "JOIN_GAME", playerName: "Sam" });

    expect(players(actor).map((p) => p.id)).toEqual(["player-1", "player-2"]);
  });
});

describe("game machine: settings", () => {
  const settings = (actor: ReturnType<typeof createTestActor>) =>
    actor.getSnapshot().context.public.settings;

  it("the host's UPDATE_SETTINGS changes the answer time and player limit", () => {
    const actor = createTestActor();
    hostSend(actor, { type: "UPDATE_SETTINGS", settings: { maxPlayers: 10, answerTimeWindow: 8 } });

    expect(settings(actor)).toEqual({ maxPlayers: 10, answerTimeWindow: 8 });
  });

  it("settings can change once questions are in (lobby ready)", () => {
    const actor = createTestActor();
    hostSend(actor, { type: "QUESTIONS_PARSED", questions: TWO_QUESTIONS });
    hostSend(actor, { type: "UPDATE_SETTINGS", settings: { maxPlayers: 100, answerTimeWindow: 60 } });

    expect(settings(actor)).toEqual({ maxPlayers: 100, answerTimeWindow: 60 });
    expect(actor.getSnapshot().value).toEqual({ lobby: "ready" });
  });

  it("a player's UPDATE_SETTINGS is ignored", () => {
    const actor = createTestActor();
    playerSend(actor, "player-1", { type: "JOIN_GAME", playerName: "Ada" });
    playerSend(actor, "player-1", {
      type: "UPDATE_SETTINGS",
      settings: { maxPlayers: 10, answerTimeWindow: 8 },
    });

    expect(settings(actor)).toEqual({ maxPlayers: 30, answerTimeWindow: 25 });
  });

  it("the new answer time is the question's timer", async () => {
    vi.useFakeTimers();
    try {
      const actor = createTestActor();
      hostSend(actor, { type: "QUESTIONS_PARSED", questions: TWO_QUESTIONS });
      playerSend(actor, "player-1", { type: "JOIN_GAME", playerName: "Ada" });
      hostSend(actor, { type: "UPDATE_SETTINGS", settings: { maxPlayers: 30, answerTimeWindow: 8 } });
      hostSend(actor, { type: "START_GAME" });
      hostSend(actor, { type: "NEXT_QUESTION" });

      await vi.advanceTimersByTimeAsync(7_900);
      expect(actor.getSnapshot().value).toEqual({ active: "questionActive" });
      await vi.advanceTimersByTimeAsync(200);
      expect(actor.getSnapshot().value).toEqual({ active: "questionPrep" });
    } finally {
      vi.useRealTimers();
    }
  });
});

describe("game machine: removing players", () => {
  it("the host removes a player in the lobby", () => {
    const actor = createTestActor();
    playerSend(actor, "player-1", { type: "JOIN_GAME", playerName: "Ada" });
    playerSend(actor, "player-2", { type: "JOIN_GAME", playerName: "Ben" });
    hostSend(actor, { type: "REMOVE_PLAYER", playerId: "player-2" });

    expect(players(actor).map((p) => p.name)).toEqual(["Ada"]);
  });

  it("a player cannot remove another player", () => {
    const actor = createTestActor();
    playerSend(actor, "player-1", { type: "JOIN_GAME", playerName: "Ada" });
    playerSend(actor, "player-2", { type: "JOIN_GAME", playerName: "Ben" });
    playerSend(actor, "player-1", { type: "REMOVE_PLAYER", playerId: "player-2" });

    expect(players(actor)).toHaveLength(2);
  });

  it("a removed player can join again", () => {
    const actor = createTestActor();
    playerSend(actor, "player-2", { type: "JOIN_GAME", playerName: "Ben" });
    hostSend(actor, { type: "REMOVE_PLAYER", playerId: "player-2" });
    playerSend(actor, "player-2", { type: "JOIN_GAME", playerName: "Ben" });

    expect(players(actor).map((p) => p.name)).toEqual(["Ben"]);
  });
});
