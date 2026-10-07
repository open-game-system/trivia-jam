import { motion } from "framer-motion";
import { EASE_OUT, EASE_POP } from "./glass";

/**
 * The game's signature: a glowing indigo-to-purple number line with a single glowing pin. It is the
 * wordmark's underline in the lobby, the "where will it land?" line on the question screen, and the
 * stage of the reveal, where the answer's pin lands on it.
 */

/** The pin: a white-to-lavender stem rising from the line, crowned with a point of light. */
export const PinLight = ({ height, head = 30 }: { height: number; head?: number }) => (
  <span aria-hidden="true" className="absolute block" style={{ left: 0, bottom: 0, width: 0, height }}>
    <span
      className="absolute block"
      style={{ left: -3, bottom: 0, width: 6, height, borderRadius: 6, background: "linear-gradient(180deg, rgba(255,255,255,0), #ffffff 45%, var(--glow))", boxShadow: "0 0 16px rgba(196, 181, 253, 0.85)" }}
    />
    <span
      className="absolute block"
      style={{ left: -head / 2, bottom: height - head / 2, width: head, height: head, borderRadius: 999, background: "radial-gradient(circle, #ffffff 30%, var(--glow) 58%, rgba(196,181,253,0) 72%)", boxShadow: `0 0 ${head}px ${head / 3}px rgba(196, 181, 253, 0.55)` }}
    />
  </span>
);

/** A soft pool of light on the floor under the line. */
export const FloorGlow = ({ width, height, strength = 1 }: { width: number; height: number; strength?: number }) => (
  <span
    aria-hidden="true"
    className="absolute block pointer-events-none"
    style={{
      left: -width * 0.08,
      width: width * 1.16,
      top: -height * 0.3,
      height,
      opacity: strength,
      background: "radial-gradient(50% 50% at 50% 30%, rgba(139, 92, 246, 0.34), rgba(99, 102, 241, 0.12) 55%, transparent 75%)",
      filter: "blur(10px)",
    }}
  />
);

/**
 * The lockup's mark: a short glowing axis, a few ticks and one pin. In the lobby the pin seeks (glides
 * between values like a guess, then settles); `pin` is where it rests (0..1 along the line).
 */
export const BrandAxis = ({ width, pin = 0.68, seek = false, ticks = 7 }: { width: number; pin?: number; seek?: boolean; ticks?: number }) => {
  const at = width * pin;
  return (
    <div aria-hidden="true" className="relative" style={{ width, height: 120 }} data-testid="tv-brand-axis">
      <div className="absolute" style={{ left: 0, top: 96, width, height: 0 }}>
        <FloorGlow width={width} height={90} />
        <motion.div
          className="absolute tv-axis"
          style={{ left: 0, width, top: -4, height: 8, transformOrigin: "left" }}
          initial={{ scaleX: 0 }}
          animate={{ scaleX: 1 }}
          transition={{ duration: 0.8, delay: 0.35, ease: [0.6, 0, 0.2, 1] }}
        />
        {Array.from({ length: ticks }, (_, i) => (
          <motion.span
            key={i}
            className="absolute block"
            style={{ left: (i * width) / (ticks - 1) - 2, top: -13, width: 4, height: 26, borderRadius: 4, background: "rgba(255,255,255,.3)" }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 + i * 0.05, duration: 0.3 }}
          />
        ))}
        <motion.span
          className="absolute block"
          style={{ left: 0, top: 0 }}
          initial={{ x: seek ? width * 0.15 : at, opacity: 0 }}
          animate={seek ? { x: [width * 0.15, width * 0.86, width * 0.38, at], opacity: 1 } : { x: at, opacity: 1 }}
          transition={seek ? { x: { duration: 2.6, delay: 1, times: [0, 0.4, 0.72, 1], ease: "easeInOut" }, opacity: { delay: 0.9, duration: 0.3 } } : { duration: 0.4, delay: 0.6, ease: EASE_OUT }}
        >
          <motion.span
            className="absolute block"
            style={{ left: 0, top: 0 }}
            initial={{ scaleY: 0.2 }}
            animate={{ scaleY: 1 }}
            transition={{ delay: seek ? 3.5 : 0.7, duration: 0.45, ease: EASE_POP }}
          >
            <span className="absolute block" style={{ left: 0, top: -84, height: 84 }}>
              <PinLight height={84} head={34} />
            </span>
          </motion.span>
        </motion.span>
      </div>
    </div>
  );
};

/**
 * The reveal's stage: the line stands on a lit floor (a soft glow pooled under it, fading down the
 * screen) with two faint beams from the top of the frame meeting on it, so the upper field is part of
 * the set rather than empty.
 */
export const RevealStage = ({ axisY, left, right, live }: { axisY: number; left: number; right: number; live: boolean }) => {
  const width = right - left;
  return (
    <motion.div
      aria-hidden="true"
      className="absolute inset-0 pointer-events-none"
      style={{ zIndex: 0 }}
      initial={live ? { opacity: 0 } : false}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.9, delay: live ? 0.2 : 0 }}
    >
      {/* The floor: a wide pool of light under the line, fading towards the bottom of the frame. */}
      <span
        className="absolute block"
        style={{
          left: left - 120,
          width: width + 240,
          top: axisY - 240,
          height: 1080 - axisY + 240,
          background: "radial-gradient(50% 50% at 50% 46%, rgba(139, 92, 246, 0.30), rgba(99, 102, 241, 0.10) 45%, transparent 70%)",
        }}
      />
      {/* A thin bright horizon right on the line. */}
      <span className="absolute block" style={{ left, width, top: axisY - 30, height: 60, background: "radial-gradient(50% 50% at 50% 50%, rgba(196, 181, 253, 0.22), transparent 70%)", filter: "blur(6px)" }} />
      {/* Two faint beams from the top of the frame, meeting over the line. */}
      {/* filter runs before clip-path, so the blur sits on a parent to soften the beams' edges. */}
      <span className="absolute block" style={{ left: 0, top: 0, width: 1920, height: axisY, filter: "blur(26px)" }}>
        <span className="absolute inset-0 block" style={{ background: BEAM, clipPath: "polygon(14% 0, 24% 0, 58% 100%, 38% 100%)" }} />
        <span className="absolute inset-0 block" style={{ background: BEAM, clipPath: "polygon(76% 0, 86% 0, 62% 100%, 42% 100%)" }} />
      </span>
    </motion.div>
  );
};

const BEAM = "linear-gradient(180deg, rgba(196, 181, 253, 0.07), rgba(139, 92, 246, 0.02) 70%, transparent)";

/** The answer's spotlight: a cone of lavender light from the top of the frame onto the answer tick. */
export const AnswerSpotlight = ({ x, axisY, live }: { x: number; axisY: number; live: boolean }) => (
  <motion.span
    aria-hidden="true"
    className="absolute block pointer-events-none"
    style={{ left: x - 320, width: 640, top: 0, height: axisY + 40, zIndex: 1, transformOrigin: "50% 0", filter: "blur(16px)" }}
    initial={live ? { opacity: 0, scaleX: 0.3 } : false}
    animate={{ opacity: 1, scaleX: 1 }}
    transition={{ duration: 0.45, ease: EASE_OUT }}
  >
    <span
      className="absolute inset-0 block"
      style={{
        background: "linear-gradient(180deg, rgba(255, 255, 255, 0.0), rgba(221, 214, 254, 0.10) 40%, rgba(196, 181, 253, 0.30))",
        clipPath: "polygon(44% 0, 56% 0, 86% 100%, 14% 100%)",
      }}
    />
  </motion.span>
);
