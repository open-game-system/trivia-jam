import type { Meta, StoryObj } from "@storybook/react";
import { expect, fn, within } from "@storybook/test";
import { userEvent } from "@storybook/testing-library";
import { withActorKit } from "actor-kit/storybook";
import { createActorKitMockClient } from "actor-kit/test";
import { useState } from "react";
import { GameContext } from "~/game.context";
import type { GameMachine } from "~/game.machine";
import { SessionContext } from "~/session.context";
import type { SessionMachine } from "~/session.machine";
import { defaultGameSnapshot, defaultSessionSnapshot } from "../../../stories/utils";
import { HostView } from "../host-view";
import { PlayerView } from "../player-view";
import { NumberPad } from "./NumberPad";
import { PhoneShell } from "./PhoneShell";
import { PlayerResult } from "./PlayerResult";

const meta = {
  title: "Phone/Screens",
  parameters: { layout: "fullscreen" },
  decorators: [
    withActorKit<SessionMachine>({ actorType: "session", context: SessionContext }),
    withActorKit<GameMachine>({ actorType: "game", context: GameContext }),
  ],
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

const ME = "player-456";
const numericQuestion = {
  id: "q1",
  text: "How many legs does a spider have?",
  correctAnswer: 8,
  questionType: "numeric" as const,
};

const asPlayer = (userId: string) => ({
  "session-123": {
    ...defaultSessionSnapshot,
    public: { ...defaultSessionSnapshot.public, userId },
  },
});

const people = [
  { id: ME, name: "Juneau", score: 6 },
  { id: "p2", name: "Mom", score: 9 },
  { id: "p3", name: "Dad", score: 3 },
];

/* ---------- The pad on its own ---------- */

const PadHarness = ({ onSubmit }: { onSubmit: (value: string) => void }) => {
  const [value, setValue] = useState("");
  return (
    <PhoneShell fill>
      <div className="pt-6 text-center text-2xl font-extrabold">How many legs?</div>
      <NumberPad
        value={value}
        onChange={setValue}
        onSubmit={() => onSubmit(value)}
        isSubmitting={false}
      />
    </PhoneShell>
  );
};

const padArgs = { onSubmit: fn() };

export const NumberPadTyping: StoryObj<typeof PadHarness> = {
  render: () => <PadHarness {...padArgs} />,
  decorators: [],
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const display = canvas.getByTestId("answer-display");
    const go = canvas.getByRole("button", { name: /submit/i });
    expect(go).toBeDisabled();

    for (const key of ["1", "7", "7", "6"]) {
      await userEvent.click(canvas.getByRole("button", { name: key }));
    }
    expect(display).toHaveTextContent("1776");
    await userEvent.click(canvas.getByRole("button", { name: "Delete" }));
    expect(display).toHaveTextContent("177");
    await userEvent.click(canvas.getByRole("button", { name: "6" }));

    // No system keyboard: the only input is visually hidden and keyboard-less.
    const input = canvas.getByLabelText(/your answer/i);
    expect(input).toHaveAttribute("inputmode", "none");
    expect(document.activeElement).not.toBe(input);

    expect(go).toBeEnabled();
    await userEvent.click(go);
    expect(padArgs.onSubmit).toHaveBeenCalledWith("1776");
  },
};

/* ---------- Player screens ---------- */

export const LockedInNumber: Story = {
  parameters: {
    actorKit: {
      session: asPlayer(ME),
      game: {
        "game-123": {
          ...defaultGameSnapshot,
          public: {
            ...defaultGameSnapshot.public,
            players: people,
            questions: { q1: numericQuestion },
            questionNumber: 1,
            currentQuestion: {
              questionId: "q1",
              startTime: Date.now() - 4000,
              answers: [
                { playerId: ME, playerName: "Juneau", value: 6, timestamp: Date.now() - 1000 },
              ],
            },
          },
          value: { active: "questionActive" },
        },
      },
    },
  },
  render: () => <PlayerView />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const state = await canvas.findByTestId("answer-submitted");
    expect(state).toHaveTextContent("LOCKED IN");
    expect(within(state).getByText("6")).toBeInTheDocument();
  },
};

