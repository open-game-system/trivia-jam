import { motion, useReducedMotion } from "framer-motion";
import { useEffect, useMemo, useState } from "react";
import type { Question, QuestionResult } from "~/game.types";
import { type Award, computeAwards } from "./awards";
import { FINALE_AT as AT } from "./finale-timeline";
import { FitName } from "./fit-name";
import { InkToken, RisoType, Slug } from "./print";
import { RollingNumber } from "./standings";
import { Sunburst } from "./sunburst";
import { joinNames } from "./tv-model";

type FinalPlayer = { id: string; name: string; score: number };

const INKS = ["var(--pink)", "var(--blue)", "var(--yellow)", "var(--teal)"];

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

const FLOOR = 940;
const BLOCK = 380;
const GAP = 30;
const PODIUM_WIDTH = BLOCK * 3 + GAP * 2;
/** The awards column is reserved from frame 0, so nothing moves when the awards land. */
const AWARDS_WIDTH = 500;
const AWARDS_RIGHT = 80;
const AWARDS_LEFT = 1920 - AWARDS_RIGHT - AWARDS_WIDTH;
/** The headline is centred over the podium as one group and never runs into the awards column. */
const HEADLINE_BOX = PODIUM_WIDTH - 20;
const podiumLeftFor = (hasAwards: boolean) => (hasAwards ? (AWARDS_LEFT - PODIUM_WIDTH) / 2 : (1920 - PODIUM_WIDTH) / 2);

const PODIUM = [
  { place: 2, slot: 0, height: 450, ink: "var(--blue)", on: "var(--paper)", at: AT.second, label: "2nd" },
  { place: 1, slot: 1, height: 550, ink: "var(--pink)", on: "var(--ink)", at: AT.first, label: "1st" },
  { place: 3, slot: 2, height: 390, ink: "var(--teal)", on: "var(--paper)", at: AT.third, label: "3rd" },
] as const;

/** A score that sits on 0 until its moment, then counts up to the final total. */
const CountUp = ({ to, atSeconds, live }: { to: number; atSeconds: number; live: boolean }) => {
  const [go, setGo] = useState(!live);
  useEffect(() => {
    if (!live) return;
    const t = setTimeout(() => setGo(true), atSeconds * 1000);
    return () => clearTimeout(t);
  }, [live, atSeconds]);
  return <RollingNumber from={0} to={go ? to : 0} run={live && go} duration={AT.countFor} />;
};

/**
 * A podium block rises out of the floor already printed with its player (no empty slab), lands with a
 * squash, and its score counts up from 0 while the room watches.
 */
const PodiumStep = ({
  step,
  player,
  inkIndex,
  speed,
  left,
}: {
  step: (typeof PODIUM)[number];
  player: FinalPlayer;
  inkIndex: number;
  speed: number;
  left: number;
}) => {
  const first = step.place === 1;
  const token = first ? 150 : 104;
  const rise = step.at * speed;
  return (
    <div
      className="absolute overflow-hidden"
      style={{ left: left + step.slot * (BLOCK + GAP), top: FLOOR - step.height - 40, width: BLOCK + 16, height: step.height + 40 }}
    >
      <motion.div
        className="absolute flex flex-col items-center"
        style={{
          left: 0,
          top: 40,
          width: BLOCK,
          height: step.height,
          background: step.ink,
          border: "6px solid var(--ink)",
          boxShadow: `10px 10px 0 ${first ? "var(--yellow)" : "var(--ink)"}`,
          transformOrigin: "50% 100%",
          paddingTop: 22,
        }}
        initial={{ y: step.height + 60 }}
        animate={{ y: [step.height + 60, -18, 0, 0, 0], scaleY: [1, 1, 0.9, 1.04, 1], scaleX: [1, 1, 1.06, 0.98, 1] }}
        transition={{ delay: rise, duration: (first ? 0.95 : 0.75) * Math.max(speed, 0.6), times: [0, 0.55, 0.72, 0.86, 1], ease: "easeOut" }}
        data-testid={`player-score-${player.id}`}
      >
        <span aria-hidden="true" className="absolute inset-0 halftone-ink" style={{ opacity: 0.2 }} />
        <span className="relative slug" style={{ fontSize: 36, color: step.on, lineHeight: 1 }}>
          {step.label}
        </span>
        <span className="relative mt-3" style={{ borderRadius: 999, boxShadow: "0 0 0 7px var(--paper)" }}>
          <InkToken name={player.name} inkIndex={inkIndex} size={token} />
        </span>
        <FitName
          text={player.name}
          max={first ? 84 : 64}
          box={BLOCK - 44}
          className="tv-display text-center mt-3"
          style={{ letterSpacing: "-0.015em", color: step.on }}
        />
        <span className="relative tv-display tabular" style={{ fontSize: first ? 96 : 76, lineHeight: 1, color: step.on }} aria-hidden="true">
          <CountUp to={player.score} atSeconds={AT.count * speed} live />
        </span>
        <span className="tv-sr">{player.score} points</span>
      </motion.div>
    </div>
  );
};

