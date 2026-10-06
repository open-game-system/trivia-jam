import { motion } from "framer-motion";
import { type ReactNode, useEffect, useState } from "react";
import { Bloom, EASE_OUT, EASE_POP, GlassToken, Label } from "./glass";
import { RollingNumber } from "./standings";
import { winnerCardRects } from "./badge-place";
import { layoutWinners } from "./winners-layout";
import { popIn, slamIn, STEP, stepTo } from "./motion-presets";

export type WinnersKind = "exact" | "closest" | "right" | "nobody";

export type Winner = {
  id: string;
  name: string;
  inkIndex: number;
  points: number;
  /** Their total before this question. */
  prevScore: number;
  /** Where their chip sat on the line or tile, so it can break forward from there. */
  from?: { x: number; y: number; size: number };
};

const STAMP = {
  exact: { label: "Exact!", tone: "tv-pill--win", size: 140, rotate: -2, bloom: "rgba(74, 222, 128, 0.55)" },
  closest: { label: "Closest!", tone: "tv-pill--close", size: 84, rotate: -2, bloom: "rgba(251, 191, 36, 0.45)" },
  right: { label: "Got it!", tone: "tv-pill--win", size: 104, rotate: -2, bloom: "rgba(74, 222, 128, 0.55)" },
} as const;

/** How far the card shrinks for the misses beat (from the top centre of the frame). */
export const STEP_UP_SCALE = 0.62;

/** One tween of one transform (compositor-driven), so the step-up never lands in a single frame. */
const StepUp = ({ compact, children }: { compact: boolean; children: ReactNode }) => {
  const step = stepTo(compact ? { scale: STEP_UP_SCALE, y: -14 } : { scale: 1, y: 0 });
  return (
    <motion.div className="absolute inset-0" style={{ transformOrigin: "50% 0" }} initial={false} animate={step.animate} transition={step.transition}>
      {children}
    </motion.div>
  );
};

/** How long the step-up takes (ms), for anything that has to move with it. */
export const STEP_UP_MS = STEP.duration * 1000;

/** The stamp's moment: when it starts to fall, and the light that blooms behind it as it hits. */
const STAMP_DELAY = 0.3;

/** When winner i's "+N" lands on their chip (s after scoring starts) and their total starts to roll. */
const rollAt = (i: number) => 0.28 + i * 0.12;

const StampBloom = ({ color, live }: { color: string; live: boolean }) => (
  <motion.span
    aria-hidden="true"
    className="absolute pointer-events-none"
    style={{ left: "50%", top: "50%", width: 1100, height: 520, marginLeft: -550, marginTop: -260, borderRadius: 999, background: `radial-gradient(closest-side, ${color}, transparent)`, zIndex: -1 }}
    initial={live ? { transform: "scale(0.3)", opacity: 0 } : false}
    animate={live ? { transform: ["scale(0.3)", "scale(0.3)", "scale(1.15)", "scale(1)"], opacity: [0, 0, 1, 0.55] } : { transform: "scale(1)", opacity: 0.55 }}
    transition={{ delay: STAMP_DELAY, duration: 0.9, times: [0, 0.22, 0.45, 1], ease: EASE_OUT }}
  />
);

/** The lowest point of the stamp (row top + height + its slight tilt). */
const STAMP_ROW_BOTTOM = 284;

/** A total that holds its old value until the "+N" badge has stamped, then ticks over. */
const ArrivingTotal = ({ from, to, afterMs, live }: { from: number; to: number; afterMs: number; live: boolean }) => {
  const [arrived, setArrived] = useState(!live);
  useEffect(() => {
    if (!live) return;
    const t = setTimeout(() => setArrived(true), afterMs);
    return () => clearTimeout(t);
  }, [live, afterMs]);
  return <RollingNumber from={from} to={arrived ? to : from} run={live && arrived} duration={0.5} />;
};

const stumped = (live: boolean) => {
  const p = popIn({ delay: live ? 1.1 : 0, rotate: 3 });
  return live ? { initial: p.initial, animate: p.animate, transition: p.transition } : { initial: false as const, animate: { transform: p.animate.transform.at(-1), opacity: 1 } };
};

