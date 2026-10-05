import { useEffect, useRef } from "react";
import { GameContext } from "~/game.context";
import { useQuestionTimer } from "~/hooks/use-question-timer";
import { cuesBetween, type TvAudioView } from "./cues";
import { tvAudio } from "./engine";

/**
 * Mounted once on the TV page: turns game-state changes into sound (see cues.ts) and ticks the last
 * five seconds of each question. Audio starts on the first press, or at once where autoplay is allowed
 * (the OGS cloud stream, the recorder). `?record` exposes the mix as window.__tvAudioTap for evidence.
 */
export function useTvAudio() {
  const isLobby = GameContext.useMatches("lobby");
  const isQuestion = GameContext.useMatches({ active: "questionActive" });
  const isFinished = GameContext.useMatches("finished");
  const questionNumber = GameContext.useSelector((s) => s.public.questionNumber);
  const answered = GameContext.useSelector((s) => s.public.currentQuestion?.answers.length ?? 0);
  const players = GameContext.useSelector((s) => s.public.players.length);
  const results = GameContext.useSelector((s) => s.public.questionResults.length);
  const currentQuestion = GameContext.useSelector((s) => s.public.currentQuestion);
  const answerTimeWindow = GameContext.useSelector((s) => s.public.settings.answerTimeWindow);
  const secondsLeft = useQuestionTimer(currentQuestion, answerTimeWindow, isQuestion);

  const phase: TvAudioView["phase"] = isFinished ? "finished" : isQuestion ? "question" : isLobby ? "lobby" : "prep";
  const prev = useRef<TvAudioView | null>(null);

  useEffect(() => {
    const audio = tvAudio();
    audio.unlock();
    const unlock = () => audio.unlock();
    window.addEventListener("pointerdown", unlock);
    window.addEventListener("keydown", unlock);
    if (new URLSearchParams(window.location.search).has("record")) {
      Reflect.set(window, "__tvAudioTap", () => audio.tap());
    }
    return () => {
      window.removeEventListener("pointerdown", unlock);
      window.removeEventListener("keydown", unlock);
      audio.play({ type: "bed", bed: null });
    };
  }, []);

  useEffect(() => {
    const next: TvAudioView = { phase, questionNumber, answered, players, results };
    const audio = tvAudio();
    for (const cue of cuesBetween(prev.current, next)) audio.play(cue);
    prev.current = next;
  }, [phase, questionNumber, answered, players, results]);

  const lastTick = useRef<number | null>(null);
  useEffect(() => {
    if (!isQuestion || secondsLeft > 5 || secondsLeft === lastTick.current) return;
    // Every player locked in: the round is over, no countdown.
    if (players > 0 && answered >= players) return;
    lastTick.current = secondsLeft;
    tvAudio().tick(secondsLeft);
  }, [isQuestion, secondsLeft, answered, players]);
}
