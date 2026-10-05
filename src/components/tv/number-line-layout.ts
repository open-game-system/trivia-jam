/**
 * Layout solver for the number-line reveal. Pure: guesses in, poster-pixel
 * positions out. Identical guesses collapse into one labelled group; groups
 * that would collide go to lanes above the line (leader lines carry them back
 * to their value) and are nudged sideways only as far as needed; a guess off
 * the scale becomes a group over an edge tab that shows its true value.
 */
import { type Axis, buildAxis, formatTick, type Highlight, xOnAxis } from "./tv-model";

export type LineGuess = {
  playerId: string;
  name: string;
  value: number;
  inkIndex: number;
  points: number;
  highlight: Highlight | undefined;
};

export type LineFrame = { left: number; right: number; top: number; axisY: number };

/** `stampRow`: points stamped on their own row under the name (roomy) or as a sticker on the chip (compact). */
export type LineSize = { value: number; chip: number; name: number; maxRows: number; maxName: number; stamp: number; stampRow: boolean };

/**
 * Big for a family, compact for a crowd; still couch-readable (values >= 56 px, names >= 40 px) for a crowd.
 * `stamp` is the font size of the "+N" points stamp printed under each name.
 */
export const ROOMY_SIZE: LineSize = { value: 84, chip: 88, name: 46, maxRows: 3, maxName: 12, stamp: 38, stampRow: true };
export const COMPACT_SIZE: LineSize = { value: 58, chip: 60, name: 40, maxRows: 2, maxName: 9, stamp: 30, stampRow: false };

/** The reveal's poster area: the question above `top`, tick labels and the answer below `axisY`. */
export const REVEAL_FRAME: LineFrame = { left: 96, right: 1824, top: 290, axisY: 790 };

export type GuessGroup = {
  key: string;
  value: number;
  label: string;
  /** Highest points first, so a speed tiebreak reads left to right. */
  members: LineGuess[];
  /** Where the group points: its value on the line, or the centre of its edge flag. */
  axisX: number;
  /** Centre of the group (its chips sit side by side, its number under them). */
  x: number;
  lane: number;
  /** Y of the bottom of the group: the bottom of its number, or of its chips when it rides an edge flag. */
  bottom: number;
  width: number;
  height: number;
  offScale: "left" | "right" | null;
  highlight: Highlight | undefined;
  /** On a tie (same guess, different points), the player who won it on speed. */
  fastest: string | null;
};

export type LineLayout = {
  axis: Axis;
  axisLeft: number;
  axisRight: number;
  ticks: Array<{ value: number; label: string; x: number }>;
  correctX: number;
  groups: GuessGroup[];
  size: LineSize;
};

/** Room kept past the end of the line for an off-scale flag. */
const TAB_ROOM = 250;
const LINE_MARGIN = 64;
const GAP = 28;
const LANE_GAP = 18;
/** The channel above the axis the "?" puck travels in: no labels there, just short leaders. */
export const STEM_MIN = 100;
/** Half-width of the answer pin's exclusion zone: no label crosses it unless it guessed the answer. */
export const PIN_ZONE = 46;
/** An edge flag's size: it carries the off-scale value ("100 →"), the chips ride on top of it. */
export const FLAG = { width: 200, height: 64 } as const;
const COL_GAP = 18;
/** Sideways nudges beyond this read as "somewhere else": try another lane first. */
const MAX_SHIFT = 240;
/** The spotlit group may slide this far off its value, no further. */
const LIT_SHIFT = 24;
export const shortName = (name: string, max: number): string => (name.length > max ? `${name.slice(0, max - 1)}…` : name);

/** "+4" or, for the player who won a tie on speed, "+4 · fastest". */
export const stampText = (points: number, fastest: boolean): string => (fastest ? `+${points} · fastest` : `+${points}`);

const stampWidth = (text: string, size: LineSize): number => text.length * size.stamp * 0.64 + 28;

/** One column per member: chip, name under it, points stamp under that. */
export const columnWidth = (m: LineGuess, fastest: boolean, size: LineSize): number =>
  Math.ceil(
    Math.max(
      size.chip,
      shortName(m.name, size.maxName).length * size.name * 0.6,
      m.points > 0 ? stampWidth(stampText(m.points, fastest), size) : 0,
    ),
  );

