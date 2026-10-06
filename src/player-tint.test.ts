import { describe, expect, it } from "vitest";
import { tokenTintClass } from "~/components/phone/ink";
import { chipTint } from "~/components/tv/chip-tint";
import { PLAYER_TINTS, playerSeat, playerTint } from "./player-tint";

const room = [
  { id: "p-sam", name: "Sam" },
  { id: "p-priya", name: "Priya" },
  { id: "p-jordan", name: "Jordan" },
  { id: "p-lee", name: "Lee" },
  { id: "p-max", name: "Max" },
];

describe("player tint: one colour per player, the same on the TV and the phones", () => {
  it("a player's seat is their join order", () => {
    expect(room.map((p) => playerSeat(room, p.id))).toEqual([0, 1, 2, 3, 4]);
    expect(playerSeat(room, "p-gone")).toBe(0);
  });

  it("cycles the four aurora hues by seat", () => {
    expect([0, 1, 2, 3, 4, 5].map(playerTint)).toEqual(["indigo", "purple", "pink", "lavender", "indigo", "purple"]);
    expect(playerTint(-1)).toBe("indigo");
    expect(new Set(PLAYER_TINTS).size).toBe(4);
  });

  it("the TV chip and the phone token resolve the same hue for the same player", () => {
    for (const p of room) {
      const seat = playerSeat(room, p.id);
      expect(tokenTintClass(seat)).toBe(`ptoken-${chipTint(seat).name}`);
    }
    // Priya (second to join) and Jordan (third) were purple / pink on the TV but pink / purple on the phones.
    expect(chipTint(playerSeat(room, "p-priya")).name).toBe("purple");
    expect(tokenTintClass(playerSeat(room, "p-priya"))).toBe("ptoken-purple");
    expect(tokenTintClass(playerSeat(room, "p-jordan"))).toBe("ptoken-pink");
  });
});