const resultFor = (guess: number) => ({
  questionId: "q1",
  questionNumber: 1,
  answers: [
    { playerId: ME, playerName: "Juneau", value: guess, timestamp: 1000 },
    { playerId: "p2", playerName: "Mom", value: 8, timestamp: 2000 },
    { playerId: "p3", playerName: "Dad", value: 12, timestamp: 3000 },
  ],
  scores: [
    { playerId: "p2", playerName: "Mom", points: 4, position: 1, timeTaken: 2 },
    {
      playerId: ME,
      playerName: "Juneau",
      points: guess === 8 ? 4 : guess === 7 ? 3 : 0,
      position: guess === 8 ? 1 : 2,
      timeTaken: 1,
    },
    { playerId: "p3", playerName: "Dad", points: 0, position: 3, timeTaken: 3 },
  ],
});

const resultsStory = (guess: number): Story => ({
  parameters: {
    actorKit: {
      session: asPlayer(ME),
      game: {
        "game-123": {
          ...defaultGameSnapshot,
          public: {
            ...defaultGameSnapshot.public,
            players: people,
            questions: { q1: numericQuestion },
            questionNumber: 1,
            questionResults: [resultFor(guess)],
          },
          value: { active: "questionPrep" },
        },
      },
    },
  },
  render: () => <PlayerView />,
});

export const ResultsExact: Story = {
  ...resultsStory(8),
  play: async ({ canvasElement }) => {
    const mine = await within(canvasElement).findByTestId("my-result");
    expect(mine).toHaveTextContent("EXACT!");
  },
};

export const ResultsMiss: Story = {
  ...resultsStory(5),
  play: async ({ canvasElement }) => {
    const mine = await within(canvasElement).findByTestId("my-result");
    expect(mine).toHaveTextContent("NOT THIS TIME");
    expect(within(mine).getByTestId("my-answer")).toHaveTextContent("5");
    expect(within(mine).getByTestId("correct-answer")).toHaveTextContent("8");
  },
};

const HoldHarness = ({ ageMs }: { ageMs: number }) => {
  const [arrivedAt] = useState(() => Date.now() - ageMs);
  return (
    <PhoneShell>
      <PlayerResult
        question={{ ...numericQuestion }}
        result={resultFor(8)}
        me={people[0]}
        players={people}
        arrivedAt={arrivedAt}
      />
    </PhoneShell>
  );
};

/** A miss that still scored: lead with the points and the place, never "NOT THIS TIME". */
export const ResultsScoredSecondPlace: Story = {
  render: () => {
    const base = resultFor(5);
    const result = {
      ...base,
      scores: base.scores.map((sc) => (sc.playerId === ME ? { ...sc, points: 2 } : sc)),
    };
    return (
      <PhoneShell>
        <PlayerResult
          question={{ ...numericQuestion }}
          result={result}
          me={{ ...people[0], score: 13 }}
          players={[{ ...people[0], score: 13 }, { ...people[1], score: 15 }, people[2]]}
        />
      </PhoneShell>
    );
  },
  play: async ({ canvasElement }) => {
    const mine = await within(canvasElement).findByTestId("my-result");
    expect(mine).not.toHaveTextContent("NOT THIS TIME");
    expect(mine).toHaveTextContent("GOOD GUESS!");
    expect(mine).toHaveTextContent("2nd");
  },
};

/** The result just arrived: the phone says LOOK AT THE TV and does not spoil the outcome. */
export const ResultsHeldForTheTv: Story = {
  render: () => <HoldHarness ageMs={0} />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const hold = await canvas.findByTestId("look-at-tv");
    expect(hold).toHaveTextContent("LOOK AT THE TV");
    expect(canvas.queryByTestId("my-result")).toBeNull();
  },
};

