import { tvAudio } from "~/audio/engine";
import { motion, useReducedMotion } from "framer-motion";
import { useEffect, useMemo, useRef } from "react";
import type { Question, QuestionResult } from "~/game.types";
import { InkToken, RisoType, Slug } from "./print";
import { OptionTiles, QuestionSlug } from "./question";
import { RollingNumber, StandingsStrip } from "./standings";
import {
  assignLanes,
  buildAxis,
  buildStandings,
  findHighlights,
  formatTick,
  type Highlight,
  matchOptionIndex,
  optionLetter,
  revealSchedule,
  type StandingRow,
  toNumber,
  xOnAxis,
} from "./tv-model";
import { PHASE, useRevealPhase } from "./use-reveal-phase";

type TvPlayer = { id: string; name: string; score: number };

const AXIS_LEFT = 170;
const AXIS_WIDTH = 1580;
const AXIS_Y = 735;
type PinGeometry = { width: number; laneHeight: number; maxLanes: number; token: number; guessSize: number };
const ROOMY: PinGeometry = { width: 240, laneHeight: 168, maxLanes: 3, token: 64, guessSize: 56 };
const COMPACT: PinGeometry = { width: 176, laneHeight: 148, maxLanes: 4, token: 52, guessSize: 46 };
const ROLL = [0.2, 0.9, 0.2, 1.15] as const;

type Pin = {
  playerId: string;
  name: string;
  value: number;
  x: number;
  lane: number;
  order: number;
  inkIndex: number;
  points: number;
  highlight: Highlight | undefined;
};

const PointsBadge = ({ points, live, compact = false }: { points: number; live: boolean; compact?: boolean }) => (
  <motion.span
    className="tv-display tabular inline-flex items-baseline gap-1"
    style={{ fontSize: compact ? 34 : 40, background: "var(--pink)", color: "var(--ink)", padding: compact ? "2px 8px" : "2px 12px", border: "4px solid var(--ink)", lineHeight: 1 }}
    initial={live ? { scale: 0, rotate: -20 } : false}
    animate={{ scale: [0, 1.25, 1], rotate: -6 }}
    transition={{ duration: 0.4 }}
  >
    +<RollingNumber from={0} to={points} run={live} duration={0.6} />
    {compact ? null : (
      <span className="slug" style={{ fontSize: 28 }}>
        {" "}pts
      </span>
    )}
  </motion.span>
);

/** "EXACT!" (teal) or "CLOSEST!" (yellow) stamped beside the answer, with who did it. */
const HighlightCallout = ({
  kind,
  names,
  side,
  anchor,
  live,
}: {
  kind: Highlight;
  names: string[];
  side: "left" | "right";
  anchor: number;
  live: boolean;
}) => (
  <motion.div
    className="absolute flex flex-col"
    style={{
      top: AXIS_Y + 120,
      ...(side === "right" ? { left: anchor } : { right: 1920 - anchor }),
      alignItems: side === "right" ? "flex-start" : "flex-end",
      zIndex: 40,
    }}
    initial={live ? { scale: 2.6, opacity: 0, rotate: -24 } : false}
    animate={{ scale: [2.6, 0.86, 1], opacity: 1, rotate: -6 }}
    transition={{ duration: 0.42, times: [0, 0.6, 1] }}
    data-testid="tv-highlight"
  >
    <span
      className="tv-stamp"
      style={{
        fontSize: 52,
        color: kind === "exact" ? "var(--paper)" : "var(--ink)",
        background: kind === "exact" ? "var(--teal)" : "var(--yellow)",
        borderColor: "var(--ink)",
      }}
    >
      {kind === "exact" ? "Exact!" : "Closest!"}
    </span>
    <span className="tv-display mt-3" style={{ fontSize: 48, lineHeight: 1, letterSpacing: "-0.01em", maxWidth: 520 }}>
      {names.join(" & ")}
    </span>
  </motion.div>
);

