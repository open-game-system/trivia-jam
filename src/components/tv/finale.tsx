import { motion, useReducedMotion } from "framer-motion";
import { useEffect, useMemo, useState } from "react";
import type { Question, QuestionResult } from "~/game.types";
import { type Award, computeAwards } from "./awards";
import { PODIUM_LAYOUT, podiumHeights } from "./finale-layout";
import { FINALE_AT as AT } from "./finale-timeline";
import { FitName } from "./fit-name";
import { InkToken, RisoType, Roller, Slug, WIPE } from "./print";
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

const { block: BLOCK, gap: GAP, width: PODIUM_WIDTH, left: PODIUM_LEFT, floor: FLOOR } = PODIUM_LAYOUT;
/** The headline is centred on the frame, over the podium. */
const HEADLINE_BOX = PODIUM_WIDTH - 20;
/** When the awards come in, the podium steps back (scaled from this point) to make room for their strip. */
const STEP_BACK = { scale: 0.74, originY: 300 } as const;
const steppedY = (y: number) => STEP_BACK.originY + (y - STEP_BACK.originY) * STEP_BACK.scale;
const AWARDS_TOP = 872;

/** The share of the takeover spent on screen before the roller wipes it off. */
const TAKEOVER_WIPE = 0.86;

const PODIUM = [
  { place: 2, slot: 0, ink: "var(--blue)", on: "var(--paper)", at: AT.second, label: "2nd" },
  { place: 1, slot: 1, ink: "var(--pink)", on: "var(--ink)", at: AT.first, label: "1st" },
  { place: 3, slot: 2, ink: "var(--teal)", on: "var(--paper)", at: AT.third, label: "3rd" },
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

/** 1st place before the takeover: the block is up, but who is on it stays a question. */
const Mystery = ({ size }: { size: number }) => (
  <span
    aria-hidden="true"
    className="tv-display flex items-center justify-center"
    style={{ width: size, height: size, borderRadius: 999, background: "var(--paper)", border: "8px solid var(--ink)", fontSize: size * 0.62, color: "var(--ink)" }}
  >
    ?
  </span>
);

/**
 * A podium block rises out of the floor already printed with its player (no empty slab), lands with a
 * squash, and its score counts up from 0 while the room watches. 1st rises as "1st ?" and only shows
 * its player when the winner takeover clears (`revealAt`).
 */
const PodiumStep = ({
  step,
  player,
  inkIndex,
  height,
  speed,
}: {
  step: (typeof PODIUM)[number];
  player: FinalPlayer;
  inkIndex: number;
  height: number;
  speed: number;
}) => {
  const first = step.place === 1;
  const token = first ? 150 : 96;
  const rise = step.at * speed;
  const [revealed, setRevealed] = useState(!first);
  useEffect(() => {
    if (!first) return;
    const t = setTimeout(() => setRevealed(true), AT.reveal * speed * 1000);
    return () => clearTimeout(t);
  }, [first, speed]);
  return (
    <div
      className="absolute overflow-hidden"
      style={{ left: PODIUM_LEFT + step.slot * (BLOCK + GAP), top: FLOOR - height - 40, width: BLOCK + 16, height: height + 40 }}
    >
      <motion.div
        className="absolute flex flex-col items-center"
        style={{
          left: 0,
          top: 40,
          width: BLOCK,
          height,
          background: step.ink,
          border: "6px solid var(--ink)",
          boxShadow: `10px 10px 0 ${first ? "var(--yellow)" : "var(--ink)"}`,
          transformOrigin: "50% 100%",
          paddingTop: 22,
        }}
        initial={{ y: height + 60 }}
        animate={{ y: [height + 60, -18, 0, 0, 0], scaleY: [1, 1, 0.9, 1.04, 1], scaleX: [1, 1, 1.06, 0.98, 1] }}
        transition={{ delay: rise, duration: (first ? 0.95 : 0.75) * Math.max(speed, 0.6), times: [0, 0.55, 0.72, 0.86, 1], ease: "easeOut" }}
        data-testid={`player-score-${player.id}`}
      >
        <span aria-hidden="true" className="absolute inset-0 halftone-ink" style={{ opacity: 0.2 }} />
        <span className="relative slug" style={{ fontSize: 40, color: step.on, lineHeight: 1 }}>
          {step.label}
        </span>
        {revealed ? (
          <motion.span
            className="relative flex flex-col items-center"
            initial={first ? { scale: 1.6, opacity: 0, rotate: -8 } : false}
            animate={{ scale: [first ? 1.6 : 1, 0.9, 1], opacity: 1, rotate: 0 }}
            transition={{ duration: 0.45, times: [0, 0.6, 1] }}
          >
            <span className="relative mt-3" style={{ borderRadius: 999, boxShadow: "0 0 0 7px var(--paper)" }}>
              <InkToken name={player.name} inkIndex={inkIndex} size={token} />
            </span>
            <FitName
              text={player.name}
              max={first ? 84 : 60}
              box={BLOCK - 44}
              className="tv-display text-center mt-3"
              style={{ letterSpacing: "-0.015em", color: step.on }}
            />
            <span className="relative tv-display tabular" style={{ fontSize: first ? 96 : 68, lineHeight: 1, color: step.on }} aria-hidden="true">
              {first ? <CountUp to={player.score} atSeconds={0.2} live /> : <CountUp to={player.score} atSeconds={AT.count * speed} live />}
            </span>
          </motion.span>
        ) : (
          <span className="relative mt-3">
            <Mystery size={token} />
          </span>
        )}
        {/* Assistive tech (and the tests) always get the player and their score; the screen keeps 1st a mystery until the takeover. */}
        <span className="tv-sr">
          {player.name} {player.score} points
        </span>
      </motion.div>
    </div>
  );
};

const STAMP_INKS = [
  { bg: "var(--teal)", fg: "var(--paper)" },
  { bg: "var(--blue)", fg: "var(--paper)" },
  { bg: "var(--pink)", fg: "var(--ink)" },
];

/** One award at a time along the bottom strip: the card rises in, then its own stamp slams onto it. */
const AwardCard = ({ award, index, at, box }: { award: Award; index: number; at: number; box: number }) => {
  const stamp = STAMP_INKS[index % STAMP_INKS.length];
  return (
    <motion.div
      className="relative flex flex-col justify-center flex-1 min-w-0"
      style={{ height: 176, padding: "16px 26px", background: "var(--paper-2)", border: "6px solid var(--ink)", boxShadow: `10px 10px 0 ${INKS[index % INKS.length]}` }}
      initial={{ y: 260, opacity: 0, rotate: 3 }}
      animate={{ y: 0, opacity: 1, rotate: index % 2 === 0 ? -1 : 1 }}
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
      <FitName text={joinNames(award.names)} max={68} box={box} className="tv-display mt-3" style={{ letterSpacing: "-0.015em" }} />
    </motion.div>
  );
};

/** The finale opens on a title card, not a bare sunburst; the roller wipes it off as the podium starts to rise. */
const Opener = ({ speed }: { speed: number }) => (
  <>
    <motion.div
      aria-hidden="true"
      className="absolute inset-0 flex flex-col items-center justify-center"
      style={{ background: "var(--paper)", zIndex: 72 }}
      initial={{ clipPath: WIPE.shown }}
      animate={{ clipPath: WIPE.gone }}
      transition={{ delay: AT.openerOut * speed, duration: 0.35 * speed, ease: WIPE.ease }}
    >
      <motion.span
        className="tv-display"
        style={{ fontSize: 230, lineHeight: 0.9, letterSpacing: "-0.03em" }}
        initial={{ scale: 1.5, opacity: 0, rotate: -4 }}
        animate={{ scale: [1.5, 0.94, 1], opacity: 1, rotate: -2 }}
        transition={{ duration: 0.45, times: [0, 0.65, 1] }}
      >
        <RisoType top="var(--ink)" under="var(--pink)" offset={8}>
          That&apos;s the game
        </RisoType>
      </motion.span>
      <motion.span className="mt-12" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35, duration: 0.3 }}>
        <Slug className="text-blue">The final scores</Slug>
      </motion.span>
    </motion.div>
    <Roller delay={AT.openerOut * speed} duration={0.35 * speed} zIndex={74} />
  </>
);

