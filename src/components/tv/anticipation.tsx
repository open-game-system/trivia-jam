import { motion } from "framer-motion";
import { Bloom, EASE_OUT, GlassToken, Label } from "./glass";
import { StandingsStrip } from "./standings";
import type { StandingRow } from "./tv-model";

/** Before a question: "Question 3" set huge and glowing, the room along the foot on a glass shelf. */
export const TvAnticipation = ({
  nextNumber,
  total,
  rows,
  showScores,
}: {
  nextNumber: number;
  total: number;
  rows: StandingRow[];
  showScores: boolean;
}) => (
  <motion.div key="anticipation" className="absolute inset-0" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
    <Bloom x={960} y={520} r={640} color="rgba(139, 92, 246, 0.34)" live />
    <div className="absolute flex flex-col items-center" style={{ left: 0, right: 0, top: 96 }}>
      <Label className="mb-4">{total > 0 ? `${nextNumber} of ${total} · Phones ready` : "Phones ready"}</Label>
      <h1 data-testid="waiting-for-question" className="tv-display tv-hero flex flex-col items-center" style={{ lineHeight: 0.84 }}>
        <motion.span
          className="lav-text"
          initial={{ y: 24, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.5, ease: EASE_OUT }}
          style={{ fontSize: 150, letterSpacing: "-0.04em", paddingBottom: 10 }}
        >
          Question
        </motion.span>
        <motion.span
          initial={{ scale: 1.4, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.3, ease: EASE_OUT }}
          className="glow-text inline-block"
          style={{ fontSize: 520, letterSpacing: "-0.05em", paddingInline: "0.04em", lineHeight: 0.86 }}
        >
          {nextNumber}
        </motion.span>
        <span className="tv-sr">Waiting for Question...</span>
      </h1>
    </div>
    <div className="absolute tv-glass flex items-center" style={{ left: 72, right: 72, bottom: 40, minHeight: 132, padding: "20px 36px", borderRadius: 32 }}>
      {showScores ? (
        <StandingsStrip rows={rows} settled />
      ) : (
        <div className="flex items-center gap-8">
          <Label>Tonight</Label>
          {rows.slice(0, 7).map((r) => (
            <span key={r.id} className="flex items-center gap-3">
              <GlassToken name={r.name} inkIndex={r.inkIndex} size={64} />
              <span className="tv-name text-[36px] whitespace-nowrap">{r.name}</span>
            </span>
          ))}
        </div>
      )}
    </div>
  </motion.div>
);
