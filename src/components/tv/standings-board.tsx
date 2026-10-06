import { motion } from "framer-motion";
import { useEffect, useMemo, useState } from "react";
import { EASE_OUT, EASE_POP, GlassToken, Label } from "./glass";
import { FitName } from "./fit-name";
import { type BeatRow, standingsBeat } from "./standings-beat";
import { countTicks } from "./standings-frame";
import type { StandingRow } from "./tv-model";

/**
 * The standings beat (~3.5 s, then a settled hold): the board fades in showing the PREVIOUS order and
 * totals (after question 1: everyone on 0 in join order, no rank numerals); each "+N" chip is stamped on its
 * row, then drops into the total as the totals roll (rows held still); then the rows reorder ONCE with a
 * slide and the true ranks land; then the up/down pills pop in. Every frame comes from `standingsBeat`.
 */
const CHIPS_AT = 500;
const COUNT_AT = 1100;
const COUNT_MS = 1200;
const SETTLE_AT = 2700;
const MOVES_AT = 3300;

const SHEET = { left: 96, right: 1824, top: 236, bottom: 1040 };
/** Up to this many rows, the lower band is the "Up next" card instead of empty space. */
const CARD_ROWS = 3;
const CARD_BAND = 230;
const ROW_GAP = 18;
const COLUMN_GAP = 40;

/** A "moved" pill: a small triangle and the number of places, green up, muted glass down. */
const MoveStamp = ({ delta, size, live }: { delta: number; size: number; live: boolean }) => {
  if (delta === 0) return null;
  const up = delta > 0;
  return (
    <motion.span
      className={`tv-pill ${up ? "tv-pill--win" : "tv-pill--glass"} gap-2`}
      style={{ padding: "8px 18px 8px 14px", fontSize: size * 0.72 }}
      aria-label={up ? `up ${delta}` : `down ${-delta}`}
      data-testid="standing-move"
      initial={live ? { scale: 0.3, opacity: 0 } : false}
      animate={{ scale: [0.3, 1.12, 1], opacity: 1 }}
      transition={{ duration: 0.4, times: [0, 0.6, 1], ease: EASE_POP }}
    >
      <svg width={size * 0.5} height={size * 0.45} viewBox="0 0 40 36" aria-hidden="true">
        <polygon points={up ? "20,2 38,34 2,34" : "2,2 38,2 20,34"} fill="currentColor" />
      </svg>
      <span className="tv-display" style={{ lineHeight: 1 }}>
        {Math.abs(delta)}
      </span>
    </motion.span>
  );
};