/** The tie's speed winner: same guess, more points (the server breaks ties on time). */
export const speedWinner = (members: ReadonlyArray<LineGuess>): string | null => {
  const scoring = members.filter((m) => m.points > 0);
  if (scoring.length < 2) return null;
  const top = Math.max(...scoring.map((m) => m.points));
  const atTop = scoring.filter((m) => m.points === top);
  return atTop.length === 1 && scoring.some((m) => m.points < top) ? atTop[0].playerId : null;
};

const groupWidth = (label: string, members: LineGuess[], fastest: string | null, size: LineSize, withLabel: boolean): number => {
  const shown = members.slice(0, size.maxRows);
  const cols = shown.reduce((sum, m) => sum + columnWidth(m, m.playerId === fastest, size), 0) + COL_GAP * (shown.length - 1);
  const more = members.length > size.maxRows ? size.chip * 0.9 + COL_GAP : 0;
  const valueWidth = withLabel ? label.length * size.value * 0.62 : 0;
  return Math.ceil(Math.max(valueWidth, cols + more) + 16);
};

const groupHeight = (members: LineGuess[], size: LineSize, withLabel: boolean): number => {
  const stamps = size.stampRow && members.some((m) => m.points > 0) ? 8 + size.stamp * 1.3 : 0;
  const label = withLabel ? 8 + size.value * 0.95 : 0;
  return Math.ceil(size.chip + 6 + size.name * 1.08 + stamps + label);
};

/**
 * Order-preserving overlap removal on one row: items keep their order, sit as
 * close to where they want to be as the gap allows, and stay inside the bounds.
 * Returns the centre of each item.
 */
export const packRow = (
  items: ReadonlyArray<{ want: number; width: number; weight?: number }>,
  min: number,
  max: number,
  gap: number,
): number[] => {
  type Block = { first: number; last: number; left: number; width: number };
  const blocks: Block[] = [];
  const lefts = items.map((it) => it.want - it.width / 2);
  items.forEach((it, i) => {
    let block: Block = { first: i, last: i, left: lefts[i], width: it.width };
    for (;;) {
      const prev = blocks[blocks.length - 1];
      if (!prev || prev.left + prev.width + gap <= block.left) break;
      blocks.pop();
      // Merge: the block sits where the mean of its members' wishes puts it.
      const first = prev.first;
      const last = block.last;
      let offset = 0;
      let sum = 0;
      let weights = 0;
      for (let k = first; k <= last; k++) {
        const w = items[k].weight ?? 1;
        sum += w * (lefts[k] - offset);
        weights += w;
        offset += items[k].width + gap;
      }
      const width = offset - gap;
      block = { first, last, left: sum / weights, width };
    }
    blocks.push(block);
  });
  const centres: number[] = [];
  for (const b of blocks) {
    let x = b.left;
    for (let k = b.first; k <= b.last; k++) {
      centres.push(x + items[k].width / 2);
      x += items[k].width + gap;
    }
  }
  // Clamp into the bounds, pushing neighbours along so nothing overlaps.
  for (let i = 0; i < centres.length; i++) {
    const lo = i === 0 ? min + items[i].width / 2 : centres[i - 1] + items[i - 1].width / 2 + gap + items[i].width / 2;
    centres[i] = Math.max(centres[i], lo);
  }
  for (let i = centres.length - 1; i >= 0; i--) {
    const hi =
      i === centres.length - 1 ? max - items[i].width / 2 : centres[i + 1] - items[i + 1].width / 2 - gap - items[i].width / 2;
    centres[i] = Math.min(centres[i], hi);
  }
  return centres;
};

type Draft = Omit<GuessGroup, "x" | "lane" | "bottom">;

type Attempt = { groups: GuessGroup[]; fits: boolean; shift: number; litShift: number; overflow: number };

type LaneMode = "greedy" | "alternate";

const overlapsLit = (d: Draft, lit: Draft[]): boolean =>
  lit.some((l) => Math.min(d.axisX + d.width / 2, l.axisX + l.width / 2) - Math.max(d.axisX - d.width / 2, l.axisX - l.width / 2) + GAP > 0);

/**
 * Alternate lanes: spotlit groups by the line; the rest take turns up the lanes, left to right,
 * and never share the line's lane with a spotlit group they would bump into.
 */
const alternateLanes = (drafts: Draft[], laneCount: number): number[] => {
  const lit = drafts.filter((d) => d.highlight !== undefined);
  let turn = 0;
  return drafts.map((d) => {
    if (d.highlight !== undefined || laneCount === 1) return 0;
    let lane = turn % laneCount;
    turn++;
    if (lane === 0 && overlapsLit(d, lit)) {
      lane = 1;
      turn++;
    }
    return lane;
  });
};

