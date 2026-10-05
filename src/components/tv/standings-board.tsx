import { motion } from "framer-motion";
import { useEffect, useMemo, useState } from "react";
import { InkToken, RisoType, Slug } from "./print";
import { FitName } from "./fit-name";
import { type BeatRow, standingsBeat } from "./standings-beat";
import { countTicks } from "./standings-frame";
import type { StandingRow } from "./tv-model";

/**
 * The standings beat (~3.5 s, then a settled hold): the board is rolled on showing the PREVIOUS order and
 * totals (after question 1: everyone on 0 in join order, no rank numerals); each "+N" chip is stamped on its
 * row, then drops into the total as the totals roll (rows held still); then the rows reorder ONCE with a
 * slide and the true ranks are stamped; then the up/down stamps land. Every frame comes from `standingsBeat`.
 */
const CHIPS_AT = 500;
const COUNT_AT = 1100;
const COUNT_MS = 1200;
const SETTLE_AT = 2700;
const MOVES_AT = 3300;

const SHEET = { left: 96, right: 1824, top: 236, bottom: 1040 };
/** Up to this many rows, the lower band is the "Up next" card instead of empty paper. */
const CARD_ROWS = 3;
const CARD_BAND = 230;
const ROW_GAP = 18;
const COLUMN_GAP = 40;

/** A printed "moved" stamp: a solid triangle and the number of places, teal up, ink down. */
const MoveStamp = ({ delta, size, live }: { delta: number; size: number; live: boolean }) => {
  if (delta === 0) return null;
  const up = delta > 0;
  const ink = up ? "var(--teal)" : "var(--ink)";
  return (
    <motion.span
      className="inline-flex items-center gap-2"
      style={{ background: ink, color: "var(--paper)", border: "5px solid var(--ink)", padding: "6px 14px 6px 10px", rotate: up ? -5 : 4 }}
      aria-label={up ? `up ${delta}` : `down ${-delta}`}
      data-testid="standing-move"
      initial={live ? { scale: 2.4, opacity: 0, rotate: -18 } : false}
      animate={{ scale: [2.4, 0.86, 1], opacity: 1, rotate: up ? -5 : 4 }}
      transition={{ duration: 0.38, times: [0, 0.6, 1] }}
    >
      <svg width={size * 0.62} height={size * 0.56} viewBox="0 0 40 36" aria-hidden="true">
        <polygon points={up ? "20,2 38,34 2,34" : "2,2 38,2 20,34"} fill="var(--paper)" />
      </svg>
      <span className="tv-display tabular" style={{ fontSize: size * 0.72, lineHeight: 1 }}>
        {Math.abs(delta)}
      </span>
    </motion.span>
  );
};

/** The rank, stamped in ink on a block that overprints a pink second drum. It flips when the rank changes. */
const RankStamp = ({ rank, size, leader, live }: { rank: number | null; size: number; leader: boolean; live: boolean }) => (
  <span className="relative flex-none" style={{ width: size, height: size }} data-testid="standing-rank">
    <span aria-hidden="true" className="absolute inset-0 overprint" style={{ background: "var(--pink)", transform: "translate(6px, 6px) rotate(-4deg)" }} />
    <motion.span
      key={rank ?? "level"}
      className="absolute inset-0 flex items-center justify-center tv-display tabular"
      style={{ background: leader ? "var(--blue)" : "var(--ink)", color: "var(--paper)", fontSize: size * 0.78, lineHeight: 1, rotate: -4 }}
      initial={live ? { rotateX: 90, scale: 1.3 } : false}
      animate={{ rotateX: 0, scale: 1 }}
      transition={{ duration: 0.28, ease: [0.2, 0.9, 0.2, 1.2] }}
    >
      {rank ?? "\u2013"}
    </motion.span>
  </span>
);

