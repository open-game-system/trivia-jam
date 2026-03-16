import { motion } from "framer-motion";
import type { Answer } from "~/game.types";

export const PlayerAnswerRow = ({
  player,
  answer,
  startTime,
}: {
  player: { id: string; name: string; score: number };
  answer: Answer | null;
  startTime: number;
}) => {
  const hasAnswered = !!answer;

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      data-testid={`player-answer-${player.id}`}
      className={`rounded-xl p-4 flex justify-between items-center border ${
        hasAnswered
          ? "bg-gray-900/50 border-gray-700/50"
          : "bg-gray-900/20 border-gray-700/20"
      }`}
    >
      <span
        className={`text-xl font-medium ${
          hasAnswered ? "text-white/90" : "text-white/50"
        }`}
      >
        {player.name}
      </span>
      {hasAnswered ? (
        <span className="text-xl font-bold text-indigo-400">
          {((answer.timestamp - startTime) / 1000).toFixed(1)}s
        </span>
      ) : (
        <span className="text-lg text-indigo-400/50">Waiting...</span>
      )}
    </motion.div>
  );
};
