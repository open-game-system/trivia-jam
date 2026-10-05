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
  const fraction = playersCount > 0 ? Math.min(1, answersCount / playersCount) : 0;

  return (
    <div>
      <h3 className="pslug" style={{ fontSize: 15 }}>
        Answers Submitted: {answersCount} / {playersCount}
      </h3>
      <div className="ptimer-track mt-2" aria-hidden="true">
        <div
          className="ptimer-fill"
          style={{ transform: `scaleX(${fraction})`, background: "var(--teal)" }}
        />
      </div>
      <AnimatePresence>
        {allAnswered && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.3 }}
            className="pchip pchip-teal mt-2"
          >
            All players answered!
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
