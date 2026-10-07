import { readFileSync } from "node:fs";
import { createAccessToken } from "actor-kit/server";
import { z } from "zod";

/**
 * Server truth for the chaos harness: the game's snapshot straight from the Durable Object
 * (GET /api/game/<id>, signed with the local ACTOR_KIT_SECRET), as an observer that never joins.
 * Parsed at the boundary so the harness compares UI against typed state.
 */
const PlayerSchema = z.object({ id: z.string(), name: z.string(), score: z.number() });
const AnswerSchema = z.object({ playerId: z.string(), value: z.union([z.number(), z.string()]) });
export const ServerSnapshotSchema = z.object({
  value: z.unknown(),
  public: z.object({
    hostId: z.string(),
    players: z.array(PlayerSchema),
    currentQuestion: z.object({ questionId: z.string(), answers: z.array(AnswerSchema) }).nullable(),
    questionNumber: z.number(),
    questionResults: z.array(z.object({ questionId: z.string(), answers: z.array(AnswerSchema) })),
    winner: z.string().nullable(),
  }),
});
export type ServerSnapshot = z.infer<typeof ServerSnapshotSchema>;

function readSecret(): string {
  for (const file of [".output/server/.dev.vars", ".dev.vars"]) {
    try {
      const line = readFileSync(file, "utf8")
        .split("\n")
        .find((l) => l.startsWith("ACTOR_KIT_SECRET="));
      if (line) return line.slice("ACTOR_KIT_SECRET=".length).replace(/^"|"$/g, "").trim();
    } catch {
      // try the next file
    }
  }
  return "actor-kit-dev-secret";
}

const OBSERVER_ID = "chaos-oracle-observer";

export async function fetchServerSnapshot(baseURL: string, gamePath: string): Promise<ServerSnapshot> {
  const gameId = gamePath.split("/").pop() ?? "";
  const accessToken = await createAccessToken({
    signingKey: readSecret(),
    actorId: gameId,
    actorType: "game",
    callerId: OBSERVER_ID,
    callerType: "client",
  });
  const url = new URL(`/api/game/${gameId}`, baseURL);
  url.searchParams.set("input", JSON.stringify({ hostName: "oracle" }));
  const response = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } });
  if (!response.ok) throw new Error(`oracle: ${response.status} ${await response.text()}`);
  const body = z.object({ snapshot: z.unknown() }).parse(await response.json());
  return ServerSnapshotSchema.parse(body.snapshot);
}

/** The machine's state as a dotted path ("lobby.ready", "active.questionActive", "finished"). */
export function stateName(snapshot: ServerSnapshot): string {
  const walk = (v: unknown): string =>
    typeof v === "string"
      ? v
      : v && typeof v === "object"
        ? Object.entries(v)
            .map(([k, child]) => `${k}.${walk(child)}`)
            .join("|")
        : String(v);
  return walk(snapshot.value);
}
