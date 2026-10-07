import { motion } from "framer-motion";
import type { ReactNode } from "react";
import { finishMargin } from "./competitive";
import { FinalScores, Winner, byScore } from "./FinalScores";
import { finishStamp, ordinal } from "./outcome";
import { PhoneShell } from "./PhoneShell";

type Person = { id: string; name: string; score: number };

/** Game over, from a player's seat: their place in glow, then the table. */
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
  const margin = finishMargin(ranked, me.id);

  return (
    <PhoneShell className="pb-8">
      <div className="mx-auto w-full max-w-5xl px-4 pt-6">
        <div className="grid grid-cols-1 gap-6">
          <div className="flex flex-col items-center gap-3">
            <h1
              className="lav-text font-extrabold leading-none"
              style={{ fontSize: "clamp(32px, 6dvh, 56px)", letterSpacing: "-0.02em" }}
            >
              Game Over!
            </h1>
            <motion.div
              className="flex flex-col items-center"
              initial={{ scale: 1.4, opacity: 0 }}
              animate={{ scale: [1.4, 0.97, 1], opacity: 1 }}
              transition={{
                scale: { duration: 0.5, times: [0, 0.7, 1], ease: "easeOut" },
                opacity: { duration: 0.1 },
              }}
            >
              <span
                className="tabular glow-text font-extrabold leading-none"
                style={{ fontSize: "clamp(88px, min(22dvh, 34vw), 200px)", letterSpacing: "-0.04em" }}
                data-testid="my-place"
                aria-label={`You finished ${ordinal(place)}`}
              >
                {ordinal(place)}
              </span>
            </motion.div>
            <motion.div
              className="pstat"
              style={{ fontSize: "clamp(24px, 4.4dvh, 36px)", minWidth: 0, padding: "0.1em 0.45em", whiteSpace: "nowrap" }}
              initial={{ scale: 1.6, opacity: 0 }}
              animate={{ scale: [1.6, 0.96, 1], opacity: 1 }}
              transition={{
                delay: 0.45,
                scale: { duration: 0.4, times: [0, 0.7, 1], ease: "easeOut" },
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
                className="tabular glow-text font-extrabold leading-none"
                style={{ fontSize: "clamp(56px, 13dvh, 120px)" }}
              >
                {me.score}
              </span>
              <span className="label-caps text-xl">points</span>
            </div>
            {margin && (
              <p className="text-xl font-bold text-gray-200" data-testid="finish-margin">
                {margin}
              </p>
            )}
            {winner && <Winner winner={winner} large />}
            {action}
          </div>
          <FinalScores players={players} highlightPlayerId={me.id} />
        </div>
      </div>
    </PhoneShell>
  );
};
