import { motion } from "framer-motion";
import type { Question } from "~/game.types";

type PlayerAnswer = {
  playerId: string;
  playerName: string;
  value: string | number;
};

type PlayerScore = {
  playerId: string;
  points: number;
  position: number;
  timeTaken: number;
};

const isCloseNumericAnswer = (
  question: Question,
  answerValue: string | number,
): boolean => {
  if (question.questionType !== "numeric") return false;
  if (typeof answerValue !== "number" || typeof question.correctAnswer !== "number")
    return false;
  return Math.abs(answerValue - question.correctAnswer) / question.correctAnswer < 0.1;
};

const getResultRowStyle = (points: number, isClose: boolean): string => {
  if (points > 0) return "bg-green-500/10 border border-green-500/30";
  if (isClose) return "bg-yellow-500/10 border border-yellow-500/30";
  return "bg-gray-900/50";
};

export const ResultScoreRow = ({
  answer,
  score,
  question,
}: {
  answer: PlayerAnswer;
  score: PlayerScore;
  question: Question;
}) => {
  const isClose = isCloseNumericAnswer(question, answer.value);

  return (
    <motion.div
      data-testid={`player-result-${answer.playerId}`}
      className={`${getResultRowStyle(score.points, isClose)} rounded-2xl p-6 flex items-center gap-6`}
    >
      <div className="text-2xl font-bold text-indigo-400 w-12 text-center">
        {score.points > 0 ? `#${score.position}` : "\u2015"}
      </div>
      <div className="flex-1">
        <div className="text-xl font-medium">{answer.playerName}</div>
        <div className="text-sm text-gray-400">
          {answer.value} \u2022 {score.timeTaken.toFixed(1)}s
        </div>
      </div>
      {score.points > 0 && (
        <div className="text-2xl font-bold text-indigo-400">
          {score.points} <span className="text-indigo-400/70">pts</span>
        </div>
      )}
    </motion.div>
  );
};

export const ResultsScoreList = ({
  answers,
  scores,
  question,
}: {
  answers: PlayerAnswer[];
  scores: PlayerScore[];
  question: Question;
}) => {
  const sortedScores = [...scores].sort((a, b) => a.position - b.position);

  if (answers.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="text-center py-8"
      >
        <div className="text-4xl mb-4">{"\uD83D\uDE34"}</div>
        <div className="text-xl text-white/70">
          No one answered this question
        </div>
      </motion.div>
    );
  }

  return (
    <div className="space-y-4">
      {sortedScores.map((score) => {
        const answer = answers.find((a) => a.playerId === score.playerId);
        if (!answer) return null;

        return (
          <ResultScoreRow
            key={answer.playerId}
            answer={answer}
            score={score}
            question={question}
          />
        );
      })}
    </div>
  );
};

export const QuestionAnswerHeader = ({
  question,
  children,
}: {
  question: Question;
  children?: React.ReactNode;
}) => (
  <div className="mb-12">
    <h1 className="text-5xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 to-purple-400 mb-6">
      {question.text}
    </h1>
    {children}
    <div
      className="text-4xl font-bold text-green-400"
      data-testid="correct-answer"
    >
      {question.correctAnswer}
    </div>
  </div>
);
