import { motion } from "framer-motion";
import { InkToken, RisoType, Slug } from "./print";
import { StandingsStrip } from "./standings";
import { Sunburst } from "./sunburst";
import type { StandingRow } from "./tv-model";

/** Before a question: "QUESTION 3" printed huge, the room's standings small at the foot. */
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
  <motion.div
    key="anticipation"
    className="absolute inset-0"
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    exit={{ opacity: 0 }}
  >
    <Sunburst size={1500} x={1240} y={470} fill="url(#tv-dots-pink)" rays={22} />
    <div className="absolute flex flex-col items-start" style={{ left: 120, top: 120 }}>
      <Slug className="text-ink mb-8">{total > 0 ? `${nextNumber} of ${total} · Phones ready` : "Phones ready"}</Slug>
      <h1 data-testid="waiting-for-question" className="tv-display flex flex-col items-start" style={{ lineHeight: 0.8 }}>
        <motion.span
          initial={{ x: -120, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ duration: 0.55, ease: [0.2, 0.9, 0.2, 1.15] }}
          style={{ fontSize: 200 }}
        >
          <RisoType top="var(--ink)" under="var(--blue)" offset={7}>
            QUESTION
          </RisoType>
        </motion.span>
        <motion.span
          initial={{ scale: 2.4, opacity: 0, rotate: -14 }}
          animate={{ scale: [2.4, 0.86, 1.04, 1], opacity: 1, rotate: -4 }}
          transition={{ duration: 0.6, delay: 0.35, times: [0, 0.55, 0.8, 1] }}
          className="tabular inline-block"
          style={{ fontSize: 500, marginLeft: 260, marginTop: -10 }}
        >
          <RisoType top="var(--blue)" under="var(--pink)" offset={14} rough>
            {nextNumber}
          </RisoType>
        </motion.span>
        <span className="tv-sr">Waiting for Question...</span>
      </h1>
    </div>
    <div className="absolute" style={{ left: 96, right: 96, bottom: 52 }}>
      <div className="tv-rule mb-6" />
      {showScores ? (
        <StandingsStrip rows={rows} settled />
      ) : (
        <div className="flex items-center gap-8">
          <Slug className="text-ink">Tonight</Slug>
          {rows.slice(0, 7).map((r) => (
            <span key={r.id} className="flex items-center gap-3">
              <InkToken name={r.name} inkIndex={r.inkIndex} size={64} />
              <span className="tv-display text-[36px]" style={{ letterSpacing: "-0.01em" }}>{r.name}</span>
            </span>
          ))}
        </div>
      )}
    </div>
  </motion.div>
);
