import { motion, useIsPresent } from "framer-motion";
import { type ReactNode, useLayoutEffect, useRef } from "react";
import { leaveBox, stageBox } from "./flip";
import { FitName } from "./fit-name";
import { EASE_OUT, EASE_POP, GlassToken, Label } from "./glass";
import { GlassTimer } from "./timer";
import { optionLetter } from "./tv-model";

type TvPlayer = { id: string; name: string };

export const questionFontSize = (text: string, compact: boolean): number => {
  const n = text.length;
  const size = n <= 40 ? 110 : n <= 70 ? 96 : n <= 110 ? 84 : 72;
  return compact ? Math.min(size, 80) : size;
};

/** How wide the question text sets, in its own font's pixels (the results header wraps it the same way). */
export const questionMeasure = (hasOptions: boolean): number => (hasOptions ? 1340 : 1400);

/** The hand-off keys: the results screen picks the question text and the placeholder axis up from here. */
export const questionTextKey = (text: string) => `question-text:${text}`;
export const GHOST_AXIS_KEY = "ghost-axis";

/** "QUESTION 2 OF 5" on a small glass pill. */
export const QuestionSlug = ({ number, total, extra }: { number: number; total: number; extra?: string }) => (
  <div className="flex items-center gap-5">
    <span className="tv-glass-pill inline-flex items-center" style={{ padding: "12px 26px" }}>
      <Label className="!text-[color:var(--text-2)]">
        Question {number}
        {total > 0 ? ` of ${total}` : ""}
      </Label>
    </span>
    {extra ? <Label>{extra}</Label> : null}
  </div>
);

/** Four glass answer tiles, lettered. In the reveal, tokens stack on the tiles and the right one lights green. */
export const OptionTiles = ({
  options,
  correctIndex,
  tokens,
  height = 150,
}: {
  options: string[];
  correctIndex?: number;
  tokens?: ReactNode[];
  height?: number;
}) => (
  <div className="grid grid-cols-2 gap-x-10 gap-y-8">
    {options.map((option, i) => {
      const isRight = correctIndex === i;
      const dimmed = correctIndex !== undefined && !isRight;
      return (
        <motion.div
          key={`${i}-${option}`}
          initial={{ y: 24, opacity: 0 }}
          animate={{ y: 0, opacity: dimmed ? 0.32 : 1, scale: isRight ? [1, 1.04, 1] : 1 }}
          transition={{
            duration: 0.42,
            delay: correctIndex === undefined ? 0.25 + i * 0.08 : 0,
            ease: EASE_OUT,
            scale: { duration: 0.45, times: [0, 0.4, 1] },
          }}
          className="relative flex items-center tv-glass"
          style={{
            height,
            borderRadius: 28,
            borderColor: isRight ? "var(--win)" : undefined,
            boxShadow: isRight ? "0 0 0 2px var(--win), 0 0 60px rgba(74, 222, 128, 0.4)" : undefined,
            transition: "border-color .3s, box-shadow .3s",
          }}
          data-testid={`tv-option-${i}`}
        >
          <span className="flex items-center justify-center h-full flex-none" style={{ width: height }}>
            <span
              className="tv-display flex items-center justify-center"
              style={{
                width: height * 0.66,
                height: height * 0.66,
                borderRadius: 999,
                fontSize: height * 0.4,
                background: isRight ? "var(--win-fill)" : "linear-gradient(135deg, #4f46e5, #7e22ce)",
                color: isRight ? "var(--win-ink)" : "var(--text)",
                boxShadow: isRight ? "0 0 30px rgba(74,222,128,.6)" : "0 0 24px rgba(139,92,246,.45)",
              }}
            >
              {optionLetter(i)}
            </span>
          </span>
          <span className="flex-1 pr-8 min-w-0">
            <FitName text={option} max={54} floor={36} box={844 - height - 40} lineHeight={1.05} className="tv-display" style={{ letterSpacing: "-0.02em", color: "var(--text)" }} />
          </span>
          {tokens?.[i] ? <span className="absolute flex gap-2" style={{ right: 20, top: -38 }}>{tokens[i]}</span> : null}
          {isRight ? (
            <motion.span
              className="tv-pill tv-pill--win absolute"
              style={{ left: height - 60, bottom: -30, fontSize: 44, padding: "10px 26px", zIndex: 2 }}
              initial={{ scale: 0.4, opacity: 0, rotate: -2 }}
              animate={{ scale: [0.4, 1.12, 1], opacity: [0, 1, 1], rotate: [-2, -2, -2] }}
              transition={{ duration: 0.42, times: [0, 0.6, 1], ease: EASE_POP }}
            >
              Right!
            </motion.span>
          ) : null}
        </motion.div>
      );
    })}
  </div>
);

/** The lock-in band's token size: big enough to read from the couch, ten across at most. */
export const lockInSize = (count: number): { token: number; slot: number } =>
  count <= 4 ? { token: 140, slot: 300 } : count <= 6 ? { token: 136, slot: 230 } : count <= 8 ? { token: 128, slot: 196 } : { token: 120, slot: 164 };

