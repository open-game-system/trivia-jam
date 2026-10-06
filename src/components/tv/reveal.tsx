import { tvAudio } from "~/audio/engine";
import { motion, useReducedMotion } from "framer-motion";
import { type ReactNode, useEffect, useMemo, useRef } from "react";
import type { Question, QuestionResult } from "~/game.types";
import { FitName } from "./fit-name";
import { EASE_OUT, EASE_POP, GlassToken, Label } from "./glass";
import { OptionTiles, QuestionSlug } from "./question";
import { type LineGuess, layoutNumberLine, memberChipCentres, REVEAL_FRAME, sweepStops } from "./number-line-layout";
import { GuessGroupView, Leaders, NumberLineAxis } from "./number-line-reveal";
import { RollingNumber } from "./standings";
import {
  choiceWinners,
  findHighlights,
  formatTick,
  matchOptionIndex,
  optionLetter,
  revealSchedule,
  toNumber,
} from "./tv-model";
import { choiceMisses, numericMisses } from "./misses";
import { MissesStrip } from "./misses-strip";
import { choiceAnswerText, PUCK } from "./reveal-geometry";
import { PHASE, useRevealPhase } from "./use-reveal-phase";
import { type Winner, WinnersCard, type WinnersKind } from "./winners-card";
import { stepTo } from "./motion-presets";

type TvPlayer = { id: string; name: string; score: number };

const AXIS_Y = REVEAL_FRAME.axisY;

const PointsBadge = ({ points, live, compact = false }: { points: number; live: boolean; compact?: boolean }) => (
  <motion.span
    className="tv-pill tv-pill--lav inline-flex items-baseline gap-1"
    style={{ fontSize: compact ? 34 : 40, padding: compact ? "4px 12px" : "5px 14px" }}
    initial={live ? { scale: 0, opacity: 0 } : false}
    animate={{ scale: [0, 1.15, 1], opacity: 1 }}
    transition={{ duration: 0.4, ease: EASE_POP }}
  >
    +<RollingNumber from={0} to={points} run={live} duration={0.6} />
    {compact ? null : (
      <span style={{ fontSize: 28, fontWeight: 700 }}>
        {" "}pts
      </span>
    )}
  </motion.span>
);

/** Exact answers give the stage a short jolt as the answer lands. Nothing else does. */
const Shake = ({ on, children }: { on: boolean; children: ReactNode }) => (
  <motion.div className="absolute inset-0" animate={on ? { x: [0, -14, 11, -6, 0], y: [0, 6, -5, 2, 0] } : { x: 0, y: 0 }} transition={{ duration: 0.11, delay: on ? 0.16 : 0 }}>
    {children}
  </motion.div>
);

/**
 * When the winners break forward, the line (or the tiles) fades back and sinks away: no translucent
 * ghost of it stays under the takeover. A TV that loads late starts cleared.
 */
const LineLayer = ({ back, live, children }: { back: boolean; live: boolean; children: ReactNode }) => (
  <motion.div
    className="absolute inset-0"
    initial={false}
    animate={back ? { opacity: 0, y: 24, scale: 0.98 } : { opacity: 1, y: 0, scale: 1 }}
    transition={{ duration: back && live ? 0.4 : 0, ease: EASE_OUT }}
  >
    {children}
  </motion.div>
);

/** Where the answer steps up to for the misses beat: between the shrunken winners and the misses strip. */
const STEPPED_ANSWER = { top: 498, scale: 0.6 } as const;

const answerCenter = (x: number) => Math.min(REVEAL_FRAME.right - 260, Math.max(REVEAL_FRAME.left + 240, x));

/** The pin where the answer lands on the line: a glowing white-to-lavender stem and a bright point of light. */
const AnswerPin = ({ x, live }: { x: number; live: boolean }) => (
  <>
    <motion.div
      aria-hidden="true"
      className="absolute"
      style={{ left: x - 4, width: 8, top: AXIS_Y - 64, height: 64, borderRadius: 8, background: "linear-gradient(180deg, rgba(255,255,255,0), #ffffff 40%, var(--glow))", boxShadow: "0 0 18px rgba(196, 181, 253, 0.9)", transformOrigin: "bottom", zIndex: 3 }}
      initial={live ? { scaleY: 0 } : false}
      animate={{ scaleY: 1 }}
      transition={{ duration: 0.22, ease: "easeIn" }}
    />
    <motion.div
      aria-hidden="true"
      className="absolute"
      style={{ left: x - 22, top: AXIS_Y - 22, width: 44, height: 44, borderRadius: 999, background: "radial-gradient(circle, #ffffff 30%, var(--glow) 60%, rgba(196,181,253,0) 72%)", boxShadow: "0 0 40px 10px rgba(196, 181, 253, 0.55)", zIndex: 5 }}
      initial={live ? { scale: 0 } : false}
      animate={{ scale: 1 }}
      transition={{ delay: 0.2, duration: 0.4, ease: EASE_POP }}
    />
  </>
);