/** The rank numeral in a round glass well; amber for the leader. It flips when the rank changes. */
const RankStamp = ({ rank, size, leader, live }: { rank: number | null; size: number; leader: boolean; live: boolean }) => (
  <span className="relative flex-none" style={{ width: size, height: size }} data-testid="standing-rank">
    <motion.span
      key={rank ?? "level"}
      className="absolute inset-0 flex items-center justify-center tv-display"
      style={{
        borderRadius: 999,
        background: leader ? "var(--close)" : "rgba(255, 255, 255, 0.08)",
        border: leader ? "none" : "2px solid var(--glass-edge)",
        color: leader ? "#3b1d03" : "var(--text-2)",
        boxShadow: leader ? "0 0 36px rgba(251, 191, 36, 0.5)" : undefined,
        fontSize: size * 0.56,
        lineHeight: 1,
      }}
      initial={live ? { rotateX: 90, scale: 1.2 } : false}
      animate={{ rotateX: 0, scale: 1 }}
      transition={{ duration: 0.3, ease: EASE_OUT }}
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
      className="relative flex items-center px-7 h-full tv-glass"
      style={{
        gap,
        borderRadius: Math.min(32, height * 0.22),
        background: leader ? "linear-gradient(90deg, rgba(251, 191, 36, 0.16), rgba(251, 191, 36, 0.06)), rgba(11, 15, 26, 0.4)" : undefined,
        borderColor: leader ? "rgba(251, 191, 36, 0.55)" : undefined,
        boxShadow: leader ? "0 0 50px rgba(251, 191, 36, 0.18)" : undefined,
        transition: "background .3s, border-color .3s, box-shadow .3s",
      }}
      data-testid={`standing-${row.id}`}
    >
      <RankStamp rank={row.shownRank} size={Math.round(height * (tight ? 0.62 : 0.66))} leader={leader} live={live} />
      <span className="relative">
        <GlassToken name={row.name} inkIndex={row.inkIndex} size={Math.round(height * (tight ? 0.55 : 0.6))} />
      </span>
      <span className="relative flex-1 min-w-0">
        <FitName text={row.name} max={nameSize} floor={40} box={nameBox} className="tv-name" style={{ fontWeight: 800 }} />
      </span>
      <span className="relative flex justify-center" style={{ minWidth: height * (tight ? 0.7 : 0.9) }}>
        {movesShown ? <MoveStamp delta={row.move} size={Math.round(height * 0.4)} live={live} /> : null}
      </span>
      <span className="relative flex items-center justify-end" style={{ minWidth: height * (tight ? 0.8 : 1.25) }}>
        {row.gained > 0 && live && chips ? (
          // The "+N" pops in beside the total, then drops into it and is gone (scale to 0, never a fade).
          <motion.span
            aria-hidden="true"
            className="absolute tv-pill tv-pill--lav"
            style={{ right: "100%", marginRight: 16, fontSize: height * 0.3, padding: "6px 16px" }}
            initial={{ scale: 0 }}
            animate={counting ? { x: 110, scale: 0 } : { scale: [0, 1.15, 1] }}
            transition={counting ? { duration: 0.3, ease: "easeIn" } : { duration: 0.4, ease: EASE_POP }}
          >
            +{row.gained}
          </motion.span>
        ) : null}
        <motion.span
          key={row.shownScore}
          className="tv-display text-right"
          style={{ fontSize: height * 0.56, lineHeight: 1, color: leader ? "var(--close)" : "var(--text)" }}
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
          <Label className="mb-3">
            After question {afterNumber}
            {total > 0 ? ` of ${total}` : ""}
          </Label>
          <h2 className="tv-display lav-text" style={{ fontSize: 132, letterSpacing: "-0.04em", lineHeight: 1, paddingBottom: 10 }}>
            Standings
          </h2>
        </div>
        {card ? null : (
          <div className="flex flex-col items-end pb-2">
            <Label className="mb-3">{isLast ? "That was the last question" : "Up next"}</Label>
            {isLast ? null : (
              <span className="tv-display" style={{ fontSize: 88, lineHeight: 1, color: "var(--text)" }}>
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

/** The lower band between questions: a bright glass card announcing what comes next. */
const UpNextCard = ({ top, bottom, next, total, isLast, live }: { top: number; bottom: number; next: number; total: number; isLast: boolean; live: boolean }) => {
  const height = Math.min(260, bottom - top);
  return (
    <motion.div
      className="absolute flex items-center gap-12 tv-glass"
      style={{
        left: 96,
        right: 96,
        top: bottom - height,
        height,
        padding: "0 56px",
        borderRadius: 36,
        background: "linear-gradient(100deg, rgba(99, 102, 241, 0.42), rgba(168, 85, 247, 0.32)), rgba(11, 15, 26, 0.45)",
        borderColor: "rgba(196, 181, 253, 0.45)",
        boxShadow: "0 0 80px rgba(139, 92, 246, 0.35)",
      }}
      initial={live ? { opacity: 0, y: 30 } : false}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: live ? (MOVES_AT + 500) / 1000 : 0, duration: 0.5, ease: EASE_OUT }}
      data-testid="tv-up-next"
    >
      <span className="tv-label" style={{ fontSize: 40, color: "var(--glow)", lineHeight: 1 }}>
        {isLast ? "That was the last question" : "Up next"}
      </span>
      <span className="tv-display flex-1 glow-text" style={{ fontSize: Math.min(140, height * 0.62), lineHeight: 1.05, letterSpacing: "-0.04em", paddingBottom: 8 }}>
        {isLast ? "Final scores" : `Question ${next}`}
      </span>
      {!isLast && total > 0 ? (
        <span className="tv-label" style={{ fontSize: 40, lineHeight: 1, color: "var(--text-2)" }}>
          of {total}
        </span>
      ) : null}
    </motion.div>
  );
};
