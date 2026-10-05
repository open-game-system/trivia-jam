import { describe, expect, it } from "vitest";
import { FINALE_AT as AT } from "./finale-timeline";

describe("finale running order", () => {
  it("raises the podium 3rd, 2nd, 1st, then counts, then the winner takes over", () => {
    expect(AT.third).toBeLessThan(AT.second);
    expect(AT.second).toBeLessThan(AT.first);
    expect(AT.first + 0.95).toBeLessThan(AT.count);
    expect(AT.count + AT.countFor).toBeLessThan(AT.takeover);
  });
  it("stamps three awards one at a time before the calm hold, about 20 s in all", () => {
    expect(AT.title).toBeGreaterThan(AT.takeover);
    expect(AT.awards).toBeGreaterThan(AT.title);
    expect(AT.awards + 2 * AT.awardGap + 1).toBeLessThan(AT.calm);
    expect(AT.calm).toBeGreaterThanOrEqual(14);
    expect(AT.calm).toBeLessThanOrEqual(20);
  });
});
