import { describe, expect, it } from "vitest";
import { cuesBetween, type TvAudioView } from "./cues";

const lobby: TvAudioView = { phase: "lobby", questionNumber: 0, answered: 0, players: 0, results: 0 };

describe("cuesBetween", () => {
  it("starts the lobby bed when the TV first shows the lobby", () => {
    expect(cuesBetween(null, lobby)).toEqual([{ type: "bed", bed: "lobby" }]);
  });

  it("plays a join pop for each new player in the lobby", () => {
    expect(cuesBetween(lobby, { ...lobby, players: 2 })).toEqual([
      { type: "join", count: 1 },
      { type: "join", count: 2 },
    ]);
  });

  it("does not pop when a player leaves", () => {
    expect(cuesBetween({ ...lobby, players: 2 }, { ...lobby, players: 1 })).toEqual([]);
  });

  it("starts a question with the bell and the thinking bed", () => {
    const prep: TvAudioView = { ...lobby, phase: "prep", players: 3 };
    const q1: TvAudioView = { ...prep, phase: "question", questionNumber: 1 };
    expect(cuesBetween(prep, q1)).toEqual([{ type: "question" }, { type: "bed", bed: "think" }]);
  });

  it("plays a rising lock-in for each answer that arrives", () => {
    const q: TvAudioView = { phase: "question", questionNumber: 1, answered: 0, players: 3, results: 0 };
    expect(cuesBetween(q, { ...q, answered: 2 })).toEqual([
      { type: "lockIn", count: 1, of: 3 },
      { type: "lockIn", count: 2, of: 3 },
    ]);
  });

  it("stages the reveal and silences the bed when a question's results arrive", () => {
    const q: TvAudioView = { phase: "question", questionNumber: 1, answered: 3, players: 3, results: 0 };
    const after: TvAudioView = { ...q, phase: "prep", answered: 0, results: 1 };
    expect(cuesBetween(q, after)).toEqual([{ type: "bed", bed: null }, { type: "reveal" }]);
  });

  it("does not replay a reveal the TV joined after (a refresh mid-game)", () => {
    const prep: TvAudioView = { phase: "prep", questionNumber: 2, answered: 0, players: 3, results: 2 };
    expect(cuesBetween(null, prep)).toEqual([{ type: "bed", bed: "lobby" }]);
  });

  it("joins a running question with the thinking bed and no bell", () => {
    const q: TvAudioView = { phase: "question", questionNumber: 2, answered: 1, players: 3, results: 1 };
    expect(cuesBetween(null, q)).toEqual([{ type: "bed", bed: "think" }]);
  });

  it("ends the game with the fanfare and the finale bed", () => {
    const prep: TvAudioView = { phase: "prep", questionNumber: 5, answered: 0, players: 3, results: 5 };
    expect(cuesBetween(prep, { ...prep, phase: "finished" })).toEqual([
      { type: "bed", bed: null },
      { type: "gameOver" },
      { type: "bed", bed: "finale" },
    ]);
  });

  it("ends with the reveal first when the last results and game over arrive together", () => {
    const q: TvAudioView = { phase: "question", questionNumber: 5, answered: 3, players: 3, results: 4 };
    expect(cuesBetween(q, { ...q, phase: "finished", results: 5 })).toEqual([
      { type: "bed", bed: null },
      { type: "reveal" },
      { type: "gameOver" },
      { type: "bed", bed: "finale" },
    ]);
  });

  it("is silent when nothing audible changed", () => {
    expect(cuesBetween(lobby, { ...lobby })).toEqual([]);
  });
});
