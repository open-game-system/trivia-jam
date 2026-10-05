import { useOnOgsTv } from "~/ogs/use-ogs-game";
import { useState } from "react";
import { GameContext } from "~/game.context";
import type { GamePublicContext } from "~/game.types";
import { useQuestionTimer } from "~/hooks/use-question-timer";
import { TvAnticipation } from "./tv/anticipation";
import { TvQuestion } from "./tv/question";
import { TvResultsBeat } from "./tv/results-beat";
import { TvFinale } from "./tv/finale";
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
  // Results that were already in when this TV loaded are shown settled, not replayed.
  const [resultsSeenAtMount] = useState(questionResults.length);
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
        key={`results-${questionResults.length}`}
        questionResults={questionResults}
        questions={questions}
        players={players}
        live={questionResults.length > resultsSeenAtMount}
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
      </div>
    </TvStage>
  );
};

const LobbyDisplay = ({ host }: { host: string }) => {
  const players = GameContext.useSelector((state) => state.public.players);
  const gameId = GameContext.useSelector((state) => state.public.id);
  const gameCode = GameContext.useSelector((state) => state.public.gameCode);
  const onOgsTv = useOnOgsTv();
  return (
    <TvLobby
      onOgsTv={onOgsTv}
      players={players}
      joinUrl={`https://${host}/games/${gameId}`}
      host={host}
      gameCode={gameCode}
    />
  );
};

const GameFinishedDisplay = ({ players }: { players: GamePublicContext["players"] }) => (
  <TvFinale key="finale" players={players} />
);

const QuestionResultsDisplay = ({
  questionResults,
  questions,
  players,
  live,
}: {
  questionResults: GamePublicContext["questionResults"];
  questions: GamePublicContext["questions"];
  players: GamePublicContext["players"];
  live: boolean;
}) => {
  const latestResult = questionResults[questionResults.length - 1];
  const question = latestResult ? questions[latestResult.questionId] : undefined;
  if (!latestResult || !question) return null;
  return (
    <TvResultsBeat
      key={`results-${latestResult.questionId}`}
      question={question}
      result={latestResult}
      players={players}
      total={Object.keys(questions).length}
      live={live}
    />
  );
};
