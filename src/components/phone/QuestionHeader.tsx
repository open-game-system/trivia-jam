import { motion } from "framer-motion";

/** Timer (number + draining pink bar) and the question. */
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
    <div className="pqh px-4 pt-2">
      <motion.div
        className="pqh-timer tabular font-display font-extrabold text-ink leading-none"
        style={{ fontSize: "clamp(32px, 6dvh, 56px)", minWidth: "2.4ch" }}
        data-testid="question-timer"
        animate={{ scale: urgent ? [1, 1.12, 1] : 1 }}
        transition={{ duration: 1, repeat: urgent ? Infinity : 0 }}
      >
        {timeLeft}s
      </motion.div>
      <div className="pqh-bar ptimer-track" aria-hidden="true">
        <div className="ptimer-fill" style={{ transform: `scaleX(${fraction})` }} />
      </div>
      <h1
        className="pqh-title min-w-0 font-display font-extrabold text-blue"
        style={{ fontSize: "clamp(24px, min(5.6dvh, 8vw), 40px)", lineHeight: 1.08, letterSpacing: "-0.02em", overflowWrap: "anywhere" }}
      >
        {text}
      </h1>
    </div>
  );
};
