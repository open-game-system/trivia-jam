import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { InkToken, RisoType, Slug } from "./print";
import { RollingNumber } from "./standings";
import { rankMove, type StandingRow } from "./tv-model";

/** Beats of the standings board: rows land in the old order, points count in, then the order changes. */
const BEAT = { land: 0, count: 1, reorder: 2 } as const;
const COUNT_AT = 1300;
const REORDER_AT = 2700;

const SHEET = { left: 96, right: 1824, top: 236, bottom: 1040 };
const ROW_GAP = 18;
const COLUMN_GAP = 40;

/** A printed rank-change arrow: up in teal, down in ink. Level shows nothing. */
const RankArrow = ({ delta, size }: { delta: number; size: number }) => {
  if (delta === 0) return null;
  const up = delta > 0;
  return (
    <motion.span
      className="inline-flex items-center gap-2"
      aria-label={up ? `up ${delta}` : `down ${-delta}`}
      initial={{ scale: 2, opacity: 0, rotate: -12 }}
      animate={{ scale: [2, 0.88, 1], opacity: 1, rotate: 0 }}
      transition={{ duration: 0.4, times: [0, 0.6, 1], delay: 0.35 }}
    >
      <svg width={size} height={size * 0.9} viewBox="0 0 40 36" aria-hidden="true">
        <polygon points={up ? "20,2 38,34 2,34" : "2,2 38,2 20,34"} fill={up ? "var(--teal)" : "var(--ink)"} stroke="var(--ink)" strokeWidth="3" />
      </svg>
      <span className="tv-display tabular" style={{ fontSize: size * 0.8, color: up ? "var(--teal)" : "var(--ink)", lineHeight: 1 }}>
        {Math.abs(delta)}
      </span>
    </motion.span>
  );
};

const BoardRow = ({
  row,
  rows,
  beat,
  height,
  live,
}: {
  row: StandingRow;
  rows: StandingRow[];
  beat: number;
  height: number;
  live: boolean;
}) => {
  const settled = beat >= BEAT.reorder;
  const counted = beat >= BEAT.count;
  const leader = settled && row.rank === 1;
  const tight = height < 170;
  const nameSize = Math.max(56, Math.round(height * (tight ? 0.38 : 0.42)));
  return (
    <div
      className="relative flex items-center px-7 h-full"
      style={{
        gap: Math.round(height * (tight ? 0.12 : 0.16)),
        background: leader ? "var(--yellow)" : "var(--paper-2)",
        border: "6px solid var(--ink)",
        boxShadow: `9px 9px 0 ${leader ? "var(--pink)" : "var(--blue)"}`,
        transition: "background .3s",
      }}
      data-testid={`standing-${row.id}`}
    >
      <span className="tv-display tabular text-center" style={{ fontSize: height * 0.62, width: height * (tight ? 0.5 : 0.62), lineHeight: 1 }}>
        {settled ? row.rank : row.prevRank}
      </span>
      <InkToken name={row.name} inkIndex={row.inkIndex} size={Math.round(height * (tight ? 0.55 : 0.62))} />
      <span className="tv-display flex-1 min-w-0 truncate" style={{ fontSize: nameSize, lineHeight: 1.05, letterSpacing: "-0.015em" }}>
        {row.name}
      </span>
      <span className="flex justify-center" style={{ minWidth: height * (tight ? 0.5 : 0.7) }}>
        {settled ? <RankArrow delta={rankMove(row, rows)} size={Math.round(height * 0.4)} /> : null}
      </span>
      <span className="relative flex items-center justify-end" style={{ minWidth: height * (tight ? 0.8 : 1.25) }}>
        {row.gained > 0 ? (
          <motion.span
            className="absolute tv-display tabular"
            style={{ right: "100%", marginRight: 16, fontSize: height * 0.32, background: "var(--pink)", color: "var(--ink)", padding: "2px 12px", border: "4px solid var(--ink)", lineHeight: 1, rotate: -6 }}
            initial={live ? { scale: 0, opacity: 0 } : false}
            animate={counted ? { x: 140, scale: 0.4, opacity: 0 } : { scale: [0, 1.25, 1], opacity: 1 }}
            transition={counted ? { duration: 0.45, ease: "easeIn" } : { duration: 0.4, delay: 0.3 }}
          >
            +{row.gained}
          </motion.span>
        ) : null}
        <motion.span
          className="tv-display tabular text-right"
          style={{ fontSize: height * 0.6, lineHeight: 1 }}
          animate={counted && live && row.gained > 0 ? { scale: [1, 1.18, 1] } : { scale: 1 }}
          transition={{ duration: 0.5, delay: 0.4 }}
        >
          <RollingNumber from={row.prevScore} to={counted ? row.score : row.prevScore} run={live && counted} duration={1.0} />
        </motion.span>
      </span>
    </div>
  );
};

