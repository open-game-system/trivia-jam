import { createMachineServer } from "actor-kit/worker";
import { sessionMachine } from "./session.machine";
import {
  SessionClientEventSchema,
  SessionInputPropsSchema,
  SessionServiceEventSchema,
} from "./session.schemas";

export const Session = createMachineServer({
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Actor Kit's
  // createMachineServer has a circular generic (TMachine ↔ EnvFromMachine<TMachine>)
  // that prevents direct type inference. Schemas below provide runtime safety.
  machine: sessionMachine as any,
  schemas: {
    clientEvent: SessionClientEventSchema,
    serviceEvent: SessionServiceEventSchema,
    inputProps: SessionInputPropsSchema,
  },
  options: {
    persisted: true,
  },
});

export type SessionServer = InstanceType<typeof Session>;
