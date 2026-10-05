import type { Meta, StoryObj } from "@storybook/react";
import { expect } from "@storybook/test";
import { withActorKit } from "actor-kit/storybook";
import { createActorKitMockClient } from "actor-kit/test";
import React from "react";
import { SpectatorView } from "../src/components/spectator-view";
import { GameContext } from "../src/game.context";
import type { GameMachine } from "../src/game.machine";
import { SessionContext } from "../src/session.context";
import type { SessionMachine } from "../src/session.machine";
import { defaultGameSnapshot, defaultSessionSnapshot } from "./utils";

const meta = {
  title: "Views/SpectatorView",
  component: SpectatorView,
  parameters: {
    layout: "fullscreen",
    autoplay: true,
  },
  args: {
    host: "dev.triviajam.tv", // Default host value
  },
  decorators: [
    withActorKit<SessionMachine>({
      actorType: "session",
      context: SessionContext,
    }),
    withActorKit<GameMachine>({
      actorType: "game",
      context: GameContext,
    }),
  ],
} satisfies Meta<typeof SpectatorView>;

export default meta;
type Story = StoryObj<typeof SpectatorView>;

export const Docs: Story = {
  parameters: {
    actorKit: {
      session: {
        "session-123": {
          ...defaultSessionSnapshot,
          public: {
            ...defaultSessionSnapshot.public,
            userId: "spectator-123",
          },
        },
      },
      game: {
        "game-123": {
          ...defaultGameSnapshot,
          public: {
            ...defaultGameSnapshot.public,
            players: [
              { id: "player-1", name: "Player 1", score: 0 },
              { id: "player-2", name: "Player 2", score: 0 },
            ],
          },
        },
      },
    },
  },
};

export const InLobby: Story = {
  parameters: {
    actorKit: {
      session: {
        "session-123": {
          ...defaultSessionSnapshot,
          public: {
            ...defaultSessionSnapshot.public,
            userId: "spectator-123",
          },
        },
      },
      game: {
        "game-123": {
          ...defaultGameSnapshot,
          public: {
            ...defaultGameSnapshot.public,
            players: [
              { id: "player-1", name: "Player 1", score: 0 },
              { id: "player-2", name: "Player 2", score: 0 },
            ],
          },
        },
      },
    },
  },
  play: async ({ canvas, mount, step }) => {
    await step("Mount component with initial state", async () => {
      await mount(<SpectatorView host="dev.triviajam.tv" />);
    });

    await step("Verify lobby elements", async () => {
      const title = await canvas.findByText(/waiting for game to start/i);
      expect(title).toBeInTheDocument();

      const player1 = await canvas.findByText("Player 1");
      expect(player1).toBeInTheDocument();
      const player2 = await canvas.findByText("Player 2");
      expect(player2).toBeInTheDocument();
    });

    await step("Verify empty slots", async () => {
      const emptySlots = await canvas.findAllByText("Empty Slot");
      expect(emptySlots).toHaveLength(8);
    });

    await step("Verify QR code section", async () => {
      const qrCodeSection = await canvas.findByTestId("qr-code-section");
      expect(qrCodeSection).toBeInTheDocument();

      const qrCode = await canvas.findByTestId("game-qr-code");
      expect(qrCode).toBeInTheDocument();

      const qrLabel = await canvas.findByTestId("qr-code-label");
      expect(qrLabel).toHaveTextContent(/scan to join the game/i);
    });
  },
};

// Helper function to create players array
const createPlayers = (count: number, scores: Record<string, number> = {}) => 
  Array.from({ length: count }, (_, i) => ({
    id: `player-${i + 1}`,
    name: `Player ${i + 1}`,
    score: scores[`player-${i + 1}`] || 0,
  }));

