/**
 * A player's colour, the one source for the TV chips and the phone tokens: one of the four aurora hues,
 * by seat (join order), then repeats.
 */
export const PLAYER_TINTS = ["indigo", "purple", "pink", "lavender"] as const;
export type PlayerTint = (typeof PLAYER_TINTS)[number];

export const playerTint = (seat: number): PlayerTint => PLAYER_TINTS[Math.max(0, Math.floor(seat)) % PLAYER_TINTS.length];

/** A player's seat: their place in the join order (0 if they are not in the room). */
export const playerSeat = (players: ReadonlyArray<{ id: string }>, playerId: string): number =>
  Math.max(0, players.findIndex((p) => p.id === playerId));
