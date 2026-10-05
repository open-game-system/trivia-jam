import { AnimatePresence, motion } from "framer-motion";
import { Check, Copy, Loader2, Settings, Share2 } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { useMemo, useState } from "react";
import { Drawer } from "vaul";
import { GameContext } from "~/game.context";
import type { GamePublicContext } from "~/game.machine";
import type { Answer, Question, QuestionResult } from "~/game.types";
import { isCloseNumericAnswer } from "~/game/scoring-utils";
import { useQuestionTimer } from "~/hooks/use-question-timer";
import { SessionContext } from "~/session.context";
import { AnswerProgress } from "./answer-progress";
import { FinalScores, Winner, byScore } from "./phone/FinalScores";
import {
  ActionBar,
  BigStatus,
  Details,
  EndGameControl,
  LiveAnswer,
  PlayerLedger,
  QuestionExtras,
  QuestionHeadline,
} from "./phone/HostParts";
import { PlayerToken } from "./phone/ink";
import { PhoneShell } from "./phone/PhoneShell";
import { QuestionProgress } from "./question-progress";

type GameSettings = {
  maxPlayers: number;
  answerTimeWindow: number;
};

type SettingsModalProps = {
  isOpen: boolean;
  onClose: () => void;
  currentSettings: GameSettings;
  onSave: (settings: GameSettings) => void;
};

type Score = GamePublicContext["questionResults"][number]["scores"][number];
type Person = { id: string; name: string; score: number };
type LiveQuestion = { questionId: string; startTime: number; answers: Answer[] };

const formatQuestionsToText = (questions: Record<string, Question>): string => {
  return Object.values(questions)
    .map((q) => {
      if (q.questionType === "numeric") {
        return `${q.text}\n${q.correctAnswer}\n`;
      }
      const options =
        q.options
          ?.map((opt, i) => `${String.fromCharCode(97 + i)}) ${opt}`)
          .join(" ") || "";
      const correctIndex =
        q.options?.findIndex((opt) => opt === q.correctAnswer) || 0;
      return `${q.text}\n${options}\nCorrect answer: ${String.fromCharCode(
        65 + correctIndex,
      )}\n`;
    })
    .join("\n");
};

const Page = ({ children }: { children: React.ReactNode }) => (
  <div className="mx-auto w-full max-w-xl px-4">{children}</div>
);

const Masthead = ({ children }: { children?: React.ReactNode }) => (
  <div className="flex items-center justify-between gap-3 pb-4 pt-4">
    <span className="pslug">Trivia Jam / Host</span>
    {children}
  </div>
);

export const HostView = ({ host }: { host: string }) => {
  const hostId = GameContext.useSelector((state) => state.public.hostId);
  const id = GameContext.useSelector((state) => state.public.id);
  const userId = SessionContext.useSelector((state) => state.public.userId);

  if (userId !== hostId) {
    return (
      <PhoneShell className="flex items-center justify-center p-5">
        <div className="sheet sheet-pink w-full max-w-md px-6 py-8 text-center">
          <h1 className="mb-3 text-3xl font-extrabold">Host Controls Not Available</h1>
          <p className="text-xl font-semibold">Only the host can access these controls.</p>
        </div>
      </PhoneShell>
    );
  }

  if (!id) {
    return (
      <PhoneShell className="flex items-center justify-center p-5">
        <div className="sheet w-full max-w-md px-6 py-8 text-center">
          <h1 className="misreg mb-4 text-3xl font-extrabold">Creating Game...</h1>
          <Loader2 className="mx-auto h-12 w-12 animate-spin" role="status" />
        </div>
      </PhoneShell>
    );
  }

  return <HostGameView host={host} />;
};

const HostGameView = ({ host }: { host: string }) => {
  const currentQuestion = GameContext.useSelector((state) => state.public.currentQuestion);
  const players = GameContext.useSelector((state) => state.public.players);
  const questions = GameContext.useSelector((state) => state.public.questions);
  const questionResults = GameContext.useSelector((state) => state.public.questionResults);
  const questionNumber = GameContext.useSelector((state) => state.public.questionNumber);
  const send = GameContext.useSend();
  const isActive = GameContext.useMatches("active");
  const isFinished = GameContext.useMatches("finished");
  const isLobby = GameContext.useMatches("lobby");

  const lastQuestionResult = questionResults[questionResults.length - 1];

  return (
    <PhoneShell fill className="flex flex-col">
      {isLobby && (
        <LobbyControls
          players={players}
          onStartGame={() => send({ type: "START_GAME" })}
          host={host}
        />
      )}

      {isActive && (
        <>
          <QuestionProgress
            current={questionNumber}
            total={Object.keys(questions).length}
          />
          <QuestionControls
            currentQuestion={currentQuestion}
            lastQuestionResult={lastQuestionResult}
            questions={questions}
            players={players}
          />
        </>
      )}

      {isFinished && <GameFinishedDisplay players={players} />}
    </PhoneShell>
  );
};