const BoardRow = ({
  row,
  height,
  width,
  live,
  chips,
  counting,
  movesShown,
}: {
  row: BeatRow;
  height: number;
  width: number;
  live: boolean;
  chips: boolean;
  counting: boolean;
  movesShown: boolean;
}) => {
  const leader = movesShown && row.shownRank === 1 && row.shownScore > 0;
  const tight = height < 170;
  const nameSize = Math.max(56, Math.round(height * (tight ? 0.38 : 0.42)));
  // What is left for the name once the rank, token, move and score columns have their room.
  const gap = Math.round(height * (tight ? 0.12 : 0.16));
  const nameBox = Math.max(160, width - 68 - height * (tight ? 0.62 + 0.55 + 0.7 + 0.8 : 0.66 + 0.6 + 0.9 + 1.25) - gap * 4);
  return (
    <div
      className="relative flex items-center px-7 h-full"
      style={{
        gap,
        background: "var(--paper-2)",
        border: "6px solid var(--ink)",
        boxShadow: `9px 9px 0 ${leader ? "var(--pink)" : "var(--blue)"}`,
      }}
      data-testid={`standing-${row.id}`}
    >
      {/* The leader's row is printed through a yellow halftone screen. */}
      <motion.span
        aria-hidden="true"
        className="absolute inset-0 pointer-events-none"
        style={{ background: "radial-gradient(circle at center, var(--yellow) 62%, transparent 64%) 0 0 / 13px 13px", mixBlendMode: "multiply" }}
        initial={false}
        animate={{ opacity: leader ? 1 : 0 }}
        transition={{ duration: 0.25 }}
      />
      <RankStamp rank={row.shownRank} size={Math.round(height * (tight ? 0.62 : 0.66))} leader={leader} live={live} />
      <span className="relative">
        <InkToken name={row.name} inkIndex={row.inkIndex} size={Math.round(height * (tight ? 0.55 : 0.6))} />
      </span>
      <span className="relative flex-1 min-w-0">
        <FitName text={row.name} max={nameSize} floor={40} box={nameBox} className="tv-display" style={{ letterSpacing: "-0.015em" }} />
      </span>
      <span className="relative flex justify-center" style={{ minWidth: height * (tight ? 0.7 : 0.9) }}>
        {movesShown ? <MoveStamp delta={row.move} size={Math.round(height * 0.4)} live={live} /> : null}
      </span>
      <span className="relative flex items-center justify-end" style={{ minWidth: height * (tight ? 0.8 : 1.25) }}>
        {row.gained > 0 && live && chips ? (
          // The "+N" is stamped beside the total, then drops into it and is gone (scale to 0, never a fade).
          <motion.span
            aria-hidden="true"
            className="absolute tv-display tabular"
            style={{ right: "100%", marginRight: 16, fontSize: height * 0.34, background: "var(--pink)", color: "var(--ink)", padding: "2px 12px", border: "4px solid var(--ink)", lineHeight: 1, rotate: -6 }}
            initial={{ scale: 0 }}
            animate={counting ? { x: 110, scale: 0 } : { scale: [0, 1.25, 1] }}
            transition={counting ? { duration: 0.3, ease: "easeIn" } : { duration: 0.4 }}
          >
            +{row.gained}
          </motion.span>
        ) : null}
        <motion.span
          key={row.shownScore}
          className="tv-display tabular text-right"
          style={{ fontSize: height * 0.6, lineHeight: 1 }}
          initial={live && counting ? { y: -10, scale: 1.12 } : false}
          animate={{ y: 0, scale: 1 }}
          transition={{ duration: 0.16 }}
        >
          {row.shownScore}
        </motion.span>
      </span>
    </div>
  );
};

/** Where each row sits on the sheet: one column up to five players, two beyond. */
const placeRows = (count: number, bottom: number) => {
  const twoColumns = count > 5;
  const perColumn = twoColumns ? Math.ceil(count / 2) : Math.max(1, count);
  const columnWidth = twoColumns ? (SHEET.right - SHEET.left - COLUMN_GAP) / 2 : SHEET.right - SHEET.left;
  const height = Math.min(twoColumns ? 150 : 190, Math.floor((bottom - SHEET.top - (perColumn - 1) * ROW_GAP) / perColumn));
  const at = (index: number) => {
    const column = Math.floor(index / perColumn);
    const slot = index % perColumn;
    return { left: SHEET.left + column * (columnWidth + COLUMN_GAP), top: SHEET.top + slot * (height + ROW_GAP) };
  };
  return { columnWidth, height, at };
};

