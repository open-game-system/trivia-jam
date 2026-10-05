import type { ProfileSnapshot } from "@open-game-system/profile-kit";
import type { GameClientEvent } from "~/game.types";

export type NameGate =
  | { kind: "waiting" }
  | { kind: "form" }
  | { kind: "join"; event: Extract<GameClientEvent, { type: "JOIN_GAME" }> };

/** In the OGS app a phone joins under its OGS profile (no name form); in a plain browser it asks for a name. */
export function nameGate(profile: ProfileSnapshot): NameGate {
  if (profile === undefined) return { kind: "waiting" };
  if (profile === null) return { kind: "form" };
  return { kind: "join", event: { type: "JOIN_GAME", playerName: profile.name, ogsToken: profile.token } };
}
