import { motion, useReducedMotion } from "framer-motion";
import type { Question, QuestionResult } from "~/game.types";
import { PlayerToken } from "./ink";
import { LookAtTv } from "./LookAtTv";
import { useSpoilerGate } from "./useSpoilerGate";
import { beatenBy, formatNumber, offBy, placeOnQuestion, quip, standingFact } from "./competitive";
import { describeOutcome, ordinal, resultHeadline, type Outcome } from "./outcome";
import { useCountUp } from "./useCountUp";

type Person = { id: string; name: string; score: number };

const TONE: Record<Outcome, string> = {
  exact: "bg-teal text-paper",
  close: "bg-yellow text-ink",
  miss: "bg-paper-2 text-ink",
  none: "bg-paper-2 text-ink",
};

/** The player's own result: the competitive facts first, then the numbers. */
const MyOutcome = ({
  question,
  result,
  me,
  overallRank,
}: {
  question: Question;
  result: QuestionResult;
  me: Person;
  overallRank: number;
}) => {
  const myAnswer = result.answers.find((a) => a.playerId === me.id);
  const myScore = result.scores.find((s) => s.playerId === me.id);
  const outcome = describeOutcome(question, myAnswer?.value);
  const earned = myScore?.points ?? 0;
  const headline = resultHeadline(outcome, earned, question.questionType);
  const tone = earned > 0 && outcome === "miss" ? "bg-yellow text-ink" : TONE[outcome];
  const points = useCountUp(earned);
  const total = useCountUp(me.score);
  const numeric = question.questionType === "numeric";
  const here = placeOnQuestion(result.scores, me.id);
  const beaten = beatenBy(result.scores, me.id);
  const fact = standingFact(outcome, offBy(question, myAnswer?.value), question.questionType);
  const line = quip({ outcome, points: earned, place: here?.place ?? null, beatenBy: beaten });
  const show = (value: string | number) => (numeric ? formatNumber(value) : String(value));

  return (
    <motion.section
      data-testid="my-result"
      className="sheet pres p-4"
      initial={{ y: 24, opacity: 0, rotate: -1.5 }}
      animate={{ y: 0, opacity: 1, rotate: 0 }}
      transition={{ type: "spring", stiffness: 380, damping: 22 }}
    >
      <motion.div
        className={`${tone} pres-stamp font-display font-extrabold`}
        initial={{ scale: 1.8, rotate: -14, opacity: 0 }}
        animate={{ scale: [1.8, 0.94, 1], rotate: -4, opacity: 1 }}
        transition={{ duration: 0.38, times: [0, 0.7, 1], ease: "easeOut", delay: 0.15 }}
      >
        {headline}
      </motion.div>

      <div className="pres-fact">
        {fact && (
          <div className="pres-fact-big font-display font-extrabold" data-testid="my-off-by">
            {fact}
          </div>
        )}
        <p className="pres-quip">{line}</p>
      </div>

      <div className="pres-stats">
        <div className="pres-stat" data-testid="my-question-place">
          <span className="pslug">This question</span>
          <span className="pres-stat-fig tabular">
            {here ? ordinal(here.place) : "-"}
            {here && <small> of {here.of}</small>}
          </span>
        </div>
        <div className="pres-stat">
          <span className="pslug">Points</span>
          <span className="pres-stat-fig tabular" data-testid="my-points" aria-label={`${earned} points`}>
            +{points}
          </span>
        </div>
        <div className="pres-stat">
          <span className="pslug" data-testid="my-overall" aria-label={`Place ${overallRank}`}>
            Overall {ordinal(overallRank)}
          </span>
          <span
            className="pres-stat-fig tabular"
            data-testid="my-total"
            aria-label={`${me.score} points in total`}
          >
            {total}
          </span>
        </div>
      </div>

      <div className="pres-answers grid grid-cols-2 gap-3 text-center">
        <div>
          <div className="pslug">You</div>
          <div
            className="tabular font-display font-extrabold leading-none misreg misreg-sm"
            style={{ fontSize: numeric ? "clamp(32px, 6dvh, 56px)" : "clamp(22px, 3.4dvh, 32px)" }}
            data-testid="my-answer"
          >
            {myAnswer ? show(myAnswer.value) : "-"}
          </div>
        </div>
        <div>
          <div className="pslug">Answer</div>
          <div
            className="tabular font-display font-extrabold leading-none text-blue"
            style={{ fontSize: numeric ? "clamp(32px, 6dvh, 56px)" : "clamp(22px, 3.4dvh, 32px)" }}
            data-testid="correct-answer"
          >
            {show(question.correctAnswer)}
          </div>
        </div>
      </div>

      {beaten.length > 0 && (
        <p className="pres-beaten" data-testid="beaten-by">
          <span className="pslug">Beat you</span> {beaten.join(", ")}
        </p>
      )}
    </motion.section>
  );
};

