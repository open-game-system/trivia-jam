/** The finale podium's geometry. Pure, poster pixels. */

const BLOCK = 380;
const GAP = 30;
const WIDTH = BLOCK * 3 + GAP * 2;

export const PODIUM_LAYOUT = {
  block: BLOCK,
  gap: GAP,
  width: WIDTH,
  /** Centred on the frame. */
  left: (1920 - WIDTH) / 2,
  floor: 940,
  /** 1st's block (and any block level with it). */
  maxHeight: 560,
  /** What 2nd and 3rd need to carry their player on 0 points: place, token, name, score. */
  baseHeight: 300,
} as const;

/**
 * Block heights for 1st, 2nd and 3rd: above the base every block needs for its player, the height
 * grows in proportion to the score, so the podium shows how close the game was.
 */
export const podiumHeights = (scores: readonly [number, number, number] | readonly number[]): number[] => {
  const { maxHeight, baseHeight } = PODIUM_LAYOUT;
  const top = Math.max(0, scores[0] ?? 0);
  return scores.slice(0, 3).map((s, i) => {
    if (i === 0) return maxHeight;
    if (top <= 0) return baseHeight;
    return Math.round(baseHeight + ((maxHeight - baseHeight) * Math.max(0, Math.min(s, top))) / top);
  });
};
