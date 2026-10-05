import { useStore } from "@nanostores/react";
import { AnimatePresence, motion } from "framer-motion";
import { HelpCircle } from "lucide-react";
import { atom } from "nanostores";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { useOgsProfile } from "@open-game-system/profile-kit/react";
import { nameGate } from "~/ogs/name-gate";
import { GameContext } from "~/game.context";
import type { GamePublicContext } from "~/game.types";
import { useQuestionTimer } from "~/hooks/use-question-timer";
import { SessionContext } from "~/session.context";
import { HelpModal } from "./help-modal";
import { QuestionProgress } from "./question-progress";
import { ChoiceTiles } from "./phone/ChoiceTiles";
import { PlayerFinish } from "./phone/PlayerFinish";
import { PlayerResult } from "./phone/PlayerResult";
import { useResultArrival } from "./phone/useResultArrival";
import { LockedIn } from "./phone/LockedIn";
import { NumberPad } from "./phone/NumberPad";
import { PhoneShell } from "./phone/PhoneShell";
import { QuestionHeader } from "./phone/QuestionHeader";
import { PlayerToken, WaitingDots } from "./phone/ink";
import { toAnswerNumber } from "./phone/keypad";
import { draftFor, type Draft } from "./phone/draft";

type Player = {
  id: string;
  name: string;
  score: number;
};

type CurrentQuestion = NonNullable<GamePublicContext["currentQuestion"]>;

const HelpButton = ({ onOpen }: { onOpen: () => void }) => (
  <button type="button" onClick={onOpen} className="pbtn pbtn-quiet">
    <HelpCircle size={22} aria-hidden="true" />
    How to Play
  </button>
);

/** The kid's waiting screen: their own big token and name fill the screen. */
const WaitCard = ({
  title,
  seat,
  name,
  children,
  footer,
}: {
  title: string;
  seat: number;
  name: string;
  children?: ReactNode;
  footer?: ReactNode;
}) => (
  <PhoneShell className="pwait">
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ ease: [0.2, 0.9, 0.2, 1.15], duration: 0.35 }}
      className="pwait-body"
    >
      <PlayerToken name={name} seat={seat} className="pwait-token" />
      <div className="pwait-text">
        <span className="pslug">Trivia Jam</span>
        <h1 className="misreg pwait-title">{title}</h1>
        {children}
        <div className="mt-5 flex justify-center landscape:justify-start">
          <WaitingDots />
        </div>
        {footer && <div className="mt-5 flex justify-center landscape:justify-start">{footer}</div>}
      </div>
    </motion.div>
  </PhoneShell>
);

const WithHelp = ({
  render,
}: {
  render: (help: ReactNode) => ReactNode;
}) => {
  const [$showHelp] = useState(() => atom<boolean>(false));
  const showHelp = useStore($showHelp);
  return (
    <>
      {render(<HelpButton onOpen={() => $showHelp.set(true)} />)}
      <AnimatePresence>
        {showHelp && <HelpModal $showHelp={$showHelp} />}
      </AnimatePresence>
    </>
  );
};

const LobbyDisplay = ({ player, seat }: { player: Player; seat: number }) => (
  <WithHelp
    render={(help) => (
      <WaitCard title={`Welcome, ${player.name}!`} seat={seat} name={player.name} footer={help}>
        <p className="pwait-sub">
          Waiting for host to start the game...
        </p>
      </WaitCard>
    )}
  />
);

const WaitingDisplay = ({ player, seat }: { player: Player; seat: number }) => {
  const resultsCount = GameContext.useSelector(
    (state) => state.public.questionResults.length,
  );
  const isFirst = resultsCount === 0;
  return (
    <WithHelp
      render={(help) => (
        <WaitCard
          title={
            isFirst ? "Waiting for first question..." : "Waiting for next question..."
          }
          seat={seat}
          name={player.name}
          footer={help}
        >
          <p className="pwait-sub">Get ready, {player.name}!</p>
        </WaitCard>
      )}
    />
  );
};