const attempt = (drafts: Draft[], laneCount: number, frame: LineFrame, correctX: number, mode: LaneMode): Attempt => {
  // Greedy lanes: each group (left to right) takes the lane where it has to move least.
  // Spotlit groups always take the lane by the line; others avoid their spot there.
  const lit = drafts.filter((d) => d.highlight !== undefined);
  const lastRight = Array.from({ length: laneCount }, () => Number.NEGATIVE_INFINITY);
  const laneOf = mode === "alternate" ? alternateLanes(drafts, laneCount) : drafts.map((d) => {
    const left = d.axisX - d.width / 2;
    const right = d.axisX + d.width / 2;
    let best = 0;
    let bestCost = Number.POSITIVE_INFINITY;
    for (let lane = 0; lane < laneCount; lane++) {
      if (d.highlight !== undefined && lane > 0) break;
      let cost = Math.max(0, lastRight[lane] + GAP - left);
      if (lane === 0 && d.highlight === undefined) {
        for (const l of lit) {
          const overlap = Math.min(right, l.axisX + l.width / 2) - Math.max(left, l.axisX - l.width / 2) + GAP;
          if (overlap > 0) cost += overlap;
        }
      }
      if (cost < bestCost - 0.5) {
        best = lane;
        bestCost = cost;
      }
    }
    lastRight[best] = Math.max(lastRight[best] + GAP, left) + d.width;
    return best;
  });
  const xs = drafts.map((d) => d.axisX);
  let overlap = false;
  for (let lane = 0; lane < laneCount; lane++) {
    const idx = drafts.flatMap((_, i) => (laneOf[i] === lane ? [i] : []));
    // The answer pin's exclusion zone rides in the lane by the line as an immovable item,
    // unless a group in that lane guessed (next to) the answer and sits on the pin itself.
    const pinned = lane === 0 && !idx.some((i) => Math.abs(drafts[i].axisX - correctX) < PIN_ZONE);
    const items = idx.map((i) => ({
      want: drafts[i].axisX,
      width: drafts[i].width,
      weight: drafts[i].highlight !== undefined || drafts[i].offScale !== null ? 25 : 1,
      group: i,
    }));
    if (pinned) items.push({ want: correctX, width: PIN_ZONE * 2 - GAP, weight: 1e6, group: -1 });
    items.sort((a, b) => a.want - b.want || a.group - b.group);
    const centres = packRow(items, frame.left, frame.right, GAP);
    items.forEach((it, k) => {
      if (it.group >= 0) xs[it.group] = centres[k];
    });
    // A lane too full to fit inside the frame gets squeezed past its edges: that is a miss too.
    for (const i of idx) if (xs[i] - drafts[i].width / 2 < frame.left - 0.5 || xs[i] + drafts[i].width / 2 > frame.right + 0.5) overlap = true;
    for (let k = 1; k < idx.length; k++) {
      const a = idx[k - 1];
      const b = idx[k];
      if (xs[b] - xs[a] < (drafts[a].width + drafts[b].width) / 2 + GAP - 0.5) overlap = true;
    }
  }
  const bottoms: number[] = [];
  let bottom = frame.axisY - STEM_MIN;
  for (let lane = 0; lane < laneCount; lane++) {
    bottoms.push(bottom);
    const tallest = Math.max(0, ...drafts.filter((_, i) => laneOf[i] === lane).map((d) => d.height));
    bottom -= tallest + LANE_GAP;
  }
  const top = bottom + LANE_GAP;
  // A group off the scale in the lane by the line rides on its edge flag.
  const groups = drafts.map((d, i) => ({
    ...d,
    x: xs[i],
    lane: laneOf[i],
    bottom: d.offScale !== null && laneOf[i] === 0 ? frame.axisY - FLAG.height / 2 - 6 : bottoms[laneOf[i]],
  }));
  const shift = Math.max(0, ...groups.map((g) => Math.abs(g.x - g.axisX)));
  const litShift = Math.max(0, ...groups.filter((g) => g.highlight !== undefined).map((g) => Math.abs(g.x - g.axisX)));
  const overflow = Math.max(0, frame.top - top);
  return { groups, fits: !overlap && overflow === 0, shift, litShift, overflow: overlap ? Number.POSITIVE_INFINITY : overflow };
};

