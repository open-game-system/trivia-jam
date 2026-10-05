import { motion, useReducedMotion } from "framer-motion";
import { useMemo } from "react";
import type { Question, QuestionResult } from "~/game.types";
import { InkToken, Slug } from "./print";
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
const LANE_HEIGHT = 168;
const MAX_LANES = 3;
const PIN_WIDTH = 240;
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

const PointsBadge = ({ points, live }: { points: number; live: boolean }) => (
  <motion.span
    className="tv-display tabular inline-flex items-baseline gap-1"
    style={{ fontSize: 40, background: "var(--pink)", color: "var(--ink)", padding: "2px 12px", border: "4px solid var(--ink)", lineHeight: 1 }}
    initial={live ? { scale: 0, rotate: -20 } : false}
    animate={{ scale: [0, 1.25, 1], rotate: -6 }}
    transition={{ duration: 0.4 }}
  >
    +<RollingNumber from={0} to={points} run={live} duration={0.6} />
    <span className="slug" style={{ fontSize: 28 }}>
      {" "}pts
    </span>
  </motion.span>
);

const HighlightStamp = ({ kind, live }: { kind: Highlight; live: boolean }) => (
  <motion.span
    className="tv-stamp absolute"
    style={{
      fontSize: 38,
      left: "50%",
      top: -64,
      color: kind === "exact" ? "var(--paper)" : "var(--ink)",
      background: kind === "exact" ? "var(--teal)" : "var(--yellow)",
      borderColor: "var(--ink)",
    }}
    initial={live ? { scale: 2.6, opacity: 0, rotate: -24, x: "-50%" } : false}
    animate={{ scale: [2.6, 0.86, 1], opacity: 1, rotate: -8, x: "-50%" }}
    transition={{ duration: 0.42, times: [0, 0.6, 1] }}
  >
    {kind === "exact" ? "Exact!" : "Closest!"}
  </motion.span>
);

const GuessPin = ({ pin, phase, live, delay }: { pin: Pin; phase: number; live: boolean; delay: number }) => {
  const bottom = AXIS_Y - 26 - pin.lane * LANE_HEIGHT;
  const stem = 26 + pin.lane * LANE_HEIGHT;
  const lit = pin.highlight !== undefined && phase >= PHASE.spotlight;
  const dim = phase >= PHASE.spotlight && pin.highlight === undefined;
  return (
    <div
      className="absolute"
      style={{ left: AXIS_LEFT + pin.x - PIN_WIDTH / 2, top: 0, width: PIN_WIDTH, height: AXIS_Y + 8 }}
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
        animate={{ y: 0, opacity: dim ? 0.55 : 1 }}
        transition={{
          y: { delay: live ? delay : 0, type: "spring", stiffness: 420, damping: 17, mass: 0.9 },
          opacity: { delay: live && phase < PHASE.spotlight ? delay : 0, duration: 0.25 },
        }}
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
        {lit && pin.highlight ? <HighlightStamp kind={pin.highlight} live={live} /> : null}
        <span className="relative tv-display tabular" style={{ fontSize: 56, lineHeight: 1 }}>
          {formatTick(pin.value)}
        </span>
        <span className="relative flex items-center mt-1">
          <InkToken name={pin.name} inkIndex={pin.inkIndex} size={64} />
          {phase >= PHASE.points && pin.points > 0 ? (
            <span className="absolute" style={{ left: 72, top: 8 }}>
              <PointsBadge points={pin.points} live={live} />
            </span>
          ) : null}
        </span>
        <span
          className="relative tv-display truncate text-center"
          style={{ fontSize: 36, lineHeight: 1.1, maxWidth: PIN_WIDTH - 20, letterSpacing: "-0.01em", background: "var(--paper)", padding: "0 6px" }}
        >
          {pin.name}
        </span>
      </motion.div>
    </div>
  );
};

const AnswerNumeral = ({ value, x, live }: { value: string; x: number; live: boolean }) => {
  const center = Math.min(AXIS_LEFT + AXIS_WIDTH - 300, Math.max(AXIS_LEFT + 260, AXIS_LEFT + x));
  return (
    <>
      <motion.div
        aria-hidden="true"
        className="absolute overprint"
        style={{ left: AXIS_LEFT + x - 5, width: 10, top: 150, height: AXIS_Y - 150 + 70, background: "var(--pink)", transformOrigin: "top" }}
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
    animate={{ x: [AXIS_WIDTH / 2, AXIS_WIDTH * 0.2, AXIS_WIDTH * 0.8, AXIS_WIDTH * 0.5], scale: 1 }}
    transition={{ duration: 1.2, ease: "easeInOut" }}
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
    phase < PHASE.suspense ? "The guesses" : phase < PHASE.answer ? "And the answer is" : phase < PHASE.points ? "The answer" : "Standings";
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
                <span className="absolute" style={{ top: 64, left: -6 }}>
                  <PointsBadge points={pointsOf.get(t.playerId) ?? 0} live={live} />
                </span>
              ) : null}
            </motion.span>
          ))}
        </>
      ),
    );
    return (
      <motion.div key="reveal" className="absolute inset-0" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
        <TopBand question={question} number={number} total={total} phase={phase} rows={rows} live={live} />
        <NoGuessNote names={noGuess} />
        <div className="absolute" style={{ left: 96, right: 96, top: 330 }}>
          <OptionTiles
            options={options}
            height={170}
            correctIndex={phase >= PHASE.answer && correctIndex >= 0 ? correctIndex : undefined}
            tokens={tokens}
          />
        </div>
        {correctIndex >= 0 ? (
          <span className="tv-sr" data-testid="correct-answer">
            {String(question.correctAnswer)}
          </span>
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
  const lanes = assignLanes(
    placed.map((p) => p.x),
    PIN_WIDTH - 10,
  );
  // Farthest guess drops first, so the closest lands last, right before the answer.
  const dropOrder = [...placed].sort((a, b) => Math.abs(b.value - correct) - Math.abs(a.value - correct));
  const pins: Pin[] = placed.map((p, i) => ({
    playerId: p.answer.playerId,
    name: p.answer.playerName,
    value: p.value,
    x: p.x,
    lane: lanes[i] % MAX_LANES,
    order: dropOrder.indexOf(p),
    inkIndex: inkOf(p.answer.playerId, p.i),
    points: pointsOf.get(p.answer.playerId) ?? 0,
    highlight: highlights.get(p.answer.playerId),
  }));
  const ticks = axis.ticks.map((t) => ({ label: formatTick(t), x: xOnAxis(t, axis, AXIS_WIDTH) }));
  const correctX = xOnAxis(correct, axis, AXIS_WIDTH);

  return (
    <motion.div key="reveal" className="absolute inset-0" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <TopBand question={question} number={number} total={total} phase={phase} rows={rows} live={live} />
      <NoGuessNote names={noGuess} />
      <NumberLine ticks={ticks} live={live} />
      {phase === PHASE.suspense ? <SuspenseMarker /> : null}
      {pins.map((pin) => (
        <GuessPin key={pin.playerId} pin={pin} phase={phase} live={live} delay={firstDrop + pin.order * stagger} />
      ))}
      {phase >= PHASE.answer ? <AnswerNumeral value={String(question.correctAnswer)} x={correctX} live={live} /> : null}
    </motion.div>
  );
};
