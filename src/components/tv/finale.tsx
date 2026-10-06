import { motion, useReducedMotion } from "framer-motion";
import { useEffect, useMemo, useState } from "react";
import type { Question, QuestionResult } from "~/game.types";
import { type Award, computeAwards } from "./awards";
import { awardsColumn, FINALE_FINAL, landsAt, PODIUM_LAYOUT, podiumHeights, steppedPodium } from "./finale-layout";
import { FINALE_AT as AT } from "./finale-timeline";
import { FitName } from "./fit-name";
import { AuroraGlow, Bloom, EASE_OUT, GlassToken, Label } from "./glass";
import { RollingNumber } from "./standings";
import { popIn } from "./motion-presets";
import { joinNames } from "./tv-model";

type FinalPlayer = { id: string; name: string; score: number };

/** The aurora's own colours, for the glowing confetti. */
const GLOWS = ["#a5b4fc", "#c084fc", "#f9a8d4", "#c4b5fd", "#ffffff"];

/** Deterministic pseudo-random so the confetti is the same on every TV. */
const seeded = (seed: number) => {
  let s = seed;
  return () => {
    s = (s * 16807) % 2147483647;
    return s / 2147483647;
  };
};

type Mote = { x: number; size: number; color: string; delay: number; drift: number; fall: number; twinkle: number };

/** Confetti as soft glowing motes of light in the aurora colours, drifting down and twinkling. */
const GlowConfetti = ({ count, start }: { count: number; start: number }) => {
  const motes = useMemo<Mote[]>(() => {
    const rnd = seeded(7);
    return Array.from({ length: count }, (_, i) => ({
      x: rnd() * 1920,
      size: 10 + rnd() * 22,
      color: GLOWS[i % GLOWS.length],
      delay: start + rnd() * 1.8,
      drift: (rnd() - 0.5) * 220,
      fall: 3.6 + rnd() * 2.4,
      twinkle: 0.5 + rnd() * 0.5,
    }));
  }, [count, start]);
  return (
    <div aria-hidden="true" className="absolute inset-0 pointer-events-none" style={{ zIndex: 60 }}>
      {motes.map((m, i) => (
        <motion.span
          key={i}
          className="tv-particle"
          style={{
            left: m.x,
            top: -60,
            width: m.size,
            height: m.size,
            background: `radial-gradient(circle, #ffffff 0%, ${m.color} 35%, transparent 70%)`,
            boxShadow: `0 0 ${Math.round(m.size * 1.2)}px ${m.color}`,
          }}
          initial={{ y: 0, x: 0, opacity: 0 }}
          animate={{ y: 1220, x: m.drift, opacity: [0, 1, m.twinkle, 1, 0.6] }}
          transition={{ duration: m.fall, delay: m.delay, ease: [0.3, 0.1, 0.6, 1] }}
        />
      ))}
    </div>
  );
};

const { block: BLOCK, gap: GAP, width: PODIUM_WIDTH, left: PODIUM_LEFT, floor: FLOOR } = PODIUM_LAYOUT;
/** The headline is centred on the frame, over the podium. */
const HEADLINE_BOX = PODIUM_WIDTH - 20;
/** When the awards come in, the podium steps back and slides left; the awards stack in the right third. */
const STEP_BACK = FINALE_FINAL;
const steppedY = (y: number) => STEP_BACK.originY + (y - STEP_BACK.originY) * STEP_BACK.scale;
const STEPPED = steppedPodium();

/** The share of the takeover spent at full strength before it fades away. */
const TAKEOVER_HOLD = 0.86;

const PODIUM = [
  { place: 2, slot: 0, at: AT.second, label: "2nd" },
  { place: 1, slot: 1, at: AT.first, label: "1st" },
  { place: 3, slot: 2, at: AT.third, label: "3rd" },
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
    className="tv-display tv-glass-pill flex items-center justify-center"
    style={{ width: size, height: size, fontSize: size * 0.56, color: "var(--glow)", borderColor: "var(--glow)", borderStyle: "dashed", boxShadow: "0 0 40px rgba(196, 181, 253, 0.4)" }}
  >
    ?
  </span>
);

