import type { DurableObjectNamespace } from "@cloudflare/workers-types";
import { createActorKitRouter, createMachineServer } from "actor-kit/worker";
import { gameMachine } from "./game.machine";
import {
  GameClientEventSchema,
  GameInputPropsSchema,
  GameServiceEventSchema,
} from "./game.schemas";
import type { ActorEnv } from "./actor-env";

export const Game = createMachineServer({
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Actor Kit 0.52.4 fixed
  // the EnvFromMachine circularity but the context constraint still uses Record<string, unknown>
  // which doesn't match our typed GameServerContext. Tracked upstream.
  machine: gameMachine as any,
  schemas: {
    clientEvent: GameClientEventSchema,
    serviceEvent: GameServiceEventSchema,
    inputProps: GameInputPropsSchema,
  },
  options: {
    persisted: true,
  },
});

export type GameServer = InstanceType<typeof Game>;

interface WorkerEnv extends ActorEnv {
  GAME: DurableObjectNamespace<GameServer>;
}

export const actorKitRouter = createActorKitRouter<WorkerEnv>([
  "session",
  "game",
]);
