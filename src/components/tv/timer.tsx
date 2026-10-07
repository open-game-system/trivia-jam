import { motion } from "framer-motion";

const R = 104;
const STROKE = 14;
const CIRC = 2 * Math.PI * R;
const VIEW = 260;
const HERO = 118;
/** Each tick pops the numeral in from this scale: kept small so even the pop stays inside the ring. */
export const TICK_POP = 1.08;

/** The hero face's tabular digit: advance and ink height, in ems (Unbounded 700, measured). */
export const TIMER_FACE = { digitEm: 0.9, inkEm: 0.78 } as const;

/** The clear diameter inside the ring's stroke, in px, for a dial `size` px across. */
export const timerInnerDiameter = (size: number): number => ((2 * R - STROKE) * size) / VIEW;

/**
 * The numeral's font size: the full hero size when it fits, else as big as keeps the ink's corners
 * inside the ring with clear space (two digits are wider than the ring at the hero size).
 */
export const timerNumeralSize = (remaining: number, size: number): number => {
  const digits = String(Math.max(0, Math.round(remaining))).length;
  const diagonalEm = Math.hypot(digits * TIMER_FACE.digitEm, TIMER_FACE.inkEm);
  const fit = Math.floor((timerInnerDiameter(size) * 0.88) / diagonalEm);
  return Math.min((HERO * size) / VIEW, fit);
};

/**
 * The timer dial: a frosted glass disc with an indigo-to-purple ring that drains as time runs out, and the
 * number huge in the middle, ticking once a second. The last five seconds the ring turns pink and glows.
 */
export const GlassTimer = ({ remaining, total, size = 260 }: { remaining: number; total: number; size?: number }) => {
  const urgent = remaining <= 5;
  const fraction = total > 0 ? Math.max(0, Math.min(1, remaining / total)) : 0;
  return (
    <div className="relative" style={{ width: size, height: size }} aria-label={`${remaining} seconds left`}>
      <span
        aria-hidden="true"
        className="absolute tv-glass"
        style={{
          inset: 6,
          borderRadius: 999,
          boxShadow: urgent ? "0 0 60px rgba(236, 72, 153, 0.45), inset 0 1px 0 rgba(255,255,255,.12)" : "0 0 50px rgba(139, 92, 246, 0.3), inset 0 1px 0 rgba(255,255,255,.12)",
          transition: "box-shadow .4s",
        }}
      />
      <svg viewBox="0 0 260 260" width={size} height={size} aria-hidden="true" className="absolute inset-0" style={{ overflow: "visible" }}>
        <defs>
          <linearGradient id="tv-timer-ring" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="var(--aurora-indigo)" />
            <stop offset="1" stopColor="var(--aurora-purple)" />
          </linearGradient>
          <linearGradient id="tv-timer-ring-urgent" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="var(--aurora-purple)" />
            <stop offset="1" stopColor="var(--aurora-pink)" />
          </linearGradient>
        </defs>
        <circle cx={130} cy={130} r={R} fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth={STROKE} />
        <circle
          cx={130}
          cy={130}
          r={R}
          fill="none"
          stroke={urgent ? "url(#tv-timer-ring-urgent)" : "url(#tv-timer-ring)"}
          strokeWidth={STROKE}
          strokeLinecap="round"
          strokeDasharray={CIRC}
          strokeDashoffset={CIRC * (1 - fraction)}
          transform="rotate(-90 130 130)"
          style={{ transition: "stroke-dashoffset 1s linear", filter: `drop-shadow(0 0 10px ${urgent ? "rgba(236,72,153,.8)" : "rgba(168,85,247,.7)"})` }}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <motion.span
          key={remaining}
          initial={{ scale: TICK_POP, opacity: 0.6 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.3, ease: [0.2, 0.8, 0.2, 1] }}
          className="tv-display tv-hero"
          style={{ fontSize: timerNumeralSize(remaining, size), color: "var(--text)", lineHeight: 1 }}
          data-testid="question-timer"
        >
          {remaining}
        </motion.span>
      </div>
    </div>
  );
};
