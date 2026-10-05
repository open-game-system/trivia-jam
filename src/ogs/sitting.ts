import type { InstanceReportInput } from "@open-game-system/profile-kit";
import { OGS_APP_ID } from "~/ogs-join";

export type SittingInput = {
  gameId: string;
  origin: string;
  phase: "lobby" | "active" | "finished";
  questionNumber: number;
  totalQuestions: number;
  winnerName: string | null;
};

/** The label the OGS app shows for this game ("Playing: Question 3 of 5"), from game state. */
export function sittingReport(input: SittingInput): InstanceReportInput {
  const { gameId, origin, phase, questionNumber, totalQuestions, winnerName } = input;
  const status = phase === "finished" ? "completed" : phase;
  const title =
    phase === "lobby"
      ? "Getting ready"
      : phase === "finished"
        ? winnerName
          ? `${winnerName} won`
          : "Game over"
        : questionNumber > 0
          ? `Question ${questionNumber} of ${totalQuestions}`
          : "Starting";
  return { instanceId: `${OGS_APP_ID}:${gameId}`, appId: OGS_APP_ID, status, title, resumeUrl: `${origin}/games/${gameId}` };
}
