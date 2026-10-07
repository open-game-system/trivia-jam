/**
 * Shared-element hand-off between TV screens. Pure geometry plus a one-slot mailbox: the outgoing
 * screen leaves the box its element last occupied; the incoming screen reads it and starts its
 * own element there, then moves it home.
 */
export type Box = { x: number; y: number; w: number; h: number };

/** The transform (origin top-left) that draws an element whose home is `to` exactly over `from`. */
export const flipFrom = (from: Box, to: Box): { x: number; y: number; scale: number } => {
  const scale = to.w > 0 ? from.w / to.w : 1;
  return { x: from.x - to.x, y: from.y - to.y, scale };
};

const mailbox = new Map<string, Box>();

export const leaveBox = (key: string, box: Box): void => {
  mailbox.set(key, box);
};

/** The box last left under `key` (read during render, so it never mutates the mailbox). */
export const peekBox = (key: string): Box | undefined => mailbox.get(key);

/** An element's box in stage pixels (the stage is scaled to the screen). */
export const stageBox = (el: Element): Box | undefined => {
  const sheet = el.closest(".tv-sheet");
  if (!(sheet instanceof HTMLElement)) return undefined;
  const s = sheet.getBoundingClientRect();
  const scale = sheet.offsetWidth > 0 ? s.width / sheet.offsetWidth : 1;
  const r = el.getBoundingClientRect();
  return { x: (r.left - s.left) / scale, y: (r.top - s.top) / scale, w: r.width / scale, h: r.height / scale };
};