const ActiveQuestionDisplay = ({
  currentQuestion,
  questions,
  hasAnswered,
  userId,
  timeLeft,
  totalTime,
  answerInput,
  setAnswerInput,
  isSubmitting,
  onSubmitNumeric,
  onChoose,
}: {
  currentQuestion: CurrentQuestion;
  questions: GamePublicContext["questions"];
  hasAnswered: boolean;
  userId: string;
  timeLeft: number;
  totalTime: number;
  answerInput: string;
  setAnswerInput: (value: string) => void;
  isSubmitting: boolean;
  onSubmitNumeric: () => void;
  onChoose: (value: string) => void;
}) => {
  const isFirstQuestion = GameContext.useSelector(
    (state) => state.public.questionResults.length === 0,
  );
  const question = questions[currentQuestion.questionId];
  const isMultipleChoice = question?.questionType === "multiple-choice";
  const myAnswer = currentQuestion.answers.find((a) => a.playerId === userId);
  const options = question?.options ?? [];
  const myLetterIndex = myAnswer ? options.indexOf(String(myAnswer.value)) : -1;

  return (
    <>
      <QuestionHeader
        text={question ? question.text : "Loading question..."}
        timeLeft={timeLeft}
        totalTime={totalTime}
        questionId={currentQuestion.questionId}
        hint={isFirstQuestion}
        options={isMultipleChoice ? options : undefined}
      />
      {hasAnswered && myAnswer ? (
        <LockedIn
          value={myAnswer.value}
          letter={
            isMultipleChoice && myLetterIndex >= 0
              ? String.fromCharCode(65 + myLetterIndex)
              : undefined
          }
        />
      ) : isMultipleChoice ? (
        <ChoiceTiles
          options={options}
          disabled={isSubmitting}
          onChoose={onChoose}
        />
      ) : (
        <NumberPad
          value={answerInput}
          onChange={setAnswerInput}
          onSubmit={onSubmitNumeric}
          isSubmitting={isSubmitting}
        />
      )}
    </>
  );
};

const QuestionResultsDisplay = ({
  player,
  questions,
  questionResults,
  players,
  arrivedAt,
}: {
  player: Player;
  questions: GamePublicContext["questions"];
  questionResults: GamePublicContext["questionResults"];
  players: Player[];
  arrivedAt: number | null;
}) => {
  const latestResult = questionResults[questionResults.length - 1];
  const question = latestResult ? questions[latestResult.questionId] : null;
  if (!latestResult || !question) return null;
  return (
    <PlayerResult
      question={question}
      result={latestResult}
      me={player}
      players={players}
      arrivedAt={arrivedAt}
    />
  );
};

const ActiveStateContent = ({
  player,
  players,
  questions,
  questionResults,
  questionNumber,
  totalQuestions,
}: {
  player: Player;
  players: Player[];
  questions: GamePublicContext["questions"];
  questionResults: GamePublicContext["questionResults"];
  questionNumber: number;
  totalQuestions: number;
}) => {
  const currentQuestion = GameContext.useSelector((state) => state.public.currentQuestion);
  const answerTimeWindow = GameContext.useSelector((state) => state.public.settings.answerTimeWindow);
  const userId = SessionContext.useSelector((state) => state.public.userId);
  const send = GameContext.useSend();
  const [draft, setDraft] = useState<Draft>({ questionId: null, value: "" });
  const questionId = currentQuestion?.questionId ?? null;
  const answerInput = draftFor(draft, questionId);
  const setAnswerInput = (value: string) => setDraft({ questionId, value });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const timeLeft = useQuestionTimer(currentQuestion, answerTimeWindow, currentQuestion !== null);
  const latestResultId = questionResults[questionResults.length - 1]?.questionId ?? null;
  const arrivedAt = useResultArrival(questionId, latestResultId);
  const hasAnswered = !!currentQuestion?.answers.some((a) => a.playerId === userId);

  const handleSubmitNumeric = () => {
    const numericAnswer = toAnswerNumber(answerInput);
    if (!currentQuestion || hasAnswered || numericAnswer === null) return;
    setIsSubmitting(true);
    send({ type: "SUBMIT_ANSWER", value: numericAnswer });
    setAnswerInput("");
    setIsSubmitting(false);
  };

  const handleChoose = (value: string) => {
    if (!currentQuestion || hasAnswered) return;
    setIsSubmitting(true);
    send({ type: "SUBMIT_ANSWER", value });
    setIsSubmitting(false);
  };

  if (!currentQuestion && questionResults.length === 0) {
    return <WaitingDisplay player={player} seat={Math.max(0, players.findIndex((p) => p.id === player.id))} />;
  }

  return (
    <PhoneShell fill={currentQuestion !== null}>
      <QuestionProgress current={questionNumber} total={totalQuestions} />
      {currentQuestion ? (
        <ActiveQuestionDisplay
          currentQuestion={currentQuestion}
          questions={questions}
          hasAnswered={hasAnswered}
          userId={userId}
          timeLeft={timeLeft}
          totalTime={answerTimeWindow}
          answerInput={answerInput}
          setAnswerInput={setAnswerInput}
          isSubmitting={isSubmitting}
          onSubmitNumeric={handleSubmitNumeric}
          onChoose={handleChoose}
        />
      ) : (
        <QuestionResultsDisplay
          player={player}
          questions={questions}
          questionResults={questionResults}
          players={players}
          arrivedAt={arrivedAt}
        />
      )}
    </PhoneShell>
  );
};

