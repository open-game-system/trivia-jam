import { motion } from "framer-motion";

/** Timer (glass chip + draining glow bar) and the question. */
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
        className="pqh-timer ptimer-chip"
        data-urgent={urgent}
        data-testid="question-timer"
        animate={{ scale: urgent ? [1, 1.08, 1] : 1 }}
        transition={{ duration: 1, repeat: urgent ? Infinity : 0 }}
      >
        {timeLeft}s
      </motion.div>
      <div className="pqh-bar ptimer-track" aria-hidden="true">
        <div className="ptimer-fill" style={{ transform: `scaleX(${fraction})` }} />
      </div>
      <h1
        className="pqh-title lav-text min-w-0 font-extrabold"
        style={{ fontSize: "clamp(24px, min(5.6dvh, 8vw), 40px)", lineHeight: 1.08, letterSpacing: "-0.02em", overflowWrap: "anywhere" }}
      >
        {text}
      </h1>
    </div>
  );
};