export const ActiveQuestionNoAnswers: Story = {
  parameters: {
    actorKit: {
      session: {
        "session-123": defaultSessionSnapshot,
      },
      game: {
        "game-123": {
          ...defaultGameSnapshot,
          public: {
            ...defaultGameSnapshot.public,
            gameStatus: "active",
            questions: {
              "q1": {
                id: "q1",
                text: "What year was the Declaration of Independence signed?",
                correctAnswer: 1776,
                questionType: "numeric",
              },
            },
            currentQuestion: {
              questionId: "q1",
              startTime: Date.now(),
              answers: [],
            },
            players: createPlayers(10),
          },
        },
      },
    },
  },
  play: async ({ canvas, mount }) => {
    const gameClient = createActorKitMockClient<GameMachine>({
      initialSnapshot: {
        ...defaultGameSnapshot,
        public: {
          ...defaultGameSnapshot.public,
          id: "game-123",
          hostId: "host-123",
          questions: {
            "q1": {
              id: "q1",
              text: "What year was the Declaration of Independence signed?",
              correctAnswer: 1776,
              questionType: "numeric",
            },
          },
          currentQuestion: {
            questionId: "q1",
            startTime: Date.now(),
            answers: [],
          },
          players: createPlayers(10),
          settings: {
            maxPlayers: 10,
            answerTimeWindow: 30,
          },
        },
        value: { active: "questionActive" },
      },
    });

    await mount(
      <GameContext.ProviderFromClient client={gameClient}>
        <SpectatorView host="dev.triviajam.tv" />
      </GameContext.ProviderFromClient>
    );

    // Verify question display
    const questionText = await canvas.findByText(
      "What year was the Declaration of Independence signed?"
    );
    expect(questionText).toBeInTheDocument();

    // Verify timer display
    const timer = await canvas.findByTestId("question-timer");
    expect(timer).toBeInTheDocument();
    // Timer counts down from answerTimeWindow — verify it's present and in range
    const timerValue = parseInt(timer.textContent!);
    expect(timerValue).toBeGreaterThanOrEqual(0);
    expect(timerValue).toBeLessThanOrEqual(30);
  },
};

export const ActiveQuestionWithAnswers: Story = {
  parameters: {
    actorKit: {
      session: {
        "session-123": defaultSessionSnapshot,
      },
      game: {
        "game-123": {
          ...defaultGameSnapshot,
          public: {
            ...defaultGameSnapshot.public,
            gameStatus: "active",
            questions: {
              "q1": {
                id: "q1",
                text: "What year was the Declaration of Independence signed?",
                correctAnswer: 1776,
                questionType: "numeric",
              },
            },
            currentQuestion: {
              questionId: "q1",
              startTime: Date.now() - 15000, // Started 15 seconds ago
              answers: [
                {
                  playerId: "player-1",
                  playerName: "Player 1",
                  value: 1776,
                  timestamp: Date.now() - 10000,
                },
                {
                  playerId: "player-2",
                  playerName: "Player 2",
                  value: 1775,
                  timestamp: Date.now() - 5000,
                },
              ],
            },
            players: createPlayers(10),
            settings: {
              maxPlayers: 10,
              questionCount: 10,
              answerTimeWindow: 30,
            },
          },
          value: { active: "questionActive" },
        },
      },
    },
  },
};