/**
 * A podium block (a tall glass slab) rises out of the floor already carrying its player (no empty slab),
 * settles, and its score counts up from 0 while the room watches. 1st rises as "1st ?" and only shows
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
      className="absolute"
      // Cut only at the floor (the slab rises out of it); its glow spills freely to the sides and above.
      style={{ left: PODIUM_LEFT + step.slot * (BLOCK + GAP), top: FLOOR - height - 40, width: BLOCK + 16, height: height + 40, clipPath: "inset(-400px -400px 0 -400px)" }}
    >
      <motion.div
        className="absolute flex flex-col items-center tv-glass"
        style={{
          left: 8,
          top: 40,
          width: BLOCK,
          height: height + 32,
          borderRadius: "32px 32px 0 0",
          borderBottom: "none",
          background: first
            ? "linear-gradient(180deg, rgba(129, 140, 248, 0.5), rgba(168, 85, 247, 0.28) 55%, rgba(168, 85, 247, 0.1)), rgba(11, 15, 26, 0.35)"
            : "linear-gradient(180deg, rgba(255, 255, 255, 0.12), rgba(255, 255, 255, 0.04)), rgba(11, 15, 26, 0.42)",
          borderColor: first ? "rgba(196, 181, 253, 0.6)" : undefined,
          boxShadow: first ? "0 0 90px rgba(139, 92, 246, 0.45), inset 0 1px 0 rgba(255,255,255,.3)" : undefined,
          transformOrigin: "50% 100%",
          paddingTop: 22,
        }}
        initial={{ y: height + 80 }}
        animate={{ y: [height + 80, -10, 0] }}
        transition={{ delay: rise, duration: (first ? 0.95 : 0.75) * Math.max(speed, 0.6), times: [0, 0.7, 1], ease: EASE_OUT }}
        data-testid={`player-score-${player.id}`}
      >
        <span className="relative tv-label" style={{ fontSize: 40, color: first ? "var(--text)" : "var(--text-2)", lineHeight: 1 }}>
          {step.label}
        </span>
        {revealed ? (
          <motion.span
            className="relative flex flex-col items-center"
            initial={first ? { scale: 1.3, opacity: 0 } : false}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.5, ease: EASE_OUT }}
          >
            <span className="relative mt-3" style={{ borderRadius: 999 }}>
              <GlassToken name={player.name} inkIndex={inkIndex} size={token} win={first} />
            </span>
            <FitName
              text={player.name}
              max={first ? 84 : 60}
              box={BLOCK - 44}
              className="tv-display text-center mt-3"
              style={{ letterSpacing: "-0.03em", color: "var(--text)" }}
            />
            <span className={`relative tv-display ${first ? "glow-text" : ""}`} style={{ fontSize: first ? 96 : 68, lineHeight: 1, color: first ? undefined : "var(--glow)" }} aria-hidden="true">
              {/* 1st counts as they are revealed; 2nd and 3rd count the moment their block settles. */}
              {first ? <CountUp to={player.score} atSeconds={0.2} live /> : <CountUp to={player.score} atSeconds={landsAt(step.at, false, speed)} live />}
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

/** One award at a time along the bottom strip: the glass card rises in, then its pill pops on. */
const AwardCard = ({ award, index, at, box }: { award: Award; index: number; at: number; box: number }) => (
  <motion.div
    className="relative flex flex-col justify-center min-w-0 tv-glass"
    style={{ height: FINALE_FINAL.cardHeight, padding: "16px 28px", borderRadius: 28 }}
    initial={{ x: 60, opacity: 0 }}
    animate={{ x: 0, opacity: 1 }}
    transition={{ delay: at, duration: 0.45, ease: EASE_OUT }}
    data-testid={`tv-award-${award.id}`}
  >
    <span className="flex items-center justify-between gap-4">
      <span className="tv-label whitespace-nowrap" style={{ fontSize: 30, lineHeight: 1 }}>
        {award.title}
      </span>
      <motion.span
        className={`tv-pill ${index % 2 === 0 ? "tv-pill--lav" : "tv-pill--close"} flex-none`}
        style={{ fontSize: 32, padding: "6px 16px" }}
        {...popIn({ delay: at + 0.55 })}
      >
        {award.detail}
      </motion.span>
    </span>
    <FitName text={joinNames(award.names)} max={64} box={box} className="tv-display mt-3" style={{ letterSpacing: "-0.03em", color: "var(--text)" }} />
  </motion.div>
);