const STAMP_INKS = [
  { bg: "var(--teal)", fg: "var(--paper)" },
  { bg: "var(--blue)", fg: "var(--paper)" },
  { bg: "var(--pink)", fg: "var(--ink)" },
];

/** One award at a time: the card slides in, then its own stamp slams onto it. */
const AwardCard = ({ award, index, at }: { award: Award; index: number; at: number }) => {
  const stamp = STAMP_INKS[index % STAMP_INKS.length];
  return (
    <motion.div
      className="relative flex flex-col justify-center"
      style={{ minHeight: 200, padding: "22px 28px 20px", background: "var(--paper-2)", border: "6px solid var(--ink)", boxShadow: `10px 10px 0 ${INKS[index % INKS.length]}` }}
      initial={{ x: 640, opacity: 0, rotate: 5 }}
      animate={{ x: 0, opacity: 1, rotate: index % 2 === 0 ? -1.2 : 1 }}
      transition={{ delay: at, duration: 0.5, ease: [0.2, 0.9, 0.2, 1.15] }}
      data-testid={`tv-award-${award.id}`}
    >
      <span className="flex items-center justify-between gap-4">
        <span className="slug whitespace-nowrap" style={{ fontSize: 30, lineHeight: 1 }}>
          {award.title}
        </span>
        <motion.span
          className="tv-stamp tabular flex-none"
          style={{ fontSize: 34, padding: "3px 12px", background: stamp.bg, color: stamp.fg, borderColor: "var(--ink)" }}
          initial={{ scale: 2.6, opacity: 0, rotate: -22 }}
          animate={{ scale: [2.6, 0.86, 1.04, 1], opacity: 1, rotate: -8 }}
          transition={{ delay: at + 0.55, duration: 0.42, times: [0, 0.55, 0.8, 1] }}
        >
          {award.detail}
        </motion.span>
      </span>
      <FitName
        text={joinNames(award.names)}
        max={72}
        box={AWARDS_WIDTH - 12 - 56}
        className="tv-display mt-3"
        style={{ letterSpacing: "-0.015em" }}
      />
    </motion.div>
  );
};