export const QuestionResults: Story = {
  parameters: {
    actorKit: {
      session: {
        "session-123": defaultSessionSnapshot,
      },
      game: {
        "game-123": {
          ...defaultGameSnapshot,
          public: {
            ...defaultGameSnapshot.public,
            id: "game-123",
            hostId: "host-123",
            gameStatus: "active",
            questions: {
              "q1": {
                id: "q1",
                text: "What year was the Declaration of Independence signed?",
                correctAnswer: 1776,
                questionType: "numeric",
              },
            },
            currentQuestion: null,
            questionResults: [
              {
                questionId: "q1",
                questionNumber: 1,
                answers: [
                  {
                    playerId: "player-1",
                    playerName: "Player 1",
                    value: 1776,
                    timestamp: Date.now() - 8000,
                  },
                  {
                    playerId: "player-2",
                    playerName: "Player 2",
                    value: 1775,
                    timestamp: Date.now() - 5000,
                  },
                ],
                scores: [
                  {
                    playerId: "player-1",
                    playerName: "Player 1",
                    points: 3,
                    position: 1,
                    timeTaken: 8,
                  },
                  {
                    playerId: "player-2",
                    playerName: "Player 2",
                    points: 2,
                    position: 2,
                    timeTaken: 5,
                  },
                ],
              },
            ],
            players: createPlayers(10, {
              "player-1": 3,
              "player-2": 2,
            }),
            settings: {
              maxPlayers: 10,
              questionCount: 10,
              answerTimeWindow: 30,
            },
          },
          value: { active: "questionPrep" },
        },
      },
    },
  },
  play: async ({ canvas, mount }) => {
    const gameClient = createActorKitMockClient<GameMachine>({
      initialSnapshot: {
        ...defaultGameSnapshot,
        public: {
          ...defaultGameSnapshot.public,
          id: "game-123",
          hostId: "host-123",
          questions: {
            "q1": {
              id: "q1",
              text: "What year was the Declaration of Independence signed?",
              correctAnswer: 1776,
              questionType: "numeric",
            },
          },
          currentQuestion: null,
          questionResults: [
            {
              questionId: "q1",
              questionNumber: 1,
              answers: [
                {
                  playerId: "player-1",
                  playerName: "Player 1",
                  value: 1776,
                  timestamp: Date.now() - 8000,
                },
                {
                  playerId: "player-2",
                  playerName: "Player 2",
                  value: 1775,
                  timestamp: Date.now() - 5000,
                },
              ],
              scores: [
                {
                  playerId: "player-1",
                  playerName: "Player 1",
                  points: 3,
                  position: 1,
                  timeTaken: 8,
                },
                {
                  playerId: "player-2",
                  playerName: "Player 2",
                  points: 2,
                  position: 2,
                  timeTaken: 5,
                },
              ],
            },
          ],
          players: createPlayers(10, {
            "player-1": 3,
            "player-2": 2,
          }),
          settings: {
            maxPlayers: 10,
            answerTimeWindow: 30,
          },
        },
        value: { active: "questionPrep" },
      },
    });

    await mount(
      <GameContext.ProviderFromClient client={gameClient}>
        <SpectatorView host="dev.triviajam.tv" />
      </GameContext.ProviderFromClient>
    );

    // Verify results display
    const questionText = await canvas.findByText("What year was the Declaration of Independence signed?");
    expect(questionText).toBeInTheDocument();

    const correctAnswer = await canvas.findByTestId("correct-answer");
    expect(correctAnswer).toBeInTheDocument();
    expect(correctAnswer).toHaveTextContent("1776");

    // Verify player scores
    const player1Result = await canvas.findByTestId("player-result-player-1");
    expect(player1Result).toBeInTheDocument();
    expect(player1Result).toHaveTextContent("3 pts");

    const player2Result = await canvas.findByTestId("player-result-player-2");
    expect(player2Result).toBeInTheDocument();
    expect(player2Result).toHaveTextContent("2 pts");
  },
};

export const GameFinished: Story = {
  parameters: {
    actorKit: {
      session: {
        "session-123": {
          ...defaultSessionSnapshot,
          public: {
            ...defaultSessionSnapshot.public,
            userId: "spectator-123",
          },
        },
      },
      game: {
        "game-123": {
          ...defaultGameSnapshot,
          public: {
            ...defaultGameSnapshot.public,
            id: "game-123",
            hostId: "host-123",
            gameStatus: "finished",
            winner: "player-1",
            players: createPlayers(10, {
              "player-1": 15,
              "player-2": 12,
              "player-3": 9,
              "player-4": 7,
              "player-5": 5,
              "player-6": 4,
              "player-7": 3,
              "player-8": 2,
              "player-9": 1,
              "player-10": 0,
            }),
            questions: {},
            questionResults: [],
            settings: {
              maxPlayers: 10,
              questionCount: 10,
              answerTimeWindow: 30,
            },
          },
          value: "finished",
        },
      },
    },
  },
  play: async ({ canvas, mount }) => {
    const gameClient = createActorKitMockClient<GameMachine>({
      initialSnapshot: {
        ...defaultGameSnapshot,
        public: {
          ...defaultGameSnapshot.public,
          id: "game-123",
          hostId: "host-123",
          winner: "player-1",
          players: createPlayers(10, {
            "player-1": 15,
            "player-2": 12,
            "player-3": 9,
            "player-4": 7,
            "player-5": 5,
            "player-6": 4,
            "player-7": 3,
            "player-8": 2,
            "player-9": 1,
            "player-10": 0,
          }),
          questions: {},
          questionResults: [],
          settings: {
            maxPlayers: 10,
            answerTimeWindow: 30,
          },
        },
        value: "finished",
      },
    });

    await mount(
      <GameContext.ProviderFromClient client={gameClient}>
        <SpectatorView host="dev.triviajam.tv" />
      </GameContext.ProviderFromClient>
    );

    // Verify game over elements using test IDs
    const gameOverTitle = await canvas.findByTestId("game-over-title");
    expect(gameOverTitle).toBeInTheDocument();
    expect(gameOverTitle).toHaveTextContent(/game over/i);

    // Find winner announcement section
    const winnerSection = await canvas.findByTestId("winner-announcement");
    expect(winnerSection).toBeInTheDocument();
    expect(winnerSection).toHaveTextContent(/player 1.*wins/i);

    // Find Final Scores heading
    const scoresHeading = await canvas.findByTestId("final-scores-heading");
    expect(scoresHeading).toBeInTheDocument();
    expect(scoresHeading).toHaveTextContent(/final scores/i);

    // Verify player scores using test IDs
    const player1Score = await canvas.findByTestId("player-score-player-1");
    expect(player1Score).toBeInTheDocument();
    expect(player1Score).toHaveTextContent("Player 1");
    expect(player1Score).toHaveTextContent("15");

    const player2Score = await canvas.findByTestId("player-score-player-2");
    expect(player2Score).toBeInTheDocument();
    expect(player2Score).toHaveTextContent("Player 2");
    expect(player2Score).toHaveTextContent("12");
  },
};

