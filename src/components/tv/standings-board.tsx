import { motion } from "framer-motion";
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { EASE_OUT, GlassToken, Label } from "./glass";
import { FitName } from "./fit-name";
import { popIn } from "./motion-presets";
import { BOARD, type BoardChips, type BoardRowFrame, boardFrame, boardTicks } from "./standings-choreo";
import type { StandingRow } from "./tv-model";
import { boardPrint, type PrintedRow } from "./board-print";

/**
 * The standings beat: the board opens on the PREVIOUS order, totals and ranks; each "+N" chip pops beside
 * its total, then flies into it as the totals roll (rows held still); then the rows reorder ONCE (a 450 ms
 * slide) with the new ranks; then the move pills land, the leader pulses, and the settled board holds
 * >= 2 s before "Up next". Every frame comes from `boardFrame` (standings-choreo.ts).
 */

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
      {...(live ? popIn({ delay: 0 }) : { initial: false as const })}
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

/** The rank numeral in a round glass well; amber for the leader. It re-stamps when the rank changes. Empty on a level start. */
const RankStamp = ({ rank, size, leader, live }: { rank: number | null; size: number; leader: boolean; live: boolean }) => (
  <span className="relative flex-none" style={{ width: size, height: size }} data-testid="standing-rank">
    <motion.span
      key={rank ?? "open"}
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
      // The new rank lands with the reorder: a quick scale-down from bright (never an edge-on flip, which reads as a dash).
      initial={live && rank !== null ? { transform: "scale(1.35)", opacity: 0 } : false}
      animate={{ transform: "scale(1)", opacity: 1 }}
      transition={{ duration: 0.3, ease: EASE_OUT }}
    >
      {rank}
    </motion.span>
  </span>
);

