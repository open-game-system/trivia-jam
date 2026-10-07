import type { GameToken } from "@open-game-system/profile-kit/server";
import { GameClientEventSchema } from "./game.schemas";
import type { GameClientEvent, OgsJoinGameEvent } from "./game.types";

/** Trivia Jam's id in the OGS catalogue: game tokens for any other game are refused. */
export const OGS_APP_ID = "trivia-jam";

export type JoinEvent = Extract<GameClientEvent, { type: "JOIN_GAME" }>;
/** A join as the machine gets it: verified (OGS_JOIN_GAME), or the typed name with the token dropped. */
export type TrustedJoin = OgsJoinGameEvent | Omit<JoinEvent, "ogsToken">;

/** A socket message that is a JOIN_GAME carrying an OGS token (verify it before the machine sees it). */
export function joinFromMessage(message: string | ArrayBuffer): JoinEvent | null {
  const text = typeof message === "string" ? message : new TextDecoder().decode(message);
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return null;
  }
  const parsed = GameClientEventSchema.safeParse(raw);
  if (!parsed.success || parsed.data.type !== "JOIN_GAME" || parsed.data.ogsToken === undefined) return null;
  return parsed.data;
}

/**
 * A valid token for this game names the player (its OGS name and avatar); anything else (no token,
 * another game's, expired, forged) is an ordinary typed-name join.
 */
export async function trustJoin(join: JoinEvent, verify: (token: string) => Promise<GameToken | null>): Promise<TrustedJoin> {
  const claims = join.ogsToken === undefined ? null : await verify(join.ogsToken);
  if (!claims) return { type: "JOIN_GAME", playerName: join.playerName };
  return { type: "OGS_JOIN_GAME", profile: { id: claims.sub, name: claims.name, avatar: claims.avatar } };
}
