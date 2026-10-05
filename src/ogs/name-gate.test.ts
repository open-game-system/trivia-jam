import { describe, expect, it } from "vitest";
import { nameGate } from "./name-gate";

describe("nameGate", () => {
  it("waits while asking the OGS app who this is", () => {
    expect(nameGate(undefined)).toEqual({ kind: "waiting" });
  });

  it("shows the game's own name form in a plain browser", () => {
    expect(nameGate(null)).toEqual({ kind: "form" });
  });

  it("joins under the OGS profile, sending its token for the server to verify", () => {
    expect(nameGate({ id: "u1", handle: "dad", name: "Dad", avatar: "https://a/x.png", token: "tok" })).toEqual({
      kind: "join",
      event: { type: "JOIN_GAME", playerName: "Dad", ogsToken: "tok" },
    });
  });
});
