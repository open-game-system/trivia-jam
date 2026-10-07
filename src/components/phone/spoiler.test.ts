import { describe, expect, it } from "vitest";
import { revealSchedule } from "~/components/tv/tv-model";
import { holdRemainingMs, spoilerGate } from "./spoiler";

const answerAt = revealSchedule(3, false).answer;

describe("spoilerGate", () => {
  it("holds while the TV is still building to the answer", () => {
    expect(spoilerGate({ arrivedAt: 1000, now: 1000, guessCount: 3, reducedMotion: false })).toBe("hold");
    expect(spoilerGate({ arrivedAt: 1000, now: 1000 + answerAt - 1, guessCount: 3, reducedMotion: false })).toBe("hold");
  });

  it("shows once the TV has landed the answer", () => {
    expect(spoilerGate({ arrivedAt: 1000, now: 1000 + answerAt, guessCount: 3, reducedMotion: false })).toBe("show");
  });

  it("shows at once on a phone that was not watching when the result arrived", () => {
    expect(spoilerGate({ arrivedAt: null, now: 5, guessCount: 3, reducedMotion: false })).toBe("show");
  });

  it("waits longer for more guesses and less with reduced motion", () => {
    const many = revealSchedule(8, false).answer;
    expect(many).toBeGreaterThan(answerAt);
    expect(spoilerGate({ arrivedAt: 0, now: answerAt, guessCount: 8, reducedMotion: false })).toBe("hold");
    const reduced = revealSchedule(3, true).answer;
    expect(spoilerGate({ arrivedAt: 0, now: reduced, guessCount: 3, reducedMotion: true })).toBe("show");
  });
});

describe("holdRemainingMs", () => {
  it("counts down to the answer and never goes negative", () => {
    expect(holdRemainingMs({ arrivedAt: 1000, now: 1500, guessCount: 3, reducedMotion: false })).toBe(answerAt - 500);
    expect(holdRemainingMs({ arrivedAt: 1000, now: 1000 + answerAt + 99, guessCount: 3, reducedMotion: false })).toBe(0);
    expect(holdRemainingMs({ arrivedAt: null, now: 0, guessCount: 3, reducedMotion: false })).toBe(0);
  });
});