const GuessPin = ({ pin, phase, live, delay, geo }: { pin: Pin; phase: number; live: boolean; delay: number; geo: PinGeometry }) => {
  const PIN_WIDTH = geo.width;
  const bottom = AXIS_Y - 26 - pin.lane * geo.laneHeight;
  const stem = 26 + pin.lane * geo.laneHeight;
  const lit = pin.highlight !== undefined && phase >= PHASE.spotlight;
  const dim = phase >= PHASE.spotlight && pin.highlight === undefined ? 0.5 : 1;
  return (
    <div
      className="absolute"
      style={{ left: AXIS_LEFT + pin.x - PIN_WIDTH / 2, top: 0, width: PIN_WIDTH, height: AXIS_Y + 8, zIndex: lit ? 30 : 10 + (geo.maxLanes - pin.lane) }}
      data-testid={`player-result-${pin.playerId}`}
    >
      <motion.div
        className="absolute"
        style={{ left: PIN_WIDTH / 2 - 3, width: 6, top: bottom, height: stem, background: "var(--ink)", transformOrigin: "bottom" }}
        initial={live ? { scaleY: 0 } : false}
        animate={{ scaleY: 1 }}
        transition={{ delay: live ? delay + 0.25 : 0, duration: 0.25 }}
      />
      <motion.div
        className="absolute flex flex-col items-center"
        style={{ left: 0, width: PIN_WIDTH, bottom: AXIS_Y + 8 - bottom }}
        initial={live ? { y: -420, opacity: 0 } : false}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: live ? delay : 0, y: { type: "spring", stiffness: 420, damping: 17, mass: 0.9 }, opacity: { duration: 0.15 } }}
      >
        {lit ? (
          <motion.svg
            aria-hidden="true"
            className="absolute"
            width={300}
            height={300}
            style={{ left: PIN_WIDTH / 2 - 150, top: -40, mixBlendMode: "multiply" }}
            initial={live ? { scale: 0 } : false}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 300, damping: 14 }}
          >
            <circle cx={150} cy={150} r={146} fill="url(#tv-dots-yellow)" />
          </motion.svg>
        ) : null}
        <span className="relative tv-display tabular" style={{ fontSize: geo.guessSize, lineHeight: 1, opacity: dim, transition: "opacity .3s" }}>
          {formatTick(pin.value)}
        </span>
        <span className="relative flex items-center mt-1">
          <span style={{ opacity: dim, transition: "opacity .3s" }}>
            <InkToken name={pin.name} inkIndex={pin.inkIndex} size={geo.token} />
          </span>
          {phase >= PHASE.points && pin.points > 0 ? (
            <span className="absolute" style={{ left: geo.token + 10, top: geo.token / 2 - 26 }}>
              <PointsBadge points={pin.points} live={live} compact={geo === COMPACT} />
            </span>
          ) : null}
        </span>
        <span
          className="relative tv-display truncate text-center"
          style={{ fontSize: 36, lineHeight: 1.1, maxWidth: PIN_WIDTH - 20, letterSpacing: "-0.01em", opacity: dim, transition: "opacity .3s" }}
        >
          {pin.name}
        </span>
      </motion.div>
    </div>
  );
};

const answerCenter = (x: number) => Math.min(AXIS_LEFT + AXIS_WIDTH - 300, Math.max(AXIS_LEFT + 260, AXIS_LEFT + x));

