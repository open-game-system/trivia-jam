import { tvAudio } from "~/audio/engine";
import { motion, useReducedMotion } from "framer-motion";
import { useEffect, useMemo, useRef } from "react";
import type { Question, QuestionResult } from "~/game.types";
import { InkToken, RisoType, Slug } from "./print";
import { OptionTiles, QuestionSlug } from "./question";
import { type LineGuess, layoutNumberLine, REVEAL_FRAME, sweepStops } from "./number-line-layout";
import { GuessGroupView, Leaders, NumberLineAxis } from "./number-line-reveal";
import { RollingNumber, StandingsStrip } from "./standings";
import {
  buildStandings,
  findHighlights,
  type Highlight,
  matchOptionIndex,
  optionLetter,
  revealSchedule,
  type StandingRow,
  toNumber,
} from "./tv-model";
import { PHASE, useRevealPhase } from "./use-reveal-phase";

type TvPlayer = { id: string; name: string; score: number };

const AXIS_Y = REVEAL_FRAME.axisY;
const ROLL = [0.2, 0.9, 0.2, 1.15] as const;

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

const answerCenter = (x: number) => Math.min(REVEAL_FRAME.right - 260, Math.max(REVEAL_FRAME.left + 240, x));

const AnswerNumeral = ({ value, x, live }: { value: string; x: number; live: boolean }) => {
  const center = answerCenter(x);
  return (
    <>
      <motion.div
        aria-hidden="true"
        className="absolute overprint"
        style={{ left: x - 5, width: 10, top: AXIS_Y - 40, height: 40, background: "var(--pink)", transformOrigin: "bottom", zIndex: 3 }}
        initial={live ? { scaleY: 0 } : false}
        animate={{ scaleY: 1 }}
        transition={{ duration: 0.22, ease: "easeIn" }}
      />
      <motion.div
        aria-hidden="true"
        className="absolute"
        style={{ left: x - 26, top: AXIS_Y - 26, width: 52, height: 52, background: "var(--pink)", border: "6px solid var(--ink)", rotate: 45, zIndex: 5 }}
        initial={live ? { scale: 0 } : false}
        animate={{ scale: 1 }}
        transition={{ delay: 0.2, type: "spring", stiffness: 500, damping: 14 }}
      />
      <motion.div
        className="absolute tv-display tabular"
        style={{ left: center, top: AXIS_Y + 78, fontSize: 200, lineHeight: 0.86, x: "-50%" }}
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

/** The "?" puck sweeps between the guesses while the room holds its breath. */
const SuspenseMarker = ({ stops, seconds }: { stops: number[]; seconds: number }) => {
  const path = stops.length > 0 ? stops : [960];
  return (
    <motion.span
      aria-hidden="true"
      className="tv-display absolute flex items-center justify-center"
      style={{ left: -55, top: AXIS_Y - 55, width: 110, height: 110, borderRadius: 999, background: "var(--pink)", fontSize: 76, border: "6px solid var(--ink)", zIndex: 8 }}
      initial={{ x: path[0], scale: 0 }}
      animate={{ x: path, scale: 1 }}
      transition={{ x: { duration: seconds, ease: "easeInOut" }, scale: { type: "spring", stiffness: 500, damping: 15 } }}
    >
      ?
    </motion.span>
  );
};

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
  const numeralCenter = answerCenter(layout.correctX);
  const numeralHalf = (String(question.correctAnswer).length * 110) / 2;
  const litGroups = layout.groups.filter((g) => g.highlight !== undefined);
  const firstLit = litGroups[0];
  const roomRight = 1920 - (numeralCenter + numeralHalf + 50);
  const callout =
    firstLit && firstLit.highlight
      ? {
          kind: firstLit.highlight,
          names: litGroups.flatMap((g) => g.members.map((m) => m.name)),
          side: roomRight >= 440 ? ("right" as const) : ("left" as const),
          anchor: roomRight >= 440 ? numeralCenter + numeralHalf + 50 : numeralCenter - numeralHalf - 50,
        }
      : undefined;

  return (
    <motion.div key="reveal" className="absolute inset-0" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <TopBand question={question} number={number} total={total} phase={phase} rows={rows} live={live} />
      <NoGuessNote names={noGuess} />
      <NumberLineAxis layout={layout} axisY={AXIS_Y} live={live} />
      {phase === PHASE.suspense ? <SuspenseMarker stops={suspenseStops} seconds={suspenseSeconds} /> : null}
      {phase >= PHASE.answer ? <AnswerNumeral value={String(question.correctAnswer)} x={layout.correctX} live={live} /> : null}
      <Leaders groups={layout.groups} axisY={AXIS_Y} delays={delays} live={live} />
      {layout.groups.map((g) => (
        <GuessGroupView
          key={g.key}
          group={g}
          size={layout.size}
          showPoints={phase >= PHASE.points}
          lit={g.highlight !== undefined && phase >= PHASE.spotlight}
          dim={phase >= PHASE.spotlight && g.highlight === undefined}
          live={live}
          delay={delays.get(g.key) ?? 0}
        />
      ))}
      {phase >= PHASE.spotlight && callout ? (
        <HighlightCallout kind={callout.kind} names={callout.names} side={callout.side} anchor={callout.anchor} live={live} />
      ) : null}
    </motion.div>
  );
};
