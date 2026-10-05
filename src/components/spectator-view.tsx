import { AnimatePresence, motion } from "framer-motion";
import { Users } from "lucide-react";
import { GameContext } from "~/game.context";
import type { Answer, GamePublicContext, Question } from "~/game.types";
import { useQuestionTimer } from "~/hooks/use-question-timer";
import {
  GameBackground,
  TimerDisplay,
  FinalScoresList,
  WinnerAnnouncement,
  MultipleChoiceOptions,
  PlayerAnswerRow,
  ResultsScoreList,
  QuestionAnswerHeader,
  SidebarScoreboard,
} from "./game";
import { TvLobby } from "./tv/lobby";
import { TvStage } from "./tv/stage";

const QuestionProgress = ({
  current,
  total,
}: {
  current: number;
  total: number;
}) => {
  const progress = (current / total) * 100;

  return (
    <div className="fixed top-0 left-0 right-80 p-4 z-50">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center gap-3">
          <div className="flex-1 h-3 bg-gray-800/50 rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-indigo-500 to-purple-500"
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.5 }}
            />
          </div>
          <div className="text-sm font-medium text-white/70 tabular-nums">
            {current} / {total}
          </div>
        </div>
      </div>
    </div>
  );
};

const sortPlayersByAnswerTime = (
  players: Array<{ id: string; name: string; score: number }>,
  playerAnswers: Record<string, Answer | null>
) =>
  [...players].sort((a, b) => {
    const aAnswer = playerAnswers[a.id];
    const bAnswer = playerAnswers[b.id];
    if (!aAnswer && !bAnswer) return 0;
    if (!aAnswer) return 1;
    if (!bAnswer) return -1;
    return aAnswer.timestamp - bAnswer.timestamp;
  });

const buildPlayerAnswerMap = (
  players: Array<{ id: string; name: string; score: number }>,
  answers: Answer[]
): Record<string, Answer | null> =>
  players.reduce<Record<string, Answer | null>>((acc, player) => {
    acc[player.id] = answers.find((a) => a.playerId === player.id) || null;
    return acc;
  }, {});

