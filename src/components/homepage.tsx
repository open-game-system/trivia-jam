import { useState } from "react";
import { atom } from "nanostores";
import { HelpModal } from "./help-modal";
import { PhoneShell } from "./phone/PhoneShell";

/** Legacy join-by-code home (kept for its stories): same riso poster. */
export function Homepage() {
  const [gameCode, setGameCode] = useState("");
  const [$showHelp] = useState(() => atom<boolean>(false));

  const handleJoinGame = (e: React.FormEvent) => {
    e.preventDefault();
    if (gameCode) {
      console.log(`Joining game with code: ${gameCode}`);
    }
  };

  const handleStartNewGame = () => {
    console.log("Starting a new game");
  };

  return (
    <PhoneShell className="flex items-center justify-center px-5 py-8">
      <main className="w-full max-w-xl">
        <h1 className="pposter-title mb-8">Trivia Jam</h1>

        <form onSubmit={handleJoinGame} className="sheet mb-6 p-5">
          <h2 className="mb-3 text-3xl font-extrabold">Join a Game</h2>
          <label htmlFor="gameCode" className="pslug mb-2 block" style={{ fontSize: 16 }}>
            Game Code
          </label>
          <input
            type="text"
            id="gameCode"
            className="pfield mb-4"
            value={gameCode}
            onChange={(e) => setGameCode(e.target.value.toUpperCase())}
            placeholder="Enter game code"
            maxLength={6}
          />
          <button type="submit" className="pbtn pbtn-pink pbtn-lg pbtn-block">
            Join Game
          </button>
        </form>

        <div className="sheet sheet-pink mb-6 p-5">
          <h2 className="mb-3 text-3xl font-extrabold">Start a New Game</h2>
          <button
            type="button"
            onClick={handleStartNewGame}
            className="pbtn pbtn-yellow pbtn-lg pbtn-block"
          >
            Create New Game
          </button>
        </div>

        <button type="button" onClick={() => $showHelp.set(true)} className="pbtn pbtn-block">
          How to Play
        </button>
      </main>
      <HelpModal $showHelp={$showHelp} />
    </PhoneShell>
  );
}
