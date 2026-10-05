import { motion } from "framer-motion";

/** Timer (number + draining pink bar) and the question, for kid screens. */
export const QuestionHeader = ({
  text,
  timeLeft,
  totalTime,
}: {
  text: string;
  timeLeft: number;
  totalTime: number;
}) => {
  const urgent = timeLeft <= 5;
  const fraction = totalTime > 0 ? Math.max(0, Math.min(1, timeLeft / totalTime)) : 0;

  return (
    <div className="px-4 pt-2">
      <div className="flex items-center gap-3">
        <motion.div
          className="tabular font-display font-extrabold text-ink leading-none"
          style={{ fontSize: "clamp(32px, 6dvh, 56px)", minWidth: "2.4ch" }}
          data-testid="question-timer"
          animate={{ scale: urgent ? [1, 1.12, 1] : 1 }}
          transition={{ duration: 1, repeat: urgent ? Infinity : 0 }}
        >
          {timeLeft}s
        </motion.div>
        <div className="ptimer-track flex-1" aria-hidden="true">
          <div
            className="ptimer-fill"
            style={{ transform: `scaleX(${fraction})` }}
          />
        </div>
      </div>
      <h1
        className="mt-2 font-display font-extrabold text-blue text-center"
        style={{ fontSize: "clamp(26px, 5.6dvh, 60px)", lineHeight: 1.05, letterSpacing: "-0.02em" }}
      >
        {text}
      </h1>
    </div>
  );
};