/* ---------- Results (between questions) ---------- */

const ResultAnswerRow = ({
  answer,
  score,
  question,
  seat,
}: {
  answer: Answer;
  score: Score | undefined;
  question: Question;
  seat: number;
}) => {
  const numeric = question.questionType === "numeric";
  const isExact = numeric && Number(answer.value) === Number(question.correctAnswer);
  const isClose = numeric && isCloseNumericAnswer(answer.value, question.correctAnswer);
  const scored = !!score && score.points > 0;

  return (
    <div
      data-testid={`player-result-${answer.playerId}`}
      className={`prow ${scored ? "prow-win" : ""}`}
    >
      <PlayerToken name={answer.playerName} seat={seat} />
      <div className="min-w-0 flex-1">
        <div className="truncate text-xl font-extrabold leading-tight">
          {answer.playerName}
        </div>
        <div className="pslug truncate">
          {answer.value}
          {score ? ` - ${score.timeTaken.toFixed(1)}s` : ""}
        </div>
      </div>
      {(isExact || isClose) && (
        <span className={`pchip ${isExact ? "pchip-teal" : "pchip-yellow"}`}>
          {isExact ? "Exact" : "Close"}
        </span>
      )}
      {scored ? (
        <span className="tabular text-2xl font-extrabold">+{score.points}</span>
      ) : (
        <span className="pchip">0</span>
      )}
    </div>
  );
};

const PreviousQuestionResults = ({
  lastQuestionResult,
  questions,
  players,
}: {
  lastQuestionResult: QuestionResult;
  questions: Record<string, Question>;
  players: Person[];
}) => {
  const question = questions[lastQuestionResult.questionId];
  const shortAnswer = String(question.correctAnswer).length <= 6;
  return (
    <motion.section
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ ease: [0.2, 0.9, 0.2, 1.15], duration: 0.3 }}
      aria-labelledby="results-heading"
    >
      <h1 className="h-head text-blue">{question.text}</h1>
      <div className="hstatus-card mt-4">
        <div className="pslug">Answer</div>
        <div
          className={`tabular ${shortAnswer ? "hstatus-figure" : "h-head"}`}
          style={shortAnswer ? undefined : { marginTop: 4 }}
        >
          {question.correctAnswer}
        </div>
      </div>
      <h2 id="results-heading" className="pslug mb-2 mt-5" style={{ fontSize: 16 }}>
        Results
      </h2>
      {lastQuestionResult.answers.length === 0 ? (
        <p className="prow">
          <span className="text-xl font-bold">No one answered this question</span>
        </p>
      ) : (
        <div className="flex flex-col gap-2">
          {sortedAnswers(lastQuestionResult, questions).map((answer) => (
            <ResultAnswerRow
              key={answer.playerId}
              answer={answer}
              score={lastQuestionResult.scores.find((s) => s.playerId === answer.playerId)}
              question={question}
              seat={Math.max(0, players.findIndex((p) => p.id === answer.playerId))}
            />
          ))}
        </div>
      )}
    </motion.section>
  );
};

/* ---------- Setup (lobby) ---------- */

