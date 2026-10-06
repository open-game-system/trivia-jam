/**
 * The finale's running order, in seconds from game over (halved with reduced motion). About 16 s:
 * a title card opens the finale and is wiped off; the podium rises 3rd, 2nd, then 1st as a mystery
 * ("1st ?"); 2nd and 3rd count up; the winner takes over the whole screen; as the takeover clears,
 * 1st is revealed on the podium and the title lands; then the awards come in along the bottom, one
 * at a time; then a calm "thanks for playing" hold.
 */
export const FINALE_AT = {
  opener: 0,
  openerOut: 1.15,
  third: 1.5,
  second: 2.4,
  first: 3.4,
  count: 4.5,
  countFor: 1.6,
  takeover: 6.6,
  title: 9.4,
  /** 1st steps out from behind the "?" as the takeover clears. */
  reveal: 9.4,
  awards: 10.4,
  awardGap: 1.2,
  calm: 15.6,
} as const;

/** The winner takeover, ms from game over: the moment the finale fanfare should hit. */
export const FINALE_TAKEOVER_MS = FINALE_AT.takeover * 1000;

/** The takeover for this TV: halved with reduced motion, like the rest of the finale. */
export const finaleTakeoverMs = (reducedMotion: boolean): number => FINALE_TAKEOVER_MS * (reducedMotion ? 0.5 : 1);
