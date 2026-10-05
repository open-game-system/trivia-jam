import { motion } from "framer-motion";
import type { CSSProperties, ReactNode } from "react";
import { initialOf, inkForIndex } from "./tv-model";

/**
 * Display type printed on two drums: the under ink lands a few px down-right,
 * the top ink overprints it (multiply), so the overlap mixes like a real riso.
 */
export const RisoType = ({
  children,
  top = "var(--blue)",
  under = "var(--pink)",
  offset = 8,
  rough = false,
  className = "",
  style,
}: {
  children: ReactNode;
  top?: string;
  under?: string;
  offset?: number;
  rough?: boolean;
  className?: string;
  style?: CSSProperties;
}) => {
  const vars: CSSProperties = { ...style };
  return (
    <span className={`tv-riso-type ${className}`} style={vars}>
      <span
        aria-hidden="true"
        className={`tv-riso-under ${rough ? "tv-rough" : ""}`}
        style={{ color: under, transform: `translate(${offset}px, ${offset}px)` }}
      >
        {children}
      </span>
      <span className={`tv-riso-top ${rough ? "tv-rough" : ""}`} style={{ color: top }}>
        {children}
      </span>
    </span>
  );
};

/** A player's token: a solid ink circle with their initial, or an outline before they lock in. */
export const InkToken = ({
  name,
  inkIndex,
  size = 96,
  filled = true,
  className = "",
}: {
  name: string;
  inkIndex: number;
  size?: number;
  filled?: boolean;
  className?: string;
}) => {
  const ink = inkForIndex(inkIndex);
  const border = Math.max(4, Math.round(size / 18));
  const outlineColor = ink.name === "yellow" ? "var(--ink)" : ink.color;
  const background = !filled
    ? "var(--paper)"
    : ink.halftone
      ? `radial-gradient(circle at center, ${ink.color} 48%, transparent 50%) 0 0 / 10px 10px, var(--paper)`
      : ink.color;
  const color = !filled ? outlineColor : ink.halftone ? "var(--ink)" : ink.on;
  return (
    <span
      aria-hidden="true"
      className={`tv-token ${className}`}
      style={{
        width: size,
        height: size,
        fontSize: Math.max(28, Math.round(size * 0.52)),
        borderWidth: border,
        borderColor: filled ? "var(--ink)" : outlineColor,
        borderStyle: filled ? "solid" : "dashed",
        background,
        color,
      }}
    >
      {initialOf(name)}
    </span>
  );
};

/** The token lands like a rubber stamp: a lift, a 1-frame squash, settle. */
export const StampIn = ({
  children,
  delay = 0,
  className = "",
  rotate = 0,
}: {
  children: ReactNode;
  delay?: number;
  className?: string;
  rotate?: number;
}) => (
  <motion.div
    className={className}
    initial={{ scale: 1.6, opacity: 0, rotate: rotate - 8 }}
    animate={{ scale: [1.6, 0.86, 1.04, 1], opacity: [0, 1, 1, 1], rotate }}
    transition={{ duration: 0.5, delay, times: [0, 0.45, 0.75, 1], ease: "easeOut" }}
  >
    {children}
  </motion.div>
);

/** Space Mono slug line, like a print job's label. */
export const Slug = ({
  children,
  className = "",
  testId,
}: {
  children: ReactNode;
  className?: string;
  testId?: string;
}) => (
  <div className={`slug text-[32px] leading-none ${className}`} data-testid={testId}>
    {children}
  </div>
);

/** The ink roller's leading edge: a black drum with a pink stripe that sweeps across the sheet once. */
export const Roller = ({ delay = 0, duration = 0.45, zIndex = 70 }: { delay?: number; duration?: number; zIndex?: number }) => (
  <motion.div
    aria-hidden="true"
    className="absolute pointer-events-none"
    style={{ top: -20, bottom: -20, left: 0, width: 46, zIndex, display: "flex" }}
    initial={{ x: -80, scaleX: 1 }}
    animate={{ x: [-80, 1960], scaleX: [1, 1] }}
    transition={{ delay, duration, ease: [0.6, 0, 0.2, 1] }}
  >
    <span style={{ width: 30, background: "var(--ink)" }} />
    <span style={{ width: 16, background: "var(--pink)" }} />
  </motion.div>
);

/** Clip paths for a left-to-right printed wipe: on (the sheet arrives) and off (the sheet is wiped away). */
export const WIPE = {
  hidden: "inset(0% 100% 0% 0%)",
  shown: "inset(0% 0% 0% 0%)",
  gone: "inset(0% 0% 0% 100%)",
  ease: [0.6, 0, 0.2, 1] as const,
};

/**
 * A new sheet rolled onto the TV: it is revealed left to right behind the roller, on opaque paper,
 * so the old layer underneath is covered, never cross-faded.
 */
export const RolledSheet = ({ children, live, duration = 0.45, zIndex = 1 }: { children: ReactNode; live: boolean; duration?: number; zIndex?: number }) => (
  <>
    <motion.div
      className="absolute inset-0"
      style={{ background: "var(--paper)", zIndex }}
      initial={live ? { clipPath: WIPE.hidden } : false}
      animate={{ clipPath: WIPE.shown }}
      transition={{ duration, ease: WIPE.ease }}
    >
      {children}
    </motion.div>
    {live ? <Roller duration={duration} zIndex={zIndex + 1} /> : null}
  </>
);
