import { motion, useReducedMotion } from "framer-motion";
import { useEffect, useMemo, useState } from "react";
import type { Question, QuestionResult } from "~/game.types";
import { type Award, computeAwards } from "./awards";
import { InkToken, RisoType, Slug } from "./print";
import { Sunburst } from "./sunburst";
import { joinNames } from "./tv-model";

type FinalPlayer = { id: string; name: string; score: number };

const INKS = ["var(--pink)", "var(--blue)", "var(--yellow)", "var(--teal)"];

/** Seconds into the finale for each beat (halved with reduced motion). */
const AT = { third: 0.3, second: 1.0, first: 1.7, takeover: 2.9, title: 4.7, awards: 5.4, calm: 11 } as const;

/** Deterministic pseudo-random so the confetti sheet is the same on every TV. */
const seeded = (seed: number) => {
  let s = seed;
  return () => {
    s = (s * 16807) % 2147483647;
    return s / 2147483647;
  };
};

type Scrap = { x: number; size: number; ink: string; shape: "rect" | "dot" | "tri"; delay: number; spin: number; drift: number; fall: number };

/** Confetti as printed paper scraps in the four inks, overprinting where they cross. */
const PaperConfetti = ({ count, start }: { count: number; start: number }) => {
  const scraps = useMemo<Scrap[]>(() => {
    const rnd = seeded(7);
    return Array.from({ length: count }, (_, i) => ({
      x: rnd() * 1920,
      size: 18 + rnd() * 26,
      ink: INKS[i % INKS.length],
      shape: (["rect", "dot", "tri"] as const)[Math.floor(rnd() * 3)],
      delay: start + rnd() * 1.6,
      spin: (rnd() - 0.5) * 720,
      drift: (rnd() - 0.5) * 260,
      fall: 3.2 + rnd() * 2.2,
    }));
  }, [count, start]);
  return (
    <div aria-hidden="true" className="absolute inset-0 pointer-events-none" style={{ zIndex: 60 }}>
      {scraps.map((c, i) => (
        <motion.svg
          key={i}
          width={c.size}
          height={c.size}
          viewBox="0 0 10 10"
          className="absolute overprint"
          style={{ left: c.x, top: -60 }}
          initial={{ y: 0, x: 0, rotate: 0, opacity: 0 }}
          animate={{ y: 1220, x: c.drift, rotate: c.spin, opacity: [0, 1, 1, 1] }}
          transition={{ duration: c.fall, delay: c.delay, ease: [0.3, 0.1, 0.6, 1] }}
        >
          {c.shape === "rect" ? (
            <rect x="0" y="2" width="10" height="6" fill={c.ink} />
          ) : c.shape === "dot" ? (
            <circle cx="5" cy="5" r="5" fill={c.ink} />
          ) : (
            <polygon points="5,0 10,10 0,10" fill={c.ink} />
          )}
        </motion.svg>
      ))}
    </div>
  );
};

const FLOOR = 900;
const BLOCK = 372;
const GAP = 30;
/** The podium is drawn centred, then slides left to make room for the awards. */
const PODIUM_LEFT = 96;
const PODIUM_WIDTH = BLOCK * 3 + GAP * 2;
const CENTRE_SHIFT = (1920 - PODIUM_WIDTH) / 2 - PODIUM_LEFT;

const PODIUM = [
  { place: 2, slot: 0, height: 360, ink: "var(--blue)", on: "var(--paper)", at: AT.second, label: "2nd" },
  { place: 1, slot: 1, height: 450, ink: "var(--pink)", on: "var(--ink)", at: AT.first, label: "1st" },
  { place: 3, slot: 2, height: 300, ink: "var(--teal)", on: "var(--paper)", at: AT.third, label: "3rd" },
] as const;

