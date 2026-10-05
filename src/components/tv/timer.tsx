import { motion } from "framer-motion";

const R = 104;
const CIRC = 2 * Math.PI * R;

/**
 * A printed dial: a thick blue ring drains as time runs out, the number is set
 * huge in the middle and stamps once a second. The last five seconds go pink.
 */
export const InkTimer = ({ remaining, total, size = 260 }: { remaining: number; total: number; size?: number }) => {
  const urgent = remaining <= 5;
  const fraction = total > 0 ? Math.max(0, Math.min(1, remaining / total)) : 0;
  return (
    <div className="relative" style={{ width: size, height: size }} aria-label={`${remaining} seconds left`}>
      <svg viewBox="0 0 260 260" width={size} height={size} aria-hidden="true" style={{ overflow: "visible" }}>
        {/* misregistered second ink */}
        <circle cx={136} cy={136} r={R + 18} fill="none" stroke="var(--pink)" strokeWidth={6} opacity={0.9} />
        <circle cx={130} cy={130} r={R + 18} fill={urgent ? "var(--pink)" : "var(--paper-2)"} stroke="var(--ink)" strokeWidth={6} />
        <circle cx={130} cy={130} r={R - 12} fill="url(#tv-dots-blue)" opacity={urgent ? 0 : 0.35} />
        <circle
          cx={130}
          cy={130}
          r={R}
          fill="none"
          stroke={urgent ? "var(--ink)" : "var(--blue)"}
          strokeWidth={24}
          strokeDasharray={CIRC}
          strokeDashoffset={CIRC * (1 - fraction)}
          transform="rotate(-90 130 130)"
          style={{ transition: "stroke-dashoffset 1s linear" }}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <motion.span
          key={remaining}
          initial={{ scale: 1.25 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", stiffness: 700, damping: 18 }}
          className="tv-display tabular"
          style={{ fontSize: 128, color: "var(--ink)", lineHeight: 1 }}
          data-testid="question-timer"
        >
          {remaining}
        </motion.span>
      </div>
    </div>
  );
};
