import { AnimatePresence, motion } from "framer-motion";

/**
 * The host's one big status while a question is live: "2 of 3 answered", huge,
 * with a bar under it. The accessible/e2e text ("Answers Submitted: 2 / 3") is
 * kept as a screen-reader line so nothing that reads it breaks.
 */
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
      <h3 className="sr-only">
        Answers Submitted: {answersCount} / {playersCount}
      </h3>
      <div className="hstatus-figure" aria-hidden="true">
        <span className="tabular">{answersCount}</span>
        <span className="hstatus-of">of {playersCount}</span>
      </div>
      <div className="hstatus-label" aria-hidden="true">
        answered
      </div>
      <div className="ptimer-track mt-3" aria-hidden="true">
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
            className="pchip pchip-teal mt-3"
            style={{ fontSize: 16 }}
          >
            All players answered!
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
