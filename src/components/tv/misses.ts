/**
 * The "misses" beat after the winners: everyone who did not win, with how far off they were.
 * Pure: answers in, rows out.
 */
import { formatTick, matchOptionIndex, optionLetter } from "./tv-model";

export type MissRow = { playerId: string; name: string; inkIndex: number; tag: string; nearest: boolean };
export type Misses = { rows: MissRow[]; more: number };

/** Two rows of three across the bottom of the poster. */
export const MAX_MISSES_SHOWN = 6;

const cap = (rows: MissRow[]): Misses => ({ rows: rows.slice(0, MAX_MISSES_SHOWN), more: Math.max(0, rows.length - MAX_MISSES_SHOWN) });

const clean = (n: number) => formatTick(Number(n.toFixed(4)));

export const numericMisses = (
  guesses: ReadonlyArray<{ playerId: string; name: string; inkIndex: number; value: number }>,
  correct: number,
  winnerIds: ReadonlySet<string>,
): Misses => {
  const missed = guesses
    .filter((g) => !winnerIds.has(g.playerId))
    .map((g) => ({ ...g, off: Math.abs(g.value - correct) }))
    .sort((a, b) => a.off - b.off);
  const best = missed[0]?.off;
  const consoled = winnerIds.size > 0;
  return cap(
    missed.map((g) => ({
      playerId: g.playerId,
      name: g.name,
      inkIndex: g.inkIndex,
      tag: `${clean(g.value)} · off by ${clean(g.off)}`,
      nearest: consoled && g.off === best,
    })),
  );
};

export const choiceMisses = (
  answers: ReadonlyArray<{ playerId: string; name: string; inkIndex: number; value: string | number }>,
  options: ReadonlyArray<string>,
  correctIndex: number,
): Misses => {
  const missed = answers
    .map((a) => ({ ...a, pick: matchOptionIndex(a.value, options) }))
    .filter((a) => a.pick >= 0 && a.pick !== correctIndex)
    .sort((a, b) => a.pick - b.pick);
  return cap(
    missed.map((a) => ({
      playerId: a.playerId,
      name: a.name,
      inkIndex: a.inkIndex,
      tag: `picked ${optionLetter(a.pick)} · ${options[a.pick]}`,
      nearest: false,
    })),
  );
};
