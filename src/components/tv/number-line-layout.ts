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

export type LineSize = { value: number; chip: number; name: number; maxRows: number; maxName: number; stamp: number };

/** Big for a family (points stamped beside the name); compact for a crowd (points stamped on the chip); still couch-readable (values >= 56 px, names >= 40 px) for a crowd. */
export const ROOMY_SIZE: LineSize = { value: 84, chip: 84, name: 46, maxRows: 3, maxName: 12, stamp: 170 };
export const COMPACT_SIZE: LineSize = { value: 58, chip: 56, name: 40, maxRows: 2, maxName: 9, stamp: 0 };

/** The reveal's poster area: the question above `top`, tick labels and the answer below `axisY`. */
export const REVEAL_FRAME: LineFrame = { left: 96, right: 1824, top: 290, axisY: 790 };

export type GuessGroup = {
  key: string;
  value: number;
  label: string;
  members: LineGuess[];
  /** Where the group points: its value on the line, or the centre of its edge tab. */
  axisX: number;
  /** Centre of the group's label stack. */
  x: number;
  lane: number;
  /** Y of the bottom of the label stack. */
  bottom: number;
  width: number;
  height: number;
  offScale: "left" | "right" | null;
  highlight: Highlight | undefined;
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

/** Room kept past the end of the line for an off-scale tab. */
const TAB_ROOM = 200;
const LINE_MARGIN = 64;
const GAP = 28;
const LANE_GAP = 18;
const STEM_MIN = 38;
/** Sideways nudges beyond this read as "somewhere else": try another lane first. */
const MAX_SHIFT = 150;
export const shortName = (name: string, max: number): string => (name.length > max ? `${name.slice(0, max - 1)}…` : name);

const groupWidth = (label: string, members: LineGuess[], size: LineSize): number => {
  const valueWidth = label.length * size.value * 0.62;
  const rowWidth = Math.max(...members.map((m) => size.chip + 14 + shortName(m.name, size.maxName).length * size.name * 0.58 + (m.points > 0 ? size.stamp : 0)));
  return Math.ceil(Math.max(valueWidth, rowWidth) + 24);
};

const groupHeight = (members: LineGuess[], size: LineSize): number => {
  const rows = Math.min(members.length, size.maxRows);
  const more = members.length > size.maxRows ? size.name + 6 : 0;
  return Math.ceil(size.value * 0.95 + 12 + rows * (size.chip + 10) + more);
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

type Attempt = { groups: GuessGroup[]; fits: boolean; shift: number; overflow: number };

const attempt = (drafts: Draft[], laneCount: number, frame: LineFrame): Attempt => {
  // Greedy lanes: each group (left to right) takes the lane where it has to move least.
  // Spotlit groups always take the lane by the line; others avoid their spot there.
  const lit = drafts.filter((d) => d.highlight !== undefined);
  const lastRight = Array.from({ length: laneCount }, () => Number.NEGATIVE_INFINITY);
  const laneOf = drafts.map((d) => {
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
    const centres = packRow(
      idx.map((i) => ({ want: drafts[i].axisX, width: drafts[i].width, weight: drafts[i].highlight === undefined ? 1 : 25 })),
      frame.left,
      frame.right,
      GAP,
    );
    idx.forEach((i, k) => {
      xs[i] = centres[k];
    });
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
  const groups = drafts.map((d, i) => ({ ...d, x: xs[i], lane: laneOf[i], bottom: bottoms[laneOf[i]] }));
  const shift = Math.max(0, ...groups.map((g) => Math.abs(g.x - g.axisX)));
  const overflow = Math.max(0, frame.top - top);
  return { groups, fits: !overlap && overflow === 0, shift, overflow: overlap ? Number.POSITIVE_INFINITY : overflow };
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
          ? (frame.left + axisLeft) / 2
          : offScale === "right"
            ? (axisRight + frame.right) / 2
            : axisLeft + xOnAxis(value, axis, axisRight - axisLeft);
      const label = formatTick(value);
      const lit = members.find((m) => m.highlight !== undefined)?.highlight;
      return {
        key: `v${value}`,
        value,
        label,
        members,
        axisX,
        width: groupWidth(label, members, size),
        height: groupHeight(members, size),
        offScale,
        highlight: lit,
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
  const results = tries.map((t) => {
    const drafts = buildDrafts(guesses, axis, axisLeft, axisRight, frame, t.size);
    return { size: t.size, ...attempt(drafts, t.lanes, frame) };
  });
  const chosen =
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