/** The answer's place in the misses beat: one transform tween with the winners card (never a one-frame snap). */
const stepped = (compact: boolean, fromTop: number) =>
  stepTo(compact ? { scale: STEPPED_ANSWER.scale, y: STEPPED_ANSWER.top - fromTop } : { scale: 1, y: 0 });

/** The answer, huge and glowing, under the line: it stays put while everything else steps back. */
const AnswerNumeral = ({ value, x, live, compact }: { value: string; x: number; live: boolean; compact: boolean }) => {
  const center = answerCenter(x);
  const step = stepped(compact, AXIS_Y + 58);
  return (
    <motion.div
      className="absolute"
      style={{ top: AXIS_Y + 58, x: "-50%", zIndex: 35 }}
      initial={live ? { left: center } : false}
      animate={{ left: center }}
      transition={{ type: "spring", stiffness: 200, damping: 22 }}
      data-testid="correct-answer"
    >
      <motion.div style={{ transformOrigin: "50% 0" }} initial={false} animate={step.animate} transition={step.transition}>
        <motion.div
          className="tv-display"
          style={{ fontSize: 252, lineHeight: 0.8, letterSpacing: "-0.045em", transformOrigin: "50% 0" }}
          initial={live ? { scale: 1.4, opacity: 0 } : false}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.12, ease: EASE_OUT }}
        >
          <motion.span
            aria-hidden="true"
            className="tv-bloom"
            style={{ left: "50%", top: "50%", width: 760, height: 520, marginLeft: -380, marginTop: -260, background: "radial-gradient(closest-side, rgba(196, 181, 253, 0.4), transparent)", zIndex: -1 }}
            initial={live ? { scale: 0.2, opacity: 0 } : false}
            animate={{ scale: [0.2, 1.25, 1], opacity: [0, 1, 0.75] }}
            transition={{ duration: 0.9, delay: 0.25, ease: EASE_OUT }}
          />
          <span className="glow-text relative" style={{ paddingInline: "0.06em" }}>
            {value}
          </span>
        </motion.div>
      </motion.div>
    </motion.div>
  );
};

const ChoiceAnswerLine = ({ letter, text, live, compact }: { letter: string; text: string; live: boolean; compact: boolean }) => {
  const size = text.length <= 10 ? 180 : text.length <= 18 ? 130 : 88;
  const full = choiceAnswerText(letter, text);
  const step = stepped(compact, 850);
  return (
    <motion.div className="absolute" style={{ left: 96, right: 96, top: 850, zIndex: 35, transformOrigin: "50% 0" }} initial={false} animate={step.animate} transition={step.transition} data-testid="correct-answer">
      <motion.div
        className="flex items-end justify-center gap-10"
        style={{ transformOrigin: "50% 0" }}
        initial={live ? { scale: 1.4, opacity: 0 } : false}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.5, ease: EASE_OUT }}
      >
        <FitName text={full} max={size} floor={72} box={1728} lineHeight={1.02} className="tv-display text-center glow-text" style={{ letterSpacing: "-0.035em", paddingBottom: "0.06em" }}>
          {letter}
          <span style={{ margin: "0 0.28em" }}>{"\u00b7"}</span>
          {text}
        </FitName>
      </motion.div>
    </motion.div>
  );
};

/**
 * The "?" puck sweeps between the guesses while the room holds its breath. It travels UNDER the axis,
 * below the tick labels and pointing up at the line, so it never sits over a guess or its numeral;
 * the answer numeral lands in the same place.
 */
