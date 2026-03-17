import { createMachineServer } from "actor-kit/worker";
import { sessionMachine } from "./session.machine";
import {
  SessionClientEventSchema,
  SessionInputPropsSchema,
  SessionServiceEventSchema,
} from "./session.schemas";

export const Session = createMachineServer({
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Actor Kit 0.52.4 fixed
  // the EnvFromMachine circularity but the context constraint still uses Record<string, unknown>.
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
