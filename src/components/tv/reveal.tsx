import { tvAudio } from "~/audio/engine";
import { motion, useReducedMotion } from "framer-motion";
import { type ReactNode, useEffect, useMemo, useRef } from "react";
import type { Question, QuestionResult } from "~/game.types";
import { InkToken, RisoType, Slug } from "./print";
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
import { PHASE, useRevealPhase } from "./use-reveal-phase";
import { type Winner, WinnersCard, type WinnersKind } from "./winners-card";

type TvPlayer = { id: string; name: string; score: number };

const AXIS_Y = REVEAL_FRAME.axisY;

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

/** Exact answers shake the poster for two or three frames as the answer lands. Nothing else does. */
const Shake = ({ on, children }: { on: boolean; children: ReactNode }) => (
  <motion.div className="absolute inset-0" animate={on ? { x: [0, -14, 11, -6, 0], y: [0, 6, -5, 2, 0] } : { x: 0, y: 0 }} transition={{ duration: 0.11, delay: on ? 0.16 : 0 }}>
    {children}
  </motion.div>
);

/** Everything on the line steps back when the winners break forward. */
const LineLayer = ({ back, children }: { back: boolean; children: ReactNode }) => (
  <motion.div
    className="absolute inset-0"
    style={{ transformOrigin: "50% 75%" }}
    initial={false}
    animate={back ? { opacity: 0.09, scale: 0.97 } : { opacity: 1, scale: 1 }}
    transition={{ duration: 0.35, ease: [0.2, 0.9, 0.2, 1] }}
  >
    {children}
  </motion.div>
);

const answerCenter = (x: number) => Math.min(REVEAL_FRAME.right - 260, Math.max(REVEAL_FRAME.left + 240, x));

/** The pin where the answer lands on the line: a pink stem and diamond. */
const AnswerPin = ({ x, live }: { x: number; live: boolean }) => (
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
  </>
);

/** The answer, huge, under the line: it stays printed while everything else steps back. */
const AnswerNumeral = ({ value, x, live }: { value: string; x: number; live: boolean }) => {
  const center = answerCenter(x);
  return (
    <motion.div
      className="absolute tv-display tabular"
      style={{ top: AXIS_Y + 78, fontSize: 200, lineHeight: 0.86, x: "-50%", zIndex: 35 }}
      initial={live ? { scale: 2.4, opacity: 0, y: -120, left: center } : false}
      animate={{ scale: [2.4, 0.9, 1.03, 1], opacity: 1, y: 0, left: center }}
      transition={{ duration: 0.5, times: [0, 0.55, 0.8, 1], delay: 0.12, left: { type: "spring", stiffness: 200, damping: 22 } }}
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
  );
};

const ChoiceAnswerLine = ({ letter, text, live }: { letter: string; text: string; live: boolean }) => {
  const size = text.length <= 10 ? 180 : text.length <= 18 ? 130 : 88;
  return (
    <motion.div
      className="absolute flex items-end justify-center gap-10"
      style={{ left: 96, right: 96, top: 850, zIndex: 35 }}
      initial={live ? { scale: 1.8, opacity: 0, y: -80 } : false}
      animate={{ scale: [1.8, 0.94, 1], opacity: 1, y: 0 }}
      transition={{ duration: 0.5, times: [0, 0.65, 1] }}
      data-testid="correct-answer"
    >
      <span className="tv-display truncate" style={{ fontSize: size, lineHeight: 0.9 }}>
        <RisoType top="var(--blue)" under="var(--pink)" offset={10} rough>
          {letter}&nbsp;{text}
        </RisoType>
      </span>
    </motion.div>
  );
};

/** The "?" puck sweeps between the guesses while the room holds its breath: above the axis, so the ticks stay readable. */
const SuspenseMarker = ({ stops, seconds }: { stops: number[]; seconds: number }) => {
  const path = stops.length > 0 ? stops : [960];
  const size = 84;
  return (
    <motion.span
      aria-hidden="true"
      className="absolute"
      style={{ left: -size / 2, top: AXIS_Y - 14 - size - 10, width: size, height: size + 24, zIndex: 8 }}
      initial={{ x: path[0], scale: 0 }}
      animate={{ x: path, scale: 1 }}
      transition={{ x: { duration: seconds, ease: "easeInOut" }, scale: { type: "spring", stiffness: 500, damping: 15 } }}
    >
      <svg className="absolute" style={{ left: size / 2 - 14, top: size - 6 }} width={28} height={26} viewBox="0 0 28 26">
        <polygon points="0,0 28,0 14,24" fill="var(--ink)" />
      </svg>
      <span
        className="tv-display absolute flex items-center justify-center"
        style={{ left: 0, top: 0, width: size, height: size, borderRadius: 999, background: "var(--pink)", fontSize: 58, border: "6px solid var(--ink)" }}
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
      <motion.div className="absolute flex items-center gap-6" style={{ left: 96, top: 56, zIndex: 40 }} animate={{ opacity: clear ? 0 : 1 }} transition={{ duration: 0.2 }}>
        <QuestionSlug number={number} total={total} />
        <motion.span key={caption} initial={live ? { opacity: 0, x: -20 } : false} animate={{ opacity: 1, x: 0 }}>
          <Slug className="text-blue">{caption}</Slug>
        </motion.span>
      </motion.div>
      <motion.h2
        className="absolute tv-display text-ink"
        style={{ left: 96, top: 136, maxWidth: 1728, fontSize: qSize, lineHeight: 1.04, letterSpacing: "-0.02em" }}
        animate={{ opacity: clear ? 0 : 1, y: clear ? -24 : 0 }}
        transition={{ duration: 0.18 }}
      >
        {question.text}
      </motion.h2>
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
              <motion.span
                className="inline-flex"
                animate={phase >= PHASE.spotlight && winnerIds.has(t.playerId) ? { scale: 1.3, y: -8 } : phase === PHASE.suspense ? { rotate: [0, -6, 6, -4, 4, 0] } : { scale: 1, rotate: 0 }}
                transition={phase === PHASE.suspense ? { duration: 0.45, repeat: Infinity } : { type: "spring", stiffness: 400, damping: 12 }}
              >
                <InkToken name={t.name} inkIndex={t.inkIndex} size={72} />
              </motion.span>
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
        <NoGuessNote names={noGuess} />
        <LineLayer back={forward && correctIndex >= 0}>
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
          <ChoiceAnswerLine letter={optionLetter(correctIndex)} text={options[correctIndex]} live={live} />
        ) : null}
        {forward && correctIndex >= 0 ? <WinnersCard kind={kind} winners={winners} scoring={phase >= PHASE.points} live={live} /> : null}
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
        <NoGuessNote names={noGuess} />
        <LineLayer back={forward && winners.length > 0}>
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
        {phase >= PHASE.answer ? <AnswerNumeral value={String(question.correctAnswer)} x={forward && winners.length > 0 ? 960 : layout.correctX} live={live} /> : null}
        {forward && litKind ? <WinnersCard kind={litKind} winners={winners} detail={detail} scoring={phase >= PHASE.points} live={live} /> : null}
      </Shake>
    </motion.div>
  );
};
