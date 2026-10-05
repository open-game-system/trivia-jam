import { getOgsSessionSource, onOgsPause, reportOgsSitting } from "@open-game-system/profile-kit";
import { useOgsSession } from "@open-game-system/profile-kit/react";
import { useEffect } from "react";
import { tvAudio } from "~/audio/engine";
import { GameContext } from "~/game.context";
import { sittingReport } from "./sitting";

// TV page, at module load: the launcher posts ogs:start as soon as the frame loads, so the session
// source must exist before React renders; and parked (ogs:suspend) means silent until ogs:resume.
if (typeof window !== "undefined") {
  getOgsSessionSource();
  onOgsPause((paused) => tvAudio().setPaused(paused));
}

/** True when this TV page is framed by the OGS TV launcher (its own TV code replaces ours). */
export function useOnOgsTv(): boolean {
  const session = useOgsSession();
  return session !== null && session !== undefined;
}

/** Reports the sitting label ("Question 3 of 5") to the OGS app or launcher whenever it changes. */
export function useOgsSitting(gameId: string) {
  const isLobby = GameContext.useMatches("lobby");
  const isFinished = GameContext.useMatches("finished");
  const questionNumber = GameContext.useSelector((s) => s.public.questionNumber);
  const totalQuestions = GameContext.useSelector((s) => Object.keys(s.public.questions).length);
  const winnerName = GameContext.useSelector((s) => s.public.players.find((p) => p.id === s.public.winner)?.name ?? null);
  const phase = isFinished ? "finished" : isLobby ? "lobby" : "active";

  useEffect(() => {
    reportOgsSitting(sittingReport({ gameId, origin: window.location.origin, phase, questionNumber, totalQuestions, winnerName }));
  }, [gameId, phase, questionNumber, totalQuestions, winnerName]);
}
