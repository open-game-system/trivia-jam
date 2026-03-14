import type { Meta, StoryObj } from "@storybook/react";
import { withActorKit } from "actor-kit/storybook";
import React from "react";
import { atom } from "nanostores";
import { HomePageContent } from "../src/routes/index";
import { SessionContext } from "../src/session.context";
import type { SessionMachine } from "../src/session.machine";
import { withRouter } from "./utils";

const TEST_GAME_ID = "12345678-1234-1234-1234-123456789012";

const defaultSessionSnapshot = {
  public: {
    userId: "user-123",
    gameIdsByJoinCode: {},
  },
  private: {},
  value: { Initialization: "Ready" as const },
};

const meta: Meta<typeof HomePageContent> = {
  title: "Routes/Index",
  component: HomePageContent,
  parameters: {
    layout: "fullscreen",
  },
  args: {
    newGameId: TEST_GAME_ID,
    deviceType: "mobile",
    $showHelp: atom<boolean>(false),
  },
  decorators: [
    withRouter(),
    withActorKit<SessionMachine>({
      actorType: "session",
      context: SessionContext,
    }),
  ],
};

export default meta;
type Story = StoryObj<typeof HomePageContent>;

export const DefaultView: Story = {
  parameters: {
    router: {
      initialPath: "/",
    },
    actorKit: {
      session: {
        "session-123": defaultSessionSnapshot,
      },
    },
  },
};