const PodiumStep = ({
  step,
  player,
  inkIndex,
  speed,
}: {
  step: (typeof PODIUM)[number];
  player: FinalPlayer;
  inkIndex: number;
  speed: number;
}) => {
  const first = step.place === 1;
  const token = first ? 132 : 104;
  return (
    <motion.div
      className="absolute flex flex-col items-center"
      style={{
        left: PODIUM_LEFT + step.slot * (BLOCK + GAP),
        top: FLOOR - step.height,
        width: BLOCK,
        height: step.height,
        background: step.ink,
        border: "6px solid var(--ink)",
        boxShadow: `10px 10px 0 ${first ? "var(--yellow)" : "var(--ink)"}`,
        transformOrigin: "bottom",
        paddingTop: 22,
      }}
      initial={{ scaleY: 0 }}
      animate={{ scaleY: 1 }}
      transition={{ delay: step.at * speed, type: "spring", stiffness: 260, damping: 16 }}
      data-testid={`player-score-${player.id}`}
    >
      <span aria-hidden="true" className="absolute inset-0 halftone-ink" style={{ opacity: 0.22 }} />
      <motion.div
        className="relative flex flex-col items-center"
        initial={{ scale: 2.2, opacity: 0, y: -50 }}
        animate={{ scale: [2.2, 0.86, 1.04, 1], opacity: 1, y: 0 }}
        transition={{ delay: (step.at + 0.3) * speed, duration: 0.5, times: [0, 0.55, 0.8, 1] }}
      >
        <span className="slug" style={{ fontSize: 34, color: step.on, lineHeight: 1 }}>
          {step.label}
        </span>
        <span className="mt-3" style={{ borderRadius: 999, boxShadow: "0 0 0 6px var(--paper)" }}>
          <InkToken name={player.name} inkIndex={inkIndex} size={token} />
        </span>
        <span
          className="tv-display truncate text-center mt-3"
          style={{ fontSize: first ? 72 : 58, lineHeight: 1.02, maxWidth: BLOCK - 28, letterSpacing: "-0.015em", color: step.on }}
        >
          {player.name}
        </span>
        <span className="tv-display tabular" style={{ fontSize: first ? 60 : 50, lineHeight: 1, color: step.on }}>
          {player.score}
          <span className="slug" style={{ fontSize: 30 }}>
            {" "}pts
          </span>
        </span>
      </motion.div>
    </motion.div>
  );
};

const AwardCard = ({ award, index, speed }: { award: Award; index: number; speed: number }) => (
  <motion.div
    className="relative flex flex-col justify-center px-7"
    style={{ height: 178, background: "var(--paper-2)", border: "5px solid var(--ink)", boxShadow: `9px 9px 0 ${INKS[index % INKS.length]}` }}
    initial={{ x: 520, opacity: 0, rotate: 4 }}
    animate={{ x: 0, opacity: 1, rotate: index % 2 === 0 ? -1.2 : 1 }}
    transition={{ delay: (0.25 + index * 0.45) * speed, duration: 0.5, ease: [0.2, 0.9, 0.2, 1.15] }}
    data-testid={`tv-award-${award.id}`}
  >
    <span className="slug" style={{ fontSize: 30, lineHeight: 1 }}>
      {award.title}
    </span>
    <span className="flex items-baseline gap-4 mt-3 min-w-0">
      <span className="tv-display truncate" style={{ fontSize: 60, lineHeight: 1.05, letterSpacing: "-0.015em" }}>
        {joinNames(award.names)}
      </span>
      <span className="tv-display tabular whitespace-nowrap text-blue" style={{ fontSize: 44, lineHeight: 1 }}>
        {award.detail}
      </span>
    </span>
  </motion.div>
);

/**
 * Game over: the podium stamped 3rd, 2nd, 1st (each player on their block), the winner takes over the
 * screen in huge misregistered type with confetti, recap awards slide in, then a calm "thanks" hold.
 */
