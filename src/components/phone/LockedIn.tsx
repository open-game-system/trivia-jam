import { motion } from "framer-motion";
import { WaitingDots } from "./ink";

/** After answering: a happy stamp with their number. No times. */
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
      initial={{ scale: 1.9, rotate: -16, opacity: 0, y: -40 }}
      animate={{ scale: [1.9, 0.94, 1], rotate: -5, opacity: 1, y: 0 }}
      transition={{ duration: 0.38, times: [0, 0.7, 1], ease: "easeOut" }}
    >
      <span className="pstamp-label">LOCKED IN</span>
      <span className="pstamp-number">{letter ? `${letter}` : value}</span>
      {letter && (
        <span className="pslug text-ink" style={{ fontSize: 18, maxWidth: "16ch", textAlign: "center" }}>
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
