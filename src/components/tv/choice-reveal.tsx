import { motion } from "framer-motion";
import { FitName } from "./fit-name";
import { EASE_OUT, GlassToken } from "./glass";
import { type ChoiceLayout, eliminationOrder, eliminationTimes } from "./choice-columns";
import { slamIn } from "./motion-presets";
import { optionLetter } from "./tv-model";
import { PHASE } from "./use-reveal-phase";

export type ChoicePick = { playerId: string; name: string; inkIndex: number; order: number };

/**
 * The multiple-choice reveal, staged like the number line: full-height columns, the players' chips
 * dropping onto their picks; through the suspense the wrong options dim and sink away one by one
 * (emptiest first), and on the answer beat the right column lights and "Right!" slams.
 */
export const ChoiceColumns = ({
  options,
  picks,
  layout,
  correctIndex,
  winnerIds,
  phase,
  live,
  firstDrop,
  stagger,
  suspenseMs,
}: {
  options: string[];
  picks: ChoicePick[][];
  layout: ChoiceLayout;
  correctIndex: number;
  winnerIds: ReadonlySet<string>;
  phase: number;
  live: boolean;
  /** Seconds. */
  firstDrop: number;
  /** Seconds. */
  stagger: number;
  /** Milliseconds of the suspense beat, which the eliminations fill. */
  suspenseMs: number;
}) => {
  const order = eliminationOrder(
    picks.map((p) => p.length),
    correctIndex,
  );
  const times = eliminationTimes(order.length, suspenseMs);
  const dropAt = new Map(order.map((oi, k) => [oi, times[k] / 1000]));
  const eliminating = phase >= PHASE.suspense;
  const answered = phase >= PHASE.answer;
  return (
    <>
      {layout.columns.map((col, oi) => {
        const wrongAt = dropAt.get(oi);
        const dropped = eliminating && wrongAt !== undefined;
        const right = answered && oi === correctIndex;
        const slam = slamIn({ delay: 0, rotate: -2 });
        return (
          <motion.div
            key={`${oi}-${options[oi]}`}
            className="absolute tv-glass"
            style={{
              left: col.x,
              top: col.top,
              width: col.width,
              height: col.bottom - col.top,
              borderRadius: 32,
              borderColor: right ? "var(--win)" : undefined,
              boxShadow: right ? "0 0 0 2px var(--win), 0 0 80px rgba(74, 222, 128, 0.45)" : undefined,
              transition: "border-color .3s, box-shadow .3s",
            }}
            initial={live ? { opacity: 0, transform: "translateY(24px) scale(1)" } : false}
            animate={dropped ? { opacity: 0.2, transform: "translateY(40px) scale(0.95)" } : { opacity: 1, transform: "translateY(0px) scale(1)" }}
            transition={dropped ? { delay: live ? wrongAt : 0, duration: live ? 0.42 : 0, ease: EASE_OUT } : { delay: live ? 0.1 + oi * 0.06 : 0, duration: 0.4, ease: EASE_OUT }}
            data-testid={`tv-option-${oi}`}
          >
            <div className="absolute flex items-center gap-4" style={{ left: 20, right: 20, top: 0, height: layout.header }}>
              <span
                className="tv-display flex flex-none items-center justify-center"
                style={{
                  width: 72,
                  height: 72,
                  borderRadius: 999,
                  fontSize: 40,
                  background: right ? "var(--win-fill)" : "linear-gradient(135deg, #4f46e5, #7e22ce)",
                  color: right ? "var(--win-ink)" : "var(--text)",
                  boxShadow: right ? "0 0 30px rgba(74,222,128,.6)" : "0 0 24px rgba(139,92,246,.45)",
                  transition: "background .3s, color .3s",
                }}
              >
                {optionLetter(oi)}
              </span>
              <FitName text={options[oi]} max={52} floor={32} box={col.width - 40 - 72 - 16} lineHeight={1.05} className="tv-display" style={{ letterSpacing: "-0.02em", color: "var(--text)" }} />
            </div>
            <div className="absolute" style={{ left: 20, right: 20, top: layout.header - 1, height: 2, background: "var(--glass-edge)", opacity: 0.6 }} />
            {right ? (
              <span className="absolute flex justify-center" style={{ left: 0, right: 0, top: layout.header - 34, zIndex: 4 }}>
                <span className="relative inline-flex">
                  <motion.span
                    aria-hidden="true"
                    className="absolute pointer-events-none"
                    style={{ left: "50%", top: "50%", width: 520, height: 300, marginLeft: -260, marginTop: -150, borderRadius: 999, background: "radial-gradient(closest-side, rgba(74, 222, 128, 0.55), transparent)", zIndex: -1 }}
                    initial={live ? { transform: "scale(0.3)", opacity: 0 } : false}
                    animate={live ? { transform: ["scale(0.3)", "scale(0.3)", "scale(1.15)", "scale(1)"], opacity: [0, 0, 1, 0.5] } : { transform: "scale(1)", opacity: 0.5 }}
                    transition={{ duration: 0.9, times: [0, 0.22, 0.45, 1], ease: EASE_OUT }}
                  />
                  <motion.span
                    className="tv-pill tv-pill--win"
                    style={{ fontSize: 52, padding: "10px 34px", letterSpacing: "-0.02em" }}
                    {...(live ? slam : { initial: false as const, animate: { transform: slam.animate.transform.at(-1), opacity: 1 } })}
                    data-testid="tv-stamp"
                  >
                    Right!
                  </motion.span>
                </span>
              </span>
            ) : null}
            {picks[oi].length > 0 ? (
              // The pile's glow: a soft bar rising behind the chips, so the columns read as a vote count.
              <motion.div
                aria-hidden="true"
                className="absolute"
                style={{
                  left: 8,
                  right: 8,
                  bottom: 8,
                  top: layout.chipAt(oi, picks[oi].length - 1).y - col.top - layout.chip / 2 - 22,
                  borderRadius: 24,
                  background: right
                    ? "linear-gradient(to top, rgba(74, 222, 128, 0.3), rgba(74, 222, 128, 0.04))"
                    : "linear-gradient(to top, rgba(129, 140, 248, 0.24), rgba(192, 132, 252, 0.04))",
                  transformOrigin: "50% 100%",
                  transition: "background .3s",
                }}
                initial={live ? { transform: "scaleY(0)", opacity: 0 } : false}
                animate={{ transform: "scaleY(1)", opacity: 1 }}
                transition={{ delay: live ? firstDrop + Math.min(...picks[oi].map((t) => t.order)) * stagger + 0.3 : 0, duration: 0.5, ease: EASE_OUT }}
              />
            ) : null}
            {picks[oi].map((t, k) => {
              const at = layout.chipAt(oi, k);
              const x = at.x - col.x;
              const y = at.y - col.top;
              const delay = firstDrop + t.order * stagger;
              const win = answered && winnerIds.has(t.playerId);
              return (
                <motion.div
                  key={t.playerId}
                  className="absolute flex items-center gap-4"
                  style={{ left: x - layout.chip / 2, top: y - layout.chip / 2, height: layout.chip }}
                  initial={live ? { transform: "translateY(-460px)", opacity: 0 } : false}
                  animate={{ transform: ["translateY(-460px)", "translateY(12px)", "translateY(0px)"], opacity: [0, 1, 1] }}
                  transition={live ? { delay, duration: 0.5, times: [0, 0.72, 1], ease: EASE_OUT } : { duration: 0 }}
                  data-testid={`player-result-${t.playerId}`}
                >
                  <motion.span
                    className="inline-flex"
                    animate={phase === PHASE.suspense ? { rotate: [0, -6, 6, -4, 4, 0] } : { rotate: 0 }}
                    transition={phase === PHASE.suspense ? { duration: 0.45, repeat: Infinity } : { duration: 0.2 }}
                  >
                    <GlassToken name={t.name} inkIndex={t.inkIndex} size={layout.chip} win={win} />
                  </motion.span>
                  {layout.mode === "list" ? (
                    <FitName text={t.name} max={40} floor={layout.nameMin} box={layout.nameBox} lineHeight={1.05} className="tv-name" style={{ fontWeight: 700, color: win ? "var(--win)" : "var(--text-2)" }} />
                  ) : (
                    <span className="tv-sr">{t.name}</span>
                  )}
                </motion.div>
              );
            })}
          </motion.div>
        );
      })}
    </>
  );
};
