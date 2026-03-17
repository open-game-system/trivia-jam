import { motion } from "framer-motion";
import { Crown } from "lucide-react";

type Player = { id: string; name: string; score: number };

const getMedalEmoji = (index: number): string => {
  if (index === 0) return "\u{1F947}";
  if (index === 1) return "\u{1F948}";
  if (index === 2) return "\u{1F949}";
  return `#${index + 1}`;
};

export const WinnerAnnouncement = ({ winner }: { winner: Player }) => (
  <div className="text-center mb-12" data-testid="winner-announcement">
    <div className="text-8xl mb-6">{"\u{1F451}"}</div>
    <h2 className="text-4xl font-bold text-indigo-300 mb-4">
      {winner.name} Wins!
    </h2>
    <p className="text-2xl text-indigo-300/70">with {winner.score} points</p>
  </div>
);

export const FinalScoresList = ({
  players,
  highlightPlayerId,
}: {
  players: Player[];
  highlightPlayerId?: string;
}) => {
  const sortedPlayers = [...players].sort((a, b) => b.score - a.score);

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold text-indigo-300 flex items-center justify-center gap-3 mb-6" data-testid="final-scores-heading">
        <Crown className="w-6 h-6" /> Final Scores
      </h2>
      <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2">
        {sortedPlayers.map((player, index) => (
          <motion.div
            key={player.id}
            data-testid={`player-score-${player.id}`}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.1 }}
            className={`flex justify-between items-center p-4 rounded-xl border ${
              index === 0
                ? "bg-yellow-500/10 border-yellow-500/30"
                : index === 1
                ? "bg-gray-400/10 border-gray-400/30"
                : index === 2
                ? "bg-amber-600/10 border-amber-600/30"
                : "bg-gray-800/30 border-gray-700/30"
            } ${highlightPlayerId && player.id === highlightPlayerId ? "bg-indigo-500/10" : ""}`}
          >
            <div className="flex items-center gap-4">
              <span className="text-2xl font-bold min-w-[40px]">
                {getMedalEmoji(index)}
              </span>
              <span className="font-medium text-xl">{player.name}</span>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold text-indigo-400">
                {player.score}
              </span>
              <span className="text-indigo-400/70 text-sm">pts</span>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
};