const SettingsModal = ({
  isOpen,
  onClose,
  currentSettings,
  onSave,
}: SettingsModalProps) => {
  const [settings, setSettings] = useState<GameSettings>(currentSettings);
  const playerLimits = useMemo(
    () =>
      Array.from(
        new Set([10, 30, 100, 1000, 10000, 100000, 1000000, currentSettings.maxPlayers]),
      ).sort((a, b) => a - b),
    [currentSettings.maxPlayers],
  );

  if (!isOpen) return null;

  return (
    <Drawer.Root open={isOpen} onOpenChange={onClose}>
      <Drawer.Portal>
        <Drawer.Overlay
          className="fixed inset-0 z-[100]"
          style={{ background: "rgba(30,27,26,0.55)" }}
        />
        <Drawer.Content className="psheet-drawer">
          <div className="flex-1 overflow-y-auto px-5 pb-6 pt-4">
            <div className="mx-auto mb-4 h-2 w-16 bg-ink" aria-hidden="true" />
            <div className="mx-auto max-w-xl">
              <Drawer.Title asChild>
                <h2 className="misreg mb-5 text-4xl font-extrabold">Game Settings</h2>
              </Drawer.Title>
              <Drawer.Description className="sr-only">
                Time limit and player limit
              </Drawer.Description>

              <div className="space-y-4">
                <div className="sheet p-4">
                  <div className="flex items-center justify-between gap-3">
                    <h3 className="text-2xl font-extrabold">Time Limit</h3>
                    <div className="flex items-center gap-2">
                      <input
                        id="answerTime"
                        type="number"
                        inputMode="numeric"
                        min="5"
                        max="120"
                        value={settings.answerTimeWindow}
                        onChange={(e) =>
                          setSettings((s) => ({
                            ...s,
                            answerTimeWindow: parseInt(e.target.value) || 5,
                          }))
                        }
                        className="pfield text-center"
                        style={{ width: 96 }}
                        aria-label="Answer Time Window"
                      />
                      <span className="pslug">sec</span>
                    </div>
                  </div>
                  <p className="mt-2 text-base font-semibold">Time to answer each question</p>
                </div>

                <div className="sheet p-4">
                  <div className="flex items-center justify-between gap-3">
                    <h3 className="text-2xl font-extrabold">Player Limit</h3>
                    <select
                      id="maxPlayers"
                      value={settings.maxPlayers}
                      onChange={(e) =>
                        setSettings((s) => ({
                          ...s,
                          maxPlayers: parseInt(e.target.value),
                        }))
                      }
                      className="pfield"
                      style={{ width: 150 }}
                      aria-label="Max Players"
                    >
                      {playerLimits.map((limit) => (
                        <option key={limit} value={limit}>
                          {limit.toLocaleString()}
                        </option>
                      ))}
                    </select>
                  </div>
                  <p className="mt-2 text-base font-semibold">Maximum number of players allowed</p>
                </div>
              </div>

              <div className="mt-6 space-y-3">
                <button
                  type="button"
                  onClick={() => {
                    onSave(settings);
                    onClose();
                  }}
                  className="pbtn pbtn-pink pbtn-lg pbtn-block"
                >
                  Save Changes
                </button>
                <button type="button" onClick={onClose} className="pbtn pbtn-block">
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
};

const EXAMPLE_QUESTIONS = `How many legs does a spider have?
8`;

const QuestionImportForm = ({
  documentContent,
  onDocumentContentChange,
  onParseDocument,
  parsingErrorMessage,
  isParsing,
}: {
  documentContent: string;
  onDocumentContentChange: (content: string) => void;
  onParseDocument: () => void;
  parsingErrorMessage?: string;
  isParsing: boolean;
}) => (
  <section className="mb-6">
    <h2 className="h-head mb-3">Import Questions</h2>
    {parsingErrorMessage && (
      <div
        className="mb-3 border-4 border-ink bg-yellow p-3 h-detail"
        role="alert"
      >
        <strong>Could not parse questions:</strong> {parsingErrorMessage}
      </div>
    )}
    {isParsing ? (
      <div className="sheet flex flex-col items-center justify-center px-4 py-10">
        <Loader2
          className="mb-4 h-10 w-10 animate-spin"
          data-testid="parsing-spinner"
          role="status"
        />
        <p className="text-xl font-extrabold">Processing questions...</p>
        <p className="pslug mt-2">This may take a few moments</p>
      </div>
    ) : (
      <div className="hform">
        <p className="h-detail mb-2">Question, then answer. Blank line between.</p>
        <pre className="hform-example" aria-label="Example">{EXAMPLE_QUESTIONS}</pre>
        <textarea
          value={documentContent}
          onChange={(e) => onDocumentContentChange(e.target.value)}
          placeholder={`Paste your questions below using this format:

Question?
Answer

For multiple choice questions:
Question?
a) Option 1 b) Option 2 c) Option 3 d) Option 4
Correct answer: B`}
          className="pfield mb-3"
          rows={5}
        />
        <button
          type="button"
          onClick={onParseDocument}
          disabled={!documentContent.trim()}
          className="pbtn pbtn-pink pbtn-lg pbtn-block"
        >
          Submit questions
        </button>
      </div>
    )}
  </section>
);

const QuestionListDisplay = ({
  questions,
  onEditQuestions,
}: {
  questions: Record<string, Question>;
  onEditQuestions: () => void;
}) => (
  <section className="mb-5">
    <div className="mb-2 flex items-center justify-between gap-3">
      <h3 className="h-head">
        {Object.keys(questions).length} Questions
      </h3>
      <button type="button" onClick={onEditQuestions} className="pbtn pbtn-quiet">
        Edit Questions
      </button>
    </div>
    <div className="space-y-1.5">
      {Object.entries(questions).map(([id, question], index) => (
        <div
          key={id}
          data-testid={`parsed-question-${index + 1}`}
          className="prow"
          style={{ minHeight: 48, padding: "6px 10px" }}
        >
          <span className="prank" aria-hidden="true" style={{ minWidth: 34, height: 34, fontSize: 16 }}>
            {index + 1}
          </span>
          <div className="min-w-0 flex-1 truncate text-base font-bold leading-snug">
            <span className="sr-only">Q{index + 1}: </span>
            {question.text}
          </div>
          <span className="tabular max-w-[34%] truncate text-xl font-extrabold">
            <span className="sr-only">Answer: </span>
            {question.correctAnswer}
          </span>
        </div>
      ))}
    </div>
  </section>
);

const GameLinkSection = ({
  gameUrl,
  playerCount,
}: {
  gameUrl: string;
  playerCount: number;
}) => {
  const [copied, setCopied] = useState(false);
  const [showQr, setShowQr] = useState(false);

  const copyGameLink = async () => {
    await navigator.clipboard.writeText(gameUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const shareGameLink = async () => {
    try {
      await navigator.share({
        title: "Join my Trivia Jam game!",
        text: "Join my Trivia Jam game!",
        url: gameUrl,
      });
    } catch {
      copyGameLink();
    }
  };

  return (
    <section className="mb-6" aria-label="Invite players">
      <div className="hstatus-card">
        <BigStatus
          figure={playerCount}
          label={playerCount === 1 ? "player joined" : "players joined"}
        />
        <button
          type="button"
          onClick={shareGameLink}
          className="pbtn pbtn-yellow pbtn-lg pbtn-block mt-4"
        >
          <Share2 size={26} strokeWidth={3} aria-hidden="true" />
          Share
        </button>
        <div className="mt-3 grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={copyGameLink}
            className="pbtn pbtn-quiet"
            aria-label={gameUrl}
            data-testid="game-link-button"
          >
            <AnimatePresence mode="wait">
              {copied ? (
                <motion.span
                  key="check"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  exit={{ scale: 0 }}
                  className="text-teal"
                  data-testid="copy-success-icon"
                >
                  <Check size={24} strokeWidth={3} />
                </motion.span>
              ) : (
                <motion.span
                  key="copy"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  exit={{ scale: 0 }}
                  data-testid="copy-icon"
                >
                  <Copy size={24} strokeWidth={3} />
                </motion.span>
              )}
            </AnimatePresence>
            <span aria-hidden="true">{copied ? "Copied" : "Copy link"}</span>
          </button>
          <button
            type="button"
            onClick={() => setShowQr((v) => !v)}
            className="pbtn pbtn-quiet"
            aria-expanded={showQr}
          >
            {showQr ? "Hide QR" : "Show QR"}
          </button>
        </div>
        {showQr && (
          <div className="hqr mt-4" data-testid="join-qr">
            <QRCodeSVG
              value={gameUrl}
              size={240}
              level="M"
              marginSize={0}
              fgColor="#1E1B1A"
              bgColor="#F3EEE3"
              title="Scan to join the game"
              style={{ width: "100%", maxWidth: 260, height: "auto" }}
            />
          </div>
        )}
      </div>
    </section>
  );
};

const StartGameSection = ({
  canStartGame,
  hasEnoughPlayers,
  hasQuestions,
  onStartGame,
}: {
  canStartGame: boolean;
  hasEnoughPlayers: boolean;
  hasQuestions: boolean;
  onStartGame: () => void;
}) => {
  const [isStarting, setIsStarting] = useState(false);

  const handleStartGame = () => {
    setIsStarting(true);
    onStartGame();
  };

  return (
    <ActionBar>
      {!canStartGame && (
        <p className="pslug mb-2 text-center" style={{ fontSize: 14 }}>
          {!hasQuestions ? "Add questions to begin" : "Waiting for a player to join"}
        </p>
      )}
      <button
        type="button"
        onClick={handleStartGame}
        disabled={!canStartGame || isStarting}
        className="pbtn pbtn-pink pbtn-lg pbtn-block"
      >
        {isStarting ? (
          <>
            <Loader2 className="h-6 w-6 animate-spin" data-testid="loading-spinner" />
            Starting Game...
          </>
        ) : (
          "Start Game"
        )}
      </button>
      {/* hasEnoughPlayers is reflected in the hint above */}
      <span className="sr-only">{hasEnoughPlayers ? "" : "No players yet"}</span>
    </ActionBar>
  );
};

const LobbyControls = ({
  players,
  onStartGame,
  host,
}: {
  players: Person[];
  onStartGame: () => void;
  host: string;
}) => {
  const gameId = GameContext.useSelector((state) => state.public.id);
  const questions = GameContext.useSelector((state) => state.public.questions);
  const hostId = GameContext.useSelector((state) => state.public.hostId);
  const answerTimeWindow = GameContext.useSelector((state) => state.public.settings.answerTimeWindow);
  const maxPlayers = GameContext.useSelector((state) => state.public.settings.maxPlayers);
  const parsingErrorMessage = GameContext.useSelector((state) => state.public.parsingErrorMessage);
  const send = GameContext.useSend();
  const isParsingDocument = GameContext.useMatches({ lobby: "parsingDocument" });
  const hasEnoughPlayers = players.length > 0;
  const [showSettings, setShowSettings] = useState(false);
  const [isEditingQuestions, setIsEditingQuestions] = useState(false);
  const [documentContent, setDocumentContent] = useState("");

  const gameUrl = `https://${host}/games/${gameId}`;
  const client = GameContext.useClient();

  const handleParseDocument = async () => {
    if (!documentContent.trim()) return;

    send({ type: "PARSE_QUESTIONS", documentContent: documentContent.trim() });

    try {
      await client.waitFor(
        (state) => Object.keys(state.public.questions).length > 0,
        10000,
      );
      setIsEditingQuestions(false);
    } catch (error) {
      console.error("Failed to parse questions:", error);
    }
  };

  const handleSaveSettings = (newSettings: GameSettings) => {
    send({ type: "UPDATE_SETTINGS", settings: newSettings });
  };

  const hasQuestions = Object.keys(questions).length > 0;
  const canStartGame = hasEnoughPlayers && hasQuestions;

  return (
    <>
      <div className="phost-scroll">
        <Page>
          <Masthead>
            <button
              type="button"
              onClick={() => setShowSettings(true)}
              className="pbtn pbtn-quiet"
              style={{ minWidth: 48, padding: 0 }}
              aria-label="Settings"
            >
              <Settings size={26} strokeWidth={2.6} aria-hidden="true" />
            </button>
          </Masthead>
          <h1 className="misreg mb-4 text-4xl font-extrabold">Game Setup</h1>

          {(!hasQuestions || isEditingQuestions) && (
            <QuestionImportForm
              documentContent={documentContent}
              onDocumentContentChange={setDocumentContent}
              onParseDocument={handleParseDocument}
              parsingErrorMessage={parsingErrorMessage}
              isParsing={isParsingDocument}
            />
          )}

          <GameLinkSection gameUrl={gameUrl} playerCount={players.length} />

          {hasQuestions && !isEditingQuestions && (
            <QuestionListDisplay
              questions={questions}
              onEditQuestions={() => {
                setDocumentContent(formatQuestionsToText(questions));
                setIsEditingQuestions(true);
              }}
            />
          )}

          <PlayerLedger
            players={players}
            hostId={hostId}
            maxPlayers={maxPlayers}
            onRemove={(playerId) => send({ type: "REMOVE_PLAYER", playerId })}
          />
        </Page>
      </div>

      <StartGameSection
        canStartGame={canStartGame}
        hasEnoughPlayers={hasEnoughPlayers}
        hasQuestions={hasQuestions}
        onStartGame={onStartGame}
      />

      <AnimatePresence>
        {showSettings && (
          <SettingsModal
            isOpen={showSettings}
            onClose={() => setShowSettings(false)}
            currentSettings={{ answerTimeWindow, maxPlayers }}
            onSave={handleSaveSettings}
          />
        )}
      </AnimatePresence>
    </>
  );
};

/* ---------- Playing: the controller ---------- */

const LiveQuestionPanel = ({
  currentQuestion,
  question,
  timeLeft,
  players,
}: {
  currentQuestion: LiveQuestion;
  question: Question | undefined;
  timeLeft: number;
  players: Person[];
}) => {
  const answered = new Set(currentQuestion.answers.map((a) => a.playerId));
  const missing = players.filter((p) => !answered.has(p.id));
  return (
    <motion.section
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ ease: [0.2, 0.9, 0.2, 1.15], duration: 0.3 }}
    >
      <p className="h-head text-blue">{question?.text}</p>

      <div className="hstatus-card relative mt-4">
        <motion.div
          className="tabular h-head absolute right-3 top-3 border-4 border-ink px-3 py-1"
          data-testid="question-timer"
          animate={{ scale: timeLeft <= 5 ? [1, 1.1, 1] : 1 }}
          transition={{ duration: 1, repeat: timeLeft <= 5 ? Infinity : 0 }}
          style={{ background: timeLeft <= 5 ? "var(--pink)" : "var(--paper)" }}
        >
          {timeLeft}s
        </motion.div>
        <AnswerProgress
          answersCount={currentQuestion.answers.length}
          playersCount={players.length}
        />
      </div>

      {missing.length > 0 && (
        <section className="mt-4" aria-label="Waiting on">
          <h2 className="pslug mb-2" style={{ fontSize: 16 }}>
            Waiting on
          </h2>
          <ul className="flex flex-wrap gap-2">
            {missing.map((player) => (
              <li key={player.id} className="prow" style={{ minHeight: 48, padding: "4px 12px 4px 6px" }}>
                <PlayerToken name={player.name} seat={Math.max(0, players.findIndex((p) => p.id === player.id))} />
                <span className="h-detail">{player.name}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className="mt-4">
        <Details>
          {question && <QuestionExtras question={question} />}
          {currentQuestion.answers.length > 0 && question && (
            <div className="flex flex-col gap-2">
              {currentQuestion.answers.map((answer) => (
                <LiveAnswer key={answer.playerId} answer={answer} question={question} />
              ))}
            </div>
          )}
        </Details>
      </div>
    </motion.section>
  );
};

const QuestionControls = ({
  currentQuestion,
  lastQuestionResult,
  questions,
  players,
}: {
  currentQuestion: LiveQuestion | null;
  lastQuestionResult: QuestionResult | undefined;
  questions: Record<string, Question>;
  players: Person[];
}) => {
  const send = GameContext.useSend();
  const answerTimeWindow = GameContext.useSelector((state) => state.public.settings.answerTimeWindow);
  const maxPlayers = GameContext.useSelector((state) => state.public.settings.maxPlayers);
  const questionNumber = GameContext.useSelector((state) => state.public.questionNumber);
  const hostId = GameContext.useSelector((state) => state.public.hostId);
  const isLastQuestion = questionNumber >= Object.keys(questions).length;
  const isActive = GameContext.useMatches("active");
  const isQuestionActive = isActive && currentQuestion !== null;
  const timeLeft = useQuestionTimer(currentQuestion, answerTimeWindow, isQuestionActive);

  const nextQuestion: Question | undefined = Object.values(questions)[questionNumber];

  const handleNextQuestion = () => {
    if (!nextQuestion) return;
    send({ type: "NEXT_QUESTION" });
  };
  const endGame = () => send({ type: "END_GAME" });

  const isFirst = !lastQuestionResult;
  const showEndGameDemoted = !isLastQuestion;

  return (
    <>
      <div className="phost-scroll">
        <Page>
          <div className="pt-2" />
          {currentQuestion ? (
            <LiveQuestionPanel
              currentQuestion={currentQuestion}
              question={questions[currentQuestion.questionId]}
              timeLeft={timeLeft}
              players={players}
            />
          ) : (
            <>
              {lastQuestionResult && (
                <PreviousQuestionResults
                  lastQuestionResult={lastQuestionResult}
                  questions={questions}
                  players={players}
                />
              )}
              {isFirst && (
                <>
                  <p className="pslug mb-2">First up</p>
                  {nextQuestion ? (
                    <QuestionHeadline question={nextQuestion} />
                  ) : (
                    <p className="h-head">No questions available</p>
                  )}
                  <div className="hstatus-card mt-4">
                    <BigStatus
                      figure={players.length}
                      label={players.length === 1 ? "player ready" : "players ready"}
                    />
                  </div>
                </>
              )}
              {lastQuestionResult && isLastQuestion && (
                <section className="sheet sheet-yellow mt-5 p-4 text-center">
                  <p className="h-detail">That was the last question.</p>
                </section>
              )}

              <div className="mt-5">
                <Details summary={isFirst ? "Details" : "Details: up next, players"}>
                  {!(lastQuestionResult && isLastQuestion) && (
                    <section aria-label="Up next">
                      {!isFirst && <p className="pslug mb-2">Up next</p>}
                      {!isFirst && nextQuestion && <QuestionHeadline question={nextQuestion} />}
                      {!isFirst && !nextQuestion && (
                        <p className="h-detail">No more questions available</p>
                      )}
                      {nextQuestion && (
                        <div className="mt-3 flex flex-col gap-3">
                          <QuestionExtras question={nextQuestion} />
                        </div>
                      )}
                    </section>
                  )}
                  <PlayerLedger
                    players={players}
                    hostId={hostId}
                    maxPlayers={maxPlayers}
                    onRemove={(playerId) => send({ type: "REMOVE_PLAYER", playerId })}
                  />
                  {showEndGameDemoted && (
                    <div className="border-t-4 border-dashed border-ink pt-4">
                      <EndGameControl onEnd={endGame} confirm={false} />
                    </div>
                  )}
                </Details>
              </div>
            </>
          )}
        </Page>
      </div>

      {currentQuestion && (
        <ActionBar>
          <EndGameControl onEnd={endGame} confirm />
        </ActionBar>
      )}

      {!currentQuestion && (
        <ActionBar>
          {lastQuestionResult && isLastQuestion ? (
            <button
              type="button"
              onClick={endGame}
              className="pbtn pbtn-pink pbtn-lg pbtn-block"
              data-testid="end-game-button"
            >
              End Game
            </button>
          ) : (
            <button
              type="button"
              onClick={handleNextQuestion}
              disabled={!nextQuestion}
              className="pbtn pbtn-pink pbtn-lg pbtn-block"
            >
              {isFirst ? "Start First Question" : "Start Next Question"}
            </button>
          )}
        </ActionBar>
      )}
    </>
  );
};

/** A fresh game is a fresh room: the same step as "Create New Game" on the home page, one tap. */
const startNewGame = () => {
  window.location.assign(`/games/${crypto.randomUUID()}`);
};

const GameFinishedDisplay = ({ players }: { players: Person[] }) => {
  const winner = byScore(players)[0];
  return (
    <>
      <div className="phost-scroll">
        <Page>
          <Masthead />
          <h1 className="misreg mb-5 text-center text-5xl font-extrabold">Game Over!</h1>
          {winner && (
            <div className="sheet sheet-pink mb-6 px-4 py-5">
              <Winner winner={winner} />
            </div>
          )}
          <FinalScores players={players} />
        </Page>
      </div>
      <ActionBar>
        <a
          href="/"
          onClick={(event) => {
            event.preventDefault();
            startNewGame();
          }}
          data-testid="new-game-link"
          className="pbtn pbtn-pink pbtn-lg pbtn-block"
          style={{ textDecoration: "none" }}
        >
          New game
        </a>
      </ActionBar>
    </>
  );
};

const sortedAnswers = (
  result: { answers: Answer[]; scores: Score[]; questionId: string },
  questions: Record<string, Question>,
) => {
  const question = questions[result.questionId];
  const correctAnswer = question.correctAnswer;

  const sortedScores = [...result.scores].sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    const answerA = result.answers.find((ans) => ans.playerId === a.playerId)?.value;
    const answerB = result.answers.find((ans) => ans.playerId === b.playerId)?.value;
    if (answerA !== undefined && answerB !== undefined && question.questionType === "numeric") {
      const diffA = Math.abs(Number(answerA) - Number(correctAnswer));
      const diffB = Math.abs(Number(answerB) - Number(correctAnswer));
      if (diffA !== diffB) return diffA - diffB;
    }
    return a.timeTaken - b.timeTaken;
  });

  return sortedScores.flatMap((score) => {
    const answer = result.answers.find((a) => a.playerId === score.playerId);
    return answer ? [answer] : [];
  });
};
