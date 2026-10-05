import { describe, expect, it } from "vitest";
import type { OgsJoinGameEvent } from "~/game.types";
import {
  createTestActor,
  playerSend,
  sendAsClient,
  setupActiveGame,
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
