import type { StoryContext, StoryFn } from "@storybook/react";
import type { CallerSnapshotFrom } from "actor-kit";
import React from "react";
import {
  RouterProvider,
  createMemoryHistory,
  createRootRoute,
  createRouter,
} from "@tanstack/react-router";
import type { GameMachine } from "../src/game.machine";
import type { SessionMachine } from "../src/session.machine";

export const defaultGameSnapshot = {
  public: {
    id: "game-123",
    hostId: "host-123",
    hostName: "Test Host",
    gameCode: "ABC123",
    players: [] as Array<{ id: string; name: string; score: number }>,
    currentQuestion: null,
    winner: null,
    settings: {
      maxPlayers: 20,
      answerTimeWindow: 30,
    },
    questions: {} as Record<
      string,
      {
        id: string;
        text: string;
        correctAnswer: string | number;
        questionType: "numeric" | "multiple-choice";
        options?: string[];
      }
    >,
    questionResults: [],
    questionNumber: 0,
  },
  private: {},
  value: { lobby: "ready" } as const,
} satisfies CallerSnapshotFrom<GameMachine>;

export const defaultSessionSnapshot = {
  public: {
    userId: "test-user-id",
    gameIdsByJoinCode: {},
  },
  private: {},
  value: { Initialization: "Ready" as const },
} satisfies CallerSnapshotFrom<SessionMachine>;

/**
 * Configuration interface for the router environment in Storybook stories.
 */
export interface RouterParameters<TLoader> {
  router: {
    /** Initial URL path for the story */
    initialPath: string;
    /** Mock data that would be returned by the loader */
    loaderData: TLoader;
  };
}

/**
 * Storybook decorator that creates a mock TanStack Router environment.
 * Required for components that use router hooks (Link, useNavigate, useParams).
 */
export const withRouter = <TLoader extends Record<string, unknown>>() => {
  return (Story: StoryFn, context: StoryContext) => {
    const routerParams = context.parameters?.router as
      | RouterParameters<TLoader>["router"]
      | undefined;

    const rootRoute = createRootRoute({
      component: () => <Story />,
    });

    const memoryHistory = createMemoryHistory({
      initialEntries: [routerParams?.initialPath || "/"],
    });

    const router = createRouter({
      routeTree: rootRoute,
      history: memoryHistory,
    });

    return <RouterProvider router={router} />;
  };
};
