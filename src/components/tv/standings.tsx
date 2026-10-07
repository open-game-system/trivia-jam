import { animate, motion, useMotionValue, useTransform } from "framer-motion";
import { useEffect } from "react";
import { GlassToken, Label } from "./glass";
import type { StandingRow } from "./tv-model";

/** A number that rolls from one value to another, like a counter ticking over. */
export const RollingNumber = ({
  from,
  to,
  run,
  duration = 1,
  className = "",
}: {
  from: number;
  to: number;
  run: boolean;
  duration?: number;
  className?: string;
}) => {
  const value = useMotionValue(run ? from : to);
  const shown = useTransform(value, (v) => String(Math.round(v)));
  useEffect(() => {
    if (!run) {
      value.set(to);
      return;
    }
    value.set(from);
    const controls = animate(value, to, { duration, ease: [0.2, 0.9, 0.2, 1] });
    return () => controls.stop();
  }, [from, to, run, duration, value]);
  return <motion.span className={`tabular-nums ${className}`}>{shown}</motion.span>;
};

/**
 * The small standings strip: one glass chip per player. With `settled` false
 * it shows the order before the latest question; flipping it re-sorts the chips
 * (layout animation) and rolls the scores up.
 */
export const StandingsStrip = ({
  rows,
  settled,
  animateScores = false,
  max = 6,
}: {
  rows: StandingRow[];
  settled: boolean;
  animateScores?: boolean;
  max?: number;
}) => {
  const ordered = settled
    ? rows
    : [...rows].sort((a, b) => b.prevScore - a.prevScore || a.inkIndex - b.inkIndex);
  const shown = ordered.slice(0, max);
  const hidden = ordered.length - shown.length;
  return (
    <div className="flex items-center gap-7" data-testid="standings-strip">
      {shown.map((row, i) => (
        <motion.div
          layout
          transition={{ type: "spring", stiffness: 260, damping: 24 }}
          key={row.id}
          className="flex items-center gap-3"
        >
          <span className="tv-display text-[32px]" style={{ width: 28, color: "var(--text-3)" }}>
            {settled ? row.rank : i + 1}
          </span>
          <GlassToken name={row.name} inkIndex={row.inkIndex} size={64} />
          <span className="flex flex-col" style={{ lineHeight: 1 }}>
            <span className="tv-name text-[36px] whitespace-nowrap" style={{ lineHeight: 1.05 }}>
              {row.name}
            </span>
            <span className="tv-display text-[36px]" style={{ lineHeight: 1, color: "var(--glow)" }}>
              <RollingNumber from={row.prevScore} to={settled ? row.score : row.prevScore} run={animateScores && settled} />
            </span>
          </span>
        </motion.div>
      ))}
      {hidden > 0 ? <Label>+{hidden}</Label> : null}
    </div>
  );
};
