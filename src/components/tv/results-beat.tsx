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
/**
 * The takeover leaves before the board arrives: it blurs and fades fully to 0 over this long, ending
 * exactly as the board's glass rows start to rise onto the bare aurora (never two translucent layers).
 */
export const LEAVE_MS = 400;

/** When the standings board appears, ms after the results arrive (live): the board's BOARD beats count from here. */
export const boardAt = (revealEnd: number) => revealEnd + HOLD_MS;

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
  useEffect(() => {
    const leave = setTimeout(() => setLeaving(true), Math.max(0, boardAt(revealMs) - LEAVE_MS));
    const show = setTimeout(() => setShowBoard(true), boardAt(revealMs));
    return () => {
      clearTimeout(leave);
      clearTimeout(show);
    };
  }, [revealMs]);
  const rows = useMemo(() => buildStandings(players, result.scores), [players, result.scores]);
  return (
    <>
      {showBoard ? null : (
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