/** "Nobody got it": a dry beat, the line sags a little and the room is stamped "stumped". */
const NobodyBeat = ({ live }: { live: boolean }) => (
  <div className="absolute flex flex-col items-center" style={{ left: 0, right: 0, top: 250 }}>
    <motion.span
      className="tv-display lav-text whitespace-nowrap"
      style={{ fontSize: 170, lineHeight: 1, letterSpacing: "-0.04em", transformOrigin: "20% 100%", paddingBottom: 12 }}
      initial={live ? { scale: 1.3, opacity: 0, rotate: 0, y: 0 } : false}
      animate={{ scale: 1, opacity: 1, rotate: 2.5, y: 18 }}
      transition={{ scale: { duration: 0.45, ease: EASE_OUT }, opacity: { duration: 0.3 }, rotate: { delay: 0.6, duration: 1.6, ease: "easeInOut" }, y: { delay: 0.6, duration: 1.6, ease: "easeInOut" } }}
    >
      Nobody got it
    </motion.span>
    <motion.span
      className="tv-pill tv-pill--lav mt-28"
      style={{ fontSize: 56, padding: "16px 40px" }}
      {...stumped(live)}
    >
      Stumped the room
    </motion.span>
  </div>
);

/**
 * The break-forward beat: the winners' chips leave the line and come to the front as one big
 * centred group, names huge, stamped EXACT / CLOSEST / GOT IT. Then (`scoring`) each "+N" lands
 * top-right of its chip (never over a name or total) and that player's total ticks over.
 */