/** One glass chip per player: a dashed empty seat while thinking, lit and glowing when they lock in. Never their answer. */
export const LockInTokens = ({
  players,
  answeredIds,
}: {
  players: TvPlayer[];
  answeredIds: ReadonlySet<string>;
}) => {
  const { token, slot } = lockInSize(players.length);
  return (
    <div className="flex items-start justify-center" style={{ gap: 16 }}>
      {players.map((p, i) => {
        const locked = answeredIds.has(p.id);
        return (
          <div key={p.id} className="flex flex-col items-center" style={{ width: slot }} data-testid={`tv-lock-${p.id}`}>
            <motion.div
              key={locked ? "locked" : "thinking"}
              style={{ borderRadius: 999 }}
              initial={locked ? { scale: 0.7, y: 10 } : false}
              animate={locked ? { scale: [0.7, 1.12, 1], y: [10, -6, 0] } : { y: [0, -5, 0] }}
              transition={
                locked
                  ? { duration: 0.42, times: [0, 0.55, 1], ease: EASE_OUT }
                  : { duration: 2.4, repeat: Infinity, delay: i * 0.3, ease: "easeInOut" }
              }
            >
              <GlassToken name={p.name} inkIndex={i} size={token} filled={locked} />
            </motion.div>
            <FitName
              text={p.name}
              max={40}
              floor={28}
              box={slot}
              className="tv-name mt-3 text-center"
              style={{ color: locked ? "var(--text)" : "var(--text-3)", transition: "color .3s" }}
            />
          </div>
        );
      })}
    </div>
  );
};

/** A faint glowing number line: where the guesses will land when the answer comes in. */
const GhostLine = ({ leaving }: { leaving: boolean }) => {
  const axis = useRef<HTMLDivElement>(null);
  // Leave the axis's box every render: the results screen grows its number line out of it.
  useLayoutEffect(() => {
    const box = axis.current ? stageBox(axis.current) : undefined;
    if (box && !leaving) leaveBox(GHOST_AXIS_KEY, box);
  });
  return (
  <div aria-hidden="true" className="absolute" style={{ left: 96, right: 96, top: 640, height: 60, opacity: leaving ? 0 : 1 }}>
    <div ref={axis} className="absolute tv-axis" style={{ left: 0, right: 0, top: 27, height: 6, opacity: 0.35 }} />
    {Array.from({ length: 9 }, (_, i) => (
      <span key={i} className="absolute" style={{ left: i * 216 - 2, top: 18, width: 4, height: 24, borderRadius: 4, background: "rgba(255,255,255,.18)" }} />
    ))}
    <motion.span
      className="tv-display tv-glass-pill absolute flex items-center justify-center"
      style={{ left: 820, top: -14, width: 88, height: 88, fontSize: 52, color: "var(--glow)", boxShadow: "0 0 40px rgba(196,181,253,.35)" }}
      animate={{ x: [-260, 300, -120, 160, -260] }}
      transition={{ duration: 14, repeat: Infinity, ease: "easeInOut" }}
    >
      ?
    </motion.span>
  </div>
  );
};

/** Height of the lock-in band along the bottom of the question screen. */
const BAND_HEIGHT = 330;

export const TvQuestion = ({
  text,
  options,
  number,
  total,
  players,
  answeredIds,
  remaining,
  timeWindow,
}: {
  text: string;
  options?: string[];
  number: number;
  total: number;
  players: TvPlayer[];
  answeredIds: ReadonlySet<string>;
  remaining: number;
  timeWindow: number;
}) => {
  const hasOptions = options !== undefined && options.length > 0;
  const fontSize = questionFontSize(text, hasOptions);
  // When the results arrive this screen leaves (under AnimatePresence): its question text and placeholder
  // axis are handed to the results screen at once, the rest fades out underneath.
  const present = useIsPresent();
  const heading = useRef<HTMLHeadingElement>(null);
  const leave = () => {
    const box = heading.current ? stageBox(heading.current) : undefined;
    if (box && present) leaveBox(questionTextKey(text), box);
  };
  useLayoutEffect(leave);
  return (
    <motion.div
      key="question"
      className="absolute inset-0"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, transition: { duration: 0.32, ease: "easeOut" } }}
      transition={{ duration: 0.25 }}
    >
      <motion.div
        className="absolute"
        style={{ left: 96, top: 72 }}
        initial={{ y: -12, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.4, ease: EASE_OUT }}
      >
        <QuestionSlug number={number} total={total} />
      </motion.div>

      <div className="absolute" style={{ right: 96, top: 56 }}>
        <GlassTimer remaining={remaining} total={timeWindow} />
      </div>

      <div
        className="absolute flex flex-col"
        style={{
          left: 96,
          right: hasOptions ? 96 : 420,
          top: 170,
          bottom: hasOptions ? BAND_HEIGHT + 20 : 460,
          justifyContent: hasOptions ? "flex-start" : "center",
        }}
      >
        <motion.h2
          ref={heading}
          className="tv-display lav-text"
          style={{ fontSize, lineHeight: 1.06, letterSpacing: "-0.03em", maxWidth: questionMeasure(hasOptions), paddingBottom: "0.08em", visibility: present ? "visible" : "hidden" }}
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.5, ease: EASE_OUT, delay: 0.1 }}
          onAnimationComplete={leave}
        >
          {text}
        </motion.h2>
        {hasOptions ? (
          <div className="mt-10">
            <OptionTiles options={options} height={128} />
          </div>
        ) : (
          <Label className="mt-8" size={40}>
            Guess the number on your phone
          </Label>
        )}
      </div>

      {hasOptions ? null : <GhostLine leaving={!present} />}

      {/* The lock-in band: a glass shelf along the bottom; each player's chip lights up as they lock in. */}
      <div className="absolute tv-glass" style={{ left: 48, right: 48, bottom: 32, height: BAND_HEIGHT - 32, borderRadius: 32 }}>
        <div className="absolute flex items-center justify-between" style={{ left: 48, right: 48, top: 22 }}>
          <Label>{`Answers Submitted: ${answeredIds.size} / ${players.length}`}</Label>
        </div>
        <div className="absolute" style={{ left: 48, right: 48, top: 72 }}>
          <LockInTokens players={players} answeredIds={answeredIds} />
        </div>
      </div>
    </motion.div>
  );
};
