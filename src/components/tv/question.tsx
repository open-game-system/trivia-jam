import { motion } from "framer-motion";
import type { ReactNode } from "react";
import { InkToken, Slug } from "./print";
import { InkTimer } from "./timer";
import { inkForIndex, optionLetter } from "./tv-model";

type TvPlayer = { id: string; name: string };

export const questionFontSize = (text: string, compact: boolean): number => {
  const n = text.length;
  const size = n <= 40 ? 110 : n <= 70 ? 96 : n <= 110 ? 84 : 72;
  return compact ? Math.min(size, 80) : size;
};

/** "QUESTION 2 OF 5" reversed out of a solid ink block, like a print job's slug. */
export const QuestionSlug = ({ number, total, extra }: { number: number; total: number; extra?: string }) => (
  <div className="flex items-center gap-5">
    <Slug>
      <span style={{ background: "var(--ink)", color: "var(--paper)", padding: "12px 20px", display: "inline-block" }}>
        Question {number}
        {total > 0 ? ` of ${total}` : ""}
      </span>
    </Slug>
    {extra ? <Slug className="text-blue">{extra}</Slug> : null}
  </div>
);

const TILE_INKS = [0, 1, 2, 3].map((i) => inkForIndex(i));

/** Four printed answer tiles, one ink each. In the reveal, tokens stack on the tiles. */
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
      const ink = TILE_INKS[i % TILE_INKS.length];
      const isRight = correctIndex === i;
      const dimmed = correctIndex !== undefined && !isRight;
      return (
        <motion.div
          key={`${i}-${option}`}
          initial={{ y: 40, opacity: 0 }}
          animate={{ y: 0, opacity: dimmed ? 0.32 : 1 }}
          transition={{ duration: 0.45, delay: correctIndex === undefined ? 0.25 + i * 0.08 : 0, ease: [0.2, 0.9, 0.2, 1.15] }}
          className="relative flex items-center"
          style={{
            height,
            background: "var(--paper-2)",
            border: "5px solid var(--ink)",
            boxShadow: `9px 9px 0 ${ink.color}`,
          }}
          data-testid={`tv-option-${i}`}
        >
          <span
            className="tv-display flex items-center justify-center h-full"
            style={{ width: height, background: ink.color, color: ink.on, fontSize: 84, borderRight: "5px solid var(--ink)" }}
          >
            {optionLetter(i)}
          </span>
          <span className="tv-display px-8 flex-1" style={{ fontSize: 54, lineHeight: 1, letterSpacing: "-0.015em" }}>
            {option}
          </span>
          {tokens?.[i] ? <span className="absolute flex gap-2" style={{ right: 20, top: -38 }}>{tokens[i]}</span> : null}
          {isRight ? (
            <motion.span
              className="tv-stamp absolute"
              style={{ right: 24, bottom: 18, color: "var(--teal)", fontSize: 40, background: "var(--paper)" }}
              initial={{ scale: 2.2, opacity: 0, rotate: -18 }}
              animate={{ scale: [2.2, 0.88, 1], opacity: 1, rotate: -8 }}
              transition={{ duration: 0.45, times: [0, 0.6, 1] }}
            >
              Right!
            </motion.span>
          ) : null}
        </motion.div>
      );
    })}
  </div>
);

