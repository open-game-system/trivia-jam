import { motion } from "framer-motion";
import type { ReactNode } from "react";
import { FinalScores, Winner, byScore } from "./FinalScores";
import { ordinal } from "./outcome";
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
          <div className="flex flex-col items-center gap-4 landscape:sticky landscape:top-6">
            <h1 className="pslug" style={{ fontSize: 18 }}>
              Game Over!
            </h1>
            <motion.div
              className="sheet sheet-pink flex flex-col items-center px-6 py-5"
              initial={{ scale: 1.5, rotate: -10, opacity: 0 }}
              animate={{ scale: [1.5, 0.96, 1], rotate: -3, opacity: 1 }}
              transition={{ duration: 0.5, times: [0, 0.7, 1], ease: "easeOut" }}
            >
              <span className="pslug">You finished</span>
              <span
                className="tabular font-display font-extrabold leading-none misreg"
                style={{ fontSize: "clamp(88px, 22dvh, 190px)" }}
                data-testid="my-place"
              >
                {ordinal(place)}
              </span>
              <span className="pslug">
                {me.score} pts - {players.length} players
              </span>
            </motion.div>
            {winner && <Winner winner={winner} />}
            {action}
          </div>
          <FinalScores players={players} highlightPlayerId={me.id} />
        </div>
      </div>
    </PhoneShell>
  );
};
