import { AnimatePresence, motion } from "framer-motion";
import { GameContext } from "~/game.context";
import type { GamePublicContext } from "~/game.types";
import { useQuestionTimer } from "~/hooks/use-question-timer";
import {
  GameBackground,
  FinalScoresList,
  WinnerAnnouncement,
  MultipleChoiceOptions,
  ResultsScoreList,
  QuestionAnswerHeader,
} from "./game";
import { TvAnticipation } from "./tv/anticipation";
import { TvQuestion } from "./tv/question";
import { buildStandings } from "./tv/tv-model";
import { TvLobby } from "./tv/lobby";
import { TvStage } from "./tv/stage";

const GameplayDisplay = ({
  currentQuestion,
  players,
  questions,
  questionNumber,
}: {
  currentQuestion: NonNullable<GamePublicContext["currentQuestion"]>;
  players: GamePublicContext["players"];
  questions: GamePublicContext["questions"];
  questionNumber: number;
}) => {
  const answerTimeWindow = GameContext.useSelector((state) => state.public.settings.answerTimeWindow);
  const isActive = GameContext.useMatches("active");
  const remainingTime = useQuestionTimer(currentQuestion, answerTimeWindow, isActive);
  const question = questions[currentQuestion.questionId];
  if (!question?.text) return null;
  const answeredIds = new Set(currentQuestion.answers.map((a) => a.playerId));
  return (
    <TvQuestion
      key={`question-${currentQuestion.questionId}`}
      text={question.text}
      options={question.questionType === "multiple-choice" ? question.options : undefined}
      number={questionNumber}
      total={Object.keys(questions).length}
      players={players}
      answeredIds={answeredIds}
      remaining={remainingTime}
      timeWindow={answerTimeWindow}
    />
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
      <GameplayDisplay
        key={`q-${currentQuestion.questionId}`}
        currentQuestion={currentQuestion}
        players={players}
        questions={questions}
        questionNumber={questionNumber}
      />
    );
  }

  if (questionResults.length > 0) {
    return (
      <QuestionResultsDisplay
        key="results"
        questionResults={questionResults}
        questions={questions}
      />
    );
  }

  return (
    <TvAnticipation
      key="anticipation"
      nextNumber={questionNumber + 1}
      total={Object.keys(questions).length}
      rows={buildStandings(players, [])}
      showScores={false}
    />
  );
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