const AnswerNumeral = ({ value, x, live }: { value: string; x: number; live: boolean }) => {
  const center = answerCenter(x);
  return (
    <>
      <motion.div
        aria-hidden="true"
        className="absolute overprint"
        style={{ left: AXIS_LEFT + x - 5, width: 10, top: 236, height: AXIS_Y - 236 + 70, background: "var(--pink)", transformOrigin: "top" }}
        initial={live ? { scaleY: 0 } : false}
        animate={{ scaleY: 1 }}
        transition={{ duration: 0.22, ease: "easeIn" }}
      />
      <motion.div
        className="absolute tv-display tabular"
        style={{ left: center, top: AXIS_Y + 74, fontSize: 250, lineHeight: 0.86, x: "-50%" }}
        initial={live ? { scale: 2.4, opacity: 0, y: -120 } : false}
        animate={{ scale: [2.4, 0.9, 1.03, 1], opacity: 1, y: 0 }}
        transition={{ duration: 0.5, times: [0, 0.55, 0.8, 1], delay: 0.12 }}
        data-testid="correct-answer"
      >
        <span className="tv-riso-type">
          <motion.span
            aria-hidden="true"
            className="tv-riso-under tv-rough"
            style={{ color: "var(--pink)" }}
            initial={live ? { x: 0, y: 0 } : false}
            animate={{ x: [0, 22, -10, 14, 9], y: [0, -12, 16, 6, 9] }}
            transition={{ duration: 0.5, delay: 0.42 }}
          >
            {value}
          </motion.span>
          <span className="tv-riso-top tv-rough" style={{ color: "var(--blue)" }}>
            {value}
          </span>
        </span>
      </motion.div>
    </>
  );
};

const ChoiceAnswerLine = ({ letter, text, live }: { letter: string; text: string; live: boolean }) => {
  const size = text.length <= 10 ? 190 : text.length <= 18 ? 130 : 88;
  return (
    <motion.div
      className="absolute flex items-end gap-10"
      style={{ left: 96, right: 96, top: 730 }}
      initial={live ? { scale: 1.8, opacity: 0, y: -80 } : false}
      animate={{ scale: [1.8, 0.94, 1], opacity: 1, y: 0 }}
      transition={{ duration: 0.5, times: [0, 0.65, 1] }}
      data-testid="correct-answer"
    >
      <Slug className="text-ink pb-6">The answer</Slug>
      <span className="tv-display truncate" style={{ fontSize: size, lineHeight: 0.9 }}>
        <RisoType top="var(--blue)" under="var(--pink)" offset={10} rough>
          {letter}&nbsp;{text}
        </RisoType>
      </span>
    </motion.div>
  );
};

const NumberLine = ({ ticks, live }: { ticks: Array<{ label: string; x: number }>; live: boolean }) => (
  <div aria-hidden="true">
    <motion.div
      className="absolute"
      style={{ left: AXIS_LEFT - 40, width: AXIS_WIDTH + 80, top: AXIS_Y - 4, height: 8, background: "var(--ink)", transformOrigin: "left" }}
      initial={live ? { scaleX: 0 } : false}
      animate={{ scaleX: 1 }}
      transition={{ duration: 0.75, ease: [0.6, 0, 0.2, 1] }}
    />
    {ticks.map((t, i) => (
      <motion.div
        key={t.label}
        className="absolute flex flex-col items-center"
        style={{ left: AXIS_LEFT + t.x - 80, width: 160, top: AXIS_Y - 18 }}
        initial={live ? { opacity: 0, y: -14 } : false}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: live ? 0.2 + i * 0.06 : 0, duration: 0.3 }}
      >
        <span style={{ width: 6, height: 36, background: "var(--ink)" }} />
        <span className="slug text-[34px] mt-2 text-blue">{t.label}</span>
      </motion.div>
    ))}
  </div>
);

const SuspenseMarker = () => (
  <motion.span
    aria-hidden="true"
    className="tv-display absolute flex items-center justify-center"
    style={{ left: AXIS_LEFT - 44, top: AXIS_Y - 44, width: 88, height: 88, borderRadius: 999, background: "var(--pink)", fontSize: 60, border: "5px solid var(--ink)" }}
    initial={{ x: AXIS_WIDTH / 2, scale: 0 }}
    animate={{ x: [AXIS_WIDTH / 2, AXIS_WIDTH * 0.25, AXIS_WIDTH * 0.75, AXIS_WIDTH * 0.5], scale: 1 }}
    transition={{ x: { duration: 1.1, ease: "easeInOut" }, scale: { type: "spring", stiffness: 500, damping: 15 } }}
  >
    ?
  </motion.span>
);

