import { motion } from "framer-motion";
import { useState, type ReactNode } from "react";
import type { Answer, Question } from "~/game.types";
import { isCloseNumericAnswer } from "~/game/scoring-utils";
import { PlayerToken } from "./ink";

type Person = { id: string; name: string; score: number };

/** The host's players list: glass rows, remove is a small secondary action. */
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
      <span aria-hidden="true">
        {players.length} {players.length === 1 ? "Player" : "Players"}
      </span>
      {/* The cap is a setting, not something the TV shows; kept for assistive tech and e2e. */}
      <span className="sr-only">
        Players ({players.length}/{maxPlayers})
      </span>
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
                  className="inline-block h-5 w-5 flex-none rounded-full border-2 border-white/40"
                  style={
                    answered
                      ? { background: "var(--win)", borderColor: "var(--win)", boxShadow: "0 0 12px rgba(74,222,128,0.7)" }
                      : { background: "transparent" }
                  }
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

/** The question as the screen's headline. */
export const QuestionHeadline = ({ question }: { question: Question }) => (
  <p className="h-head lav-text">{question.text}</p>
);

/** Host-eyes extras for a question: the answer and, for multiple choice, the options. */
export const QuestionExtras = ({ question }: { question: Question }) => (
  <>
    <div className="flex items-baseline gap-3">
      <span className="pslug">Answer</span>
      <span className="tabular h-head glow-text">{question.correctAnswer}</span>
    </div>
    {question.questionType === "multiple-choice" && question.options && (
      <div className="grid grid-cols-2 gap-2">
        {question.options.map((option, index) => (
          <div
            key={`${index}-${option}`}
            className={`rounded-2xl border px-3 py-2 h-detail ${
              option === question.correctAnswer
                ? "border-win bg-win text-win-ink"
                : "border-white/20 bg-white/10 text-white"
            }`}
          >
            {String.fromCharCode(65 + index)}) {option}
          </div>
        ))}
      </div>
    )}
  </>
);

/**
 * "Details": everything the host can look up but does not need at a glance.
 * Native <details>, so it is keyboard and screen-reader friendly and closed by default.
 */
export const Details = ({
  summary = "Details",
  children,
  testId,
}: {
  summary?: string;
  children: ReactNode;
  testId?: string;
}) => (
  <details className="hdetails" data-testid={testId}>
    <summary className="hdetails-summary">
      <span>{summary}</span>
      <svg className="hdetails-caret" width="22" height="22" viewBox="0 0 22 22" aria-hidden="true">
        <path d="M4 7.5 11 15l7-7.5" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </summary>
    <div className="hdetails-body">{children}</div>
  </details>
);

/** The one big fact on a host screen: a huge figure over a plain label. */
export const BigStatus = ({
  figure,
  of,
  label,
  tone = "ink",
}: {
  figure: string | number;
  /** Optional "of N" printed smaller beside the figure. */
  of?: string | number;
  label: string;
  tone?: "ink" | "teal";
}) => (
  <div className={`hstatus ${tone === "teal" ? "hstatus-teal" : ""}`}>
    <div className="hstatus-figure">
      <span className="tabular glow-text">{figure}</span>
      {of !== undefined && <span className="hstatus-of">of {of}</span>}
    </div>
    <div className="hstatus-label">{label}</div>
  </div>
);

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
        className="pcard pcard-glow p-4 psheet-in"
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
          <button type="button" className="pbtn pbtn-primary pbtn-block" onClick={onEnd}>
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
