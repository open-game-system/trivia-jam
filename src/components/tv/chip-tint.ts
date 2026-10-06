/** A player's glass chip tint on the TV: one of the four aurora hues, as a rim and a faint fill. */
export type ChipTint = { name: "indigo" | "purple" | "pink" | "lavender"; rim: string; fill: string };

const TINTS: ReadonlyArray<ChipTint> = [
  { name: "indigo", rim: "var(--aurora-indigo)", fill: "rgba(99, 102, 241, 0.34)" },
  { name: "purple", rim: "var(--aurora-purple)", fill: "rgba(168, 85, 247, 0.32)" },
  { name: "pink", rim: "var(--aurora-pink)", fill: "rgba(236, 72, 153, 0.3)" },
  { name: "lavender", rim: "var(--glow)", fill: "rgba(196, 181, 253, 0.24)" },
];

export const chipTint = (index: number): ChipTint => TINTS[Math.max(0, Math.floor(index)) % TINTS.length];