const BoardRow = ({
  row,
  height,
  width,
  live,
  chips,
  movesShown,
  leader,
  printed,
}: {
  row: BoardRowFrame;
  /** What the row prints this frame (no zero-state on a level start). */
  printed: PrintedRow;
  height: number;
  width: number;
  live: boolean;
  chips: BoardChips;
  movesShown: boolean;
  /** The settled leader: amber, with a slow pulse while the board holds. */
  leader: boolean;
}) => {
  const counting = chips === "flying";
  const tight = height < 170;
  const nameSize = Math.max(56, Math.round(height * (tight ? 0.38 : 0.42)));
  // What is left for the name once the rank, token, move and score columns have their room.
  const gap = Math.round(height * (tight ? 0.12 : 0.16));
  const nameBox = Math.max(160, width - 68 - height * (tight ? 0.62 + 0.55 + 0.7 + 0.8 : 0.66 + 0.6 + 0.9 + 1.25) - gap * 4);
  return (
    <div
      className={`relative flex items-center px-7 h-full tv-glass${leader ? " tv-leader-pulse" : ""}`}
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
      <RankStamp rank={printed.rank} size={Math.round(height * (tight ? 0.62 : 0.66))} leader={leader} live={live} />
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
        {row.gained > 0 && live && chips !== "none" ? (
          // The "+N" pops in beside the total, then flies into it and is gone (scale to 0, never a fade).
          <motion.span
            aria-hidden="true"
            className="absolute tv-pill tv-pill--lav"
            style={{ right: "100%", marginRight: 16, fontSize: height * 0.3, padding: "6px 16px" }}
            {...(counting
              ? { animate: { transform: "translateX(130px) scale(0)", opacity: 1 }, transition: { duration: 0.32, ease: [0.5, 0, 0.9, 0.4] } }
              : popIn({ delay: 0 }))}
          >
            +{row.gained}
          </motion.span>
        ) : null}
        {printed.score === null ? null : (
        <motion.span
          key={printed.score}
          className="tv-display tv-hero text-right"
          style={{ fontSize: height * 0.56, lineHeight: 1, color: leader ? "var(--close)" : "var(--text)" }}
          initial={live && counting ? { y: -10, scale: 1.12 } : false}
          animate={{ y: 0, scale: 1 }}
          transition={{ duration: 0.16 }}
        >
          {printed.score}
        </motion.span>
        )}
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

/** The board's clock: ms since it appeared, stepped at the moments the frame changes. A late TV starts settled. */
const useBoardClock = (live: boolean, rows: ReadonlyArray<StandingRow>) => {
  const ticks = useMemo(() => boardTicks(rows), [rows]);
  const [t, setT] = useState<number>(live ? 0 : Number.POSITIVE_INFINITY);
  useEffect(() => {
    if (!live) return;
    const timers = ticks.map((at) => setTimeout(() => setT(at), at));
    return () => timers.forEach(clearTimeout);
  }, [live, ticks]);
  return t;
};

/** Between questions: the full-screen standings beat. Points fly into the totals, then the rows re-sort once. */
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
  const t = useBoardClock(live, rows);
  const frame = boardFrame(rows, t);
  const printed = new Map(boardPrint(rows, frame, t).map((p) => [p.id, p]));
  const shown = frame.rows.filter((r) => r.slot < 10);
  const card = shown.length <= CARD_ROWS;
  const { columnWidth, height, at } = placeRows(shown.length, card ? SHEET.bottom - CARD_BAND : SHEET.bottom);
  const isLast = total > 0 && afterNumber >= total;
  const cardTop = SHEET.top + shown.length * height + (shown.length - 1) * ROW_GAP + 44;
  return (
    <div className="absolute inset-0">
      <div className="absolute flex items-end justify-between" style={{ left: 96, right: 96, top: 44 }}>
        <motion.div initial={live ? { opacity: 0, y: 18 } : false} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, ease: EASE_OUT }}>
          <Label className="mb-3">
            After question {afterNumber}
            {total > 0 ? ` of ${total}` : ""}
          </Label>
          <h2 className="tv-display tv-hero lav-text" style={{ fontSize: 132, letterSpacing: "-0.04em", lineHeight: 1, paddingBottom: 10 }}>
            Standings
          </h2>
        </motion.div>
        {card || !frame.upNext ? null : (
          <motion.div
            className="flex flex-col items-end pb-2"
            initial={live ? { opacity: 0, transform: "translateY(20px)" } : false}
            animate={{ opacity: 1, transform: "translateY(0px)" }}
            transition={{ duration: 0.45, ease: EASE_OUT }}
          >
            <Label className="mb-3">{isLast ? "That was the last question" : "Up next"}</Label>
            {isLast ? null : (
              <span className="tv-display" style={{ fontSize: 88, lineHeight: 1, color: "var(--text)" }}>
                Question {afterNumber + 1}
              </span>
            )}
          </motion.div>
        )}
      </div>
      {shown.map((row) => {
        const pos = at(row.slot);
        return (
          // Every row sits at the sheet's origin and slides by one transform: the reorder is a single
          // 450 ms tween run by the compositor, never a spring a busy frame can skip.
          <motion.div
            key={row.id}
            className="absolute"
            style={{ left: SHEET.left, top: SHEET.top, width: columnWidth, height, zIndex: 20 - row.slot }}
            initial={false}
            animate={{ transform: `translate(${pos.left - SHEET.left}px, ${pos.top - SHEET.top}px)` }}
            transition={{ duration: BOARD.reorderMs / 1000, ease: EASE_OUT }}
          >
            {/* The glass rows rise onto the bare aurora (the takeover has already gone). */}
            <motion.div
              className="h-full"
              initial={live ? { opacity: 0, transform: "translateY(28px)" } : false}
              animate={{ opacity: 1, transform: "translateY(0px)" }}
              transition={{ duration: 0.3, delay: live ? Math.min(0.2, 0.05 + row.slot * 0.04) : 0, ease: EASE_OUT }}
            >
            <BoardRow
              printed={printed.get(row.id) ?? { id: row.id, rank: row.shownRank, score: row.shownScore }}
              row={row}
              height={height}
              width={columnWidth}
              live={live}
              chips={frame.chips}
              movesShown={frame.movesShown}
              leader={frame.leaderPulse && row.shownRank === 1}
            />
            </motion.div>
          </motion.div>
        );
      })}
      {card && frame.upNext ? <UpNextCard top={cardTop} bottom={SHEET.bottom} next={afterNumber + 1} total={total} isLast={isLast} live={live} /> : null}
    </div>
  );
};

/** The lower band between questions: a bright glass card announcing what comes next. */
const UpNextCard = ({ top, bottom, next, total, isLast, live }: { top: number; bottom: number; next: number; total: number; isLast: boolean; live: boolean }) => {
  const height = Math.min(260, bottom - top);
  const slot = useRef<HTMLSpanElement>(null);
  const [slotWidth, setSlotWidth] = useState(0);
  // The slot's layout width is in stage px (offsetWidth ignores the stage's scale).
  useLayoutEffect(() => setSlotWidth(slot.current?.offsetWidth ?? 0), [isLast, next, total]);
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
      transition={{ duration: 0.5, ease: EASE_OUT }}
      data-testid="tv-up-next"
    >
      <span className="tv-label" style={{ fontSize: 40, color: "var(--glow)", lineHeight: 1 }}>
        {isLast ? "That was the last question" : "Up next"}
      </span>
      {/* The headline takes the room the label leaves, on one line: shrunk to fit, never wrapped out of the card. */}
      <span ref={slot} className="flex-1 min-w-0">
        <FitName
          text={isLast ? "Final scores" : `Question ${next}`}
          max={Math.min(140, height * 0.62)}
          floor={1}
          box={slotWidth}
          lineHeight={1.05}
          className="tv-display tv-hero glow-text"
          style={{ letterSpacing: "-0.04em", paddingBottom: 8 }}
        />
      </span>
      {!isLast && total > 0 ? (
        <span className="tv-label" style={{ fontSize: 40, lineHeight: 1, color: "var(--text-2)" }}>
          of {total}
        </span>
      ) : null}
    </motion.div>
  );
};
