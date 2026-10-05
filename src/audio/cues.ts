/**
 * What the TV should sound like, derived from game state alone: compare the last view with the
 * new one and return the cues to play, in order. Pure, so every rule is a unit test.
 */
export type Bed = "lobby" | "think" | "finale";

export type TvAudioView = {
  phase: "lobby" | "prep" | "question" | "finished";
  questionNumber: number;
  /** Answers locked in for the current question. */
  answered: number;
  players: number;
  /** Questions with results so far. */
  results: number;
};

export type Cue =
  | { type: "bed"; bed: Bed | null }
  | { type: "join"; count: number }
  | { type: "question" }
  | { type: "lockIn"; count: number; of: number }
  | { type: "reveal" }
  | { type: "gameOver" };

const bedFor = (phase: TvAudioView["phase"]): Bed =>
  phase === "question" ? "think" : phase === "finished" ? "finale" : "lobby";

export function cuesBetween(prev: TvAudioView | null, next: TvAudioView): Cue[] {
  // A TV that just opened (or refreshed) picks up the right bed and never replays past moments.
  if (!prev) return [{ type: "bed", bed: bedFor(next.phase) }];

  const cues: Cue[] = [];
  if (next.phase === "lobby") {
    for (let n = prev.players + 1; n <= next.players; n++) cues.push({ type: "join", count: n });
  }

  if (next.phase === "question" && next.questionNumber !== prev.questionNumber) {
    cues.push({ type: "question" }, { type: "bed", bed: "think" });
    return cues;
  }

  if (next.phase === "question") {
    for (let n = prev.answered + 1; n <= next.answered; n++) cues.push({ type: "lockIn", count: n, of: next.players });
  }

  const revealed = next.results > prev.results;
  const ended = next.phase === "finished" && prev.phase !== "finished";
  if (revealed || ended) cues.push({ type: "bed", bed: null });
  if (revealed) cues.push({ type: "reveal" });
  if (ended) cues.push({ type: "gameOver" }, { type: "bed", bed: "finale" });
  return cues;
}
