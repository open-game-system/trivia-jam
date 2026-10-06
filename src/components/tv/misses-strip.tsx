import { motion } from "framer-motion";
import { FitName } from "./fit-name";
import type { Misses } from "./misses";
import { EASE_POP, GlassToken, Label } from "./glass";

/** Where the strip sits: under the winners and the answer, once they have stepped up out of the way. */
export const MISSES_TOP = 664;

/**
 * The misses beat: once the winners have their points, everyone else slides in along the bottom with
 * how far off they were; the nearest miss gets a small "next closest" stamp. Then the standings.
 */
export const MissesStrip = ({ misses, live }: { misses: Misses; live: boolean }) => {
  if (misses.rows.length === 0) return null;
  const stampAt = 0.25 + misses.rows.length * 0.12;
  return (
    <div className="absolute" style={{ left: 96, right: 96, top: MISSES_TOP, zIndex: 36 }} data-testid="tv-misses">
      <motion.div initial={live ? { opacity: 0, x: -30 } : false} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.25 }}>
        <Label>The rest of the room</Label>
      </motion.div>
      <div className="grid grid-cols-3 mt-5" style={{ columnGap: 40, rowGap: 22 }}>
        {misses.rows.map((r, i) => (
          <motion.div
            key={r.playerId}
            className="relative flex items-center gap-5 tv-glass"
            style={{ minHeight: 132, padding: "12px 22px", borderColor: r.nearest ? "rgba(251, 191, 36, 0.55)" : undefined }}
            initial={live ? { y: 240, opacity: 0 } : false}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: live ? 0.15 + i * 0.12 : 0, type: "spring", stiffness: 380, damping: 24 }}
            data-testid={`tv-miss-${r.playerId}`}
          >
            <GlassToken name={r.name} inkIndex={r.inkIndex} size={84} />
            <span className="flex flex-col min-w-0 flex-1">
              <span className="flex items-center justify-between gap-3">
                <FitName text={r.name} max={52} floor={36} box={r.nearest ? 190 : 380} className="tv-name" />
                {r.nearest ? (
                  <motion.span
                    className="tv-pill tv-pill--close flex-none"
                    style={{ fontSize: 28, padding: "6px 14px" }}
                    initial={live ? { scale: 0.3, opacity: 0 } : false}
                    animate={{ scale: [0.3, 1.12, 1], opacity: 1 }}
                    transition={{ delay: live ? stampAt : 0, duration: 0.4, times: [0, 0.6, 1], ease: EASE_POP }}
                  >
                    Next closest
                  </motion.span>
                ) : null}
              </span>
              <FitName text={r.tag} max={34} floor={28} box={400} lineHeight={1.05} className="tv-display mt-2" style={{ color: "var(--glow)", fontWeight: 600, letterSpacing: 0 }} />
            </span>
          </motion.div>
        ))}
      </div>
      {misses.more > 0 ? (
        <span className="tv-label block mt-4" style={{ fontSize: 30 }}>
          +{misses.more} more
        </span>
      ) : null}
    </div>
  );
};
