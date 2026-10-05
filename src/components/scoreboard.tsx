import { motion } from "framer-motion";
import { GameContext } from "../game.context";
import { SessionContext } from "../session.context";
import { FinalScores, byScore } from "./phone/FinalScores";
import { PhoneShell } from "./phone/PhoneShell";
import { ordinal } from "./phone/outcome";

/** Standings, printed: your place up top, the full table below. */
export function Scoreboard() {
  const players = GameContext.useSelector((state) => state.public.players);
  const userId = SessionContext.useSelector((state) => state.public.userId);

  const ranked = byScore(players);
  const currentPlayer = players.find((p) => p.id === userId);
  const currentPlayerRank = ranked.findIndex((p) => p.id === userId) + 1;

  return (
    <PhoneShell className="px-4 pb-10 pt-6">
      <div className="mx-auto w-full max-w-xl">
        <h1 className="misreg mb-6 text-5xl font-extrabold">Leaderboard</h1>

        {currentPlayer && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            className="sheet sheet-pink mb-6 px-4 py-4 text-center"
          >
            <p className="pslug">Your Position</p>
            <div className="tabular text-5xl font-extrabold leading-none">
              {ordinal(currentPlayerRank)}
            </div>
            <p className="pslug mt-2">
              #{currentPlayerRank} of {ranked.length} - {currentPlayer.score} points
            </p>
          </motion.div>
        )}

        <FinalScores players={players} highlightPlayerId={userId} title="Standings" />
      </div>
    </PhoneShell>
  );
}
