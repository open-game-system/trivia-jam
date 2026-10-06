import { motion } from "framer-motion";
import type { atom } from "nanostores";
import { HelpModal } from "./help-modal";
import { PhoneShell } from "./phone/PhoneShell";

export type HomePageContentProps = {
  newGameId: string;
  deviceType?: string;
  $showHelp: ReturnType<typeof atom<boolean>>;
};

/** The home page: the name on the aurora, one big button, a way to learn. */
export function HomePageContent({ newGameId, $showHelp }: HomePageContentProps) {
  return (
    <PhoneShell className="relative flex items-center justify-center overflow-hidden px-5 py-8">
      <motion.main
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ ease: [0.2, 0.9, 0.2, 1.15], duration: 0.45 }}
        className="relative z-10 w-full max-w-xl"
      >
        <p className="pslug mb-3">A numbers game for the whole room</p>
        <h1 className="pposter-title lav-text">Trivia Jam</h1>
        <p className="mt-5 text-2xl font-semibold leading-tight text-gray-200">
          Guess the number. Closest wins.
        </p>

        <div className="mt-8 flex flex-col gap-4">
          <a
            href={`/games/${newGameId}`}
            className="pbtn pbtn-primary pbtn-lg pbtn-block"
            style={{ textDecoration: "none" }}
          >
            Create New Game
          </a>
          <button
            type="button"
            onClick={() => $showHelp.set(true)}
            className="pbtn pbtn-block"
          >
            How to Play
          </button>
        </div>
      </motion.main>

      <HelpModal $showHelp={$showHelp} />
    </PhoneShell>
  );
}
