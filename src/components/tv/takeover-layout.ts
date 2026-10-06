/**
 * The winners takeover, composed once. Pure, stage pixels.
 *
 * The takeover used to open centred and then step up and shrink to make room for "the rest of the
 * room" (a visible re-flow mid-beat). Now its final arrangement is known from the first frame: with
 * misses, winners and the answer hold the left two-thirds and the misses fill the right third; with
 * none, everything is centred. The answer is the hero (>= 240 px), always inside title-safe.
 */
export type Point = { x: number; y: number };
/** Where the winners card (authored at 1920x1080, centred on x = 960) sits: scaled about its top centre, then offset. */
export type CardPlace = { x: number; y: number; scale: number };

export type TakeoverLayout = {
  card: CardPlace;
  /** The lowest point of the card's content, in card space. */
  cardBottom: number;
  answer: { cx: number; top: number; size: number };
  /** The right-hand column for the rest of the room, or null when everybody won. */
  misses: { left: number; top: number; width: number; labelHeight: number; rowHeight: number; rowGap: number } | null;
};

/** Title-safe on a 1920x1080 stage (5% / 5%). */
export const SAFE = { left: 96, right: 1824, top: 54, bottom: 1026 } as const;

/** The card's tallest content (a single exact winner: stamp, 240 px chip, name, total). */
export const CARD_BOTTOM = 810;

export const cardToStage = (p: Point, place: CardPlace): Point => ({
  x: 960 + (p.x - 960) * place.scale + place.x,
  y: p.y * place.scale + place.y,
});

/** The inverse: where a stage point sits inside the placed card (so chips can fly from the line). */
export const stageToCard = (p: Point, place: CardPlace): Point => ({
  x: 960 + (p.x - place.x - 960) / place.scale,
  y: (p.y - place.y) / place.scale,
});

export const takeoverLayout = (missCount: number): TakeoverLayout => {
  if (missCount <= 0) {
    const card = { x: 0, y: 20, scale: 0.9 };
    return { card, cardBottom: CARD_BOTTOM, answer: { cx: 960, top: 780, size: 270 }, misses: null };
  }
  const card = { x: -320, y: 110, scale: 0.6 };
  const answer = { cx: 640, top: 640, size: 290 };
  // The column is centred on the left-hand group (stamp to answer), never above title-safe + a margin.
  const rows = Math.min(6, missCount);
  const slot = { labelHeight: 44, rowHeight: 118, rowGap: 16 };
  const height = slot.labelHeight + rows * slot.rowHeight + (rows - 1) * slot.rowGap;
  const middle = (card.y + 40 + answer.top + answer.size * 0.8) / 2;
  const top = Math.max(130, Math.round(middle - height / 2));
  return { card, cardBottom: CARD_BOTTOM, answer, misses: { left: 1240, top, width: SAFE.right - 1240, ...slot } };
};
