import { AnimatePresence, motion } from "framer-motion";
import { Users } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { useEffect, useRef, useState } from "react";
import { GameContext } from "~/game.context";
import type { Answer, GamePublicContext, Question } from "~/game.types";
import { useQuestionTimer } from "~/hooks/use-question-timer";
import {
  GameBackground,
  TimerDisplay,
  FinalScoresList,
  WinnerAnnouncement,
  MultipleChoiceOptions,
  PlayerAnswerRow,
  ResultsScoreList,
  QuestionAnswerHeader,
  SidebarScoreboard,
} from "./game";

const SOUND_EFFECTS = {
  BUZZ: "https://www.soundjay.com/misc/sounds/fail-buzzer-01.mp3",
  CORRECT: "https://cdn.freesound.org/previews/270/270404_5123851-lq.mp3",
  INCORRECT:
    "https://www.myinstants.com/media/sounds/wrong-answer-sound-effect.mp3",
  SKIP: "https://cdn.freesound.org/previews/362/362205_6629901-lq.mp3",
  QUESTION: "https://www.soundjay.com/misc/sounds/bell-ringing-05.mp3",
  GAME_OVER: "https://cdn.freesound.org/previews/171/171671_2437358-lq.mp3",
} as const;

const useSoundEffects = () => {
  const audioElementsRef = useRef<Record<string, HTMLAudioElement>>({});
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    let mounted = true;
    let loadedCount = 0;
    const totalSounds = Object.keys(SOUND_EFFECTS).length;

    Object.entries(SOUND_EFFECTS).forEach(([key, url]) => {
      const audio = new Audio();

      audio.addEventListener("canplaythrough", () => {
        if (mounted) {
          loadedCount++;
          if (loadedCount === totalSounds) {
            setIsLoaded(true);
          }
        }
      });

      audio.src = url;
      audio.preload = "auto";
      audio.volume = 0.5;
      audioElementsRef.current[key] = audio;
    });

    return () => {
      mounted = false;
      Object.values(audioElementsRef.current).forEach((audio) => {
        audio.pause();
        audio.src = "";
      });
    };
  }, []);

  const playSound = (soundKey: keyof typeof SOUND_EFFECTS) => {
    if (!isLoaded) return;

    const audio = audioElementsRef.current[soundKey];
    if (audio) {
      const newAudio = new Audio(audio.src);
      newAudio.volume = 0.5;
      newAudio.play().catch((err) => {
        console.warn(`Failed to play ${soundKey} sound:`, err);
      });
    }
  };

  return playSound;
};

const QuestionProgress = ({
  current,
  total,
}: {
  current: number;
  total: number;
}) => {
  const progress = (current / total) * 100;

  return (
    <div className="fixed top-0 left-0 right-80 p-4 z-50">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center gap-3">
          <div className="flex-1 h-3 bg-gray-800/50 rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-indigo-500 to-purple-500"
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.5 }}
            />
          </div>
          <div className="text-sm font-medium text-white/70 tabular-nums">
            {current} / {total}
          </div>
        </div>
      </div>
    </div>
  );
};

const useQuestionSoundEffects = (
  currentQuestion: GamePublicContext["currentQuestion"],
  questions: GamePublicContext["questions"]
) => {
  const playSound = useSoundEffects();
  const prevQuestionRef = useRef<typeof currentQuestion>(null);

  useEffect(() => {
    const isQuestionEnding = prevQuestionRef.current && !currentQuestion;
    const isQuestionStarting = !prevQuestionRef.current && currentQuestion;

    if (isQuestionEnding && prevQuestionRef.current) {
      const question = questions[prevQuestionRef.current.questionId];
      const hasCorrectAnswer = prevQuestionRef.current.answers.some(
        (answer) => answer.value === question.correctAnswer
      );
      playSound(hasCorrectAnswer ? "CORRECT" : "INCORRECT");
    } else if (isQuestionStarting) {
      playSound("QUESTION");
    }

    prevQuestionRef.current = currentQuestion;
  }, [currentQuestion, playSound, questions]);
};

const sortPlayersByAnswerTime = (
  players: Array<{ id: string; name: string; score: number }>,
  playerAnswers: Record<string, Answer | null>
) =>
  [...players].sort((a, b) => {
    const aAnswer = playerAnswers[a.id];
    const bAnswer = playerAnswers[b.id];
    if (!aAnswer && !bAnswer) return 0;
    if (!aAnswer) return 1;
    if (!bAnswer) return -1;
    return aAnswer.timestamp - bAnswer.timestamp;
  });

