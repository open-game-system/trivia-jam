import { motion } from "framer-motion";

/**
 * "Question 2 of 5": a strip of glowing ticks. In the page flow (never
 * fixed), so it can't overlap a heading or card.
 */
export const QuestionProgress = ({
  current,
  total,
}: {
  current: number;
  total: number;
}) => {
  const label = current === 0 ? `Ready: ${total} ${total === 1 ? "question" : "questions"}` : `Question ${current} of ${total}`;
  const ticks = Math.min(total, 12);
  const filled = total <= 12 ? current : Math.round((current / total) * ticks);

  return (
    <div
      className="flex items-center gap-3 px-4 pt-3 pb-1"
      data-testid="question-progress"
    >
      <span className="pslug whitespace-nowrap">
        {label}
      </span>
      <div className="flex flex-1 gap-1.5" aria-hidden="true">
        {Array.from({ length: ticks }, (_, i) => (
          <motion.span
            key={i}
            className="h-1.5 flex-1 rounded-full"
            style={
              i < filled
                ? { background: "linear-gradient(90deg,#6366f1,#a855f7)", boxShadow: "0 0 8px rgba(168,85,247,0.8)" }
                : { background: "rgba(255,255,255,0.14)" }
            }
            initial={false}
            animate={{ opacity: 1 }}
          />
        ))}
      </div>
    </div>
  );
};