/** The finale opens on a title card on its own night layer, which fades away as the podium starts to rise. */
const Opener = ({ speed }: { speed: number }) => (
  <motion.div
    aria-hidden="true"
    className="absolute inset-0 flex flex-col items-center justify-center"
    style={{ background: "var(--night)", zIndex: 72 }}
    initial={{ opacity: 1 }}
    animate={{ opacity: 0 }}
    transition={{ delay: AT.openerOut * speed, duration: 0.35 * speed, ease: EASE_OUT }}
  >
    <AuroraGlow />
    <Bloom x={960} y={500} r={700} color="rgba(139, 92, 246, 0.3)" live />
    <motion.span
      className="tv-display glow-text relative"
      style={{ fontSize: 210, lineHeight: 1, letterSpacing: "-0.045em", paddingBottom: 12 }}
      initial={{ scale: 1.3, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ duration: 0.5, ease: EASE_OUT }}
    >
      That&apos;s the game
    </motion.span>
    <motion.span className="mt-10 relative" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35, duration: 0.3 }}>
      <Label size={36}>The final scores</Label>
    </motion.span>
  </motion.div>
);

/**
 * Game over, as a ceremony: a title card; the podium slabs rise out of the floor 3rd, 2nd, then 1st as a
 * question mark; the scores count up; the winner takes over the whole screen in an aurora bloom with glowing confetti; as it clears,
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
  const awardBox = FINALE_FINAL.awardsWidth - 56;
  const column = awardsColumn(awards.length);
  return (
    <motion.div key="finale" className="absolute inset-0" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <Bloom x={960} y={700} r={820} color="rgba(139, 92, 246, 0.22)" live />
      <div className="absolute flex items-center justify-between" style={{ left: 96, right: 96, top: 56, zIndex: 50 }} data-testid="game-over-title">
        <span className="flex items-center gap-6">
          <span className="tv-glass-pill inline-flex items-center" style={{ padding: "12px 26px" }}>
            <Label className="!text-[color:var(--text-2)]">Game over</Label>
          </span>
          <Label className="whitespace-nowrap lav-text" testId="final-scores-heading">
            Final scores
          </Label>
        </span>
        <motion.span
          className="tv-display lav-text"
          style={{ fontSize: 60, lineHeight: 1.1, letterSpacing: "-0.03em" }}
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
          <FitName text={winnerLine} max={156} floor={84} box={HEADLINE_BOX} lineHeight={1.08} className="tv-display glow-text" style={{ letterSpacing: "-0.04em", paddingBottom: "0.06em" }} />
          <span className="tv-sr">with {winner.score} points</span>
        </motion.div>
      ) : null}

      <motion.div
        className="absolute inset-0"
        style={{ transformOrigin: `960px ${STEP_BACK.originY}px` }}
        initial={false}
        animate={{ transform: stepBack ? `translateX(${STEPPED.dx}px) scale(${STEP_BACK.scale})` : "translateX(0px) scale(1)" }}
        transition={{ duration: 0.7, ease: EASE_OUT }}
      >
        {PODIUM.map((step) => {
          const player = ranked[step.place - 1];
          return player ? (
            <PodiumStep key={step.place} step={step} player={player} inkIndex={inkIndex.get(player.id) ?? 0} height={heights[step.place - 1] ?? PODIUM_LAYOUT.baseHeight} speed={speed} />
          ) : null;
        })}
        <div className="absolute tv-axis" style={{ left: PODIUM_LEFT - 60, width: PODIUM_WIDTH + 120, top: FLOOR, height: 6, zIndex: 20 }} />
      </motion.div>

      {/* The rest of the table sits under the floor, and follows the podium when it steps back. */}
      {rest.length > 0 ? (
        <motion.div
          className="absolute flex flex-wrap items-center gap-x-10 gap-y-3"
          style={hasAwards ? { left: 960 - (STEPPED.right - STEPPED.left) / 2, width: STEPPED.right - STEPPED.left, top: FLOOR + 30 } : { left: 96, right: 96, top: FLOOR + 30 }}
          initial={false}
          animate={{ transform: stepBack ? `translate(${STEPPED.dx}px, ${steppedY(FLOOR) - FLOOR - 6}px)` : "translate(0px, 0px)" }}
          transition={{ duration: 0.7, ease: EASE_OUT }}
        >
          {rest.slice(0, 4).map((p, i) => (
            <span key={p.id} className="flex items-center gap-3" data-testid={`player-score-${p.id}`}>
              <span className="tv-display text-[32px]" style={{ color: "var(--text-3)" }}>{i + 4}</span>
              <GlassToken name={p.name} inkIndex={inkIndex.get(p.id) ?? 0} size={56} />
              <FitName text={p.name} max={40} floor={36} box={240} className="tv-name" />
              <span className="tv-display text-[40px]" style={{ color: "var(--glow)" }}>{p.score}</span>
            </span>
          ))}
          {rest.length > 4 ? <Label size={30} className="whitespace-nowrap">+{rest.length - 4} more</Label> : null}
        </motion.div>
      ) : null}

      {hasAwards && beat !== "podium" ? (
        <div className="absolute flex flex-col" style={{ left: column.left, width: column.right - column.left, top: column.top, gap: FINALE_FINAL.cardGap, zIndex: 30 }} data-testid="tv-awards">
          <motion.span initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.15 * speed, duration: 0.4, ease: EASE_OUT }} style={{ height: FINALE_FINAL.heading - FINALE_FINAL.cardGap }} className="flex items-end">
            <Label className="lav-text">Awards</Label>
          </motion.span>
          {awards.map((a, i) => (
            <AwardCard key={a.id} award={a} index={i} at={(0.35 + i * AT.awardGap) * speed} box={awardBox} />
          ))}
        </div>
      ) : null}

      {winner ? (
        <motion.div
          aria-hidden="true"
          className="absolute inset-0 flex items-center justify-center pointer-events-none"
          style={{ zIndex: 55, background: "var(--night)" }}
          initial={{ opacity: 0 }}
          animate={{ opacity: [0, 1, 1, 0] }}
          transition={{
            delay: AT.takeover * speed,
            duration: (AT.title - AT.takeover) * speed,
            // In fast; out, the bloom fades away before the podium comes back.
            times: [0, 0.03, TAKEOVER_HOLD, 1],
            ease: "easeOut",
          }}
        >
          <AuroraGlow />
          {/* The aurora blooms: indigo, purple and pink light opening up behind the name. */}
          <motion.div
            className="absolute inset-0"
            style={{
              background:
                "radial-gradient(38% 46% at 50% 50%, rgba(196, 181, 253, 0.55), transparent 70%), radial-gradient(40% 50% at 28% 40%, rgba(99, 102, 241, 0.6), transparent 72%), radial-gradient(40% 50% at 74% 58%, rgba(168, 85, 247, 0.55), transparent 72%), radial-gradient(50% 40% at 50% 100%, rgba(236, 72, 153, 0.45), transparent 72%)",
              filter: "blur(30px)",
            }}
            initial={{ scale: 0.3, opacity: 0 }}
            animate={{ scale: [0.3, 1.15, 1, 1.06], opacity: [0, 1, 0.9, 1] }}
            transition={{ delay: AT.takeover * speed, duration: (AT.title - AT.takeover) * speed, times: [0, 0.2, 0.4, 1], ease: "easeOut" }}
          />
          {/* A dark well behind the name keeps the white-to-lavender type readable over the bright bloom. */}
          <span className="tv-bloom" style={{ left: 960 - 900, top: 540 - 330, width: 1800, height: 660, background: "radial-gradient(closest-side, rgba(11, 15, 26, 0.55), transparent)" }} />
          <motion.span
            className="tv-display relative"
            style={{ lineHeight: 1 }}
            initial={{ scale: 1.4, opacity: 0 }}
            animate={{ scale: [1.4, 1, 1, 1.05], opacity: [0, 1, 1, 1] }}
            transition={{ delay: AT.takeover * speed, duration: (AT.title - AT.takeover) * speed, times: [0, 0.16, 0.3, 1], ease: "easeOut" }}
          >
            <FitName text={winner.name} max={takeoverSize} floor={120} box={1640} lineHeight={1.04} className="text-center glow-text" style={{ letterSpacing: "-0.05em", paddingBottom: "0.06em", filter: "drop-shadow(0 0 0.25em rgba(196, 181, 253, 0.7))" }} />
          </motion.span>
        </motion.div>
      ) : null}

      <GlowConfetti count={reduced ? 40 : 110} start={AT.takeover * speed} />

      <Opener speed={speed} />
    </motion.div>
  );
};
