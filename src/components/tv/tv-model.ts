/**
 * Pure derivations for the TV (spectate) screen: number-line axis, label lanes,
 * exact/closest highlights, standings with rank changes, player inks and the
 * timed reveal schedule. No React here, so it is all unit-tested.
 */

export type Axis = { min: number; max: number; ticks: number[] };

export type InkName = "blue" | "pink" | "teal" | "yellow";

export type Ink = {
  name: InkName;
  /** CSS colour of the ink. */
  color: string;
  /** Text colour that reads on a solid block of this ink. */
  on: string;
  /** Second time round the inks, tokens get a halftone variant. */
  halftone: boolean;
};

const INKS: ReadonlyArray<Omit<Ink, "halftone">> = [
  { name: "blue", color: "var(--blue)", on: "var(--paper)" },
  { name: "pink", color: "var(--pink)", on: "var(--ink)" },
  { name: "teal", color: "var(--teal)", on: "var(--paper)" },
  { name: "yellow", color: "var(--yellow)", on: "var(--ink)" },
];

export const inkForIndex = (index: number): Ink => {
  const safe = Math.max(0, Math.floor(index));
  const base = INKS[safe % INKS.length];
  return { ...base, halftone: Math.floor(safe / INKS.length) % 2 === 1 };
};

export const initialOf = (name: string): string => {
  const trimmed = name.trim();
  return trimmed.length > 0 ? trimmed.charAt(0).toUpperCase() : "?";
};

