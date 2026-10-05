import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { InkToken, RisoType } from "./print";
import { RollingNumber } from "./standings";
import { Sunburst } from "./sunburst";
import { layoutWinners } from "./winners-layout";

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
  exact: { label: "Exact!", bg: "var(--teal)", fg: "var(--paper)", size: 150, rotate: -6 },
  closest: { label: "Closest!", bg: "var(--yellow)", fg: "var(--ink)", size: 84, rotate: -4 },
  right: { label: "Got it!", bg: "var(--teal)", fg: "var(--paper)", size: 110, rotate: -5 },
} as const;

/** A total that holds its old value until the travelling "+N" arrives, then ticks over. */
const ArrivingTotal = ({ from, to, afterMs, live }: { from: number; to: number; afterMs: number; live: boolean }) => {
  const [arrived, setArrived] = useState(!live);
  useEffect(() => {
    if (!live) return;
    const t = setTimeout(() => setArrived(true), afterMs);
    return () => clearTimeout(t);
  }, [live, afterMs]);
  return <RollingNumber from={from} to={arrived ? to : from} run={live && arrived} duration={0.5} />;
};

/** "Nobody got it": a gentle comic beat, the type sags like a deflating balloon. */
const NobodyBeat = ({ live }: { live: boolean }) => (
  <div className="absolute flex flex-col items-center" style={{ left: 0, right: 0, top: 250 }}>
    <motion.span
      className="tv-display whitespace-nowrap"
      style={{ fontSize: 170, lineHeight: 0.9, transformOrigin: "20% 100%" }}
      initial={live ? { scale: 1.6, opacity: 0, rotate: 0, y: 0 } : false}
      animate={{ scale: 1, opacity: 1, rotate: 3.5, y: 18 }}
      transition={{ scale: { duration: 0.4 }, opacity: { duration: 0.2 }, rotate: { delay: 0.6, duration: 1.6, ease: "easeInOut" }, y: { delay: 0.6, duration: 1.6, ease: "easeInOut" } }}
    >
      <RisoType top="var(--ink)" under="var(--pink)" offset={6}>
        Nobody got it
      </RisoType>
    </motion.span>
    <motion.span
      className="tv-stamp mt-28"
      style={{ fontSize: 56, color: "var(--ink)", background: "var(--pink)", borderColor: "var(--ink)" }}
      initial={live ? { scale: 2.2, opacity: 0, rotate: 14 } : false}
      animate={{ scale: [2.2, 0.9, 1], opacity: 1, rotate: 7 }}
      transition={{ duration: 0.4, times: [0, 0.6, 1], delay: live ? 1.1 : 0 }}
    >
      Next one!
    </motion.span>
  </div>
);

/**
 * The break-forward beat: the winners' chips leave the line and come to the front as one big
 * centred group, names huge, stamped EXACT / CLOSEST / GOT IT. Then (`scoring`) each "+N" lands
 * on its chip and travels down into that player's total, which ticks over.
 */