/** Where each row sits on the sheet: one column up to five players, two beyond. */
const placeRows = (count: number) => {
  const twoColumns = count > 5;
  const perColumn = twoColumns ? Math.ceil(count / 2) : Math.max(1, count);
  const columnWidth = twoColumns ? (SHEET.right - SHEET.left - COLUMN_GAP) / 2 : SHEET.right - SHEET.left;
  const height = Math.min(twoColumns ? 150 : 190, Math.floor((SHEET.bottom - SHEET.top - (perColumn - 1) * ROW_GAP) / perColumn));
  const at = (index: number) => {
    const column = Math.floor(index / perColumn);
    const slot = index % perColumn;
    return { left: SHEET.left + column * (columnWidth + COLUMN_GAP), top: SHEET.top + slot * (height + ROW_GAP) };
  };
  return { columnWidth, height, at };
};

/** Between questions: the full-screen standings beat. Points count into the totals, then the rows re-sort. */
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
  const [beat, setBeat] = useState<number>(live ? BEAT.land : BEAT.reorder);
  useEffect(() => {
    if (!live) return;
    const timers = [setTimeout(() => setBeat(BEAT.count), COUNT_AT), setTimeout(() => setBeat(BEAT.reorder), REORDER_AT)];
    return () => timers.forEach(clearTimeout);
  }, [live]);
  const settled = beat >= BEAT.reorder;
  const ordered = settled ? rows : [...rows].sort((a, b) => b.prevScore - a.prevScore || a.inkIndex - b.inkIndex);
  const shown = ordered.slice(0, 10);
  const { columnWidth, height, at } = placeRows(shown.length);
  const isLast = total > 0 && afterNumber >= total;
  return (
    <motion.div key="board" className="absolute inset-0" initial={live ? { opacity: 0 } : false} animate={{ opacity: 1 }} transition={{ duration: 0.2 }}>
      <motion.div
        className="absolute flex items-end justify-between"
        style={{ left: 96, right: 96, top: 44 }}
        initial={live ? { y: -60, opacity: 0 } : false}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.45, ease: [0.2, 0.9, 0.2, 1.15] }}
      >
        <div>
          <Slug className="text-ink mb-3">
            After question {afterNumber}
            {total > 0 ? ` of ${total}` : ""}
          </Slug>
          <h2 className="tv-display" style={{ fontSize: 132 }}>
            <RisoType top="var(--ink)" under="var(--pink)" offset={8}>
              Standings
            </RisoType>
          </h2>
        </div>
        <div className="flex flex-col items-end pb-2">
          <Slug className="text-blue mb-3">{isLast ? "That was the last question" : "Up next"}</Slug>
          {isLast ? null : (
            <span className="tv-display" style={{ fontSize: 88, lineHeight: 1 }}>
              Question {afterNumber + 1}
            </span>
          )}
        </div>
      </motion.div>
      {shown.map((row, i) => {
        const pos = at(i);
        const enterDelay = live ? 0.15 + i * 0.07 : 0;
        return (
          <motion.div
            key={row.id}
            className="absolute"
            style={{ width: columnWidth, height, zIndex: settled ? 10 - Math.min(9, i) : 1 }}
            initial={live ? { left: pos.left, top: pos.top + 120, opacity: 0 } : false}
            animate={{ left: pos.left, top: pos.top, opacity: 1 }}
            transition={
              settled && live
                ? { type: "spring", stiffness: 240, damping: 13, mass: 1 }
                : { duration: 0.45, delay: enterDelay, ease: [0.2, 0.9, 0.2, 1.15] }
            }
          >
            <BoardRow row={row} rows={rows} beat={beat} height={height} live={live} />
          </motion.div>
        );
      })}
    </motion.div>
  );
};