/** Between questions: the full-screen standings beat. Points count into the totals while the rows re-sort. */
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
  const ticks = useMemo(() => countTicks(rows), [rows]);
  const [progress, setProgress] = useState<number>(live ? 0 : 1);
  const [chips, setChips] = useState(!live);
  const [counting, setCounting] = useState(!live);
  const [settled, setSettled] = useState(!live);
  const [movesShown, setMovesShown] = useState(!live);
  useEffect(() => {
    if (!live) return;
    const timers = [
      setTimeout(() => setChips(true), CHIPS_AT),
      setTimeout(() => setCounting(true), COUNT_AT),
      // Ticks come quickly, then slow into the final totals.
      ...ticks.map((p, i) => setTimeout(() => setProgress(p), COUNT_AT + 120 + COUNT_MS * Math.pow((i + 1) / ticks.length, 1.5))),
      setTimeout(() => setSettled(true), SETTLE_AT),
      setTimeout(() => setMovesShown(true), MOVES_AT),
    ];
    return () => timers.forEach(clearTimeout);
  }, [live, ticks]);
  const frame = standingsBeat(rows, { progress, settled }).slice(0, 10);
  const card = frame.length <= CARD_ROWS;
  const { columnWidth, height, at } = placeRows(frame.length, card ? SHEET.bottom - CARD_BAND : SHEET.bottom);
  const isLast = total > 0 && afterNumber >= total;
  const cardTop = SHEET.top + frame.length * height + (frame.length - 1) * ROW_GAP + 44;
  return (
    <div className="absolute inset-0">
      <div className="absolute flex items-end justify-between" style={{ left: 96, right: 96, top: 44 }}>
        <div>
          <Slug className="text-ink mb-3">
            After question {afterNumber}
            {total > 0 ? ` of ${total}` : ""}
          </Slug>
          <h2 className="tv-display" style={{ fontSize: 132 }}>
            <RisoType top="var(--ink)" under="var(--pink)" offset={6}>
              Standings
            </RisoType>
          </h2>
        </div>
        {card ? null : (
          <div className="flex flex-col items-end pb-2">
            <Slug className="text-blue mb-3">{isLast ? "That was the last question" : "Up next"}</Slug>
            {isLast ? null : (
              <span className="tv-display" style={{ fontSize: 88, lineHeight: 1 }}>
                Question {afterNumber + 1}
              </span>
            )}
          </div>
        )}
      </div>
      {frame.map((row) => {
        const pos = at(row.slot);
        return (
          <motion.div
            key={row.id}
            className="absolute"
            style={{ width: columnWidth, height, zIndex: 20 - row.slot }}
            initial={false}
            animate={{ left: pos.left, top: pos.top }}
            transition={{ type: "spring", stiffness: 260, damping: 20, mass: 0.9 }}
          >
            <BoardRow row={row} height={height} width={columnWidth} live={live} chips={chips} counting={counting} movesShown={movesShown} />
          </motion.div>
        );
      })}
      {card ? <UpNextCard top={cardTop} bottom={SHEET.bottom} next={afterNumber + 1} total={total} isLast={isLast} live={live} /> : null}
    </div>
  );
};

/** The lower band between questions: a printed ink card announcing what comes next. */
const UpNextCard = ({ top, bottom, next, total, isLast, live }: { top: number; bottom: number; next: number; total: number; isLast: boolean; live: boolean }) => {
  const height = Math.min(260, bottom - top);
  return (
    <motion.div
      className="absolute flex items-center gap-12"
      style={{ left: 96, right: 96, top: bottom - height, height, background: "var(--ink)", color: "var(--paper)", padding: "0 56px", boxShadow: "12px 12px 0 var(--pink)" }}
      initial={live ? { x: 1900 } : false}
      animate={{ x: 0 }}
      transition={{ delay: live ? (MOVES_AT + 500) / 1000 : 0, duration: 0.55, ease: [0.2, 0.9, 0.2, 1.1] }}
      data-testid="tv-up-next"
    >
      <span className="slug" style={{ fontSize: 40, color: "var(--yellow)", lineHeight: 1 }}>
        {isLast ? "That was the last question" : "Up next"}
      </span>
      <span className="tv-display flex-1" style={{ fontSize: Math.min(140, height * 0.62), lineHeight: 1.05 }}>
        {isLast ? "Final scores" : `Question ${next}`}
      </span>
      {!isLast && total > 0 ? (
        <span className="slug" style={{ fontSize: 40, lineHeight: 1 }}>
          of {total}
        </span>
      ) : null}
    </motion.div>
  );
};
