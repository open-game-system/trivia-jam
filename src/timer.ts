/**
 * Creates a timer countdown that uses performance.now() for consistent
 * local timekeeping, avoiding server-client clock skew issues.
 *
 * When a new question starts, all clients receive the state update at
 * roughly the same time via websocket. By counting down from
 * answerTimeWindow using local performance.now(), all clients show
 * consistent timer values regardless of device clock differences.
 */
export function createCountdown(
  answerTimeWindow: number,
  onTick: (remaining: number) => void,
  onComplete: () => void
): () => void {
  const startedAt = performance.now();

  const tick = () => {
    const elapsed = (performance.now() - startedAt) / 1000;
    const remaining = Math.max(0, Math.ceil(answerTimeWindow - elapsed));
    onTick(remaining);
    if (remaining <= 0) {
      onComplete();
    }
  };

  // Initial tick
  tick();

  const interval = setInterval(tick, 100);

  return () => clearInterval(interval);
}
