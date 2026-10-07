import { revealSchedule } from "~/components/tv/tv-model";

export type SpoilerInput = {
  /** When this phone saw the result arrive, or null if it loaded after the fact. */
  arrivedAt: number | null;
  now: number;
  guessCount: number;
  reducedMotion: boolean;
};

/** Milliseconds until the TV's staged reveal lands the answer. */
export const holdRemainingMs = ({ arrivedAt, now, guessCount, reducedMotion }: SpoilerInput): number => {
  if (arrivedAt === null) return 0;
  const answerAt = revealSchedule(guessCount, reducedMotion).answer;
  return Math.max(0, arrivedAt + answerAt - now);
};

/** Keep the outcome off the phone until the TV has shown the answer. */
export const spoilerGate = (input: SpoilerInput): "hold" | "show" =>
  holdRemainingMs(input) > 0 ? "hold" : "show";
