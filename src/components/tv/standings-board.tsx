import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { InkToken, RisoType, Slug } from "./print";
import { RollingNumber } from "./standings";
import type { StandingRow } from "./tv-model";

/** A printed rank-change arrow: up in teal, down in ink, level as a short rule. */
const RankArrow = ({ delta }: { delta: number }) => {
  if (delta === 0) {
    return <span aria-hidden="true" style={{ width: 36, height: 8, background: "color-mix(in srgb, var(--ink) 35%, transparent)", display: "inline-block" }} />;
  }
  const up = delta > 0;
  return (
    <span className="inline-flex items-center gap-1" aria-label={up ? `up ${delta}` : `down ${-delta}`}>
      <svg width="40" height="36" viewBox="0 0 40 36" aria-hidden="true">
        <polygon
          points={up ? "20,2 38,34 2,34" : "2,2 38,2 20,34"}
          fill={up ? "var(--teal)" : "var(--ink)"}
          stroke="var(--ink)"
          strokeWidth="3"
        />
      </svg>
      <span className="slug text-[28px]" style={{ color: up ? "var(--teal)" : "var(--ink)" }}>
        {Math.abs(delta)}
      </span>
    </span>
  );
};

const BoardRow = ({ row, settled, height, live }: { row: StandingRow; settled: boolean; height: number; live: boolean }) => {
  const leader = settled && row.rank === 1;
  return (
    <motion.div
      layout
      transition={{ type: "spring", stiffness: 210, damping: 24 }}
      className="relative flex items-center gap-6 px-6"
      style={{
        height,
        background: leader ? "var(--yellow)" : "var(--paper-2)",
        border: "5px solid var(--ink)",
        boxShadow: `7px 7px 0 ${leader ? "var(--pink)" : "var(--blue)"}`,
      }}
      data-testid={`standing-${row.id}`}
    >
      <span className="tv-display tabular text-center" style={{ fontSize: height * 0.66, width: height * 0.7, lineHeight: 1 }}>
        {settled ? row.rank : row.prevRank}
      </span>
      <InkToken name={row.name} inkIndex={row.inkIndex} size={Math.round(height * 0.66)} />
      <span className="tv-display flex-1 min-w-0 truncate" style={{ fontSize: Math.max(44, height * 0.46), lineHeight: 1.05, letterSpacing: "-0.015em" }}>
        {row.name}
      </span>
      <span style={{ width: 90 }} className="flex justify-center">
        {settled ? <RankArrow delta={row.prevRank - row.rank} /> : null}
      </span>
      {row.gained > 0 ? (
        <span className="slug text-[30px]" style={{ color: "var(--ink)", background: "var(--pink)", padding: "4px 10px", border: "3px solid var(--ink)" }}>
          +{row.gained}
        </span>
      ) : null}
      <span className="tv-display tabular text-right" style={{ fontSize: height * 0.6, minWidth: 150, lineHeight: 1 }}>
        <RollingNumber from={row.prevScore} to={settled ? row.score : row.prevScore} run={live && settled} duration={1.1} />
      </span>
    </motion.div>
  );
};

/** Between questions: the big standings board, reordering from where everyone stood before. */
export const TvStandingsBoard = ({
  rows,
  afterNumber,
  total,
  live,
}: {
  rows: StandingRow[];
  afterNumber: number;
  total: number;
  live: boolean;
}) => {
  const [settled, setSettled] = useState(!live);
  useEffect(() => {
    if (!live) return;
    const t = setTimeout(() => setSettled(true), 900);
    return () => clearTimeout(t);
  }, [live]);
  const ordered = settled ? rows : [...rows].sort((a, b) => b.prevScore - a.prevScore || a.inkIndex - b.inkIndex);
  const shown = ordered.slice(0, 10);
  const twoColumns = shown.length > 5;
  const perColumn = twoColumns ? Math.ceil(shown.length / 2) : shown.length;
  const height = twoColumns ? 112 : Math.min(124, Math.floor(620 / Math.max(1, perColumn)) - 14);
  const columns = twoColumns ? [shown.slice(0, perColumn), shown.slice(perColumn)] : [shown];
  const isLast = total > 0 && afterNumber >= total;
  return (
    <motion.div key="board" className="absolute inset-0" initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45, delay: 0.25, ease: [0.2, 0.9, 0.2, 1.15] }}>
      <div className="absolute" style={{ left: 96, top: 64 }}>
        <Slug className="text-ink mb-4">
          After question {afterNumber}
          {total > 0 ? ` of ${total}` : ""}
        </Slug>
        <h2 className="tv-display" style={{ fontSize: 150 }}>
          <RisoType top="var(--ink)" under="var(--pink)" offset={8}>
            Standings
          </RisoType>
        </h2>
      </div>
      <div className="absolute flex flex-col items-end" style={{ right: 96, top: 74 }}>
        <Slug className="text-blue mb-3">{isLast ? "That was the last question" : "Up next"}</Slug>
        {isLast ? null : (
          <span className="tv-display" style={{ fontSize: 96, lineHeight: 1 }}>
            Question {afterNumber + 1}
          </span>
        )}
      </div>
      <div className="absolute flex gap-10" style={{ left: 96, right: 96, top: 330 }}>
        {columns.map((col, c) => (
          <div key={c} className="flex-1 min-w-0 flex flex-col gap-4">
            {col.map((row) => (
              <BoardRow key={row.id} row={row} settled={settled} height={height} live={live} />
            ))}
          </div>
        ))}
      </div>
    </motion.div>
  );
};
