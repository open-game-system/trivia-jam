/** Small pure pieces of the reveal's geometry and copy, unit-tested. Poster pixels. */
import { REVEAL_FRAME } from "./number-line-layout";

/** "B · Blue whale": the letter and the answer as two words with a real break, never "B Blue whale". */
export const choiceAnswerText = (letter: string, text: string): string => `${letter} · ${text}`;

/** The bottom of the axis tick labels (tick from axisY - 18, 36 px stick, 8 px gap, 38 px label). */
export const TICK_LABEL_BOTTOM = REVEAL_FRAME.axisY - 18 + 36 + 8 + 38;

/** The "?" puck travels under the axis, below the tick labels, pointing up at the line. */
export const PUCK = { size: 84, top: TICK_LABEL_BOTTOM + 8 } as const;
