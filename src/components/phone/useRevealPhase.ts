import { useEffect, useState } from "react";
import { revealPhase, type RevealPhase, type RevealPhaseInput } from "./hostReveal";

/** The TV reveal's phase for this phone; re-renders itself when the phase changes. */
export const useRevealPhase = (input: Omit<RevealPhaseInput, "now">): RevealPhase => {
  const [now, setNow] = useState(() => Date.now());
  const phase = revealPhase({ ...input, now });
  useEffect(() => {
    if (phase.nextChangeMs <= 0) return;
    const timer = setTimeout(() => setNow(Date.now()), phase.nextChangeMs + 5);
    return () => clearTimeout(timer);
  }, [phase.name, phase.nextChangeMs]);
  return phase;
};