/**
 * Game over, as a ceremony: the podium blocks rise out of the floor 3rd, 2nd, 1st with their players on
 * them, the scores count up, the winner takes over the whole screen with confetti, the title lands, the
 * recap awards are stamped one at a time, then a calm "thanks for playing" hold.
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
  const podiumLeft = podiumLeftFor(hasAwards);
  const groupCentre = podiumLeft + PODIUM_WIDTH / 2;
  const winnerLine = winner ? `${winner.name} Wins!` : "Game Over!";
  const takeoverSize = winner ? (winner.name.length <= 5 ? 440 : winner.name.length <= 9 ? 290 : 220) : 200;
  return (
    <motion.div key="finale" className="absolute inset-0" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <Sunburst size={2000} x={groupCentre} y={620} rays={30} />
      <div className="absolute flex items-center justify-between" style={{ left: 96, right: 96, top: 48, zIndex: 50 }} data-testid="game-over-title">
        <Slug>
          <span style={{ background: "var(--ink)", color: "var(--paper)", padding: "12px 20px", display: "inline-block" }}>Game over</span>
        </Slug>
        <motion.span
          className="tv-display text-blue"
          style={{ fontSize: 60, lineHeight: 1 }}
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: beat === "calm" ? 1 : 0, y: beat === "calm" ? 0 : -10 }}
          transition={{ duration: 1.4, ease: "easeOut" }}
        >
          Thanks for playing
        </motion.span>
      </div>

      {winner ? (
        <motion.div
          className="absolute text-center"
          style={{ left: groupCentre - HEADLINE_BOX / 2, width: HEADLINE_BOX, top: 128, zIndex: 50 }}
          initial={{ opacity: 0, y: -40, scale: 1.4 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{
            opacity: { delay: AT.title * speed, duration: 0.2 },
            y: { delay: AT.title * speed, duration: 0.45, ease: [0.2, 0.9, 0.2, 1.2] },
            scale: { delay: AT.title * speed, duration: 0.45, ease: [0.2, 0.9, 0.2, 1.2] },
          }}
          data-testid="winner-announcement"
        >
          <FitName text={winnerLine} max={156} floor={84} box={HEADLINE_BOX} lineHeight={1.05} className="tv-display">
            {/* Two inks only, a 5 px offset: ink over pink. */}
            <RisoType top="var(--ink)" under="var(--pink)" offset={5}>
              {winnerLine}
            </RisoType>
          </FitName>
          <span className="tv-sr">with {winner.score} points</span>
        </motion.div>
      ) : null}

      <div className="absolute inset-0">
        {PODIUM.map((step) => {
          const player = ranked[step.place - 1];
          return player ? (
            <PodiumStep key={step.place} step={step} player={player} inkIndex={inkIndex.get(player.id) ?? 0} speed={speed} left={podiumLeft} />
          ) : null;
        })}
      </div>

      {hasAwards ? (
        <div className="absolute flex flex-col" style={{ left: AWARDS_LEFT, width: AWARDS_WIDTH, top: 170, bottom: 1080 - FLOOR + 14, justifyContent: "flex-end", gap: 26, zIndex: 30 }}>
          {beat !== "podium" ? awards.map((a, i) => <AwardCard key={a.id} award={a} index={i} at={(0.2 + i * AT.awardGap) * speed} />) : null}
        </div>
      ) : null}

      <div className="absolute" style={{ left: 0, right: 0, top: FLOOR, height: 6, background: "var(--ink)", zIndex: 20 }} />
      <div className="absolute flex items-center gap-8" style={{ left: 96, right: 96, top: FLOOR + 30 }}>
        <Slug className="text-ink whitespace-nowrap" testId="final-scores-heading">
          Final scores
        </Slug>
        {rest.slice(0, 4).map((p, i) => (
          <span key={p.id} className="flex items-center gap-3" data-testid={`player-score-${p.id}`}>
            <span className="slug text-[30px]">{i + 4}</span>
            <InkToken name={p.name} inkIndex={inkIndex.get(p.id) ?? 0} size={56} />
            <FitName text={p.name} max={40} floor={36} box={240} className="tv-display" style={{ letterSpacing: "-0.01em" }} />
            <span className="tv-display tabular text-[40px] text-blue">{p.score}</span>
          </span>
        ))}
        {rest.length > 4 ? <span className="slug text-[30px] whitespace-nowrap">+{rest.length - 4} more</span> : null}
      </div>

      {winner ? (
        <motion.div
          aria-hidden="true"
          className="absolute inset-0 flex items-center justify-center pointer-events-none"
          style={{ zIndex: 55 }}
          initial={{ opacity: 0 }}
          animate={{ opacity: [0, 1, 1, 0] }}
          transition={{ delay: AT.takeover * speed, duration: (AT.title - AT.takeover) * speed, times: [0, 0.06, 0.86, 1] }}
        >
          <div className="absolute inset-0" style={{ background: "var(--yellow)", mixBlendMode: "multiply" }} />
          <Sunburst size={2400} x={960} y={540} rays={26} fill="url(#tv-dots-pink)" spin={false} />
          <motion.span
            className="tv-display relative"
            style={{ lineHeight: 0.9 }}
            initial={{ scale: 2.4, rotate: -10 }}
            animate={{ scale: [2.4, 0.9, 1.04, 1, 1.06], rotate: [-10, -4, -4, -4, -3] }}
            transition={{ delay: AT.takeover * speed, duration: (AT.title - AT.takeover) * speed, times: [0, 0.18, 0.26, 0.32, 1] }}
          >
            <FitName text={winner.name} max={takeoverSize} floor={120} box={1640} lineHeight={1} className="text-center">
              <RisoType top="var(--ink)" under="var(--pink)" offset={6}>
                {winner.name}
              </RisoType>
            </FitName>
          </motion.span>
        </motion.div>
      ) : null}

      <PaperConfetti count={reduced ? 40 : 110} start={AT.takeover * speed} />
    </motion.div>
  );
};