const GameFinishedDisplay = ({ player }: { player: Player }) => {
  const players = GameContext.useSelector((state) => state.public.players);
  return <PlayerFinish me={player} players={players} />;
};

const NameEntryForm = () => {
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const send = GameContext.useSend();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      setError("Please enter your name");
      return;
    }
    if (name.length > 20) {
      setError("Name must be 20 characters or less");
      return;
    }
    if (!/^[a-zA-Z0-9\s]+$/.test(name)) {
      setError("Name can only contain letters, numbers and spaces");
      return;
    }

    setIsSubmitting(true);
    send({ type: "JOIN_GAME", playerName: name.trim() });
  };

  return (
    <WithHelp
      render={(help) => (
        <PhoneShell className="flex items-center justify-center p-5">
          <motion.div
            data-testid="name-input-form"
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ ease: [0.2, 0.9, 0.2, 1.15], duration: 0.35 }}
            className="sheet w-full max-w-md px-6 py-8"
          >
            <span className="pslug">Trivia Jam</span>
            <h1
              className="mb-6 mt-2 font-display font-extrabold misreg"
              style={{ fontSize: "clamp(40px, 9dvh, 64px)" }}
            >
              Join Game
            </h1>
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label htmlFor="playerName" className="pslug mb-2 block" style={{ fontSize: 16 }}>
                  Your Name
                </label>
                <input
                  data-testid="name-input"
                  id="playerName"
                  type="text"
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value);
                    setError(null);
                  }}
                  className="pfield"
                  placeholder="Type your name"
                  maxLength={20}
                  autoComplete="off"
                  disabled={isSubmitting}
                />
                {error && (
                  <motion.p
                    data-testid="name-input-error"
                    role="alert"
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mt-3 border-4 border-ink bg-yellow px-3 py-2 text-lg font-bold"
                  >
                    {error}
                  </motion.p>
                )}
              </div>
              <button
                data-testid="join-button"
                type="submit"
                className="pbtn pbtn-pink pbtn-lg pbtn-block"
                disabled={isSubmitting}
              >
                {isSubmitting ? "Joining..." : "Join Game"}
              </button>
            </form>
            <div className="mt-6 flex justify-center">{help}</div>
          </motion.div>
        </PhoneShell>
      )}
    />
  );
};

/** Plain browser: the name form. Inside the OGS app: join at once under the OGS profile. */
const JoinGate = () => {
  const gate = nameGate(useOgsProfile());
  if (gate.kind === "form") return <NameEntryForm />;
  if (gate.kind === "waiting") return <PhoneShell className="min-h-[100dvh]">{null}</PhoneShell>;
  return <OgsAutoJoin event={gate.event} />;
};

const OgsAutoJoin = ({ event }: { event: Parameters<ReturnType<typeof GameContext.useSend>>[0] }) => {
  const send = GameContext.useSend();
  const sent = useRef(false);
  // Joining is a one-time message to the room (an external system), sent once per mount.
  useEffect(() => {
    if (sent.current) return;
    sent.current = true;
    send(event);
  }, [send, event]);
  return (
    <PhoneShell className="flex min-h-[100dvh] items-center justify-center p-5">
      <p className="pslug" role="status">
        Joining...
      </p>
    </PhoneShell>
  );
};

export const PlayerView = () => {
  const players = GameContext.useSelector((state) => state.public.players);
  const questions = GameContext.useSelector((state) => state.public.questions);
  const questionResults = GameContext.useSelector((state) => state.public.questionResults);
  const questionNumber = GameContext.useSelector((state) => state.public.questionNumber);
  const userId = SessionContext.useSelector((state) => state.public.userId);
  const isLobby = GameContext.useMatches("lobby");
  const isActive = GameContext.useMatches("active");
  const isFinished = GameContext.useMatches("finished");

  const player = players.find((p) => p.id === userId);

  if (!player) return <JoinGate />;

  return (
    <>
      {isLobby && (
        <LobbyDisplay player={player} seat={Math.max(0, players.findIndex((p) => p.id === player.id))} />
      )}
      {isActive && (
        <ActiveStateContent
          player={player}
          players={players}
          questions={questions}
          questionResults={questionResults}
          questionNumber={questionNumber}
          totalQuestions={Object.keys(questions).length}
        />
      )}
      {isFinished && <GameFinishedDisplay player={player} />}
    </>
  );
};
