import { motion, useReducedMotion } from "framer-motion";
import { useEffect, useMemo, useState } from "react";
import type { Question, QuestionResult } from "~/game.types";
import { TvReveal } from "./reveal";
import { TvStandingsBoard } from "./standings-board";
import { buildStandings, revealSchedule } from "./tv-model";

/** How long the settled reveal holds before the standings board takes over. */
const HOLD_MS = 3000;
/** The reveal clears fully before the board lands: no two layers on screen at once. */
const CLEAR_MS = 280;

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
  const [showBoard, setShowBoard] = useState(false);
  const [boardOnly, setBoardOnly] = useState(false);
  useEffect(() => {
    const show = setTimeout(() => setShowBoard(true), revealMs + HOLD_MS);
    const drop = setTimeout(() => setBoardOnly(true), revealMs + HOLD_MS + CLEAR_MS);
    return () => {
      clearTimeout(show);
      clearTimeout(drop);
    };
  }, [revealMs]);
  const rows = useMemo(() => buildStandings(players, result.scores), [players, result.scores]);
  return (
    <>
      {boardOnly ? null : (
        <motion.div className="absolute inset-0" animate={{ opacity: showBoard ? 0 : 1 }} transition={{ duration: CLEAR_MS / 1000 }}>
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
      {boardOnly ? <TvStandingsBoard rows={rows} afterNumber={result.questionNumber} total={total} live={live} /> : null}
    </>
  );
};
