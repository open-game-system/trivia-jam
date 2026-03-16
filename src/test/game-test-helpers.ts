/**
 * Type-safe test helpers for the game state machine.
 *
 * Eliminates `as any` casts by providing properly typed input/event factories
 * that satisfy Actor Kit's augmented types (caller, env, storage).
 */
import { createActor } from "xstate";
import { gameMachine } from "../game.machine";
import type { GameClientEvent, GameEvent, GameInput } from "../game.types";
import type { Env } from "../env";
import type { ActorKitStorage } from "actor-kit";

/** Minimal env that satisfies Env interface for tests */
const TEST_ENV: Env = {
  GEMINI_API_KEY: "test-key",
  ACTOR_KIT_HOST: "localhost",
  ACTOR_KIT_SECRET: "test-secret",
  SESSION_JWT_SECRET: "test-jwt-secret",
};

/** Minimal storage stub for tests */
const TEST_STORAGE = {
  getAll: async () => new Map(),
  get: async (_key: string) => undefined,
  put: async () => {},
} as unknown as ActorKitStorage;

type ClientCaller = { type: "client"; id: string };
type ServiceCaller = { type: "service"; id: string };

/**
 * Create a test game actor with properly typed input.
 * No `as any` needed.
 */
export function createTestActor(hostId = "host-1", hostName = "TestHost") {
  const actor = createActor(gameMachine, {
    input: {
      id: "test-game",
      hostName,
      caller: { type: "client" as const, id: hostId },
      env: TEST_ENV,
      storage: TEST_STORAGE,
    } satisfies GameInput,
  });
  actor.start();
  return actor;
}

type TestActor = ReturnType<typeof createTestActor>;

/** Build a fully typed GameEvent from a client event + caller ID */
function makeClientEvent<T extends GameClientEvent>(
  event: T,
  callerId: string
): GameEvent {
  return {
    ...event,
    caller: { type: "client" as const, id: callerId } as ClientCaller,
    env: TEST_ENV,
    storage: TEST_STORAGE,
  } as GameEvent;
}

/** Send an event as the host */
export function hostSend(actor: TestActor, event: GameClientEvent) {
  const hostId = actor.getSnapshot().context.public.hostId;
  actor.send(makeClientEvent(event, hostId));
}

/** Send an event as a specific player */
export function playerSend(
  actor: TestActor,
  playerId: string,
  event: GameClientEvent
) {
  actor.send(makeClientEvent(event, playerId));
}

/** Send an event as a service caller (for testing guard rejection) */
export function serviceSend(
  actor: TestActor,
  serviceId: string,
  event: GameClientEvent
) {
  actor.send({
    ...event,
    caller: { type: "service" as const, id: serviceId } as ServiceCaller,
    env: TEST_ENV,
    storage: TEST_STORAGE,
  } as GameEvent);
}

/** Standard 2-question set for tests */
export const TWO_QUESTIONS = {
  q1: {
    id: "q1",
    text: "What is 2+2?",
    correctAnswer: 4,
    questionType: "numeric" as const,
  },
  q2: {
    id: "q2",
    text: "What is 3+3?",
    correctAnswer: 6,
    questionType: "numeric" as const,
  },
};

/** Set up a game in active.questionPrep state with questions and players */
export function setupActiveGame(
  playerNames: string[] = ["Alice"],
  questions = TWO_QUESTIONS
) {
  const actor = createTestActor();
  hostSend(actor, { type: "QUESTIONS_PARSED", questions });
  playerNames.forEach((name, i) => {
    playerSend(actor, `player-${i + 1}`, { type: "JOIN_GAME", playerName: name });
  });
  hostSend(actor, { type: "START_GAME" });
  return actor;
}
