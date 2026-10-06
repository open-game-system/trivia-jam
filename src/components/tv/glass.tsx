import { motion } from "framer-motion";
import type { ReactNode } from "react";
import { chipTint } from "./chip-tint";
import { initialOf } from "./tv-model";

/** The house ease for glass panels: fade-and-rise, confident, no bounce. */
export const EASE_OUT = [0.2, 0.8, 0.2, 1] as const;
/** For pops (stamps, badges): a touch of overshoot. */
export const EASE_POP = [0.2, 0.9, 0.2, 1.25] as const;

/** A player's token: a round glass chip with their initial. Dashed and dim before they lock in; green and glowing when they win. */
export const GlassToken = ({
  name,
  inkIndex,
  size = 96,
  filled = true,
  win = false,
  className = "",
}: {
  name: string;
  inkIndex: number;
  size?: number;
  filled?: boolean;
  win?: boolean;
  className?: string;
}) => {
  const tint = chipTint(inkIndex);
  const state = win ? "tv-chip--win" : filled ? "" : "tv-chip--thinking";
  return (
    <span
      aria-hidden="true"
      className={`tv-chip ${state} ${className}`}
      style={{
        width: size,
        height: size,
        fontSize: Math.max(28, Math.round(size * 0.46)),
        borderWidth: Math.max(2, Math.round(size / 30)),
        borderColor: tint.rim,
        background: `radial-gradient(circle at 35% 28%, rgba(255, 255, 255, 0.18), transparent 60%), ${tint.fill}`,
        boxShadow: filled && !win ? `0 0 ${Math.round(size * 0.3)}px ${tint.fill}` : undefined,
      }}
    >
      {initialOf(name)}
    </span>
  );
};

/** Inter caps label (QUESTION 2 OF 5, THE GUESSES...). */
export const Label = ({
  children,
  className = "",
  testId,
  size,
}: {
  children: ReactNode;
  className?: string;
  testId?: string;
  size?: number;
}) => (
  <div className={`tv-label ${className}`} style={size ? { fontSize: size } : undefined} data-testid={testId}>
    {children}
  </div>
);

/** A glass panel that fades and rises into place. */
export const RiseIn = ({
  children,
  delay = 0,
  live = true,
  className = "",
  y = 18,
}: {
  children: ReactNode;
  delay?: number;
  live?: boolean;
  className?: string;
  y?: number;
}) => (
  <motion.div
    className={className}
    initial={live ? { opacity: 0, y } : false}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.42, delay, ease: EASE_OUT }}
  >
    {children}
  </motion.div>
);

/**
 * A new screen over the old one: an opaque night layer with its own aurora glow that fades and rises in,
 * so the old layer underneath is covered, never seen through.
 */
export const SheetIn = ({ children, live, duration = 0.45, zIndex = 1 }: { children: ReactNode; live: boolean; duration?: number; zIndex?: number }) => (
  <motion.div
    className="absolute inset-0"
    style={{ background: "var(--night)", zIndex }}
    initial={live ? { opacity: 0, y: 24 } : false}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration, ease: EASE_OUT }}
  >
    <AuroraGlow />
    {children}
  </motion.div>
);

/** The aurora painted inside the stage (for opaque layers that cover the page's own aurora). */
export const AuroraGlow = ({ strength = 1 }: { strength?: number }) => (
  <div
    aria-hidden="true"
    className="absolute pointer-events-none"
    style={{
      inset: "-10%",
      opacity: strength,
      background:
        "radial-gradient(40% 34% at 12% 6%, rgba(99, 102, 241, 0.38), transparent 72%), radial-gradient(42% 40% at 94% 36%, rgba(168, 85, 247, 0.32), transparent 72%), radial-gradient(48% 34% at 54% 110%, rgba(236, 72, 153, 0.28), transparent 72%)",
      filter: "blur(48px)",
    }}
  />
);

/** A soft radial bloom of light, centred on (x, y). */
export const Bloom = ({
  x,
  y,
  r,
  color = "rgba(196, 181, 253, 0.42)",
  live,
  zIndex = 1,
  delay = 0,
}: {
  x: number;
  y: number;
  r: number;
  color?: string;
  live: boolean;
  zIndex?: number;
  delay?: number;
}) => (
  <motion.span
    aria-hidden="true"
    className="tv-bloom"
    style={{ left: x - r, top: y - r, width: r * 2, height: r * 2, zIndex, background: `radial-gradient(circle at center, ${color}, transparent 68%)` }}
    initial={live ? { scale: 0.3, opacity: 0 } : false}
    animate={{ scale: 1, opacity: 1 }}
    transition={{ duration: 0.6, delay, ease: EASE_OUT }}
  />
);