const buildPlayerAnswerMap = (
  players: Array<{ id: string; name: string; score: number }>,
  answers: Answer[]
): Record<string, Answer | null> =>
  players.reduce<Record<string, Answer | null>>((acc, player) => {
    acc[player.id] = answers.find((a) => a.playerId === player.id) || null;
    return acc;
  }, {});

const GameplayDisplay = ({
  currentQuestion,
  players,
  questions,
}: {
  currentQuestion: {
    questionId: string;
    startTime: number;
    answers: Answer[];
  } | null;
  players: Array<{ id: string; name: string; score: number }>;
  questions: Record<string, Question>;
}) => {
  const answerTimeWindow = GameContext.useSelector((state) => state.public.settings.answerTimeWindow);
  const isActive = GameContext.useMatches("active");
  const isQuestionActive = isActive && currentQuestion !== null;
  const remainingTime = useQuestionTimer(currentQuestion, answerTimeWindow, isQuestionActive);

  if (!currentQuestion) return null;

  const question = questions[currentQuestion.questionId];
  const questionText = question?.text;
  if (!questionText) return null;

  const playerAnswers = buildPlayerAnswerMap(players, currentQuestion.answers);
  const sortedPlayers = sortPlayersByAnswerTime(players, playerAnswers);
  const showOptions =
    question.questionType === "multiple-choice" && question.options;

  return (
    <div className="min-h-screen flex flex-col items-center justify-center pt-16 p-8 relative">
      <GameBackground />

      <div className="relative z-10 w-full max-w-4xl">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center"
        >
          <TimerDisplay remainingTime={remainingTime} />

          <div className="text-center mb-8">
            <h1 className="text-2xl sm:text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 to-purple-400">
              {questionText}
            </h1>
            {showOptions && (
              <MultipleChoiceOptions options={question.options!} />
            )}
          </div>

          <div className="bg-gray-800/30 backdrop-blur-sm rounded-2xl p-8 border border-gray-700/50">
            <h2 className="text-2xl font-bold text-indigo-300 mb-6 flex items-center justify-center gap-3">
              <Users className="w-6 h-6" />
              Answers Submitted: {currentQuestion.answers.length} /{" "}
              {players.length}
            </h2>

            <div className="space-y-3">
              {sortedPlayers.map((player) => (
                <PlayerAnswerRow
                  key={player.id}
                  player={player}
                  answer={playerAnswers[player.id]}
                  startTime={currentQuestion.startTime}
                />
              ))}
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

const ActiveGameContent = ({
  currentQuestion,
  players,
  questionResults,
  questions,
  questionNumber,
}: {
  currentQuestion: GamePublicContext["currentQuestion"];
  players: GamePublicContext["players"];
  questionResults: GamePublicContext["questionResults"];
  questions: GamePublicContext["questions"];
  questionNumber: number;
}) => {
  if (currentQuestion) {
    return (
      <>
        <QuestionProgress
          current={questionNumber}
          total={Object.keys(questions).length}
        />
        <GameplayDisplay
          currentQuestion={currentQuestion}
          players={players}
          questions={questions}
        />
      </>
    );
  }

  if (questionResults.length > 0) {
    return (
      <>
        <QuestionProgress
          current={questionNumber}
          total={Object.keys(questions).length}
        />
        <QuestionResultsDisplay
          questionResults={questionResults}
          questions={questions}
        />
      </>
    );
  }

  return <WaitingForQuestionDisplay />;
};

export const SpectatorView = ({ host }: { host: string }) => {
  const currentQuestion = GameContext.useSelector((state) => state.public.currentQuestion);
  const players = GameContext.useSelector((state) => state.public.players);
  const questionResults = GameContext.useSelector((state) => state.public.questionResults);
  const questions = GameContext.useSelector((state) => state.public.questions);
  const questionNumber = GameContext.useSelector((state) => state.public.questionNumber);
  const isFinished = GameContext.useMatches("finished");
  const isLobby = GameContext.useMatches("lobby");
  const isActive = GameContext.useMatches("active");

  useQuestionSoundEffects(currentQuestion, questions);

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {isActive && <SidebarScoreboard players={players} />}

      <div className={`${isActive ? "mr-80" : ""}`}>
        <AnimatePresence mode="wait">
          {isLobby && <LobbyDisplay host={host} />}

          {isActive && (
            <ActiveGameContent
              currentQuestion={currentQuestion}
              players={players}
              questionResults={questionResults}
              questions={questions}
              questionNumber={questionNumber}
            />
          )}

          {isFinished && <GameFinishedDisplay players={players} />}
        </AnimatePresence>
      </div>
    </div>
  );
};

const LobbyDisplay = ({
  host,
}: {
  host: string;
}) => {
  const maxPlayers = 10;
  const currentPlayers = GameContext.useSelector((state) => state.public.players);
  const hostId = GameContext.useSelector((state) => state.public.hostId);
  const gameId = GameContext.useSelector((state) => state.public.id);

  const gameUrl = `https://${host}/games/${gameId}`;

  const slots = Array(maxPlayers)
    .fill(undefined)
    .map((_, i) => currentPlayers[i]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 relative">
      <GameBackground />

      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        className="relative z-10 w-full max-w-4xl bg-gray-800/30 backdrop-blur-sm rounded-2xl p-8 border border-gray-700/50"
      >
        <h1 className="text-4xl font-bold text-center mb-8 bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 to-purple-400">
          Waiting for Game to Start
        </h1>

        <div
          className="mb-8 flex flex-col items-center"
          data-testid="qr-code-section"
        >
          <div className="bg-white p-4 rounded-xl mb-4">
            <QRCodeSVG value={gameUrl} size={200} data-testid="game-qr-code" />
          </div>
          <p
            className="text-center text-indigo-300/70"
            data-testid="qr-code-label"
          >
            Scan to join the game
          </p>
        </div>

        <div className="space-y-3">
          <h2 className="text-xl font-bold mb-4 text-indigo-300 flex items-center gap-2">
            <Users className="w-6 h-6" /> Players ({currentPlayers.length}/
            {maxPlayers})
          </h2>
          <AnimatePresence mode="popLayout">
            {slots.map((player, index) => (
              <motion.div
                key={player?.id || `empty-${index}`}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                className={`flex justify-between items-center p-4 rounded-xl border ${
                  player
                    ? "bg-gray-800/30 border-gray-700/30"
                    : "bg-gray-800/10 border-gray-700/20"
                }`}
              >
                {player ? (
                  <div className="flex items-center gap-3">
                    <span className="font-medium">{player.name}</span>
                    {player.id === hostId && (
                      <span className="px-2 py-1 text-xs font-bold bg-indigo-500/20 text-indigo-300 rounded-full border border-indigo-500/30">
                        Host
                      </span>
                    )}
                  </div>
                ) : (
                  <span className="text-white/30 font-medium">Empty Slot</span>
                )}
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
};

const GameFinishedDisplay = ({
  players,
}: {
  players: Array<{ id: string; name: string; score: number }>;
}) => {
  const sortedPlayers = [...players].sort((a, b) => b.score - a.score);
  const winner = sortedPlayers[0];

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 relative">
      <GameBackground />

      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="relative z-10 w-full max-w-4xl bg-gray-800/30 backdrop-blur-sm rounded-2xl p-8 border border-gray-700/50"
        data-testid="game-over-title"
      >
        <h1 className="text-6xl font-bold text-center mb-8 bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 to-purple-400">
          Game Over!
        </h1>

        <WinnerAnnouncement winner={winner} />
        <FinalScoresList players={players} />
      </motion.div>
    </div>
  );
};

const QuestionResultsDisplay = ({
  questionResults,
  questions,
}: {
  questionResults: GamePublicContext["questionResults"];
  questions: GamePublicContext["questions"];
}) => {
  const latestResult = questionResults[questionResults.length - 1];
  const question = latestResult ? questions[latestResult.questionId] : null;

  if (!latestResult || !question) return null;

  return (
    <div className="min-h-screen flex flex-col items-center justify-center pt-16 p-8 relative">
      <GameBackground />

      <div className="relative z-10 w-full max-w-4xl">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center"
        >
          <QuestionAnswerHeader question={question}>
            {question.questionType === "multiple-choice" && question.options ? (
              <MultipleChoiceOptions
                options={question.options}
                correctAnswer={question.correctAnswer}
              />
            ) : null}
          </QuestionAnswerHeader>

          <div className="bg-gray-800/30 backdrop-blur-sm rounded-2xl p-8 border border-gray-700/50">
            <h2 className="text-2xl font-bold text-indigo-300 mb-6">Results</h2>
            <ResultsScoreList
              answers={latestResult.answers}
              scores={latestResult.scores}
              question={question}
            />
          </div>
        </motion.div>
      </div>
    </div>
  );
};

const WaitingForQuestionDisplay = () => {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-8 relative">
      <GameBackground />

      <div className="relative z-10">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center"
        >
          <div>
            <h1
              className="text-6xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 to-purple-400 mb-6"
              data-testid="waiting-for-question"
            >
              Waiting for Question...
            </h1>
            <motion.div
              animate={{ scale: [1, 1.1, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
              className="text-4xl text-indigo-400/60"
            >
              ⏳
            </motion.div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};
