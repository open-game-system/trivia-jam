import { AnimatePresence, motion } from "framer-motion";

export const AnswerProgress = ({
  answersCount,
  playersCount,
}: {
  answersCount: number;
  playersCount: number;
}) => {
  const allAnswered =
    answersCount > 0 && playersCount > 0 && answersCount === playersCount;

  return (
    <div>
      <h3 className="text-lg font-bold text-indigo-300 mb-2">
        Answers Submitted: {answersCount} / {playersCount}
      </h3>
      <AnimatePresence>
        {allAnswered && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.3 }}
            className="mt-2 px-3 py-1.5 rounded-lg bg-green-500/15 border border-green-500/30 text-green-400 text-sm font-medium text-center"
          >
            All players answered!
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
