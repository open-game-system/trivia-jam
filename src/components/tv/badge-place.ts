/**
 * Where a "+N" points badge sits on the winners card. Pure, poster pixels.
 *
 * The badge rides its own layer, anchored top-right of its token, and obeys one rule: it never
 * covers a name, a total, another token, another badge, the stamp, or its own token's initial.
 * Candidates are tried in order (straddling the rim, above the rim, beside the token, above the
 * centre); the first that clears every obstacle wins, else the one that covers least.
 */
import type { WinnersLayout } from "./winners-layout";

export type Rect = { x: number; y: number; w: number; h: number };

const MARGIN = 6;

export const overlaps = (a: Rect, b: Rect): boolean =>
  a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;

const overlapArea = (a: Rect, b: Rect): number =>
  Math.max(0, Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x)) * Math.max(0, Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y));

const grow = (r: Rect, by: number): Rect => ({ x: r.x - by, y: r.y - by, w: r.w + 2 * by, h: r.h + 2 * by });

/** The badge's font and box for "+N" on a chip of this size. */
export const badgeSize = (points: number, chip: number): { font: number; w: number; h: number } => {
  const font = Math.round(Math.min(84, Math.max(44, chip * 0.34)));
  const chars = `+${points}`.length;
  return { font, w: Math.ceil(chars * font * 0.62 + 2 * 14 + 12), h: Math.ceil(font + 4 + 12) };
};

/** The square around a token's initial: a badge never sits on it. */
export const letterZone = (token: { cx: number; top: number; size: number }): Rect => ({
  x: token.cx - token.size * 0.28,
  y: token.top + token.size * 0.22,
  w: token.size * 0.56,
  h: token.size * 0.56,
});

export const placeBadge = (
  token: { cx: number; top: number; size: number },
  badge: { w: number; h: number },
  obstacles: ReadonlyArray<Rect>,
): Rect => {
  const { cx, top, size } = token;
  const right = cx + size * 0.28 + MARGIN + 2;
  const candidates: Rect[] = [
    { x: right, y: top - badge.h * 0.3, w: badge.w, h: badge.h },
    { x: right, y: top, w: badge.w, h: badge.h },
    { x: right, y: top - badge.h - 4, w: badge.w, h: badge.h },
    { x: cx + size / 2 + 4, y: top + size * 0.5 - badge.h, w: badge.w, h: badge.h },
    { x: cx + size / 2 + 4, y: top + size - badge.h, w: badge.w, h: badge.h },
    { x: cx - badge.w / 2, y: top - badge.h - 4, w: badge.w, h: badge.h },
    { x: cx - size / 2 - 4 - badge.w, y: top + size * 0.5 - badge.h, w: badge.w, h: badge.h },
  ];
  const blocked = [letterZone(token), ...obstacles].map((o) => grow(o, MARGIN));
  const cost = (c: Rect) => blocked.reduce((sum, o) => sum + overlapArea(c, o), 0) + (c.x < 0 || c.x + c.w > 1920 ? 1e9 : 0);
  return candidates.find((c) => cost(c) === 0) ?? [...candidates].sort((a, b) => cost(a) - cost(b))[0];
};

export type WinnerRects = { id: string; token: Rect; letter: Rect; name: Rect; total: Rect; badge: Rect; font: number };

/**
 * Every rect the winners card prints, with each badge placed against all the others.
 * `stampBottom`: the bottom of the EXACT / CLOSEST / GOT IT stamp row, centred on the frame.
 */
export const winnerCardRects = (
  winners: ReadonlyArray<{ id: string; name: string; points: number }>,
  layout: WinnersLayout,
  stampBottom: number,
): WinnerRects[] => {
  const byId = new Map(winners.map((w) => [w.id, w]));
  const nameTop = layout.chipTop + layout.chip + 18;
  const totalTop = nameTop + layout.name * 1.05 + 14;
  const base = layout.spots.flatMap((spot) => {
    const w = byId.get(spot.id);
    if (!w) return [];
    const token = { cx: spot.x, top: layout.chipTop, size: layout.chip };
    const nameW = Math.min(1000, w.name.length * layout.name * 0.66);
    return [
      {
        id: spot.id,
        points: w.points,
        tokenPos: token,
        token: { x: spot.x - layout.chip / 2, y: layout.chipTop, w: layout.chip, h: layout.chip },
        letter: letterZone(token),
        name: { x: spot.x - nameW / 2, y: nameTop, w: nameW, h: layout.name * 1.05 },
        total: { x: spot.x - 110, y: totalTop, w: 220, h: layout.total },
      },
    ];
  });
  const stamp: Rect = { x: 960 - 420, y: 0, w: 840, h: stampBottom };
  const fixed = [stamp, ...base.flatMap((b) => [b.name, b.total])];
  const placed: WinnerRects[] = [];
  for (const b of base) {
    const size = badgeSize(b.points, layout.chip);
    const others = base.filter((o) => o.id !== b.id).map((o) => o.token);
    const badge = placeBadge(b.tokenPos, size, [...fixed, ...others, ...placed.map((p) => p.badge)]);
    placed.push({ id: b.id, token: b.token, letter: b.letter, name: b.name, total: b.total, badge, font: size.font });
  }
  return placed;
};
