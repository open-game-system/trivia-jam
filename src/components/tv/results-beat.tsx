import { useReducedMotion } from "framer-motion";
import { useEffect, useMemo, useState } from "react";
import type { Question, QuestionResult } from "~/game.types";
import { SheetIn } from "./glass";
import { TvReveal } from "./reveal";
import { TvStandingsBoard } from "./standings-board";
import { buildStandings, revealSchedule } from "./tv-model";

/** How long the settled reveal holds before the standings board takes over. */
const HOLD_MS = 2400;
/** The board fades and rises in on an opaque layer over the reveal (never seen through); then the reveal is dropped. */
const WIPE_MS = 450;

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
    const drop = setTimeout(() => setBoardOnly(true), revealMs + HOLD_MS + WIPE_MS + 60);
    return () => {
      clearTimeout(show);
      clearTimeout(drop);
    };
  }, [revealMs]);
  const rows = useMemo(() => buildStandings(players, result.scores), [players, result.scores]);
  return (
    <>
      {boardOnly ? null : (
        <div className="absolute inset-0">
          <TvReveal
            question={question}
            result={result}
            players={players}
            number={result.questionNumber}
            total={total}
            live={live}
          />
        </div>
      )}
      {showBoard ? (
        <SheetIn live={!boardOnly} duration={WIPE_MS / 1000} zIndex={80}>
          <TvStandingsBoard rows={rows} afterNumber={result.questionNumber} total={total} live={live} />
        </SheetIn>
      ) : null}
    </>
  );
};
