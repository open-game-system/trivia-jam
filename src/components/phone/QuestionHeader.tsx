import { motion } from "framer-motion";
import { buildReadAloudText } from "./readAloud";
import { useReadAloud } from "./useReadAloud";

/** A printed speaker: a cone and sound arcs, drawn in ink (no emoji). */
const SpeakerGlyph = ({ speaking }: { speaking: boolean }) => (
  <svg viewBox="0 0 48 48" width="100%" height="100%" aria-hidden="true">
    <path d="M6 18h8l10-8v28l-10-8H6z" fill="currentColor" />
    <path
      className={speaking ? "pread-arc pread-arc-1" : "pread-arc"}
      d="M30 17c3 4 3 10 0 14"
      fill="none"
      stroke="currentColor"
      strokeWidth="4"
      strokeLinecap="square"
    />
    <path
      className={speaking ? "pread-arc pread-arc-2" : "pread-arc"}
      d="M36 11c6 7 6 19 0 26"
      fill="none"
      stroke="currentColor"
      strokeWidth="4"
      strokeLinecap="square"
    />
  </svg>
);

/** Timer (number + draining pink bar) and the question, for kid screens. */
export const QuestionHeader = ({
  text,
  timeLeft,
  totalTime,
  questionId = null,
  options,
}: {
  questionId?: string | null;
  options?: readonly string[];
  text: string;
  timeLeft: number;
  totalTime: number;
}) => {
  const urgent = timeLeft <= 5;
  const { supported, speaking, onTap } = useReadAloud(
    buildReadAloudText({ text, options }),
    questionId,
  );
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
      <div className="mt-2 flex items-center gap-3">
        {supported && (
          <button
            type="button"
            className="pread"
            aria-label="Read it to me"
            data-speaking={speaking}
            onClick={onTap}
          >
            <SpeakerGlyph speaking={speaking} />
          </button>
        )}
        <h1
          className="min-w-0 flex-1 font-display font-extrabold text-blue text-center"
          style={{ fontSize: "clamp(26px, 5.6dvh, 60px)", lineHeight: 1.05, letterSpacing: "-0.02em" }}
        >
          {text}
        </h1>
        {supported && <span className="pread-balance" aria-hidden="true" />}
      </div>
    </div>
  );
};
