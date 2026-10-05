import { describe, expect, it } from "vitest";
import type { GameToken } from "@open-game-system/profile-kit/server";
import { joinFromMessage, trustJoin } from "./ogs-join";
import { createTestActor, sendAsClient } from "./test/game-test-helpers";

const claims: GameToken = {
  iss: "https://api.example",
  aud: "trivia-jam",
  sub: "user-7",
  handle: "dad",
  name: "Dad",
  avatar: "https://cdn.example/dad.png",
  iat: 1,
  exp: 2,
};

describe("joinFromMessage", () => {
  it("picks out a JOIN_GAME that carries an OGS token", () => {
    const join = joinFromMessage(JSON.stringify({ type: "JOIN_GAME", playerName: "typed", ogsToken: "t" }));
    expect(join).toEqual({ type: "JOIN_GAME", playerName: "typed", ogsToken: "t" });
  });

  it("leaves every other message to actor-kit", () => {
    expect(joinFromMessage(JSON.stringify({ type: "JOIN_GAME", playerName: "Ava" }))).toBeNull();
    expect(joinFromMessage(JSON.stringify({ type: "START_GAME" }))).toBeNull();
    expect(joinFromMessage("not json")).toBeNull();
    expect(joinFromMessage(new TextEncoder().encode(JSON.stringify({ type: "JOIN_GAME", playerName: "x", ogsToken: "t" })).buffer)).toEqual({
      type: "JOIN_GAME",
      playerName: "x",
      ogsToken: "t",
    });
  });

  it("refuses a client that tries to send the server-only verified join itself", () => {
    expect(joinFromMessage(JSON.stringify({ type: "OGS_JOIN_GAME", profile: { id: "x", name: "Forged", avatar: "" } }))).toBeNull();
  });
});

describe("trustJoin", () => {
  it("joins under the OGS profile when the token verifies for this game", async () => {
    const event = await trustJoin({ type: "JOIN_GAME", playerName: "typed", ogsToken: "good" }, async (t: string) => (t === "good" ? claims : null));
    expect(event).toEqual({ type: "OGS_JOIN_GAME", profile: { id: "user-7", name: "Dad", avatar: "https://cdn.example/dad.png" } });
  });

  it("falls back to the typed name, without the token, when verification fails", async () => {
    const event = await trustJoin({ type: "JOIN_GAME", playerName: "typed", ogsToken: "forged" }, async () => null);
    expect(event).toEqual({ type: "JOIN_GAME", playerName: "typed" });
  });
});

describe("OGS_JOIN_GAME in the machine", () => {
  it("adds the player with the OGS name and avatar", () => {
    const actor = createTestActor();
    sendAsClient(actor, "player-1", {
      type: "OGS_JOIN_GAME",
      profile: { id: "user-7", name: "Dad", avatar: "https://cdn.example/dad.png" },
    });
    expect(actor.getSnapshot().context.public.players).toEqual([
      { id: "player-1", name: "Dad", score: 0, avatar: "https://cdn.example/dad.png" },
    ]);
  });
});
