import { useCallback, useEffect, useRef, useState } from "react";
import { pickVoice, readAloudWanted, rememberReadAloud } from "./readAloud";

const synth = (): SpeechSynthesis | null =>
  typeof window !== "undefined" && "speechSynthesis" in window ? window.speechSynthesis : null;

/**
 * Web Speech read-aloud. `speak()` must come from a tap (iOS); after the first tap the
 * question reads itself each time `questionId` changes.
 */
export const useReadAloud = (text: string, questionId: string | null) => {
  const [speaking, setSpeaking] = useState(false);
  const [tappedBefore, setTappedBefore] = useState(readAloudWanted);
  const textRef = useRef(text);
  textRef.current = text;
  const supported = synth() !== null;

  const speak = useCallback(() => {
    const engine = synth();
    if (!engine || !textRef.current) return;
    engine.cancel();
    const utterance = new SpeechSynthesisUtterance(textRef.current);
    const voice = pickVoice(engine.getVoices());
    if (voice) utterance.voice = voice;
    utterance.lang = voice?.lang ?? "en-US";
    utterance.rate = 0.95;
    utterance.onstart = () => setSpeaking(true);
    utterance.onend = () => setSpeaking(false);
    utterance.onerror = () => setSpeaking(false);
    engine.speak(utterance);
  }, []);

  const onTap = useCallback(() => {
    rememberReadAloud();
    setTappedBefore(true);
    speak();
  }, [speak]);

  // Syncing with the browser's speech engine (an external system) when a new question appears.
  useEffect(() => {
    if (questionId && readAloudWanted()) speak();
    return () => {
      synth()?.cancel();
    };
  }, [questionId, speak]);

  return { supported, speaking, onTap, tappedBefore };
};
