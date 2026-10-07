import { useState } from "react";
import { motion } from "framer-motion";
import { GameContext } from "../game.context";
import { PhoneShell } from "./phone/PhoneShell";
import { WaitingDots } from "./phone/ink";

export function PlayerJoin() {
  const [gameCode, setGameCode] = useState("");
  const [playerName, setPlayerName] = useState("");
  const [isJoining, setIsJoining] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const players = GameContext.useSelector((state) => state.public.players);
  const maxPlayers = GameContext.useSelector((state) => state.public.settings.maxPlayers);
  const sendGameEvent = GameContext.useSend();

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (gameCode && playerName) {
      setIsJoining(true);
      setError(null);

      try {
        await sendGameEvent({
          type: "JOIN_GAME",
          playerName: playerName.trim(),
        });
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to join game");
      } finally {
        setIsJoining(false);
      }
    }
  };

  const hasJoined = players.some((p) => p.name === playerName);

  return (
    <PhoneShell className="flex items-center justify-center p-5">
      <div className="w-full max-w-md">
        {!hasJoined ? (
          <motion.div
            key="join-form"
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            className="pcard px-6 py-8"
          >
            <h1 className="lav-text mb-6 text-5xl font-extrabold">Join Game</h1>

            <form onSubmit={handleJoin} className="space-y-5">
              <div>
                <label htmlFor="gameCode" className="pslug mb-2 block" style={{ fontSize: 16 }}>
                  Game Code
                </label>
                <input
                  type="text"
                  id="gameCode"
                  className="pfield"
                  value={gameCode}
                  onChange={(e) => setGameCode(e.target.value.toUpperCase())}
                  placeholder="Enter game code"
                  maxLength={8}
                  required
                />
              </div>

              <div>
                <label htmlFor="playerName" className="pslug mb-2 block" style={{ fontSize: 16 }}>
                  Your Name
                </label>
                <input
                  type="text"
                  id="playerName"
                  className="pfield"
                  value={playerName}
                  onChange={(e) => setPlayerName(e.target.value)}
                  placeholder="Enter your name"
                  required
                />
              </div>

              {error && (
                <div role="alert" className="pnotice">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={isJoining}
                className="pbtn pbtn-primary pbtn-lg pbtn-block"
              >
                {isJoining ? "Joining..." : "Join Game"}
              </button>

              <p className="pslug text-center" style={{ fontSize: 14 }}>
                {players.length}/{maxPlayers} Players
              </p>
            </form>
          </motion.div>
        ) : (
          <motion.div
            key="joined"
            initial={{ opacity: 0, scale: 0.92 }}
            animate={{ opacity: 1, scale: 1 }}
            className="pcard pcard-glow px-6 py-8 text-center"
          >
            <h2 className="lav-text mb-3 text-5xl font-extrabold">You're In!</h2>
            <p className="mb-6 text-xl font-semibold text-gray-200">Waiting for the host to start the game...</p>
            <div className="flex justify-center">
              <WaitingDots />
            </div>
          </motion.div>
        )}
      </div>
    </PhoneShell>
  );
}