const SuspenseMarker = ({ stops, seconds }: { stops: number[]; seconds: number }) => {
  const path = stops.length > 0 ? stops : [960];
  const size = PUCK.size;
  return (
    <motion.span
      aria-hidden="true"
      className="absolute"
      style={{ left: -size / 2, top: PUCK.top, width: size, height: size + 24, zIndex: 8 }}
      initial={{ x: path[0], scale: 0 }}
      animate={{ x: path, scale: 1 }}
      transition={{ x: { duration: seconds, ease: "easeInOut" }, scale: { type: "spring", stiffness: 500, damping: 15 } }}
      data-testid="tv-suspense-puck"
    >
      <svg className="absolute" style={{ left: size / 2 - 12, top: 2 }} width={24} height={20} viewBox="0 0 24 20">
        <polygon points="12,0 24,18 0,18" fill="var(--glow)" style={{ filter: "drop-shadow(0 0 6px rgba(196,181,253,.9))" }} />
      </svg>
      <span
        className="tv-display tv-glass-pill absolute flex items-center justify-center"
        style={{ left: 0, top: 22, width: size, height: size, fontSize: 54, color: "var(--glow)", borderColor: "var(--glow)", background: "rgba(30, 27, 75, 0.7)", boxShadow: "0 0 36px rgba(196, 181, 253, 0.5)" }}
      >
        ?
      </span>
    </motion.span>
  );
};

/** The question stays readable while the guesses land; when the winners break forward it clears the stage. */
const TopBand = ({
  question,
  number,
  total,
  phase,
  live,
}: {
  question: Question;
  number: number;
  total: number;
  phase: number;
  live: boolean;
}) => {
  const clear = phase >= PHASE.spotlight;
  const caption = phase < PHASE.suspense ? "The guesses" : phase < PHASE.answer ? "And the answer is..." : "The answer";
  const qSize = question.text.length <= 56 ? 72 : question.text.length <= 90 ? 60 : 56;
  return (
    <>
      {/* Cleared with a hard cut as the winners take over (it stays in the DOM, unprinted). */}
      <motion.div className="absolute flex items-center gap-6" style={{ left: 96, top: 56, zIndex: 40 }} animate={{ opacity: clear ? 0 : 1 }} transition={{ duration: 0 }}>
        <QuestionSlug number={number} total={total} />
        <motion.span key={caption} initial={live ? { opacity: 0, x: -20 } : false} animate={{ opacity: 1, x: 0 }}>
          <Label className="lav-text">{caption}</Label>
        </motion.span>
      </motion.div>
      <motion.h2
        className="absolute tv-display lav-text"
        style={{ left: 96, top: 136, maxWidth: 1728, fontSize: qSize, lineHeight: 1.08, letterSpacing: "-0.025em", paddingBottom: "0.08em" }}
        animate={{ opacity: clear ? 0 : 1 }}
        transition={{ duration: 0 }}
      >
        {question.text}
      </motion.h2>
    </>
  );
};

const NoGuessNote = ({ names }: { names: string[] }) =>
  names.length > 0 ? (
    <div className="absolute tv-label" style={{ right: 96, top: 72, fontSize: 28 }} data-testid="tv-no-guess">
      No guess: {names.length > 3 ? `${names.length} players` : names.join(", ")}
    </div>
  ) : null;