const TopBand = ({
  question,
  number,
  total,
  phase,
  rows,
  live,
}: {
  question: Question;
  number: number;
  total: number;
  phase: number;
  rows: StandingRow[];
  live: boolean;
}) => {
  const showStrip = phase >= PHASE.points;
  const caption =
    phase < PHASE.suspense ? "The guesses" : phase < PHASE.answer ? "And the answer is..." : phase < PHASE.points ? "The answer" : "Standings";
  return (
    <>
      <div className="absolute flex items-center gap-6" style={{ left: 96, top: 60 }}>
        <QuestionSlug number={number} total={total} />
        <motion.span key={caption} initial={live ? { opacity: 0, x: -20 } : false} animate={{ opacity: 1, x: 0 }}>
          <Slug className="text-blue">{caption}</Slug>
        </motion.span>
      </div>
      <motion.h2
        className="absolute tv-display text-ink"
        style={{ left: 96, top: 140, maxWidth: 1500, fontSize: 52, lineHeight: 1.05, letterSpacing: "-0.02em" }}
        animate={{ opacity: showStrip ? 0 : 1, y: showStrip ? -30 : 0 }}
        transition={{ duration: 0.35 }}
      >
        {question.text}
      </motion.h2>
      {showStrip ? (
        <motion.div
          className="absolute"
          style={{ left: 96, right: 96, top: 140 }}
          initial={live ? { opacity: 0, y: 30 } : false}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: ROLL }}
        >
          <StandingsStrip rows={rows} settled={phase >= PHASE.standings} animateScores={live} />
        </motion.div>
      ) : null}
    </>
  );
};

