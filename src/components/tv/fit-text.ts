/**
 * How big a name can be set in its box: full size if it fits, shrunk in proportion if not,
 * and at the floor it wraps to a second line rather than shrinking further. Never an ellipsis.
 */
export const fitText = ({
  naturalWidth,
  max,
  floor,
  box,
  words = 2,
}: {
  /** Width of the text set on one line at `max`. */
  naturalWidth: number;
  max: number;
  floor: number;
  box: number;
  /** Words in the text: one word cannot wrap, so it shrinks below the floor rather than break. */
  words?: number;
}): { size: number; wrap: boolean } => {
  if (naturalWidth <= 0 || box <= 0 || naturalWidth <= box) return { size: max, wrap: false };
  const exact = (max * box) / naturalWidth;
  if (exact < floor) return words > 1 ? { size: floor, wrap: true } : { size: Math.floor(exact), wrap: false };
  return { size: Math.max(floor, Math.floor(exact)), wrap: false };
};