export const TvReveal = ({
  question,
  result,
  players,
  number,
  total,
  live,
}: {
  question: Question;
  result: QuestionResult;
  players: TvPlayer[];
  number: number;
  total: number;
  live: boolean;
}) => {
  const reduced = useReducedMotion() ?? false;
  const inkOf = useMemo(() => {
    const map = new Map(players.map((p, i) => [p.id, i]));
    return (id: string, fallback: number) => map.get(id) ?? players.length + fallback;
  }, [players]);
  const pointsOf = useMemo(() => new Map(result.scores.map((s) => [s.playerId, Math.round(s.points)])), [result.scores]);
  const answeredIds = new Set(result.answers.map((a) => a.playerId));
  const noGuess = players.filter((p) => !answeredIds.has(p.id)).map((p) => p.name);
  const isChoice = question.questionType === "multiple-choice" && question.options !== undefined && question.options.length > 0;
  const guessCount = result.answers.length;
  const schedule = useMemo(() => revealSchedule(guessCount, reduced), [guessCount, reduced]);
  const phase = useRevealPhase(live, schedule, guessCount);
  const exact = result.answers.some((a) => String(a.value) === String(question.correctAnswer));
  // Score the reveal once, when it plays live (a TV that loads late stays quiet).
  const scored = useRef(false);
  useEffect(() => {
    if (!live || scored.current) return;
    scored.current = true;
    tvAudio().revealScore({ ...schedule, guesses: guessCount, exact });
  }, [live, schedule, guessCount, exact]);
  const stagger = schedule.stagger / 1000;
  const firstDrop = schedule.firstDrop / 1000;
  const scoreOf = new Map(players.map((p) => [p.id, p.score]));
  const winner = (id: string, name: string, inkIndex: number, from?: Winner["from"]): Winner => {
    const points = pointsOf.get(id) ?? 0;
    return { id, name, inkIndex, points, prevScore: (scoreOf.get(id) ?? points) - points, from };
  };
  const forward = phase >= PHASE.spotlight;
  /** The misses beat: winners and answer step up, everyone else slides in with how far off they were. */
  const settling = phase >= PHASE.standings;
  const shaking = live && exact && phase === PHASE.answer;

  if (isChoice && question.options) {
    const options = question.options;
    const correctIndex = matchOptionIndex(question.correctAnswer, options);
    const winnerIds = new Set(choiceWinners(result.answers, question.correctAnswer, options));
    const byOption: Array<Array<{ playerId: string; name: string; inkIndex: number; order: number }>> = options.map(() => []);
    result.answers.forEach((a, order) => {
      const idx = matchOptionIndex(a.value, options);
      if (idx >= 0) byOption[idx].push({ playerId: a.playerId, name: a.playerName, inkIndex: inkOf(a.playerId, order), order });
    });
    const tokens = byOption.map((list, oi) =>
      list.length === 0 ? null : (
        <>
          {list.map((t, k) => {
            // As the answer lands, the tokens on the wrong tiles drop away off the sheet.
            const dropped = phase >= PHASE.answer && correctIndex >= 0 && oi !== correctIndex;
            return (
            <motion.span
              key={t.playerId}
              className="relative inline-flex flex-col items-center"
              data-testid={`player-result-${t.playerId}`}
              initial={live ? { y: -360, opacity: 0 } : false}
              animate={dropped ? { y: 60, opacity: 0, scale: 0.7 } : { y: 0, opacity: 1 }}
              transition={
                dropped
                  ? { duration: live ? 0.45 : 0, delay: live ? 0.18 + k * 0.06 : 0, ease: EASE_OUT }
                  : { y: { delay: live ? firstDrop + t.order * stagger : 0, type: "spring", stiffness: 420, damping: 17 }, opacity: { delay: live ? firstDrop + t.order * stagger : 0 } }
              }
            >
              <motion.span
                className="inline-flex"
                animate={phase >= PHASE.spotlight && winnerIds.has(t.playerId) ? { scale: 1.3, y: -8 } : phase === PHASE.suspense ? { rotate: [0, -6, 6, -4, 4, 0] } : { scale: 1, rotate: 0 }}
                transition={phase === PHASE.suspense ? { duration: 0.45, repeat: Infinity } : { type: "spring", stiffness: 400, damping: 12 }}
              >
                <GlassToken name={t.name} inkIndex={t.inkIndex} size={72} win={phase >= PHASE.answer && winnerIds.has(t.playerId)} />
              </motion.span>
              <span className="tv-sr">{t.name}</span>
              {phase >= PHASE.points && (pointsOf.get(t.playerId) ?? 0) > 0 ? (
                <span className="absolute" style={{ top: 62, left: 0 }}>
                  <PointsBadge points={pointsOf.get(t.playerId) ?? 0} live={live} compact />
                </span>
              ) : null}
            </motion.span>
            );
          })}
        </>
      ),
    );
    // Where each token sat on its tile, so the winners can break forward from there.
    const TILE_W = (1728 - 40) / 2;
    const tokenAt = (optionIndex: number, k: number, n: number) => ({
      x: 96 + (optionIndex % 2) * (TILE_W + 40) + TILE_W - 20 - (n - 1 - k) * 80 - 36,
      y: 300 + Math.floor(optionIndex / 2) * (150 + 32) - 38 + 36,
      size: 72,
    });
    const winners: Winner[] = byOption.flatMap((list, oi) =>
      list.flatMap((t, k) => (winnerIds.has(t.playerId) ? [winner(t.playerId, t.name, t.inkIndex, tokenAt(oi, k, list.length))] : [])),
    );
    const kind: WinnersKind = winners.length > 0 ? "right" : "nobody";
    return (
      <motion.div key="reveal" className="absolute inset-0" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
        <TopBand question={question} number={number} total={total} phase={phase} live={live} />
        <LineLayer back={forward && correctIndex >= 0} live={live}>
          <NoGuessNote names={noGuess} />
          <div className="absolute" style={{ left: 96, right: 96, top: 300 }}>
            <OptionTiles
              options={options}
              height={150}
              correctIndex={phase >= PHASE.answer && correctIndex >= 0 ? correctIndex : undefined}
              tokens={tokens}
            />
          </div>
        </LineLayer>
        {phase >= PHASE.answer && correctIndex >= 0 ? (
          <ChoiceAnswerLine letter={optionLetter(correctIndex)} text={options[correctIndex]} live={live} compact={settling} />
        ) : null}
        {forward && correctIndex >= 0 ? <WinnersCard kind={kind} winners={winners} scoring={phase >= PHASE.points} live={live} compact={settling} /> : null}
        {settling && correctIndex >= 0 ? (
          <MissesStrip
            misses={choiceMisses(result.answers.map((a, i) => ({ playerId: a.playerId, name: a.playerName, inkIndex: inkOf(a.playerId, i), value: a.value })), options, correctIndex)}
            live={live}
          />
        ) : null}
      </motion.div>
    );
  }

  const correct = toNumber(question.correctAnswer) ?? 0;
  const highlights = findHighlights(result.answers, question.correctAnswer);
  const guesses: LineGuess[] = result.answers.flatMap((a, i) => {
    const v = toNumber(a.value);
    return v === null
      ? []
      : [{ playerId: a.playerId, name: a.playerName, value: v, inkIndex: inkOf(a.playerId, i), points: pointsOf.get(a.playerId) ?? 0, highlight: highlights.get(a.playerId) }];
  });
  const layout = layoutNumberLine(guesses, correct, REVEAL_FRAME);
  // Farthest guess drops first, so the closest lands last, right before the answer.
  const dropOrder = [...layout.groups].sort((a, b) => Math.abs(b.value - correct) - Math.abs(a.value - correct));
  const delays = new Map(dropOrder.map((g, i) => [g.key, firstDrop + i * stagger]));
  const lastDropEnd = schedule.firstDrop + Math.max(0, guessCount - 1) * schedule.stagger + schedule.dropDuration;
  const suspenseSeconds = Math.max(0.4, (schedule.answer - lastDropEnd) / 1000 - 0.1);
  const suspenseStops = sweepStops(layout.groups.map((g) => g.axisX));
  const litGroups = layout.groups.filter((g) => g.highlight !== undefined);
  const litKind = litGroups[0]?.highlight;
  const winners: Winner[] = litGroups.flatMap((g) => {
    const chips = memberChipCentres(g, layout.size);
    return g.members.map((m) => {
      const at = chips.get(m.playerId);
      return winner(m.playerId, m.name, m.inkIndex, at ? { ...at, size: layout.size.chip } : undefined);
    });
  });
  const miss = litGroups[0] ? Math.abs(litGroups[0].value - correct) : 0;
  const detail = litKind === "closest" ? `off by ${formatTick(Number(miss.toFixed(4)))}` : undefined;

  return (
    <motion.div key="reveal" className="absolute inset-0" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <Shake on={shaking}>
        <TopBand question={question} number={number} total={total} phase={phase} live={live} />
        <LineLayer back={forward && winners.length > 0} live={live}>
          <NoGuessNote names={noGuess} />
          <NumberLineAxis layout={layout} axisY={AXIS_Y} live={live} />
          {phase === PHASE.suspense ? <SuspenseMarker stops={suspenseStops} seconds={suspenseSeconds} /> : null}
          <Leaders groups={layout.groups} axisY={AXIS_Y} delays={delays} live={live} />
          {layout.groups.map((g) => (
            <GuessGroupView
              key={g.key}
              group={g}
              size={layout.size}
              showPoints={phase >= PHASE.points}
              lit={g.highlight !== undefined && phase >= PHASE.answer}
              dim={phase >= PHASE.answer && g.highlight === undefined}
              shiver={phase === PHASE.suspense}
              live={live}
              delay={delays.get(g.key) ?? 0}
            />
          ))}
          {phase >= PHASE.answer ? <AnswerPin x={layout.correctX} live={live} /> : null}
        </LineLayer>
        {phase >= PHASE.answer ? (
          <AnswerNumeral value={String(question.correctAnswer)} x={forward && winners.length > 0 ? 960 : layout.correctX} live={live} compact={settling && winners.length > 0} />
        ) : null}
        {forward && litKind ? <WinnersCard kind={litKind} winners={winners} detail={detail} scoring={phase >= PHASE.points} live={live} compact={settling} /> : null}
        {settling && litKind ? <MissesStrip misses={numericMisses(guesses, correct, new Set(winners.map((w) => w.id)))} live={live} /> : null}
      </Shake>
    </motion.div>
  );
};
