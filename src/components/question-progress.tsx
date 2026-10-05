import { motion } from "framer-motion";

/**
 * "Question 2 of 5": a printed strip of ticks. In the page flow (never
 * fixed), so it can't overlap a heading or card.
 */
export const QuestionProgress = ({
  current,
  total,
}: {
  current: number;
  total: number;
}) => {
  const ticks = Math.min(total, 12);
  const filled = total <= 12 ? current : Math.round((current / total) * ticks);

  return (
    <div
      className="flex items-center gap-3 px-4 pt-3 pb-1"
      data-testid="question-progress"
    >
      <span className="pslug whitespace-nowrap">
        Question {current} of {total}
      </span>
      <div className="flex flex-1 gap-1.5" aria-hidden="true">
        {Array.from({ length: ticks }, (_, i) => (
          <motion.span
            key={i}
            className="h-3 flex-1 border-2 border-ink"
            style={{ background: i < filled ? "var(--ink)" : "transparent" }}
            initial={false}
            animate={{ opacity: 1 }}
          />
        ))}
      </div>
    </div>
  );
};
