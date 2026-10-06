import { popIn } from "./motion-presets";
import { motion } from "framer-motion";
import { FitName } from "./fit-name";
import type { Misses } from "./misses";
import { GlassToken, Label } from "./glass";
import type { TakeoverLayout } from "./takeover-layout";

type Slot = NonNullable<TakeoverLayout["misses"]>;

/**
 * The rest of the room: a column down the right third of the takeover. Its slot is laid out with the
 * winners (the label is there from the first frame, nothing re-flows); once the winners have their
 * points (`rowsIn`), everyone else slides in with how far off they were, and the nearest miss gets a
 * small "next closest" stamp. Then the standings.
 */
export const MissesStrip = ({ misses, live, slot, rowsIn }: { misses: Misses; live: boolean; slot: Slot; rowsIn: boolean }) => {
  if (misses.rows.length === 0) return null;
  const stampAt = 0.25 + misses.rows.length * 0.12;
  const chip = Math.min(84, slot.rowHeight - 34);
  const inner = slot.width - 44 - chip - 20;
  return (
    <div className="absolute" style={{ left: slot.left, width: slot.width, top: slot.top, zIndex: 36 }} data-testid="tv-misses">
      <motion.div style={{ height: slot.labelHeight }} initial={live ? { opacity: 0 } : false} animate={{ opacity: 1 }} transition={{ duration: 0.4, delay: live ? 0.5 : 0 }}>
        <Label>The rest of the room</Label>
      </motion.div>
      <div className="flex flex-col" style={{ rowGap: slot.rowGap }}>
        {rowsIn
          ? misses.rows.map((r, i) => (
              <motion.div
                key={r.playerId}
                className="relative flex items-center gap-5 tv-glass"
                style={{ height: slot.rowHeight, padding: "0 22px", borderColor: r.nearest ? "rgba(251, 191, 36, 0.55)" : undefined }}
                initial={live ? { x: 140, opacity: 0 } : false}
                animate={{ x: 0, opacity: 1 }}
                transition={{ delay: live ? 0.1 + i * 0.1 : 0, type: "spring", stiffness: 380, damping: 30 }}
                data-testid={`tv-miss-${r.playerId}`}
              >
                <GlassToken name={r.name} inkIndex={r.inkIndex} size={chip} />
                <span className="flex flex-col min-w-0 flex-1">
                  <span className="flex items-center justify-between gap-3">
                    <FitName text={r.name} max={48} floor={36} box={r.nearest ? inner - 202 : inner} className="tv-name" />
                    {r.nearest ? (
                      <motion.span
                        className="tv-pill tv-pill--close flex-none"
                        style={{ fontSize: 28, padding: "6px 14px" }}
                        {...(live ? popIn({ delay: stampAt }) : { initial: false as const })}
                      >
                        Next closest
                      </motion.span>
                    ) : null}
                  </span>
                  <FitName text={r.tag} max={34} floor={28} box={inner} lineHeight={1.05} className="tv-display mt-1" style={{ color: "var(--glow)", fontWeight: 600, letterSpacing: 0 }} />
                </span>
              </motion.div>
            ))
          : null}
      </div>
      {rowsIn && misses.more > 0 ? (
        <span className="tv-label block mt-4" style={{ fontSize: 30 }}>
          +{misses.more} more
        </span>
      ) : null}
    </div>
  );
};
