import { AnimatePresence } from "framer-motion";
import type { ReactNode } from "react";

/**
 * The TV's active-game screens: the current question, or (between questions) the results / anticipation.
 * Two layers, each under its own AnimatePresence, so one screen can leave while the next arrives:
 * - question 1 leaves underneath the results (the shared-element hand-off);
 * - the results leave underneath question 2.
 * The question layer is keyed by question: when a new question arrives, a question screen that is still
 * leaving is dropped at once instead of sitting beside the new one (never two question screens).
 */
export const TvScreens = ({
  question,
  questionKey,
  between,
}: {
  question: ReactNode;
  questionKey: string;
  between: ReactNode;
}) => {
  const asking = question !== null && question !== undefined;
  return (
    <>
      <div className="absolute inset-0" style={{ zIndex: asking ? 2 : 1 }}>
        <AnimatePresence key={questionKey}>{question}</AnimatePresence>
      </div>
      <div className="absolute inset-0" style={{ zIndex: asking ? 1 : 2 }}>
        <AnimatePresence>{asking ? null : between}</AnimatePresence>
      </div>
    </>
  );
};
