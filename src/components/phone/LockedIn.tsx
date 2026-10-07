import { motion } from "framer-motion";
import { WaitingDots } from "./ink";

/** After answering: a glowing glass card with their number. No times. */
export const LockedIn = ({
  value,
  letter,
}: {
  value: string | number;
  letter?: string;
}) => (
  <div
    className="flex-1 min-h-0 flex flex-col items-center justify-center gap-5 px-4 pb-6"
    data-testid="answer-submitted"
  >
    <span className="sr-only" role="status">
      Answer Submitted!
    </span>
    <motion.div
      className="pstamp"
      initial={{ scale: 1.4, opacity: 0, y: -24 }}
      animate={{ scale: [1.4, 0.97, 1], opacity: 1, y: 0 }}
      // Per property: a shared `times` array only fits the 3-keyframe scale; on opacity it made the card fade out and back in.
      transition={{
        scale: { duration: 0.4, times: [0, 0.7, 1], ease: "easeOut" },
        y: { duration: 0.4, ease: "easeOut" },
        opacity: { duration: 0.15 },
      }}
    >
      <span className="pstamp-label">LOCKED IN</span>
      <span className="pstamp-number glow-text">{letter ? `${letter}` : value}</span>
      {letter && (
        <span className="text-xl font-bold text-center" style={{ maxWidth: "16ch" }}>
          {value}
        </span>
      )}
    </motion.div>
    <div className="flex flex-col items-center gap-3">
      <WaitingDots />
      <span className="pslug">Waiting for everyone</span>
    </div>
  </div>
);
