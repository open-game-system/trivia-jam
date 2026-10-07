import type { ProfileSnapshot } from "@open-game-system/profile-kit";
import type { GameClientEvent } from "~/game.types";

export type NameGate =
  | { kind: "waiting" }
  | { kind: "form"; taken?: string }
  | { kind: "join"; event: Extract<GameClientEvent, { type: "JOIN_GAME" }> };

const sameName = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase();

/**
 * In the OGS app a phone joins under its OGS profile (no name form), unless a player in the room already
 * has that name: then it gets the name form, saying which name was taken. A plain browser asks for a name.
 */
export function nameGate(profile: ProfileSnapshot, playerNames: readonly string[] = []): NameGate {
  if (profile === undefined) return { kind: "waiting" };
  if (profile === null) return { kind: "form" };
  if (playerNames.some((n) => sameName(n, profile.name))) return { kind: "form", taken: profile.name };
  return { kind: "join", event: { type: "JOIN_GAME", playerName: profile.name, ogsToken: profile.token } };
}