export const toNumber = (value: string | number): number | null => {
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (value.trim() === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
};

const niceStep = (rough: number, integersOnly: boolean): number => {
  const exponent = Math.floor(Math.log10(rough));
  const base = 10 ** exponent;
  const candidates = [1, 2, 2.5, 5, 10].map((m) => m * base);
  const step = candidates.find((c) => c >= rough) ?? 10 * base;
  return integersOnly ? Math.max(1, Math.round(step)) : step;
};

const median = (xs: number[]): number => {
  if (xs.length === 0) return 0;
  const s = [...xs].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 === 1 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
};

/**
 * Guesses far beyond the pack (more than 8x the median miss, and more than half
 * the answer) stay off the scale: they are pinned to the end of the line.
 */
export const onScaleGuesses = (guesses: number[], correct: number): number[] => {
  const finite = guesses.filter((g) => Number.isFinite(g));
  const misses = finite.map((g) => Math.abs(g - correct));
  const cutoff = Math.max(8 * median(misses), 0.5 * Math.abs(correct), 1);
  return finite.filter((g) => Math.abs(g - correct) <= cutoff);
};

/** A number line that spans the guesses and the answer, with 3-9 round ticks. */
export const buildAxis = (guesses: number[], correct: number): Axis => {
  const values = [...onScaleGuesses(guesses, correct), correct].filter((v) => Number.isFinite(v));
  if (values.length === 0) return { min: 0, max: 10, ticks: [0, 5, 10] };
  const integersOnly = values.every((v) => Number.isInteger(v));
  let lo = Math.min(...values);
  let hi = Math.max(...values);
  if (hi === lo) {
    const half = Math.max(Math.abs(lo) * 0.1, integersOnly ? 2 : 1);
    lo -= half;
    hi += half;
  } else {
    const pad = (hi - lo) * 0.12;
    const allPositive = lo >= 0;
    lo -= pad;
    hi += pad;
    if (allPositive && lo < 0) lo = 0;
  }
  let step = niceStep((hi - lo) / 6, integersOnly);
  let min = Math.floor(lo / step) * step;
  let max = Math.ceil(hi / step) * step;
  while ((max - min) / step > 8) {
    step = niceStep(step * 1.5, integersOnly);
    min = Math.floor(lo / step) * step;
    max = Math.ceil(hi / step) * step;
  }
  const ticks: number[] = [];
  const count = Math.round((max - min) / step);
  for (let i = 0; i <= count; i++) {
    ticks.push(Number((min + i * step).toFixed(6)));
  }
  return { min: ticks[0], max: ticks[ticks.length - 1], ticks };
};

export const xOnAxis = (value: number, axis: Axis, width: number): number => {
  const span = axis.max - axis.min;
  if (span <= 0) return width / 2;
  const t = Math.min(1, Math.max(0, (value - axis.min) / span));
  return t * width;
};

/**
 * Lanes for labels sorted by x: each label goes in the lowest lane with no label
 * closer than `minGap`. Indexes in `priority` are placed first, so they keep the
 * lanes nearest the axis.
 */
export const assignLanes = (sortedXs: number[], minGap: number, priority: number[] = []): number[] => {
  const lanes: number[] = sortedXs.map(() => -1);
  const order = [...priority.filter((i) => i >= 0 && i < sortedXs.length), ...sortedXs.map((_, i) => i).filter((i) => !priority.includes(i))];
  for (const i of order) {
    let lane = 0;
    while (sortedXs.some((x, j) => lanes[j] === lane && Math.abs(x - sortedXs[i]) < minGap)) lane++;
    lanes[i] = lane;
  }
  return lanes;
};

export type Highlight = "exact" | "closest";

/** Exact guesses win the spotlight; with no exact guess every closest guess gets it. */
export const findHighlights = (
  answers: ReadonlyArray<{ playerId: string; value: string | number }>,
  correct: string | number,
): Map<string, Highlight> => {
  const result = new Map<string, Highlight>();
  const target = toNumber(correct);
  if (target === null) return result;
  const numeric = answers.flatMap((a) => {
    const v = toNumber(a.value);
    return v === null ? [] : [{ playerId: a.playerId, diff: Math.abs(v - target) }];
  });
  if (numeric.length === 0) return result;
  const exact = numeric.filter((a) => a.diff === 0);
  if (exact.length > 0) {
    for (const a of exact) result.set(a.playerId, "exact");
    return result;
  }
  const best = Math.min(...numeric.map((a) => a.diff));
  for (const a of numeric) if (a.diff === best) result.set(a.playerId, "closest");
  return result;
};

export type StandingRow = {
  id: string;
  name: string;
  score: number;
  prevScore: number;
  gained: number;
  rank: number;
  prevRank: number;
  inkIndex: number;
};

const competitionRanks = (scores: number[]): number[] =>
  scores.map((s) => 1 + scores.filter((o) => o > s).length);

/** Players ranked by score, with where they stood before the latest question. */
export const buildStandings = (
  players: ReadonlyArray<{ id: string; name: string; score: number }>,
  lastScores: ReadonlyArray<{ playerId: string; points: number }>,
): StandingRow[] => {
  const gainedById = new Map(lastScores.map((s) => [s.playerId, Math.round(s.points)]));
  const scores = players.map((p) => p.score);
  const prevScores = players.map((p) => p.score - (gainedById.get(p.id) ?? 0));
  const ranks = competitionRanks(scores);
  const prevRanks = competitionRanks(prevScores);
  const rows = players.map((p, i) => ({
    id: p.id,
    name: p.name,
    score: p.score,
    prevScore: prevScores[i],
    gained: gainedById.get(p.id) ?? 0,
    rank: ranks[i],
    prevRank: prevRanks[i],
    inkIndex: i,
  }));
  return rows.sort((a, b) => b.score - a.score || a.inkIndex - b.inkIndex);
};

/** A multiple-choice answer may be the option text or its letter. */
export const matchOptionIndex = (value: string | number, options: ReadonlyArray<string>): number => {
  const text = String(value).trim();
  const byText = options.findIndex((o) => o === text);
  if (byText >= 0) return byText;
  if (/^[a-z]$/i.test(text)) {
    const idx = text.toUpperCase().charCodeAt(0) - 65;
    return idx < options.length ? idx : -1;
  }
  return -1;
};

export const optionLetter = (index: number): string => String.fromCharCode(65 + index);

export type RevealSchedule = {
  axis: number;
  firstDrop: number;
  stagger: number;
  dropDuration: number;
  answer: number;
  spotlight: number;
  points: number;
  standings: number;
  end: number;
};

/** Milliseconds from the moment results arrive to each beat of the reveal. */
export const revealSchedule = (guessCount: number, reducedMotion: boolean): RevealSchedule => {
  const scale = reducedMotion ? 0.5 : 1;
  const stagger = guessCount <= 6 ? 450 : Math.max(220, 2700 / guessCount);
  const dropDuration = 500;
  const firstDrop = 700;
  const lastDrop = firstDrop + Math.max(0, guessCount - 1) * stagger;
  // The anticipation beat: the "?" swings between the guesses before the answer slams.
  const answer = lastDrop + dropDuration + 2500;
  const spotlight = answer + 700;
  const points = spotlight + 700;
  const standings = points + 900;
  const end = standings + 700;
  return {
    axis: 0,
    firstDrop: firstDrop * scale,
    stagger: stagger * scale,
    dropDuration: dropDuration * scale,
    answer: answer * scale,
    spotlight: spotlight * scale,
    points: points * scale,
    standings: standings * scale,
    end: end * scale,
  };
};

/** "Lou", "Mom & Sam", "Mom, Sam & Grandpa", "4 players". */
export const joinNames = (names: ReadonlyArray<string>): string => {
  if (names.length > 3) return `${names.length} players`;
  if (names.length <= 1) return names[0] ?? "";
  return `${names.slice(0, -1).join(", ")} & ${names[names.length - 1]}`;
};

/** Who picked the right option in a multiple-choice question. */
export const choiceWinners = (
  answers: ReadonlyArray<{ playerId: string; value: string | number }>,
  correct: string | number,
  options: ReadonlyArray<string>,
): string[] => {
  const right = matchOptionIndex(correct, options);
  if (right < 0) return [];
  return answers.filter((a) => matchOptionIndex(a.value, options) === right).map((a) => a.playerId);
};

/** Numbers on the TV: years and small integers stay raw; big ones get thin separators. */
export const formatTick = (value: number): string => {
  if (Math.abs(value) >= 10000) return value.toLocaleString("en-US");
  return String(Number(value.toFixed(2)));
};
