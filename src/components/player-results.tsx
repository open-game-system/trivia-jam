import confetti from "canvas-confetti";
import { RotateCcw } from "lucide-react";
import { useEffect } from "react";
import { GameContext } from "../game.context";
import { SessionContext } from "../session.context";
import { byScore } from "./phone/FinalScores";
import { PlayerFinish } from "./phone/PlayerFinish";

/** Game results with a replay button (winners get one calm burst). */
export function PlayerResults() {
  const players = GameContext.useSelector((state) => state.public.players);
  const userId = SessionContext.useSelector((state) => state.public.userId);
  const sendGameEvent = GameContext.useSend();

  const currentPlayer = players.find((p) => p.id === userId);
  const isWinner = byScore(players)[0]?.id === userId;

  useEffect(() => {
    if (!isWinner) return;
    confetti({
      particleCount: 60,
      spread: 70,
      origin: { y: 0.7 },
      colors: ["#FF48B0", "#3255A4", "#FFE800", "#00838A"],
    });
  }, [isWinner]);

  if (!currentPlayer) return null;

  return (
    <PlayerFinish
      me={currentPlayer}
      players={players}
      action={
        <button
          type="button"
          onClick={() => sendGameEvent({ type: "START_GAME" })}
          className="pbtn pbtn-pink pbtn-lg"
        >
          <RotateCcw size={24} strokeWidth={3} aria-hidden="true" />
          Play Again
        </button>
      }
    />
  );
}
