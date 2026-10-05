import { motion } from "framer-motion";
import type { ReactNode } from "react";
import { FinalScores, Winner, byScore } from "./FinalScores";
import { finishStamp, ordinal } from "./outcome";
import { PhoneShell } from "./PhoneShell";

type Person = { id: string; name: string; score: number };

/** Game over, from a player's seat: their place, printed, then the table. */
export const PlayerFinish = ({
  me,
  players,
  action,
}: {
  me: Person;
  players: Person[];
  action?: ReactNode;
}) => {
  const ranked = byScore(players);
  const place = Math.max(1, ranked.findIndex((p) => p.id === me.id) + 1);
  const winner = ranked[0];

  return (
    <PhoneShell className="pb-8">
      <div className="mx-auto w-full max-w-5xl px-4 pt-6">
        <div className="grid grid-cols-1 gap-6 landscape:grid-cols-2 landscape:items-start">
          <div className="flex flex-col items-center gap-3 landscape:sticky landscape:top-4">
            <h1
              className="font-display font-extrabold leading-none"
              style={{ fontSize: "clamp(32px, 6dvh, 56px)", letterSpacing: "-0.02em" }}
            >
              Game Over!
            </h1>
            <motion.div
              className="flex flex-col items-center"
              initial={{ scale: 1.5, rotate: -10, opacity: 0 }}
              animate={{ scale: [1.5, 0.96, 1], rotate: -3, opacity: 1 }}
              transition={{
                scale: { duration: 0.5, times: [0, 0.7, 1], ease: "easeOut" },
                rotate: { duration: 0.5, ease: "easeOut" },
                opacity: { duration: 0.1 },
              }}
            >
              <span
                className="tabular font-display font-extrabold leading-none misreg"
                style={{ fontSize: "clamp(100px, min(30dvh, 34vw), 260px)", letterSpacing: "-0.04em" }}
                data-testid="my-place"
                aria-label={`You finished ${ordinal(place)}`}
              >
                {ordinal(place)}
              </span>
            </motion.div>
            <motion.div
              className="pstat bg-pink text-ink"
              style={{ fontSize: "clamp(30px, 6.4dvh, 56px)", minWidth: 0, padding: "0.1em 0.45em" }}
              initial={{ scale: 2, rotate: 12, opacity: 0 }}
              animate={{ scale: [2, 0.92, 1], rotate: 3, opacity: 1 }}
              transition={{
                delay: 0.45,
                scale: { duration: 0.4, times: [0, 0.7, 1], ease: "easeOut" },
                rotate: { duration: 0.4, ease: "easeOut" },
                opacity: { duration: 0.1 },
              }}
              data-testid="finish-stamp"
            >
              {finishStamp(place)}
            </motion.div>
            <div
              className="flex items-baseline gap-3"
              aria-label={`${me.score} points`}
              data-testid="my-final-points"
            >
              <span
                className="tabular font-display font-extrabold leading-none"
                style={{ fontSize: "clamp(56px, 13dvh, 120px)" }}
              >
                {me.score}
              </span>
              <span className="font-display text-2xl font-extrabold uppercase">points</span>
            </div>
            {winner && <Winner winner={winner} large />}
            {action}
          </div>
          <FinalScores players={players} highlightPlayerId={me.id} />
        </div>
      </div>
    </PhoneShell>
  );
};