/** One token per player: outline while thinking, stamped solid when they lock in. Never their answer. */
export const LockInTokens = ({
  players,
  answeredIds,
}: {
  players: TvPlayer[];
  answeredIds: ReadonlySet<string>;
}) => {
  const size = players.length > 8 ? 84 : 100;
  return (
    <div className="flex items-start gap-6 flex-wrap">
      {players.map((p, i) => {
        const locked = answeredIds.has(p.id);
        return (
          <div key={p.id} className="flex flex-col items-center" style={{ width: size + 56 }} data-testid={`tv-lock-${p.id}`}>
            <motion.div
              key={locked ? "locked" : "thinking"}
              initial={locked ? { scale: 1.5, rotate: -12, y: -30 } : false}
              animate={locked ? { scale: [1.5, 0.82, 1.06, 1], rotate: 0, y: 0 } : { y: [0, -4, 0] }}
              transition={
                locked
                  ? { duration: 0.45, times: [0, 0.5, 0.8, 1] }
                  : { duration: 2.4, repeat: Infinity, delay: i * 0.3, ease: "easeInOut" }
              }
            >
              <InkToken name={p.name} inkIndex={i} size={size} filled={locked} />
            </motion.div>
            <span
              className="tv-display text-[36px] mt-2 truncate max-w-full"
              style={{ lineHeight: 1.1, letterSpacing: "-0.01em", opacity: locked ? 1 : 0.55 }}
            >
              {p.name}
            </span>
          </div>
        );
      })}
    </div>
  );
};

/** A faint printed number line: where the guesses will land when the answer comes in. */
const GhostLine = () => (
  <div aria-hidden="true" className="absolute" style={{ left: 96, right: 96, top: 700, height: 60 }}>
    <svg className="absolute inset-0" width="1728" height="60" style={{ overflow: "visible" }}>
      <line x1="0" y1="30" x2="1728" y2="30" stroke="var(--blue)" strokeWidth="6" strokeDasharray="2 18" strokeLinecap="round" />
      {Array.from({ length: 9 }, (_, i) => (
        <line key={i} x1={i * 216} y1="12" x2={i * 216} y2="48" stroke="var(--blue)" strokeWidth="6" opacity="0.45" />
      ))}
    </svg>
    <motion.span
      className="tv-display absolute flex items-center justify-center"
      style={{ left: 820, top: -34, width: 88, height: 88, borderRadius: 999, background: "var(--pink)", color: "var(--ink)", fontSize: 60, border: "5px solid var(--ink)" }}
      animate={{ x: [-260, 300, -120, 160, -260] }}
      transition={{ duration: 14, repeat: Infinity, ease: "easeInOut" }}
    >
      ?
    </motion.span>
  </div>
);

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
  return (
    <motion.div
      key="question"
      className="absolute inset-0"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.25 }}
    >
      <motion.div
        className="absolute"
        style={{ left: 96, top: 72 }}
        initial={{ x: -80, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ duration: 0.45, ease: [0.2, 0.9, 0.2, 1.15] }}
      >
        <QuestionSlug number={number} total={total} />
      </motion.div>

      <div className="absolute" style={{ right: 96, top: 56 }}>
        <InkTimer remaining={remaining} total={timeWindow} />
      </div>

      <div
        className="absolute flex flex-col"
        style={{
          left: 96,
          right: hasOptions ? 96 : 420,
          top: hasOptions ? 180 : 170,
          bottom: hasOptions ? 300 : 400,
          justifyContent: hasOptions ? "flex-start" : "center",
        }}
      >
        <motion.h2
          className="tv-display text-ink"
          style={{ fontSize, lineHeight: 1.02, letterSpacing: "-0.025em", maxWidth: hasOptions ? 1340 : 1400 }}
          initial={{ y: 50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.55, ease: [0.2, 0.9, 0.2, 1.15], delay: 0.1 }}
        >
          {text}
        </motion.h2>
        {hasOptions ? (
          <div className="mt-10">
            <OptionTiles options={options} height={128} />
          </div>
        ) : (
          <Slug className="mt-10 text-blue">Guess the number on your phone</Slug>
        )}
      </div>

      {hasOptions ? null : <GhostLine />}

      <div className="absolute" style={{ left: 96, right: 96, bottom: 48 }}>
        <div className="tv-rule mb-5" />
        <Slug className="mb-5 text-ink">
          {`Answers Submitted: ${answeredIds.size} / ${players.length}`}
        </Slug>
        <LockInTokens players={players} answeredIds={answeredIds} />
      </div>
    </motion.div>
  );
};
