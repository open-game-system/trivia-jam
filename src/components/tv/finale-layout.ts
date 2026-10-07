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

/** The TV's title-safe area: 5% in from every edge. */
export const TITLE_SAFE = { left: 96, right: 1824, top: 54, bottom: 1026 } as const;

/**
 * The awards beat: the podium steps back (scaled about `originY`) and slides left; the awards stack in a
 * column on the right; the two are centred together on the frame.
 */
export const FINALE_FINAL = {
  scale: 0.74,
  originY: 300,
  gap: 96,
  awardsWidth: 540,
  cardHeight: 168,
  cardGap: 20,
  /** The AWARDS label above the cards. */
  heading: 56,
} as const;

type Box = { left: number; right: number; top: number; bottom: number };

const blockWidth = () => PODIUM_LAYOUT.width * FINALE_FINAL.scale + FINALE_FINAL.gap + FINALE_FINAL.awardsWidth;

/** Where the stepped-back podium's blocks sit (1st block top to the floor). */
export const steppedPodium = (): Box & { dx: number } => {
  const w = PODIUM_LAYOUT.width * FINALE_FINAL.scale;
  const left = 960 - blockWidth() / 2;
  const scaleY = (y: number) => FINALE_FINAL.originY + (y - FINALE_FINAL.originY) * FINALE_FINAL.scale;
  // The slab's top edge: the tallest block (plus its 40 px glow head-room) above the floor.
  const top = scaleY(PODIUM_LAYOUT.floor - PODIUM_LAYOUT.maxHeight - 40);
  return { left, right: left + w, top, bottom: scaleY(PODIUM_LAYOUT.floor), dx: left + w / 2 - 960 };
};

/** The awards column for `count` cards. */
export const awardsColumn = (count: number): Box => {
  const left = 960 - blockWidth() / 2 + PODIUM_LAYOUT.width * FINALE_FINAL.scale + FINALE_FINAL.gap;
  const top = Math.round(steppedPodium().top);
  const n = Math.max(1, count);
  return { left, right: left + FINALE_FINAL.awardsWidth, top, bottom: top + FINALE_FINAL.heading + n * FINALE_FINAL.cardHeight + (n - 1) * FINALE_FINAL.cardGap };
};

/** When a podium block has risen and settled (s from game over): its score counts up from here. */
export const landsAt = (riseAt: number, first: boolean, speed = 1): number => riseAt * speed + (first ? 0.95 : 0.75) * Math.max(speed, 0.6);