export const WaitingForQuestion: Story = {
  parameters: {
    actorKit: {
      session: {
        "session-123": defaultSessionSnapshot,
      },
      game: {
        "game-123": {
          ...defaultGameSnapshot,
          public: {
            ...defaultGameSnapshot.public,
            id: "game-123",
            hostId: "host-123",
            gameStatus: "active",
            questions: {},
            currentQuestion: null,
            questionResults: [],
            players: createPlayers(10, {
              "player-1": 3,
              "player-2": 2,
            }),
            settings: {
              maxPlayers: 10,
              questionCount: 10,
              answerTimeWindow: 30,
            },
          },
          value: { active: "questionPrep" },
        },
      },
    },
  },
  play: async ({ mount, canvas }) => {
    await mount(<SpectatorView host="dev.triviajam.tv" />);

    // Find and verify waiting state
    const waitingState = await canvas.findByTestId("waiting-for-question");
    expect(waitingState).toBeInTheDocument();

    // Verify waiting message
    const heading = await canvas.findByRole('heading', { level: 1 });
    expect(heading).toBeInTheDocument();
    expect(heading).toHaveTextContent("Waiting for Question...");
  },
};


// ---------------------------------------------------------------------------
// TV art-direction stories: a family game (Sam, Mom, Grandpa, Lou) in every phase.
// ---------------------------------------------------------------------------

const FAMILY = [
  { id: "p-sam", name: "Sam", score: 0 },
  { id: "p-mom", name: "Mom", score: 0 },
  { id: "p-grandpa", name: "Grandpa", score: 0 },
  { id: "p-lou", name: "Lou", score: 0 },
];

const FAMILY_QUESTIONS = {
  q1: { id: "q1", text: "How many legs does a spider have?", correctAnswer: 8, questionType: "numeric" as const },
  q2: { id: "q2", text: "How many days does it take the Moon to go once around the Earth?", correctAnswer: 27, questionType: "numeric" as const },
  q3: {
    id: "q3",
    text: "Which planet is the biggest in our solar system?",
    correctAnswer: "Jupiter",
    questionType: "multiple-choice" as const,
    options: ["Mars", "Jupiter", "Saturn", "Neptune"],
  },
  q4: { id: "q4", text: "In what year did people first walk on the Moon?", correctAnswer: 1969, questionType: "numeric" as const },
  q5: { id: "q5", text: "How many bones are in an adult human body?", correctAnswer: 206, questionType: "numeric" as const },
};

type FamilySnapshot = Parameters<typeof createActorKitMockClient<GameMachine>>[0]["initialSnapshot"];

