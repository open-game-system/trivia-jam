import { motion } from "framer-motion";
import { WaitingDots } from "./ink";

/** Between "results are in" and "the TV landed the answer": no outcome on the phone yet. */
export const LookAtTv = ({
  questionText,
  myValue,
}: {
  questionText: string;
  myValue: string | number | undefined;
}) => (
  <div
    data-testid="look-at-tv"
    className="mx-auto flex min-h-[78dvh] w-full max-w-3xl flex-col items-center justify-center gap-5 px-4 pb-8 pt-4 text-center"
  >
    <h1
      className="lav-text font-extrabold"
      style={{ fontSize: "clamp(22px, 4.2dvh, 44px)", lineHeight: 1.05, letterSpacing: "-0.02em" }}
    >
      {questionText}
    </h1>
    <motion.div
      className="pcard pcard-glow flex w-full flex-col items-center gap-3 px-5 py-6"
      initial={{ scale: 0.92, opacity: 0, y: 12 }}
      animate={{ scale: 1, opacity: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 380, damping: 22 }}
    >
      <span
        className="lav-text font-extrabold leading-none"
        style={{ fontSize: "clamp(34px, 7dvh, 64px)", letterSpacing: "-0.02em" }}
      >
        LOOK AT THE TV
      </span>
      <WaitingDots />
    </motion.div>
    {myValue !== undefined && (
      <div className="flex flex-col items-center" data-testid="look-at-tv-answer">
        <span className="pslug">You locked in</span>
        <span
          className="tabular glow-text font-extrabold leading-none"
          style={{ fontSize: "clamp(48px, 12dvh, 96px)" }}
        >
          {myValue}
        </span>
      </div>
    )}
  </div>
);