export const WinnersCard = ({
  kind,
  winners,
  detail,
  scoring,
  live,
}: {
  kind: WinnersKind;
  winners: Winner[];
  detail?: string;
  scoring: boolean;
  live: boolean;
}) => {
  if (kind === "nobody" || winners.length === 0) {
    return (
      <div className="absolute inset-0" style={{ zIndex: 30 }} data-testid="tv-highlight">
        <NobodyBeat live={live} />
      </div>
    );
  }
  const stamp = STAMP[kind];
  const layout = layoutWinners(winners);
  const byId = new Map(winners.map((w) => [w.id, w]));
  const nameTop = layout.chipTop + layout.chip + 18;
  const totalTop = nameTop + layout.name * 1.05 + 14;
  const big = kind === "exact";
  return (
    <div className="absolute inset-0" style={{ zIndex: 30 }} data-testid="tv-highlight">
      {big ? (
        // EXACT owns the whole frame: a full-width printed burst behind everything.
        <motion.div
          className="absolute inset-0"
          initial={live ? { scale: 0.2, opacity: 0 } : false}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 180, damping: 16 }}
        >
          <Sunburst size={2600} x={960} y={layout.chipTop + layout.chip / 2} rays={26} spin={false} />
        </motion.div>
      ) : (
        <motion.svg
          aria-hidden="true"
          className="absolute"
          width={900}
          height={900}
          style={{ left: 960 - 450, top: layout.chipTop + layout.chip / 2 - 450, mixBlendMode: "multiply" }}
          initial={live ? { scale: 0 } : false}
          animate={{ scale: 1 }}
          transition={{ type: "spring", stiffness: 260, damping: 18 }}
        >
          <circle cx={450} cy={450} r={kind === "closest" ? 360 : 400} fill="url(#tv-dots-yellow)" />
        </motion.svg>
      )}
      <div className="absolute flex items-center justify-center gap-10" style={{ left: 0, right: 0, top: big ? 70 : 110, height: big ? 200 : 150 }}>
        <motion.span
          className="tv-stamp"
          style={{ fontSize: stamp.size, color: stamp.fg, background: stamp.bg, borderColor: "var(--ink)", borderWidth: big ? 10 : 6, padding: big ? "6px 40px" : "4px 26px" }}
          initial={live ? { scale: 2.6, opacity: 0, rotate: stamp.rotate - 18 } : false}
          animate={{ scale: [2.6, 0.86, 1], opacity: 1, rotate: stamp.rotate }}
          transition={{ duration: 0.42, times: [0, 0.6, 1], delay: live ? 0.35 : 0 }}
        >
          {stamp.label}
        </motion.span>
        {detail ? (
          <motion.span
            className="slug"
            style={{ fontSize: 44, lineHeight: 1, background: "var(--ink)", color: "var(--paper)", padding: "10px 18px" }}
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
        // Where the travelling "+N" lands: the middle of the total, under the name.
        const travelX = -layout.chip * 0.22 - 85;
        const travelY = totalTop - layout.chipTop + 20;
        return (
          <div key={spot.id}>
            <motion.div
              className="absolute"
              style={{ left: spot.x - layout.chip / 2, top: layout.chipTop, width: layout.chip, height: layout.chip, zIndex: 3 }}
              initial={live && from ? { x: from.x - spot.x, y: from.y - centreY, scale: from.size / layout.chip } : live ? { scale: 0 } : false}
              animate={{ x: 0, y: 0, scale: 1 }}
              transition={{ type: "spring", stiffness: 190, damping: 15, mass: 1, delay: live ? i * 0.06 : 0 }}
            >
              <span className="block" style={{ borderRadius: 999, boxShadow: "0 0 0 10px var(--paper), 14px 14px 0 10px var(--ink)" }}>
                <InkToken name={w.name} inkIndex={w.inkIndex} size={layout.chip} />
              </span>
            </motion.div>
            <motion.span
              className="absolute tv-display text-center whitespace-nowrap"
              style={{ left: spot.x - 500, width: 1000, top: nameTop, fontSize: layout.name, lineHeight: 1, letterSpacing: "-0.02em", zIndex: 3 }}
              initial={live ? { opacity: 0, y: 30, scale: 0.7 } : false}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ delay: live ? 0.3 + i * 0.06 : 0, duration: 0.35, ease: [0.2, 0.9, 0.2, 1.2] }}
            >
              <RisoType top="var(--ink)" under="var(--pink)" offset={5}>
                {w.name}
              </RisoType>
            </motion.span>
            {scoring && w.points > 0 ? (
              <>
                {/* The "+N" stamps onto the chip, then travels down INTO the total and is gone: no chip is left behind. */}
                {live ? (
                  <motion.span
                    aria-hidden="true"
                    className="absolute tv-display tabular"
                    style={{ left: spot.x + layout.chip * 0.22, top: layout.chipTop - 20, fontSize: 84, lineHeight: 1, background: "var(--pink)", border: "6px solid var(--ink)", padding: "2px 16px", zIndex: 5 }}
                    initial={{ scale: 0, rotate: -20, x: 0, y: 0 }}
                    animate={{
                      scale: [0, 1.25, 1, 1, 0.7, 0],
                      rotate: [-20, -6, -6, -6, 0, 0],
                      x: [0, 0, 0, 0, travelX, travelX],
                      y: [0, 0, 0, 0, travelY, travelY + 10],
                    }}
                    transition={{ duration: 1.05, times: [0, 0.2, 0.3, 0.62, 0.92, 1], delay: i * 0.12 }}
                  >
                    +{w.points}
                  </motion.span>
                ) : null}
                <motion.span
                  className="absolute flex items-center justify-center gap-5"
                  style={{ left: spot.x - 300, width: 600, top: totalTop, zIndex: 3 }}
                  initial={live ? { opacity: 0, y: 16 } : false}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: live ? 0.2 : 0, duration: 0.3 }}
                >
                  <motion.span
                    className="tv-display tabular"
                    style={{ fontSize: layout.total, lineHeight: 1, color: "var(--blue)" }}
                    initial={false}
                    animate={live ? { scale: [1, 1, 1.3, 1] } : { scale: 1 }}
                    transition={{ duration: 0.45, times: [0, 0.6, 0.8, 1], delay: 0.85 + i * 0.12 }}
                  >
                    <ArrivingTotal from={w.prevScore} to={w.prevScore + w.points} afterMs={1000 + i * 120} live={live} />
                  </motion.span>
                  <span className="slug" style={{ fontSize: 30, lineHeight: 1, writingMode: "vertical-rl", rotate: "180deg" }}>
                    total
                  </span>
                </motion.span>
              </>
            ) : null}
          </div>
        );
      })}
      {layout.more > 0 ? (
        <span className="absolute slug" style={{ left: (layout.spots.at(-1)?.x ?? 960) + layout.chip / 2 + 40, top: layout.chipTop + layout.chip / 2 - 20, fontSize: 44 }}>
          +{layout.more}
        </span>
      ) : null}
    </div>
  );
};