const sortByRank = (scores: QuestionResult["scores"]) =>
  [...scores].sort((a, b) =>
    b.points !== a.points ? b.points - a.points : a.timeTaken - b.timeTaken,
  );

/** Short list below: everyone's guess, one printed row each. */
const Everyone = ({
  result,
  question,
  players,
  meId,
}: {
  result: QuestionResult;
  question: Question;
  players: Person[];
  meId: string;
}) => (
  <section aria-label="Everyone's answers" >
    <h2 className="pslug mb-2" style={{ fontSize: 16 }}>
      Everyone, this question
    </h2>
    <div className="flex flex-col gap-2">
      {sortByRank(result.scores).map((score, index) => {
        const answer = result.answers.find((a) => a.playerId === score.playerId);
        if (!answer) return null;
        const seat = Math.max(0, players.findIndex((p) => p.id === answer.playerId));
        return (
          <div
            key={answer.playerId}
            data-testid={`player-result-${answer.playerId}`}
            className={`prow ${answer.playerId === meId ? "prow-me" : ""}`}
          >
            <span className="prank" aria-hidden="true">
              {index + 1}
            </span>
            <PlayerToken name={answer.playerName} seat={seat} />
            <div className="min-w-0 flex-1">
              <div className="truncate text-xl font-extrabold leading-tight">
                {answer.playerName}
              </div>
              <div className="pslug truncate">
                {question.questionType === "numeric" ? formatNumber(answer.value) : answer.value} -{" "}
                {score.timeTaken.toFixed(1)}s
              </div>
            </div>
            {score.points > 0 ? (
              <div className="tabular whitespace-nowrap text-2xl font-extrabold">
                +{score.points}
              </div>
            ) : (
              <span className="pchip">0</span>
            )}
          </div>
        );
      })}
    </div>
  </section>
);

const heldValue = (question: Question, value: string | number | undefined) =>
  value !== undefined && question.questionType === "numeric" ? formatNumber(value) : value;

export const PlayerResult = ({
  question,
  result,
  me,
  players,
  arrivedAt = null,
}: {
  question: Question;
  result: QuestionResult;
  me: Person;
  players: Person[];
  /** When this phone saw the result arrive; null/omitted = show the outcome at once. */
  arrivedAt?: number | null;
}) => {
  const reducedMotion = useReducedMotion() ?? false;
  const gate = useSpoilerGate({ arrivedAt, guessCount: result.answers.length, reducedMotion });
  if (gate === "hold") {
    return (
      <LookAtTv
        questionText={question.text}
        myValue={heldValue(question, result.answers.find((a) => a.playerId === me.id)?.value)}
      />
    );
  }
  const ranked = [...players].sort((a, b) => b.score - a.score);
  const overallRank = Math.max(1, ranked.findIndex((p) => p.id === me.id) + 1);

  return (
    <div className="px-4 pb-8 pt-2 mx-auto w-full max-w-5xl">
      <h1
        className="mb-3 text-center font-display font-extrabold text-blue"
        style={{ fontSize: "clamp(20px, 3.2dvh, 28px)", lineHeight: 1.1, letterSpacing: "-0.02em" }}
      >
        {question.text}
      </h1>
      <div className="grid grid-cols-1 gap-5">
        <MyOutcome
          question={question}
          result={result}
          me={me}
          overallRank={overallRank}
        />
        <Everyone result={result} question={question} players={players} meId={me.id} />
      </div>
    </div>
  );
};