const familySnapshot = (
  patch: Partial<FamilySnapshot["public"]>,
  value: FamilySnapshot["value"],
): FamilySnapshot => ({
  ...defaultGameSnapshot,
  public: {
    ...defaultGameSnapshot.public,
    players: FAMILY,
    questions: FAMILY_QUESTIONS,
    settings: { maxPlayers: 10, answerTimeWindow: 25 },
    ...patch,
  },
  value,
});

const mountFamily = (snapshot: FamilySnapshot, after?: (client: ReturnType<typeof createActorKitMockClient<GameMachine>>) => void): Story["play"] =>
  async ({ mount }) => {
    const client = createActorKitMockClient<GameMachine>({ initialSnapshot: snapshot });
    await mount(
      <GameContext.ProviderFromClient client={client}>
        <SpectatorView host="triviajam.tv" />
      </GameContext.ProviderFromClient>
    );
    after?.(client);
  };

const now = Date.now();

export const TvLobbyFamily: Story = {
  play: mountFamily(familySnapshot({ players: FAMILY.slice(0, 3) }, { lobby: "ready" })),
};

export const TvLobbyFull: Story = {
  play: mountFamily(
    familySnapshot(
      {
        players: [
          ...FAMILY,
          { id: "p5", name: "Auntie Bea", score: 0 },
          { id: "p6", name: "Uncle Ray", score: 0 },
          { id: "p7", name: "Nana", score: 0 },
          { id: "p8", name: "Ollie", score: 0 },
          { id: "p9", name: "Maximiliana", score: 0 },
          { id: "p10", name: "Dad", score: 0 },
        ],
      },
      { lobby: "ready" },
    ),
  ),
};

export const TvBeforeFirstQuestion: Story = {
  play: mountFamily(familySnapshot({}, { active: "questionPrep" })),
};

export const TvQuestionNumeric: Story = {
  play: mountFamily(
    familySnapshot(
      {
        questionNumber: 2,
        currentQuestion: {
          questionId: "q2",
          startTime: now,
          answers: [
            { playerId: "p-mom", playerName: "Mom", value: 28, timestamp: now + 2000 },
            { playerId: "p-sam", playerName: "Sam", value: 30, timestamp: now + 4000 },
          ],
        },
      },
      { active: "questionActive" },
    ),
  ),
};

export const TvQuestionMultipleChoice: Story = {
  play: mountFamily(
    familySnapshot(
      {
        questionNumber: 3,
        currentQuestion: {
          questionId: "q3",
          startTime: now,
          answers: [{ playerId: "p-grandpa", playerName: "Grandpa", value: "Jupiter", timestamp: now + 3000 }],
        },
      },
      { active: "questionActive" },
    ),
  ),
};

export const TvQuestionLastSeconds: Story = {
  play: mountFamily(
    {
      ...familySnapshot(
        {
          questionNumber: 4,
          currentQuestion: { questionId: "q4", startTime: now, answers: [] },
        },
        { active: "questionActive" },
      ),
      public: {
        ...familySnapshot({}, { active: "questionActive" }).public,
        questionNumber: 4,
        currentQuestion: { questionId: "q4", startTime: now, answers: [] },
        settings: { maxPlayers: 10, answerTimeWindow: 4 },
      },
    },
  ),
};

type FamilyResult = FamilySnapshot["public"]["questionResults"][number];

const resultFor = (
  questionId: string,
  questionNumber: number,
  guesses: Array<[string, string, number | string, number]>,
): FamilyResult => ({
  questionId,
  questionNumber,
  answers: guesses.map(([playerId, playerName, value], i) => ({ playerId, playerName, value, timestamp: now + 2000 + i * 1500 })),
  scores: guesses.map(([playerId, playerName, , points], i) => ({ playerId, playerName, points, position: i + 1, timeTaken: 2 + i * 1.5 })),
});

const Q2_RESULT = resultFor("q2", 2, [
  ["p-sam", "Sam", 30, 2],
  ["p-mom", "Mom", 28, 3],
  ["p-grandpa", "Grandpa", 14, 0],
  ["p-lou", "Lou", 27, 4],
]);
const AFTER_Q1 = { "p-sam": 4, "p-mom": 3, "p-grandpa": 2, "p-lou": 0 };
const withScores = (scores: Record<string, number>) => FAMILY.map((p) => ({ ...p, score: scores[p.id] ?? 0 }));
const plus = (a: Record<string, number>, r: FamilyResult) =>
  Object.fromEntries(Object.entries(a).map(([id, s]) => [id, s + (r.scores.find((x) => x.playerId === id)?.points ?? 0)]));

