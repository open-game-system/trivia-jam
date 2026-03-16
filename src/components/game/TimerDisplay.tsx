import { motion } from "framer-motion";

export const TimerDisplay = ({
  remainingTime,
  className = "text-7xl",
}: {
  remainingTime: number;
  className?: string;
}) => {
  const isUrgent = remainingTime <= 5;

  return (
    <motion.div
      className={`${className} font-bold text-indigo-400 mb-8`}
      data-testid="question-timer"
      animate={{
        scale: isUrgent ? [1, 1.1, 1] : 1,
        color: isUrgent ? ["#818CF8", "#EF4444", "#818CF8"] : "#818CF8",
      }}
      transition={{
        duration: 1,
        repeat: isUrgent ? Infinity : 0,
      }}
    >
      {remainingTime}s
    </motion.div>
  );
};
