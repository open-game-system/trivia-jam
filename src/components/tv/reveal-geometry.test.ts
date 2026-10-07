import { describe, expect, it } from "vitest";
import { layoutNumberLine, REVEAL_FRAME } from "./number-line-layout";
import { choiceAnswerText, PUCK, TICK_LABEL_BOTTOM } from "./reveal-geometry";

describe("choiceAnswerText", () => {
  it("sets the letter and the answer apart with a real break", () => {
    expect(choiceAnswerText("B", "Blue whale")).toBe("B · Blue whale");
  });
});

describe("the suspense puck", () => {
  it("parks under the axis, below the tick labels", () => {
    expect(PUCK.top).toBeGreaterThan(REVEAL_FRAME.axisY);
    expect(PUCK.top).toBeGreaterThanOrEqual(TICK_LABEL_BOTTOM + 4);
  });
  it("never shares a row with a guess or its numeral (they all sit above the axis)", () => {
    const g = (id: string, value: number) => ({ playerId: id, name: id, value, inkIndex: 0, points: 0, highlight: undefined });
    const layout = layoutNumberLine([g("a", 20), g("b", 30), g("c", 32)], 32, REVEAL_FRAME);
    for (const group of layout.groups) expect(group.bottom).toBeLessThan(PUCK.top);
  });
});
