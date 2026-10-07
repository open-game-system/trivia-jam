import { type PlayerTint, playerTint } from "~/player-tint";

/** A player's glass chip tint on the TV: their aurora hue (see player-tint.ts), as a rim and a faint fill. */
export type ChipTint = { name: PlayerTint; rim: string; fill: string };

const TINTS: Record<PlayerTint, ChipTint> = {
  indigo: { name: "indigo", rim: "var(--aurora-indigo)", fill: "rgba(99, 102, 241, 0.34)" },
  purple: { name: "purple", rim: "var(--aurora-purple)", fill: "rgba(168, 85, 247, 0.32)" },
  pink: { name: "pink", rim: "var(--aurora-pink)", fill: "rgba(236, 72, 153, 0.3)" },
  lavender: { name: "lavender", rim: "var(--glow)", fill: "rgba(196, 181, 253, 0.24)" },
};

export const chipTint = (index: number): ChipTint => TINTS[playerTint(index)];