const GameplayDisplay = ({
  currentQuestion,
  players,
  questions,
}: {
  currentQuestion: {
    questionId: string;
    startTime: number;
    answers: Answer[];
  } | null;
  players: Array<{ id: string; name: string; score: number }>;
  questions: Record<string, Question>;
}) => {
  const answerTimeWindow = GameContext.useSelector((state) => state.public.settings.answerTimeWindow);
  const isActive = GameContext.useMatches("active");
  const isQuestionActive = isActive && currentQuestion !== null;
  const remainingTime = useQuestionTimer(currentQuestion, answerTimeWindow, isQuestionActive);

  if (!currentQuestion) return null;

  const question = questions[currentQuestion.questionId];
  const questionText = question?.text;
  if (!questionText) return null;

  const playerAnswers = buildPlayerAnswerMap(players, currentQuestion.answers);
  const sortedPlayers = sortPlayersByAnswerTime(players, playerAnswers);
  const showOptions =
    question.questionType === "multiple-choice" && question.options;

  return (
    <div className="min-h-screen flex flex-col items-center justify-center pt-16 p-8 relative">
      <GameBackground />

      <div className="relative z-10 w-full max-w-4xl">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center"
        >
          <TimerDisplay remainingTime={remainingTime} />

          <div className="text-center mb-8">
            <h1 className="text-2xl sm:text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 to-purple-400">
              {questionText}
            </h1>
            {showOptions && (
              <MultipleChoiceOptions options={question.options!} />
            )}
          </div>

          <div className="bg-gray-800/30 backdrop-blur-sm rounded-2xl p-8 border border-gray-700/50">
            <h2 className="text-2xl font-bold text-indigo-300 mb-6 flex items-center justify-center gap-3">
              <Users className="w-6 h-6" />
              Answers Submitted: {currentQuestion.answers.length} /{" "}
              {players.length}
            </h2>

            <div className="space-y-3">
              {sortedPlayers.map((player) => (
                <PlayerAnswerRow
                  key={player.id}
                  player={player}
                  answer={playerAnswers[player.id]}
                  startTime={currentQuestion.startTime}
                />
              ))}
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

const ActiveGameContent = ({
  currentQuestion,
  players,
  questionResults,
  questions,
  questionNumber,
}: {
  currentQuestion: GamePublicContext["currentQuestion"];
  players: GamePublicContext["players"];
  questionResults: GamePublicContext["questionResults"];
  questions: GamePublicContext["questions"];
  questionNumber: number;
}) => {
  if (currentQuestion) {
    return (
      <>
        <QuestionProgress
          current={questionNumber}
          total={Object.keys(questions).length}
        />
        <GameplayDisplay
          currentQuestion={currentQuestion}
          players={players}
          questions={questions}
        />
      </>
    );
  }

  if (questionResults.length > 0) {
    return (
      <>
        <QuestionProgress
          current={questionNumber}
          total={Object.keys(questions).length}
        />
        <QuestionResultsDisplay
          questionResults={questionResults}
          questions={questions}
        />
      </>
    );
  }

  return <WaitingForQuestionDisplay />;
};

export const SpectatorView = ({ host }: { host: string }) => {
  const currentQuestion = GameContext.useSelector((state) => state.public.currentQuestion);
  const players = GameContext.useSelector((state) => state.public.players);
  const questionResults = GameContext.useSelector((state) => state.public.questionResults);
  const questions = GameContext.useSelector((state) => state.public.questions);
  const questionNumber = GameContext.useSelector((state) => state.public.questionNumber);
  const isFinished = GameContext.useMatches("finished");
  const isLobby = GameContext.useMatches("lobby");
  const isActive = GameContext.useMatches("active");

  return (
    <TvStage>
      <div className="absolute inset-0">
        <AnimatePresence mode="wait">
          {isLobby && <LobbyDisplay host={host} />}

          {isActive && (
            <ActiveGameContent
              currentQuestion={currentQuestion}
              players={players}
              questionResults={questionResults}
              questions={questions}
              questionNumber={questionNumber}
            />
          )}

          {isFinished && <GameFinishedDisplay players={players} />}
        </AnimatePresence>
      </div>
    </TvStage>
  );
};

const LobbyDisplay = ({ host }: { host: string }) => {
  const players = GameContext.useSelector((state) => state.public.players);
  const gameId = GameContext.useSelector((state) => state.public.id);
  const gameCode = GameContext.useSelector((state) => state.public.gameCode);
  return (
    <TvLobby
      players={players}
      joinUrl={`https://${host}/games/${gameId}`}
      host={host}
      gameCode={gameCode}
    />
  );
};

const GameFinishedDisplay = ({
  players,
}: {
  players: Array<{ id: string; name: string; score: number }>;
}) => {
  const sortedPlayers = [...players].sort((a, b) => b.score - a.score);
  const winner = sortedPlayers[0];

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 relative">
      <GameBackground />

      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="relative z-10 w-full max-w-4xl bg-gray-800/30 backdrop-blur-sm rounded-2xl p-8 border border-gray-700/50"
        data-testid="game-over-title"
      >
        <h1 className="text-6xl font-bold text-center mb-8 bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 to-purple-400">
          Game Over!
        </h1>

        <WinnerAnnouncement winner={winner} />
        <FinalScoresList players={players} />
      </motion.div>
    </div>
  );
};

const QuestionResultsDisplay = ({
  questionResults,
  questions,
}: {
  questionResults: GamePublicContext["questionResults"];
  questions: GamePublicContext["questions"];
}) => {
  const latestResult = questionResults[questionResults.length - 1];
  const question = latestResult ? questions[latestResult.questionId] : null;

  if (!latestResult || !question) return null;

  return (
    <div className="min-h-screen flex flex-col items-center justify-center pt-16 p-8 relative">
      <GameBackground />

      <div className="relative z-10 w-full max-w-4xl">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center"
        >
          <QuestionAnswerHeader question={question}>
            {question.questionType === "multiple-choice" && question.options ? (
              <MultipleChoiceOptions
                options={question.options}
                correctAnswer={question.correctAnswer}
              />
            ) : null}
          </QuestionAnswerHeader>

          <div className="bg-gray-800/30 backdrop-blur-sm rounded-2xl p-8 border border-gray-700/50">
            <h2 className="text-2xl font-bold text-indigo-300 mb-6">Results</h2>
            <ResultsScoreList
              answers={latestResult.answers}
              scores={latestResult.scores}
              question={question}
            />
          </div>
        </motion.div>
      </div>
    </div>
  );
};

const WaitingForQuestionDisplay = () => {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-8 relative">
      <GameBackground />

      <div className="relative z-10">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center"
        >
          <div>
            <h1
              className="text-6xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 to-purple-400 mb-6"
              data-testid="waiting-for-question"
            >
              Waiting for Question...
            </h1>
            <motion.div
              animate={{ scale: [1, 1.1, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
              className="text-4xl text-indigo-400/60"
            >
              ⏳
            </motion.div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};
