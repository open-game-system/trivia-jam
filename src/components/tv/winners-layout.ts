/**
 * Where the winners stand when they break forward off the number line: one big centred
 * group, chips and names sized to the room's moment. Pure, poster pixels.
 */
export type WinnerSpot = { id: string; x: number };

export type WinnersLayout = {
  chip: number;
  name: number;
  total: number;
  /** Y of the top of the chips. */
  chipTop: number;
  spots: WinnerSpot[];
  /** Winners beyond the ones shown ("+2"). */
  more: number;
};

const SIZES: ReadonlyArray<{ chip: number; name: number }> = [
  { chip: 240, name: 132 },
  { chip: 200, name: 112 },
  { chip: 170, name: 92 },
  { chip: 136, name: 72 },
  { chip: 116, name: 60 },
];

export const MAX_WINNERS_SHOWN = 6;
const GAP = 96;
const WIDTH = 1728;
const CENTRE = 960;

export const layoutWinners = (winners: ReadonlyArray<{ id: string; name: string }>): WinnersLayout => {
  const shown = winners.slice(0, MAX_WINNERS_SHOWN);
  const more = winners.length - shown.length;
  const base = SIZES[Math.min(SIZES.length - 1, Math.max(0, shown.length - 1))];
  const widthsAt = (scale: number) => shown.map((w) => Math.max(base.chip * scale, w.name.length * base.name * scale * 0.66));
  const totalAt = (scale: number) => widthsAt(scale).reduce((a, b) => a + b, 0) + GAP * Math.max(0, shown.length - 1) + (more > 0 ? 160 : 0);
  const scale = Math.min(1, WIDTH / Math.max(1, totalAt(1)));
  const widths = widthsAt(scale);
  let left = CENTRE - totalAt(scale) / 2;
  const spots = shown.map((w, i) => {
    const spot = { id: w.id, x: left + widths[i] / 2 };
    left += widths[i] + GAP;
    return spot;
  });
  return { chip: Math.round(base.chip * scale), name: Math.max(48, Math.round(base.name * scale)), total: 104, chipTop: 290, spots, more };
};
