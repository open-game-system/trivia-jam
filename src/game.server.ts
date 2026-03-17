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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Actor Kit's
  // createMachineServer has a circular generic (TMachine ↔ EnvFromMachine<TMachine>)
  // that prevents direct type inference. Schemas below provide runtime safety.
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