/** Mounts mid-question, then the results arrive 600 ms later: the reveal plays live. */
const liveReveal = (questionId: string, questionNumber: number, result: FamilyResult, before: Record<string, number>): Story["play"] =>
  mountFamily(
    familySnapshot(
      {
        players: withScores(before),
        questionNumber,
        questionResults: [],
        currentQuestion: { questionId, startTime: now, answers: result.answers },
      },
      { active: "questionActive" },
    ),
    (client) => {
      setTimeout(() => {
        client.produce((draft) => {
          draft.public.currentQuestion = null;
          draft.public.questionResults.push(result);
          for (const p of draft.public.players) p.score = plus(before, result)[p.id] ?? p.score;
          draft.value = { active: "questionPrep" };
        });
      }, 600);
    },
  );

export const TvRevealNumericLive: Story = { play: liveReveal("q2", 2, Q2_RESULT, AFTER_Q1) };

export const TvRevealNumericSettled: Story = {
  play: mountFamily(
    familySnapshot(
      { players: withScores(plus(AFTER_Q1, Q2_RESULT)), questionNumber: 2, questionResults: [Q2_RESULT] },
      { active: "questionPrep" },
    ),
  ),
};

export const TvRevealYearLive: Story = {
  play: liveReveal(
    "q4",
    4,
    resultFor("q4", 4, [
      ["p-sam", "Sam", 1950, 1],
      ["p-mom", "Mom", 1969, 5],
      ["p-grandpa", "Grandpa", 1972, 3],
      ["p-lou", "Lou", 2001, 0],
    ]),
    AFTER_Q1,
  ),
};

export const TvRevealMultipleChoiceLive: Story = {
  play: liveReveal(
    "q3",
    3,
    resultFor("q3", 3, [
      ["p-sam", "Sam", "Saturn", 0],
      ["p-mom", "Mom", "Jupiter", 4],
      ["p-grandpa", "Grandpa", "Jupiter", 3],
      ["p-lou", "Lou", "Mars", 0],
    ]),
    AFTER_Q1,
  ),
};

export const TvGameOverFamily: Story = {
  play: mountFamily(
    familySnapshot(
      { players: withScores({ "p-sam": 9, "p-mom": 14, "p-grandpa": 7, "p-lou": 11 }), winner: "p-mom", questionNumber: 5 },
      "finished",
    ),
  ),
};

/** Ten players, close guesses: the crowded case for lanes and the two-column standings board. */
export const TvRevealCrowdedLive: Story = {
  play: mountFamily(
    familySnapshot(
      {
        players: [
          ...withScores(AFTER_Q1),
          { id: "p5", name: "Auntie Bea", score: 3 },
          { id: "p6", name: "Uncle Ray", score: 1 },
          { id: "p7", name: "Nana", score: 5 },
          { id: "p8", name: "Ollie", score: 2 },
          { id: "p9", name: "Maximiliana", score: 0 },
          { id: "p10", name: "Dad", score: 4 },
        ],
        questionNumber: 2,
        currentQuestion: { questionId: "q2", startTime: now, answers: [] },
      },
      { active: "questionActive" },
    ),
    (client) => {
      const result = resultFor("q2", 2, [
        ["p-sam", "Sam", 30, 1],
        ["p-mom", "Mom", 28, 3],
        ["p-grandpa", "Grandpa", 14, 0],
        ["p-lou", "Lou", 27, 5],
        ["p5", "Auntie Bea", 29, 2],
        ["p6", "Uncle Ray", 26, 4],
        ["p7", "Nana", 31, 0],
        ["p8", "Ollie", 100, 0],
        ["p9", "Maximiliana", 27, 5],
        ["p10", "Dad", 25, 1],
      ]);
      setTimeout(() => {
        client.produce((draft) => {
          draft.public.currentQuestion = null;
          draft.public.questionResults.push(result);
          for (const p of draft.public.players) p.score += result.scores.find((s) => s.playerId === p.id)?.points ?? 0;
          draft.value = { active: "questionPrep" };
        });
      }, 600);
    },
  ),
};