const buildDrafts = (
  guesses: ReadonlyArray<LineGuess>,
  axis: Axis,
  axisLeft: number,
  axisRight: number,
  frame: LineFrame,
  size: LineSize,
): Draft[] => {
  const byValue = new Map<number, LineGuess[]>();
  for (const g of guesses) byValue.set(g.value, [...(byValue.get(g.value) ?? []), g]);
  return [...byValue.entries()]
    .sort(([a], [b]) => a - b)
    .map(([value, members]) => {
      const offScale = value < axis.min ? ("left" as const) : value > axis.max ? ("right" as const) : null;
      const axisX =
        offScale === "left"
          ? axisLeft - 36 - FLAG.width / 2 - 8
          : offScale === "right"
            ? axisRight + 36 + FLAG.width / 2 + 8
            : axisLeft + xOnAxis(value, axis, axisRight - axisLeft);
      const label = formatTick(value);
      const lit = members.find((m) => m.highlight !== undefined)?.highlight;
      const ordered = [...members].sort((a, b) => b.points - a.points);
      const fastest = speedWinner(ordered);
      return {
        key: `v${value}`,
        value,
        label,
        members: ordered,
        axisX,
        width: groupWidth(label, ordered, fastest, size, offScale === null),
        height: groupHeight(ordered, size, offScale === null),
        offScale,
        highlight: lit,
        fastest,
      };
    });
};

export const layoutNumberLine = (guesses: ReadonlyArray<LineGuess>, correct: number, frame: LineFrame): LineLayout => {
  const axis = buildAxis(
    guesses.map((g) => g.value),
    correct,
  );
  const hasLeft = guesses.some((g) => g.value < axis.min);
  const hasRight = guesses.some((g) => g.value > axis.max);
  const axisLeft = frame.left + (hasLeft ? TAB_ROOM : LINE_MARGIN);
  const axisRight = frame.right - (hasRight ? TAB_ROOM : LINE_MARGIN);
  const width = axisRight - axisLeft;
  const ticks = axis.ticks.map((t) => ({ value: t, label: formatTick(t), x: axisLeft + xOnAxis(t, axis, width) }));
  const correctX = axisLeft + xOnAxis(correct, axis, width);

  const tries: Array<{ size: LineSize; lanes: number }> = [
    { size: ROOMY_SIZE, lanes: 1 },
    { size: ROOMY_SIZE, lanes: 2 },
    { size: COMPACT_SIZE, lanes: 1 },
    { size: COMPACT_SIZE, lanes: 2 },
    { size: ROOMY_SIZE, lanes: 3 },
    { size: COMPACT_SIZE, lanes: 3 },
    { size: COMPACT_SIZE, lanes: 4 },
  ];
  const results = tries.flatMap((t) => {
    const drafts = buildDrafts(guesses, axis, axisLeft, axisRight, frame, t.size);
    const modes: LaneMode[] = ["greedy", "alternate"];
    return modes.map((mode) => ({ size: t.size, ...attempt(drafts, t.lanes, frame, correctX, mode) }));
  });
  // The spotlit group stays on its value above all; then nobody strays far; then anything that fits.
  const chosen =
    results.find((r) => r.fits && r.shift <= MAX_SHIFT && r.litShift <= LIT_SHIFT) ??
    results.find((r) => r.fits && r.litShift <= LIT_SHIFT) ??
    results.find((r) => r.fits && r.shift <= MAX_SHIFT) ??
    [...results].filter((r) => r.fits).sort((a, b) => a.shift - b.shift)[0] ??
    [...results].sort((a, b) => a.overflow - b.overflow)[0];
  return { axis, axisLeft, axisRight, ticks, correctX, groups: chosen.groups, size: chosen.size };
};

/**
 * Where the "?" puck swings during the suspense beat: from the outermost guesses
 * inwards, ending on a guess so the swing never gives the answer away.
 */
export const sweepStops = (xs: ReadonlyArray<number>): number[] => {
  const sorted = [...new Set(xs)].sort((a, b) => a - b);
  if (sorted.length === 0) return [760, 1160, 860, 1060, 960];
  if (sorted.length === 1) {
    const x = sorted[0];
    return [x - 220, x + 220, x - 110, x + 90, x];
  }
  const seq: number[] = [];
  let lo = 0;
  let hi = sorted.length - 1;
  while (lo <= hi) {
    seq.push(sorted[lo]);
    if (hi !== lo) seq.push(sorted[hi]);
    lo++;
    hi--;
  }
  return seq.length >= 4 ? seq : [...seq, ...seq];
};
