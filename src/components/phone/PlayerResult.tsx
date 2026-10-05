import { motion, useReducedMotion } from "framer-motion";
import type { Question, QuestionResult } from "~/game.types";
import type { ReactNode } from "react";
import { PlayerToken } from "./ink";
import { LookAtTv } from "./LookAtTv";
import { useSpoilerGate } from "./useSpoilerGate";
import { describeOutcome, ordinal, resultHeadline, type Outcome } from "./outcome";
import { useCountUp } from "./useCountUp";

type Person = { id: string; name: string; score: number };

const TONE: Record<Outcome, string> = {
  exact: "bg-teal text-paper",
  close: "bg-yellow text-ink",
  miss: "bg-paper-2 text-ink",
  none: "bg-paper-2 text-ink",
};

/** A big printed number on a coloured block: points, place, total. */
const Stat = ({
  tone,
  children,
  label,
  testId,
  tilt,
}: {
  tone: string;
  children: ReactNode;
  label: string;
  testId?: string;
  tilt: number;
}) => (
  <motion.div
    data-testid={testId}
    aria-label={label}
    className={`pstat ${tone}`}
    initial={{ scale: 1.6, rotate: tilt * 3, opacity: 0 }}
    animate={{ scale: [1.6, 0.95, 1], rotate: tilt, opacity: 1 }}
    transition={{ duration: 0.4, times: [0, 0.7, 1], ease: "easeOut" }}
  >
    {children}
  </motion.div>
);

/** The player's own result: big, short, and happy about it. */
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

  return (
    <motion.section
      data-testid="my-result"
      className="sheet p-4 sm:p-5"
      initial={{ y: 24, opacity: 0, rotate: -1.5 }}
      animate={{ y: 0, opacity: 1, rotate: 0 }}
      transition={{ type: "spring", stiffness: 380, damping: 22 }}
    >
      <div
        className={`${tone} border-4 border-ink px-3 py-3 text-center font-display font-extrabold`}
        style={{ fontSize: "clamp(36px, 8dvh, 72px)", lineHeight: 1, letterSpacing: "-0.02em" }}
      >
        {headline}
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 text-center">
        <div>
          <div className="pslug">You</div>
          <div
            className="tabular font-display font-extrabold leading-none misreg misreg-sm"
            style={{ fontSize: numeric ? "clamp(40px, 9dvh, 84px)" : "clamp(24px, 4.4dvh, 40px)" }}
            data-testid="my-answer"
          >
            {myAnswer ? myAnswer.value : "-"}
          </div>
        </div>
        <div>
          <div className="pslug">Answer</div>
          <div
            className="tabular font-display font-extrabold leading-none text-blue"
            style={{ fontSize: numeric ? "clamp(40px, 9dvh, 84px)" : "clamp(24px, 4.4dvh, 40px)" }}
            data-testid="correct-answer"
          >
            {question.correctAnswer}
          </div>
        </div>
      </div>

      <div className="mt-5 flex items-center justify-center gap-4 border-t-4 border-ink pt-4">
        <Stat tone="bg-pink text-ink" label={`${earned} points`} tilt={-4}>
          +{points}
        </Stat>
        <Stat tone="bg-yellow text-ink" label={`Place ${overallRank}`} tilt={3}>
          {ordinal(overallRank)}
        </Stat>
      </div>

      <div
        className="mt-4 flex items-baseline justify-center gap-3 border-t-4 border-ink pt-3"
        aria-label={`${me.score} points in total`}
      >
        <span className="pslug">Total</span>
        <span
          className="tabular font-display font-extrabold leading-none misreg"
          style={{ fontSize: "clamp(64px, 16dvh, 140px)" }}
          data-testid="my-total"
        >
          {total}
        </span>
      </div>
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
  players,
  meId,
}: {
  result: QuestionResult;
  players: Person[];
  meId: string;
}) => (
  <section aria-label="Everyone's answers">
    <h2 className="pslug mb-2" style={{ fontSize: 16 }}>
      Everyone
    </h2>
    <div className="flex flex-col gap-2">
      {sortByRank(result.scores).map((score) => {
        const answer = result.answers.find((a) => a.playerId === score.playerId);
        if (!answer) return null;
        const seat = Math.max(0, players.findIndex((p) => p.id === answer.playerId));
        return (
          <div
            key={answer.playerId}
            data-testid={`player-result-${answer.playerId}`}
            className={`prow ${answer.playerId === meId ? "prow-me" : ""}`}
          >
            <PlayerToken name={answer.playerName} seat={seat} />
            <div className="min-w-0 flex-1">
              <div className="truncate text-xl font-extrabold leading-tight">
                {answer.playerName}
              </div>
            </div>
            <div className="tabular whitespace-nowrap text-2xl font-extrabold text-blue">
              {answer.value}
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
        myValue={result.answers.find((a) => a.playerId === me.id)?.value}
      />
    );
  }
  const ranked = [...players].sort((a, b) => b.score - a.score);
  const overallRank = Math.max(1, ranked.findIndex((p) => p.id === me.id) + 1);

  return (
    <div className="px-4 pb-8 pt-2 mx-auto w-full max-w-5xl">
      <h1
        className="mb-3 text-center font-display font-extrabold text-blue"
        style={{ fontSize: "clamp(24px, 4.6dvh, 48px)", lineHeight: 1.05, letterSpacing: "-0.02em" }}
      >
        {question.text}
      </h1>
      <div className="grid grid-cols-1 gap-5 landscape:grid-cols-2 landscape:items-start">
        <MyOutcome
          question={question}
          result={result}
          me={me}
          overallRank={overallRank}
        />
        <Everyone result={result} players={players} meId={me.id} />
      </div>
    </div>
  );
};