const CROWD = [
  ...withScores({ "p-sam": 5, "p-mom": 6, "p-grandpa": 2, "p-lou": 5 }),
  { id: "p5", name: "Auntie Bea", score: 5 },
  { id: "p6", name: "Uncle Ray", score: 5 },
  { id: "p7", name: "Nana", score: 5 },
  { id: "p8", name: "Ollie", score: 2 },
  { id: "p9", name: "Maximiliana", score: 5 },
  { id: "p10", name: "Dad", score: 5 },
];

/** A TV that loads between questions with ten players: settled reveal, then the two-column board. */
export const TvStandingsCrowdedSettled: Story = {
  play: mountFamily(
    familySnapshot(
      {
        players: CROWD,
        questionNumber: 2,
        questionResults: [
          resultFor("q2", 2, [
            ["p-sam", "Sam", 30, 1],
            ["p-mom", "Mom", 28, 3],
            ["p-lou", "Lou", 27, 5],
            ["p9", "Maximiliana", 27, 5],
            ["p10", "Dad", 25, 1],
          ]),
        ],
      },
      { active: "questionPrep" },
    ),
  ),
};

/** Two identical exact guesses (one label, two chips) and a guess far off the scale (an edge tab with its true value). */
export const TvRevealTiedAndOffScaleLive: Story = {
  play: liveReveal(
    "q1",
    1,
    resultFor("q1", 1, [
      ["p-sam", "Sam", 8, 4],
      ["p-mom", "Mom", 8, 4],
      ["p-grandpa", "Grandpa", 6, 2],
      ["p-lou", "Lou", 30, 0],
    ]),
    { "p-sam": 0, "p-mom": 0, "p-grandpa": 0, "p-lou": 0 },
  ),
};

/** A finished family game with its results: podium, winner takeover, then recap awards. */
export const TvGameOverWithAwards: Story = {
  play: mountFamily(
    familySnapshot(
      {
        players: withScores({ "p-sam": 9, "p-mom": 14, "p-grandpa": 7, "p-lou": 11 }),
        winner: "p-mom",
        questionNumber: 5,
        questionResults: [
          resultFor("q1", 1, [
            ["p-sam", "Sam", 8, 4],
            ["p-mom", "Mom", 8, 4],
            ["p-grandpa", "Grandpa", 6, 2],
            ["p-lou", "Lou", 30, 0],
          ]),
          Q2_RESULT,
          resultFor("q3", 3, [
            ["p-sam", "Sam", "Saturn", 0],
            ["p-mom", "Mom", "Jupiter", 4],
            ["p-grandpa", "Grandpa", "Jupiter", 3],
            ["p-lou", "Lou", "Mars", 0],
          ]),
          resultFor("q4", 4, [
            ["p-sam", "Sam", 1950, 1],
            ["p-mom", "Mom", 1969, 5],
            ["p-grandpa", "Grandpa", 1972, 3],
            ["p-lou", "Lou", 2001, 0],
          ]),
        ],
      },
      "finished",
    ),
  ),
};

/** Nobody nails it: the closest guess breaks forward with a smaller CLOSEST stamp and how far off it was. */
export const TvRevealClosestLive: Story = {
  play: liveReveal(
    "q5",
    5,
    resultFor("q5", 5, [
      ["p-sam", "Sam", 180, 2],
      ["p-mom", "Mom", 212, 4],
      ["p-grandpa", "Grandpa", 150, 1],
      ["p-lou", "Lou", 300, 0],
    ]),
    AFTER_Q1,
  ),
};

/** Nobody picked the right tile: a gentle comic beat instead of a winner. */
export const TvRevealMultipleChoiceNobodyLive: Story = {
  play: liveReveal(
    "q3",
    3,
    resultFor("q3", 3, [
      ["p-sam", "Sam", "Saturn", 0],
      ["p-mom", "Mom", "Mars", 0],
      ["p-grandpa", "Grandpa", "Neptune", 0],
      ["p-lou", "Lou", "Mars", 0],
    ]),
    AFTER_Q1,
  ),
};
