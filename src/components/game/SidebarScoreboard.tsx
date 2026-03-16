import { Trophy } from "lucide-react";

export const SidebarScoreboard = ({
  players,
}: {
  players: Array<{ id: string; name: string; score: number }>;
}) => {
  const sortedPlayers = [...players].sort((a, b) => b.score - a.score);

  return (
    <div className="fixed right-0 top-0 bottom-0 w-80 bg-gray-800/30 backdrop-blur-sm border-l border-gray-700/50 p-4 overflow-y-auto">
      <h2 className="text-xl font-bold text-indigo-300 mb-4 flex items-center gap-2">
        <Trophy className="w-5 h-5" /> Scoreboard
      </h2>
      <div className="space-y-2">
        {sortedPlayers.map((player, index) => (
          <div
            key={player.id}
            className={`p-3 rounded-lg ${
              index === 0
                ? "bg-yellow-500/10 border border-yellow-500/30"
                : "bg-gray-800/30 border border-gray-700/30"
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-indigo-400">
                  #{index + 1}
                </span>
                <span className="font-medium">{player.name}</span>
              </div>
              <span className="font-bold text-indigo-400">{player.score}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
