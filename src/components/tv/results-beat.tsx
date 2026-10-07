import { motion, useReducedMotion } from "framer-motion";
import { useEffect, useMemo, useState } from "react";
import type { Question, QuestionResult } from "~/game.types";
import { EASE_OUT } from "./glass";
import { TvReveal } from "./reveal";
import { TvStandingsBoard } from "./standings-board";
import { buildStandings, revealSchedule } from "./tv-model";

/**
 * How long the settled reveal (with the misses strip) holds before the standings board takes over.
 * Short, so the board's reorder lands early: the host's Next unlocks at the reveal's `end`.
 */
export const HOLD_MS = 1600;
/** How long the takeover takes to leave: it blurs and fades fully to 0 over this long. */
export const LEAVE_MS = 400;

/**
 * The hand-off from the takeover to the standings, ms after the results arrive (live). The takeover
 * starts leaving at `leaveAt` (its fade is front-loaded); just after, the board mounts and its glass rows
 * rise as the takeover blurs away (`boardAt`, where the board's BOARD beats count from), so the stage is
 * never empty; the takeover is gone at `goneAt`. The two never sit fully overlapped at full strength.
 */
export const beatTimeline = (revealEnd: number): { leaveAt: number; boardAt: number; goneAt: number } => {
  const goneAt = revealEnd + HOLD_MS;
  const leaveAt = goneAt - LEAVE_MS;
  return { leaveAt, boardAt: leaveAt + LEAVE_MS / 8, goneAt };
};

/** After a question: the staged reveal, then the big standings board until the next question. */
export const TvResultsBeat = ({
  question,
  result,
  players,
  total,
  live,
}: {
  question: Question;
  result: QuestionResult;
  players: Array<{ id: string; name: string; score: number }>;
  total: number;
  live: boolean;
}) => {
  const reduced = useReducedMotion() ?? false;
  const revealMs = live ? revealSchedule(result.answers.length, reduced).end : 0;
  const [leaving, setLeaving] = useState(false);
  const [showBoard, setShowBoard] = useState(false);
  const [gone, setGone] = useState(false);
  useEffect(() => {
    const t = beatTimeline(revealMs);
    const timers = [
      setTimeout(() => setLeaving(true), Math.max(0, t.leaveAt)),
      setTimeout(() => setShowBoard(true), Math.max(0, t.boardAt)),
      setTimeout(() => setGone(true), Math.max(0, t.goneAt)),
    ];
    return () => timers.forEach(clearTimeout);
  }, [revealMs]);
  const rows = useMemo(() => buildStandings(players, result.scores), [players, result.scores]);
  return (
    <>
      {gone ? null : (
        <motion.div
          className="absolute inset-0"
          initial={false}
          animate={leaving ? { opacity: 0, filter: "blur(18px)", scale: 0.97 } : { opacity: 1, filter: "blur(0px)", scale: 1 }}
          transition={{ duration: LEAVE_MS / 1000, ease: EASE_OUT }}
        >
          <TvReveal
            question={question}
            result={result}
            players={players}
            number={result.questionNumber}
            total={total}
            live={live}
          />
        </motion.div>
      )}
      {showBoard ? <TvStandingsBoard rows={rows} afterNumber={result.questionNumber} total={total} live={live} /> : null}
    </>
  );
};
