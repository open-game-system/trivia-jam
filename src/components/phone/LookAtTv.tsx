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
      className="font-display font-extrabold text-blue"
      style={{ fontSize: "clamp(22px, 4.2dvh, 44px)", lineHeight: 1.05, letterSpacing: "-0.02em" }}
    >
      {questionText}
    </h1>
    <motion.div
      className="sheet sheet-pink flex w-full flex-col items-center gap-2 px-5 py-5"
      initial={{ scale: 0.9, rotate: -2, opacity: 0 }}
      animate={{ scale: 1, rotate: 0, opacity: 1 }}
      transition={{ type: "spring", stiffness: 380, damping: 22 }}
    >
      <span
        className="font-display font-extrabold leading-none misreg"
        style={{ fontSize: "clamp(40px, 11dvh, 96px)", letterSpacing: "-0.02em" }}
      >
        LOOK AT THE TV
      </span>
      <WaitingDots />
    </motion.div>
    {myValue !== undefined && (
      <div className="flex flex-col items-center" data-testid="look-at-tv-answer">
        <span className="pslug">You locked in</span>
        <span
          className="tabular font-display font-extrabold leading-none misreg"
          style={{ fontSize: "clamp(72px, 24dvh, 220px)" }}
        >
          {myValue}
        </span>
      </div>
    )}
  </div>
);
