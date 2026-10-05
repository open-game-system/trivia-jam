import { useEffect, useState } from "react";
import { holdRemainingMs, type SpoilerInput } from "./spoiler";

/** "hold" until the TV has landed the answer; re-renders itself at that moment. */
export const useSpoilerGate = (input: Omit<SpoilerInput, "now">): "hold" | "show" => {
  const [now, setNow] = useState(() => Date.now());
  const remaining = holdRemainingMs({ ...input, now });
  useEffect(() => {
    if (remaining <= 0) return;
    const timer = setTimeout(() => setNow(Date.now()), remaining);
    return () => clearTimeout(timer);
  }, [remaining]);
  return remaining > 0 ? "hold" : "show";
};