const NoGuessNote = ({ names }: { names: string[] }) =>
  names.length > 0 ? (
    <div className="absolute slug text-[28px] text-ink" style={{ right: 96, top: 72 }} data-testid="tv-no-guess">
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
  const rows = useMemo(() => buildStandings(players, result.scores), [players, result.scores]);
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

  if (isChoice && question.options) {
    const options = question.options;
    const correctIndex = matchOptionIndex(question.correctAnswer, options);
    const byOption: Array<Array<{ playerId: string; name: string; inkIndex: number; order: number }>> = options.map(() => []);
    result.answers.forEach((a, order) => {
      const idx = matchOptionIndex(a.value, options);
      if (idx >= 0) byOption[idx].push({ playerId: a.playerId, name: a.playerName, inkIndex: inkOf(a.playerId, order), order });
    });
    const tokens = byOption.map((list) =>
      list.length === 0 ? null : (
        <>
          {list.map((t) => (
            <motion.span
              key={t.playerId}
              className="relative inline-flex flex-col items-center"
              data-testid={`player-result-${t.playerId}`}
              initial={live ? { y: -360, opacity: 0 } : false}
              animate={{ y: 0, opacity: 1 }}
              transition={{ y: { delay: live ? firstDrop + t.order * stagger : 0, type: "spring", stiffness: 420, damping: 17 }, opacity: { delay: live ? firstDrop + t.order * stagger : 0 } }}
            >
              <InkToken name={t.name} inkIndex={t.inkIndex} size={72} />
              <span className="tv-sr">{t.name}</span>
              {phase >= PHASE.points && (pointsOf.get(t.playerId) ?? 0) > 0 ? (
                <span className="absolute" style={{ top: 62, left: 0 }}>
                  <PointsBadge points={pointsOf.get(t.playerId) ?? 0} live={live} compact />
                </span>
              ) : null}
            </motion.span>
          ))}
        </>
      ),
    );
    return (
      <motion.div key="reveal" className="absolute inset-0" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
        <TopBand question={question} number={number} total={total} phase={phase} rows={rows} live={live} />
        <NoGuessNote names={noGuess} />
        <div className="absolute" style={{ left: 96, right: 96, top: 300 }}>
          <OptionTiles
            options={options}
            height={150}
            correctIndex={phase >= PHASE.answer && correctIndex >= 0 ? correctIndex : undefined}
            tokens={tokens}
          />
        </div>
        {phase >= PHASE.answer && correctIndex >= 0 ? (
          <ChoiceAnswerLine letter={optionLetter(correctIndex)} text={options[correctIndex]} live={live} />
        ) : null}
      </motion.div>
    );
  }

  const correct = toNumber(question.correctAnswer) ?? 0;
  const numeric = result.answers.flatMap((a, i) => {
    const v = toNumber(a.value);
    return v === null ? [] : [{ answer: a, value: v, i }];
  });
  const axis = buildAxis(
    numeric.map((n) => n.value),
    correct,
  );
  const highlights = findHighlights(result.answers, question.correctAnswer);
  const placed = numeric
    .map((n) => ({ ...n, x: xOnAxis(n.value, axis, AXIS_WIDTH) }))
    .sort((a, b) => a.x - b.x);
  const priority = placed.flatMap((p, i) => (highlights.has(p.answer.playerId) ? [i] : []));
  const roomyLanes = assignLanes(
    placed.map((p) => p.x),
    ROOMY.width - 10,
    priority,
  );
  const geo = Math.max(0, ...roomyLanes) + 1 > ROOMY.maxLanes ? COMPACT : ROOMY;
  const lanes =
    geo === ROOMY
      ? roomyLanes
      : assignLanes(
          placed.map((p) => p.x),
          COMPACT.width - 6,
          priority,
        );
  // Farthest guess drops first, so the closest lands last, right before the answer.
  const dropOrder = [...placed].sort((a, b) => Math.abs(b.value - correct) - Math.abs(a.value - correct));
  const pins: Pin[] = placed.map((p, i) => ({
    playerId: p.answer.playerId,
    name: p.answer.playerName,
    value: p.value,
    x: p.x,
    lane: lanes[i] % geo.maxLanes,
    order: dropOrder.indexOf(p),
    inkIndex: inkOf(p.answer.playerId, p.i),
    points: pointsOf.get(p.answer.playerId) ?? 0,
    highlight: highlights.get(p.answer.playerId),
  }));
  const ticks = axis.ticks.map((t) => ({ label: formatTick(t), x: xOnAxis(t, axis, AXIS_WIDTH) }));
  const correctX = xOnAxis(correct, axis, AXIS_WIDTH);
  const numeralCenter = answerCenter(correctX);
  const numeralHalf = (String(question.correctAnswer).length * 150) / 2;
  const litPins = pins.filter((p) => p.highlight !== undefined);
  const firstLit = litPins[0];
  const roomRight = 1920 - (numeralCenter + numeralHalf + 50);
  const callout =
    firstLit && firstLit.highlight
      ? {
          kind: firstLit.highlight,
          names: litPins.map((p) => p.name),
          side: roomRight >= 440 ? ("right" as const) : ("left" as const),
          anchor: roomRight >= 440 ? numeralCenter + numeralHalf + 50 : numeralCenter - numeralHalf - 50,
        }
      : undefined;

  return (
    <motion.div key="reveal" className="absolute inset-0" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <TopBand question={question} number={number} total={total} phase={phase} rows={rows} live={live} />
      <NoGuessNote names={noGuess} />
      <NumberLine ticks={ticks} live={live} />
      {phase === PHASE.suspense ? <SuspenseMarker /> : null}
      {pins.map((pin) => (
        <GuessPin key={pin.playerId} pin={pin} phase={phase} live={live} delay={firstDrop + pin.order * stagger} geo={geo} />
      ))}
      {phase >= PHASE.answer ? <AnswerNumeral value={String(question.correctAnswer)} x={correctX} live={live} /> : null}
      {phase >= PHASE.spotlight && callout ? (
        <HighlightCallout kind={callout.kind} names={callout.names} side={callout.side} anchor={callout.anchor} live={live} />
      ) : null}
    </motion.div>
  );
};
