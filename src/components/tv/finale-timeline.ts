/**
 * The finale's running order, in seconds from game over (halved with reduced motion). About 20 s:
 * the podium rises 3rd, 2nd, 1st; the scores count up; the winner takes over; the title lands;
 * the awards are stamped one at a time; then a calm "thanks for playing" hold.
 */
export const FINALE_AT = {
  third: 0.5,
  second: 1.5,
  first: 2.6,
  count: 3.8,
  countFor: 1.8,
  takeover: 6.2,
  title: 9.2,
  awards: 10.0,
  awardGap: 1.8,
  calm: 16.0,
} as const;
