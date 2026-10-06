import { motion } from "framer-motion";
import { FitName } from "./fit-name";
import type { Misses } from "./misses";
import { InkToken, Slug } from "./print";

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
        <Slug className="text-ink">The rest of the room</Slug>
      </motion.div>
      <div className="grid grid-cols-3 mt-5" style={{ columnGap: 40, rowGap: 22 }}>
        {misses.rows.map((r, i) => (
          <motion.div
            key={r.playerId}
            className="relative flex items-center gap-5"
            style={{ minHeight: 132, padding: "12px 20px", background: "var(--paper-2)", border: "5px solid var(--ink)" }}
            initial={live ? { y: 240, opacity: 0 } : false}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: live ? 0.15 + i * 0.12 : 0, type: "spring", stiffness: 380, damping: 24 }}
            data-testid={`tv-miss-${r.playerId}`}
          >
            <InkToken name={r.name} inkIndex={r.inkIndex} size={84} />
            <span className="flex flex-col min-w-0 flex-1">
              <span className="flex items-center justify-between gap-3">
                <FitName text={r.name} max={52} floor={36} box={r.nearest ? 190 : 380} className="tv-display" style={{ letterSpacing: "-0.015em" }} />
                {r.nearest ? (
                  <motion.span
                    className="tv-stamp flex-none whitespace-nowrap"
                    style={{ fontSize: 26, padding: "2px 10px", background: "var(--yellow)", color: "var(--ink)", borderColor: "var(--ink)" }}
                    initial={live ? { scale: 2.4, opacity: 0, rotate: -18 } : false}
                    animate={{ scale: [2.4, 0.88, 1], opacity: 1, rotate: -4 }}
                    transition={{ delay: live ? stampAt : 0, duration: 0.4, times: [0, 0.6, 1] }}
                  >
                    Next closest
                  </motion.span>
                ) : null}
              </span>
              <FitName text={r.tag} max={34} floor={28} box={400} lineHeight={1.05} className="slug tabular mt-2" style={{ color: "var(--blue)" }} />
            </span>
          </motion.div>
        ))}
      </div>
      {misses.more > 0 ? (
        <span className="slug block mt-4" style={{ fontSize: 30 }}>
          +{misses.more} more
        </span>
      ) : null}
    </div>
  );
};