/**
 * Game over, as a ceremony: a title card; the podium blocks rise out of the floor 3rd, 2nd, then 1st as a
 * question mark; the scores count up; the winner takes over the whole screen with confetti; as it clears,
 * 1st is revealed on the podium and the title lands; then the podium steps back and the recap awards come
 * in along the bottom, one at a time; then a calm "thanks for playing" hold.
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
  const heights = podiumHeights(ranked.slice(0, 3).map((p) => p.score));
  const awards = useMemo(() => computeAwards(questionResults, questions).slice(0, 3), [questionResults, questions]);
  const hasAwards = awards.length > 0;
  const [beat, setBeat] = useState<"podium" | "awards" | "calm">("podium");
  useEffect(() => {
    const timers = [setTimeout(() => setBeat("awards"), AT.awards * 1000 * speed), setTimeout(() => setBeat("calm"), AT.calm * 1000 * speed)];
    return () => timers.forEach(clearTimeout);
  }, [speed]);
  const stepBack = hasAwards && beat !== "podium";
  const winnerLine = winner ? `${winner.name} Wins!` : "Game Over!";
  const takeoverSize = winner ? (winner.name.length <= 5 ? 440 : winner.name.length <= 9 ? 290 : 220) : 200;
  const awardBox = (1728 - 2 * 30) / Math.max(1, awards.length) - 64;
  return (
    <motion.div key="finale" className="absolute inset-0" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <Sunburst size={2000} x={960} y={620} rays={30} />
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
          style={{ left: 960 - HEADLINE_BOX / 2, width: HEADLINE_BOX, top: 128, zIndex: 50 }}
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

      <motion.div
        className="absolute inset-0"
        style={{ transformOrigin: `960px ${STEP_BACK.originY}px` }}
        initial={false}
        animate={{ scale: stepBack ? STEP_BACK.scale : 1 }}
        transition={{ type: "spring", stiffness: 200, damping: 26 }}
      >
        {PODIUM.map((step) => {
          const player = ranked[step.place - 1];
          return player ? (
            <PodiumStep key={step.place} step={step} player={player} inkIndex={inkIndex.get(player.id) ?? 0} height={heights[step.place - 1] ?? PODIUM_LAYOUT.baseHeight} speed={speed} />
          ) : null;
        })}
        <div className="absolute" style={{ left: 0, right: 0, top: FLOOR, height: 6, background: "var(--ink)", zIndex: 20 }} />
      </motion.div>

      {/* The rest of the table sits under the floor at full size, and follows it when the podium steps back. */}
      <motion.div
        className="absolute flex items-center gap-8"
        style={{ left: 96, right: 96, top: FLOOR + 30 }}
        initial={false}
        animate={{ y: stepBack ? steppedY(FLOOR) - FLOOR - 8 : 0 }}
        transition={{ type: "spring", stiffness: 200, damping: 26 }}
      >
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
      </motion.div>

      {hasAwards && beat !== "podium" ? (
        <div className="absolute flex items-stretch" style={{ left: 96, right: 96, top: AWARDS_TOP, gap: 30, zIndex: 30 }} data-testid="tv-awards">
          {awards.map((a, i) => (
            <AwardCard key={a.id} award={a} index={i} at={(0.35 + i * AT.awardGap) * speed} box={awardBox} />
          ))}
        </div>
      ) : null}

      {winner ? (
        <motion.div
          aria-hidden="true"
          className="absolute inset-0 flex items-center justify-center pointer-events-none"
          style={{ zIndex: 55 }}
          initial={{ opacity: 0, clipPath: WIPE.shown }}
          animate={{ opacity: [0, 1, 1], clipPath: [WIPE.shown, WIPE.shown, WIPE.gone] }}
          transition={{
            delay: AT.takeover * speed,
            duration: (AT.title - AT.takeover) * speed,
            // A hard cut in; out, the roller wipes the takeover off before the podium comes back.
            opacity: { delay: AT.takeover * speed, duration: 0.02 },
            clipPath: { delay: AT.takeover * speed, duration: (AT.title - AT.takeover) * speed, times: [0, TAKEOVER_WIPE, 1], ease: WIPE.ease },
          }}
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

      {winner ? <Roller delay={(AT.takeover + TAKEOVER_WIPE * (AT.title - AT.takeover)) * speed} duration={(1 - TAKEOVER_WIPE) * (AT.title - AT.takeover) * speed} zIndex={58} /> : null}

      <PaperConfetti count={reduced ? 40 : 110} start={AT.takeover * speed} />

      <Opener speed={speed} />
    </motion.div>
  );
};
