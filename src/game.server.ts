import type { DurableObjectNamespace } from "@cloudflare/workers-types";
import { verifyOgsToken } from "@open-game-system/profile-kit/server";
import { createActorKitRouter, createMachineServer } from "actor-kit/worker";
import { z } from "zod";
import { gameMachine } from "./game.machine";
import {
  GameClientEventSchema,
  GameInputPropsSchema,
  GameServiceEventSchema,
} from "./game.schemas";
import type { ActorEnv } from "./actor-env";
import { OGS_APP_ID, joinFromMessage, trustJoin } from "./ogs-join";

const GameMachineServer = createMachineServer({
  machine: gameMachine,
  schemas: {
    clientEvent: GameClientEventSchema,
    serviceEvent: GameServiceEventSchema,
    inputProps: GameInputPropsSchema,
  },
  options: {
    persisted: true,
  },
});

/** actor-kit keeps each socket's caller in its attachment. */
const AttachmentSchema = z.object({ caller: z.object({ id: z.string(), type: z.enum(["client", "service", "system"]) }) });

/**
 * The game's Durable Object. A phone in the OGS app joins with its OGS game token: the token is
 * verified here (async, before the event reaches the machine) and a valid one becomes OGS_JOIN_GAME,
 * which names the player with the token's name and avatar. Every other message goes to actor-kit.
 */
export class Game extends GameMachineServer {
  readonly #jwksUrl: string | undefined;

  constructor(...args: ConstructorParameters<typeof GameMachineServer>) {
    super(...args);
    const [, env] = args;
    const url: unknown = Reflect.get(env, "OGS_JWKS_URL");
    this.#jwksUrl = typeof url === "string" ? url : undefined;
  }

  override async webSocketMessage(ws: WebSocket, message: string | ArrayBuffer): Promise<void> {
    const join = joinFromMessage(message);
    const attachment = AttachmentSchema.safeParse(ws.deserializeAttachment());
    if (join && attachment.success && attachment.data.caller.type === "client") {
      const caller = { id: attachment.data.caller.id, type: "client" as const };
      const event = await trustJoin(join, (token) => verifyOgsToken(token, { appId: OGS_APP_ID, jwksUrl: this.#jwksUrl }));
      // Like actor-kit's own delivery: the event plus the socket's caller (send passes caller through).
      const withCaller = { ...event, caller };
      this.send(withCaller);
      return;
    }
    return super.webSocketMessage?.(ws, message);
  }
}

export type GameServer = InstanceType<typeof Game>;

interface WorkerEnv extends ActorEnv {
  GAME: DurableObjectNamespace<GameServer>;
}

export const actorKitRouter = createActorKitRouter<WorkerEnv>([
  "session",
  "game",
]);