export const TvFinale = ({
  players,
  questionResults = [],
  questions = {},
}: {
  players: FinalPlayer[];
  questionResults?: ReadonlyArray<QuestionResult>;
  questions?: Readonly<Record<string, Question>>;
}) => {
  const reduced = useReducedMotion() ?? false;
  const speed = reduced ? 0.5 : 1;
  const inkIndex = new Map(players.map((p, i) => [p.id, i]));
  const ranked = [...players].sort((a, b) => b.score - a.score || (inkIndex.get(a.id) ?? 0) - (inkIndex.get(b.id) ?? 0));
  const winner = ranked[0];
  const rest = ranked.slice(3);
  const awards = useMemo(() => computeAwards(questionResults, questions).slice(0, 3), [questionResults, questions]);
  const hasAwards = awards.length > 0;
  const [beat, setBeat] = useState<"podium" | "awards" | "calm">("podium");
  useEffect(() => {
    const timers = [setTimeout(() => setBeat("awards"), AT.awards * 1000 * speed), setTimeout(() => setBeat("calm"), AT.calm * 1000 * speed)];
    return () => timers.forEach(clearTimeout);
  }, [speed]);
  const slid = hasAwards && beat !== "podium";
  const winnerLine = winner ? `${winner.name} Wins!` : "Game Over!";
  const titleSize = winnerLine.length <= 12 ? 150 : winnerLine.length <= 18 ? 120 : 92;
  const takeoverSize = winner ? (winner.name.length <= 5 ? 420 : winner.name.length <= 9 ? 280 : 180) : 200;
  return (
    <motion.div key="finale" className="absolute inset-0" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <Sunburst size={1800} x={960} y={600} rays={30} />
      <div className="absolute flex items-center justify-between" style={{ left: 96, right: 96, top: 48, zIndex: 50 }} data-testid="game-over-title">
        <Slug>
          <span style={{ background: "var(--ink)", color: "var(--paper)", padding: "12px 20px", display: "inline-block" }}>Game over</span>
        </Slug>
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: beat === "calm" ? 1 : 0 }} transition={{ duration: 1.2 }}>
          <Slug className="text-blue">Thanks for playing</Slug>
        </motion.div>
      </div>

      {winner ? (
        <motion.div
          className="absolute text-center"
          style={{ left: 0, right: 0, top: 112, zIndex: 50 }}
          initial={{ opacity: 0, y: -30 }}
          animate={{ opacity: 1, y: 0, x: slid ? PODIUM_LEFT + PODIUM_WIDTH / 2 - 960 : 0 }}
          transition={{ opacity: { delay: AT.title * speed, duration: 0.3 }, y: { delay: AT.title * speed, duration: 0.4 }, x: { duration: 0.6, ease: [0.2, 0.9, 0.2, 1.1] } }}
          data-testid="winner-announcement"
        >
          <span className="tv-display" style={{ fontSize: titleSize }}>
            <RisoType top="var(--blue)" under="var(--pink)" offset={12} rough>
              {winnerLine}
            </RisoType>
          </span>
          <span className="tv-sr">with {winner.score} points</span>
        </motion.div>
      ) : null}

      <motion.div
        className="absolute inset-0"
        initial={{ x: CENTRE_SHIFT }}
        animate={{ x: slid ? 0 : CENTRE_SHIFT }}
        transition={{ duration: 0.7, ease: [0.2, 0.9, 0.2, 1.1] }}
      >
        {PODIUM.map((step) => {
          const player = ranked[step.place - 1];
          return player ? <PodiumStep key={step.place} step={step} player={player} inkIndex={inkIndex.get(player.id) ?? 0} speed={speed} /> : null;
        })}
      </motion.div>

      {hasAwards ? (
        <div className="absolute flex flex-col" style={{ left: 1300, right: 96, top: 330, gap: 26, zIndex: 30 }}>
          {beat !== "podium" ? awards.map((a, i) => <AwardCard key={a.id} award={a} index={i} speed={speed} />) : null}
        </div>
      ) : null}

      <div className="absolute" style={{ left: 0, right: 0, top: FLOOR, height: 6, background: "var(--ink)" }} />
      <div className="absolute flex items-center gap-8" style={{ left: 96, right: 96, top: FLOOR + 40 }}>
        <Slug className="text-ink whitespace-nowrap" testId="final-scores-heading">
          Final scores
        </Slug>
        {rest.slice(0, 4).map((p, i) => (
          <span key={p.id} className="flex items-center gap-3" data-testid={`player-score-${p.id}`}>
            <span className="slug text-[30px]">{i + 4}</span>
            <InkToken name={p.name} inkIndex={inkIndex.get(p.id) ?? 0} size={56} />
            <span className="tv-display text-[40px] truncate" style={{ maxWidth: 200, letterSpacing: "-0.01em" }}>
              {p.name}
            </span>
            <span className="tv-display tabular text-[40px] text-blue">{p.score}</span>
          </span>
        ))}
        {rest.length > 4 ? <span className="slug text-[30px]">+{rest.length - 4} more</span> : null}
      </div>

      {winner ? (
        <motion.div
          aria-hidden="true"
          className="absolute inset-0 flex items-center justify-center pointer-events-none"
          style={{ zIndex: 55 }}
          initial={{ opacity: 0 }}
          animate={{ opacity: [0, 1, 1, 0] }}
          transition={{ delay: AT.takeover * speed, duration: (AT.title - AT.takeover) * speed, times: [0, 0.08, 0.82, 1] }}
        >
          <div className="absolute inset-0" style={{ background: "var(--yellow)", mixBlendMode: "multiply" }} />
          <Sunburst size={2200} x={960} y={540} rays={26} fill="url(#tv-dots-pink)" spin={false} />
          <motion.span
            className="tv-display relative whitespace-nowrap"
            style={{ fontSize: takeoverSize, lineHeight: 0.9 }}
            initial={{ scale: 2.4, rotate: -10 }}
            animate={{ scale: [2.4, 0.9, 1.04, 1], rotate: -4 }}
            transition={{ delay: AT.takeover * speed, duration: 0.55, times: [0, 0.55, 0.8, 1] }}
          >
            <RisoType top="var(--blue)" under="var(--pink)" offset={18} rough>
              {winner.name}
            </RisoType>
          </motion.span>
        </motion.div>
      ) : null}

      <PaperConfetti count={reduced ? 40 : 100} start={AT.takeover * speed} />
    </motion.div>
  );
};

