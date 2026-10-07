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

describe("nameGate: the OGS name is already taken", () => {
  const dad = { id: "u1", handle: "dad", name: "Dad", avatar: "https://a/x.png", token: "tok" };

  it("joins under the OGS name when nobody in the room has it", () => {
    expect(nameGate(dad, ["Ada", "Daddy"])).toEqual({
      kind: "join",
      event: { type: "JOIN_GAME", playerName: "Dad", ogsToken: "tok" },
    });
  });

  it("shows the name form when a player already has the OGS name", () => {
    expect(nameGate(dad, ["Ada", "Dad"])).toEqual({ kind: "form", taken: "Dad" });
  });

  it("counts a name as taken whatever its case and surrounding spaces", () => {
    expect(nameGate(dad, [" dAD "])).toEqual({ kind: "form", taken: "Dad" });
  });

  it("a plain browser gets the form with nothing taken, whoever is in the room", () => {
    expect(nameGate(null, ["Dad"])).toEqual({ kind: "form" });
  });
});