/** The TV landed the answer long ago: the outcome shows at once. */
export const ResultsShownAfterTheTv: Story = {
  render: () => <HoldHarness ageMs={60000} />,
  play: async ({ canvasElement }) => {
    expect(await within(canvasElement).findByTestId("my-result")).toHaveTextContent("EXACT!");
  },
};

export const GameOverSecondPlace: Story = {
  parameters: {
    actorKit: {
      session: asPlayer(ME),
      game: {
        "game-123": {
          ...defaultGameSnapshot,
          public: { ...defaultGameSnapshot.public, players: people },
          value: "finished",
        },
      },
    },
  },
  render: () => <PlayerView />,
  play: async ({ canvasElement }) => {
    const place = await within(canvasElement).findByTestId("my-place");
    expect(place).toHaveTextContent("2nd");
  },
};

/* ---------- Host controller ---------- */

const hostSession = asPlayer("host-123");

export const HostLiveQuestionEndGameConfirm: Story = {
  parameters: { actorKit: { session: hostSession } },
  render: () => <HostView host="dev.triviajam.tv" />,
  play: async ({ mount, canvasElement }) => {
    const gameClient = createActorKitMockClient<GameMachine>({
      initialSnapshot: {
        ...defaultGameSnapshot,
        public: {
          ...defaultGameSnapshot.public,
          players: people,
          questions: {
            q1: numericQuestion,
            q2: { ...numericQuestion, id: "q2", text: "How many days in a week?", correctAnswer: 7 },
          },
          questionNumber: 1,
          currentQuestion: {
            questionId: "q1",
            startTime: Date.now() - 4000,
            answers: [
              { playerId: "p2", playerName: "Mom", value: 8, timestamp: Date.now() - 2000 },
            ],
          },
        },
        value: { active: "questionActive" },
      },
    });
    const sent: string[] = [];
    gameClient.send = (event) => {
      sent.push(event.type);
      return Promise.resolve();
    };

    await mount(
      <GameContext.ProviderFromClient client={gameClient}>
        <HostView host="dev.triviajam.tv" />
      </GameContext.ProviderFromClient>,
    );
    const canvas = within(canvasElement);

    // One live view: timer, answers x/y, who is in. Ending asks first.
    expect(await canvas.findByTestId("question-timer")).toBeInTheDocument();
    expect(canvas.getByText(/Answers Submitted: 1 \/ 3/)).toBeInTheDocument();

    await userEvent.click(canvas.getByRole("button", { name: /end game/i }));
    expect(sent).not.toContain("END_GAME");
    await userEvent.click(await canvas.findByRole("button", { name: /keep playing/i }));
    expect(sent).not.toContain("END_GAME");

    await userEvent.click(canvas.getByRole("button", { name: /end game/i }));
    await userEvent.click(await canvas.findByRole("button", { name: /end game now/i }));
    expect(sent).toContain("END_GAME");
  },
};

export const HostGameOverNewGame: Story = {
  parameters: {
    actorKit: {
      session: hostSession,
      game: {
        "game-123": {
          ...defaultGameSnapshot,
          public: { ...defaultGameSnapshot.public, players: people },
          value: "finished",
        },
      },
    },
  },
  render: () => <HostView host="dev.triviajam.tv" />,
  play: async ({ canvasElement }) => {
    const link = await within(canvasElement).findByRole("link", { name: "New game" });
    expect(link).toHaveAttribute("href", "/");
  },
};

export const HostRemovePlayerIsQuiet: Story = {
  parameters: {
    actorKit: {
      session: hostSession,
      game: {
        "game-123": {
          ...defaultGameSnapshot,
          public: {
            ...defaultGameSnapshot.public,
            players: people,
            questions: { q1: numericQuestion },
          },
          value: { lobby: "ready" },
        },
      },
    },
  },
  render: () => <HostView host="dev.triviajam.tv" />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const remove = await canvas.findByTestId("remove-player-p2");
    expect(remove).toHaveTextContent("Remove");
    expect(remove).toHaveAccessibleName("Remove Mom");
  },
};
