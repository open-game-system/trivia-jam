import { motion } from "framer-motion";
import { PlayerToken, RankDisc } from "./ink";

type Person = { id: string; name: string; score: number };

export const byScore = (players: Person[]) =>
  [...players].sort((a, b) => b.score - a.score);

export const Winner = ({ winner }: { winner: Person }) => (
  <div data-testid="winner-announcement" className="text-center">
    <h2
      className="font-display font-extrabold text-ink"
      style={{ fontSize: "clamp(26px, 5dvh, 44px)", lineHeight: 1.05, letterSpacing: "-0.02em" }}
    >
      {winner.name} Wins!
    </h2>
    <p className="pslug mt-1" style={{ fontSize: 16 }}>
      with {winner.score} points
    </p>
  </div>
);

export const FinalScores = ({
  players,
  highlightPlayerId,
  title = "Final Scores",
}: {
  players: Person[];
  highlightPlayerId?: string;
  title?: string;
}) => (
  <section>
    <h2
      className="pslug mb-3"
      style={{ fontSize: 16 }}
      data-testid="final-scores-heading"
    >
      {title}
    </h2>
    <div className="flex flex-col gap-2.5">
      {byScore(players).map((player, index) => (
        <motion.div
          key={player.id}
          data-testid={`player-score-${player.id}`}
          initial={{ opacity: 0, x: -24 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: Math.min(index, 8) * 0.07, ease: [0.2, 0.9, 0.2, 1.15], duration: 0.3 }}
          className={`prow ${player.id === highlightPlayerId ? "prow-me" : ""} ${index === 0 ? "prow-win" : ""}`}
        >
          <RankDisc rank={index + 1} />
          <PlayerToken name={player.name} seat={players.findIndex((p) => p.id === player.id)} />
          <span className="min-w-0 flex-1 truncate text-xl font-extrabold">
            {player.name}
          </span>
          <span className="tabular text-2xl font-extrabold">{player.score}</span>
          <span className="pslug">pts</span>
        </motion.div>
      ))}
    </div>
  </section>
);
