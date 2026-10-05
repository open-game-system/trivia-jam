import { motion } from "framer-motion";
import { useState, type ReactNode } from "react";
import type { Answer, Question } from "~/game.types";
import { isCloseNumericAnswer } from "~/game/scoring-utils";
import { PlayerToken } from "./ink";

type Person = { id: string; name: string; score: number };

/** The host's players list: quiet rows, remove is a small secondary action. */
export const PlayerLedger = ({
  players,
  hostId,
  maxPlayers,
  answeredIds,
  onRemove,
}: {
  players: Person[];
  hostId: string;
  maxPlayers: number;
  /** When set, shows who has answered (filled token + chip). */
  answeredIds?: ReadonlySet<string>;
  onRemove?: (playerId: string) => void;
}) => (
  <section aria-labelledby="players-heading">
    <h2 id="players-heading" className="pslug mb-2" style={{ fontSize: 16 }}>
      Players ({players.length}/{maxPlayers})
    </h2>
    {players.length === 0 ? (
      <p className="prow" style={{ minHeight: 60 }}>
        <span className="font-semibold">Nobody yet. Send the link.</span>
      </p>
    ) : (
      <ul className="flex flex-col gap-2">
        {players.map((player, seat) => {
          const isHost = player.id === hostId;
          const answered = answeredIds?.has(player.id);
          return (
            <motion.li
              key={player.id}
              layout
              className="prow"
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <PlayerToken name={player.name} seat={seat} />
              <span className="min-w-0 flex-1 truncate text-xl font-extrabold">
                {player.name}
              </span>
              {isHost && <span className="pchip pchip-ink">Host</span>}
              {answeredIds && (
                <span
                  className="inline-block h-5 w-5 flex-none rounded-full border-4 border-ink"
                  style={{ background: answered ? "var(--teal)" : "transparent" }}
                  role="img"
                  aria-label={answered ? "Answered" : "Not answered yet"}
                />
              )}
              <motion.span
                key={`score-${player.score}`}
                initial={{ scale: 1.3 }}
                animate={{ scale: 1 }}
                className="tabular min-w-[2ch] text-right text-2xl font-extrabold"
              >
                {player.score}
              </motion.span>
              {onRemove && !isHost && !answeredIds && (
                <button
                  type="button"
                  onClick={() => onRemove(player.id)}
                  className="pbtn pbtn-quiet"
                  aria-label={`Remove ${player.name}`}
                  data-testid={`remove-player-${player.id}`}
                >
                  Remove
                </button>
              )}
            </motion.li>
          );
        })}
      </ul>
    )}
  </section>
);

/** One live answer: name, value, and an Exact / Closest chip. */
export const LiveAnswer = ({
  answer,
  question,
}: {
  answer: Answer;
  question: Question;
}) => {
  const numeric = question.questionType === "numeric";
  const isExact = numeric && Number(answer.value) === Number(question.correctAnswer);
  const isClose = numeric && isCloseNumericAnswer(answer.value, question.correctAnswer);

  return (
    <div className={`prow ${isExact ? "prow-win" : ""}`} style={{ minHeight: 56 }}>
      <span className="min-w-0 flex-1 truncate text-lg font-bold">
        {answer.playerName}
      </span>
      {(isExact || isClose) && (
        <span className={`pchip ${isExact ? "pchip-teal" : "pchip-yellow"}`}>
          {isExact ? "Exact" : "Closest"}
        </span>
      )}
      <span className="tabular text-2xl font-extrabold">{answer.value}</span>
    </div>
  );
};

/** What the host is about to read out (and the answer, host eyes only). */
export const QuestionPreview = ({
  question,
  emptyMessage,
}: {
  question: Question | undefined;
  emptyMessage: string;
}) => {
  if (!question) {
    return <p className="py-3 text-center text-xl font-bold">{emptyMessage}</p>;
  }
  return (
    <>
      <div
        className="font-display font-extrabold text-blue"
        style={{ fontSize: "clamp(24px, 6vw, 34px)", lineHeight: 1.1 }}
      >
        {question.text}
      </div>
      <div className="mt-3 flex items-baseline gap-3">
        <span className="pslug">Answer</span>
        <span className="tabular text-3xl font-extrabold">{question.correctAnswer}</span>
      </div>
      {question.questionType === "multiple-choice" && question.options && (
        <div className="mt-3 grid grid-cols-2 gap-2">
          {question.options.map((option, index) => (
            <div
              key={`${index}-${option}`}
              className={`border-4 border-ink px-3 py-2 text-base font-bold ${
                option === question.correctAnswer ? "bg-teal text-paper" : "bg-paper"
              }`}
            >
              {String.fromCharCode(65 + index)}) {option}
            </div>
          ))}
        </div>
      )}
    </>
  );
};

/** The one thing to press, pinned to the bottom edge within thumb reach. */
export const ActionBar = ({ children }: { children: ReactNode }) => (
  <div className="pbar">
    <div className="mx-auto w-full max-w-xl">{children}</div>
  </div>
);

/** Destructive, rare: apart from the routine controls, asks first. */
export const EndGameControl = ({
  onEnd,
  confirm,
  testId,
}: {
  onEnd: () => void;
  /** Ask before ending (used while a question is live). */
  confirm: boolean;
  testId?: string;
}) => {
  const [asking, setAsking] = useState(false);

  if (asking) {
    return (
      <div
        role="alertdialog"
        aria-label="End the game?"
        className="border-4 border-ink bg-yellow p-4 psheet-in"
      >
        <p className="mb-3 text-xl font-extrabold">End the game for everyone?</p>
        <div className="flex gap-3">
          <button
            type="button"
            className="pbtn pbtn-block"
            onClick={() => setAsking(false)}
          >
            Keep playing
          </button>
          <button type="button" className="pbtn pbtn-ink pbtn-block" onClick={onEnd}>
            End game now
          </button>
        </div>
      </div>
    );
  }

  return (
    <button
      type="button"
      className="pbtn pbtn-quiet"
      data-testid={testId}
      onClick={() => (confirm ? setAsking(true) : onEnd())}
    >
      End game
    </button>
  );
};