export const WinnersCard = ({
  kind,
  winners,
  detail,
  scoring,
  live,
  compact = false,
}: {
  kind: WinnersKind;
  winners: Winner[];
  detail?: string;
  scoring: boolean;
  live: boolean;
  /** The misses beat: the whole card steps up and shrinks to the top of the frame. */
  compact?: boolean;
}) => {
  if (kind === "nobody" || winners.length === 0) {
    return (
      <div className="absolute inset-0" style={{ zIndex: 30 }} data-testid="tv-highlight">
        <StepUp compact={compact}>
          <NobodyBeat live={live} />
        </StepUp>
      </div>
    );
  }
  const stamp = STAMP[kind];
  const slam = slamIn({ delay: STAMP_DELAY, rotate: stamp.rotate });
  const stampMotion = live
    ? { initial: slam.initial, animate: slam.animate, transition: slam.transition }
    : { initial: false as const, animate: { transform: slam.animate.transform.at(-1), opacity: 1 } };
  const layout = layoutWinners(winners);
  const byId = new Map(winners.map((w) => [w.id, w]));
  const nameTop = layout.chipTop + layout.chip + 18;
  const totalTop = nameTop + layout.name * 1.05 + 14;
  const big = kind === "exact";
  // The stamp sits at a slight angle: keep the badges clear of its low corner.
  const badges = winnerCardRects(winners, layout, STAMP_ROW_BOTTOM);
  return (
    <div className="absolute inset-0" style={{ zIndex: 30 }} data-testid="tv-highlight">
      {/* A bloom of light behind the winners: green and frame-wide for EXACT, lavender (or amber for closest) otherwise. */}
      <Bloom
        x={960}
        y={layout.chipTop + layout.chip / 2}
        r={big ? 900 : 560}
        color={big ? "rgba(74, 222, 128, 0.3)" : kind === "closest" ? "rgba(251, 191, 36, 0.2)" : "rgba(196, 181, 253, 0.3)"}
        live={live}
      />
      <StepUp compact={compact}>
      <div className="absolute flex items-center justify-center gap-10" style={{ left: 0, right: 0, top: big ? 50 : 100, height: big ? 200 : 150 }}>
        <span className="relative inline-flex">
          <StampBloom color={stamp.bloom} live={live} />
          <motion.span
            className={`tv-pill ${stamp.tone}`}
            style={{ fontSize: stamp.size, padding: big ? "18px 64px" : "14px 44px", letterSpacing: "-0.02em" }}
            {...stampMotion}
            data-testid="tv-stamp"
          >
            {stamp.label}
          </motion.span>
        </span>
        {detail ? (
          <motion.span
            className="tv-pill tv-pill--glass"
            style={{ fontSize: 44, padding: "14px 28px", fontWeight: 700 }}
            initial={live ? { opacity: 0, x: -30 } : false}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: live ? 0.6 : 0, duration: 0.3 }}
          >
            {detail}
          </motion.span>
        ) : null}
      </div>
      {layout.spots.map((spot, i) => {
        const w = byId.get(spot.id);
        if (!w) return null;
        const from = w.from;
        const centreY = layout.chipTop + layout.chip / 2;
        return (
          <div key={spot.id}>
            <motion.div
              className="absolute"
              style={{ left: spot.x - layout.chip / 2, top: layout.chipTop, width: layout.chip, height: layout.chip, zIndex: 3 }}
              initial={live && from ? { x: from.x - spot.x, y: from.y - centreY, scale: from.size / layout.chip } : live ? { scale: 0 } : false}
              animate={{ x: 0, y: 0, scale: 1 }}
              transition={{ type: "spring", stiffness: 190, damping: 15, mass: 1, delay: live ? i * 0.06 : 0 }}
            >
              <span className="block" style={{ borderRadius: 999 }}>
                <GlassToken name={w.name} inkIndex={w.inkIndex} size={layout.chip} win />
              </span>
            </motion.div>
            <motion.span
              className="absolute tv-display text-center whitespace-nowrap"
              style={{ left: spot.x - 500, width: 1000, top: nameTop, fontSize: layout.name, lineHeight: 1.04, letterSpacing: "-0.035em", zIndex: 3, color: "var(--text)", textShadow: "0 0 40px rgba(196, 181, 253, 0.45)" }}
              initial={live ? { opacity: 0, y: 20 } : false}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: live ? 0.3 + i * 0.06 : 0, duration: 0.4, ease: EASE_OUT }}
            >
              {w.name}
            </motion.span>
            {scoring && w.points > 0 ? (
              <>
                <motion.span
                  className="absolute flex items-center justify-center gap-5"
                  style={{ left: spot.x - 300, width: 600, top: totalTop, zIndex: 3 }}
                  initial={live ? { opacity: 0, y: 16 } : false}
                  animate={{ opacity: 1, y: 0 }}
                  // A total of 0 is not shown waiting: it appears as the "+N" lands and is already rolling.
                  transition={{ delay: live ? (w.prevScore === 0 ? rollAt(i) : 0.1) : 0, duration: 0.2 }}
                >
                  <motion.span
                    className="tv-display"
                    style={{ fontSize: layout.total, lineHeight: 1, color: "var(--glow)" }}
                    initial={false}
                    animate={live ? { transform: ["scale(1)", "scale(1.18)", "scale(1)"] } : { transform: "scale(1)" }}
                    transition={{ duration: 0.4, times: [0, 0.5, 1], delay: live ? rollAt(i) + 0.3 : 0 }}
                  >
                    <ArrivingTotal from={w.prevScore} to={w.prevScore + w.points} afterMs={rollAt(i) * 1000} live={live} />
                  </motion.span>
                  <Label size={30} className="!leading-none">total</Label>
                </motion.span>
              </>
            ) : null}
          </div>
        );
      })}
      {/* The "+N" badges ride their own layer, parked top-right of each token where they cover no name, total or token. */}
      {scoring
        ? badges.map((b, i) => {
            const w = byId.get(b.id);
            return w && w.points > 0 ? (
              <motion.span
                key={`badge-${b.id}`}
                aria-hidden="true"
                className="absolute tv-pill tv-pill--lav"
                style={{ left: b.badge.x, top: b.badge.y, width: b.badge.w, height: b.badge.h, fontSize: b.font, zIndex: 6 }}
                initial={live ? { scale: 0, opacity: 0 } : false}
                animate={{ scale: [0, 1.15, 1], opacity: 1 }}
                transition={{ duration: 0.35, delay: live ? i * 0.12 : 0, ease: EASE_POP }}
                data-testid={`tv-winner-badge-${b.id}`}
              >
                +{w.points}
              </motion.span>
            ) : null;
          })
        : null}
      {layout.more > 0 ? (
        <span className="absolute tv-label" style={{ left: (layout.spots.at(-1)?.x ?? 960) + layout.chip / 2 + 40, top: layout.chipTop + layout.chip / 2 - 20, fontSize: 44, color: "var(--text-2)" }}>
          +{layout.more}
        </span>
      ) : null}
      </StepUp>
    </div>
  );
};
