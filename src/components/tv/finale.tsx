import { motion, useReducedMotion } from "framer-motion";
import { useEffect, useMemo, useState } from "react";
import { InkToken, RisoType, Slug } from "./print";
import { Sunburst } from "./sunburst";

type FinalPlayer = { id: string; name: string; score: number };

const INKS = ["var(--pink)", "var(--blue)", "var(--yellow)", "var(--teal)"];

/** Deterministic pseudo-random so the confetti sheet is the same on every TV. */
const seeded = (seed: number) => {
  let s = seed;
  return () => {
    s = (s * 16807) % 2147483647;
    return s / 2147483647;
  };
};

type Scrap = { x: number; size: number; ink: string; shape: "rect" | "dot" | "tri"; delay: number; spin: number; drift: number; fall: number };

/** Confetti as printed paper scraps in the four inks, overprinting where they cross. */
const PaperConfetti = ({ count, start }: { count: number; start: number }) => {
  const scraps = useMemo<Scrap[]>(() => {
    const rnd = seeded(7);
    return Array.from({ length: count }, (_, i) => ({
      x: rnd() * 1920,
      size: 18 + rnd() * 26,
      ink: INKS[i % INKS.length],
      shape: (["rect", "dot", "tri"] as const)[Math.floor(rnd() * 3)],
      delay: start + rnd() * 1.6,
      spin: (rnd() - 0.5) * 720,
      drift: (rnd() - 0.5) * 260,
      fall: 3.2 + rnd() * 2.2,
    }));
  }, [count, start]);
  return (
    <div aria-hidden="true" className="absolute inset-0 pointer-events-none" style={{ zIndex: 20 }}>
      {scraps.map((c, i) => (
        <motion.svg
          key={i}
          width={c.size}
          height={c.size}
          viewBox="0 0 10 10"
          className="absolute overprint"
          style={{ left: c.x, top: -60 }}
          initial={{ y: 0, x: 0, rotate: 0, opacity: 0 }}
          animate={{ y: 1220, x: c.drift, rotate: c.spin, opacity: [0, 1, 1, 1] }}
          transition={{ duration: c.fall, delay: c.delay, ease: [0.3, 0.1, 0.6, 1] }}
        >
          {c.shape === "rect" ? (
            <rect x="0" y="2" width="10" height="6" fill={c.ink} />
          ) : c.shape === "dot" ? (
            <circle cx="5" cy="5" r="5" fill={c.ink} />
          ) : (
            <polygon points="5,0 10,10 0,10" fill={c.ink} />
          )}
        </motion.svg>
      ))}
    </div>
  );
};

const PODIUM = [
  { place: 2, left: 330, height: 250, ink: "var(--blue)", on: "var(--paper)", delay: 1.3 },
  { place: 1, left: 760, height: 360, ink: "var(--pink)", on: "var(--ink)", delay: 2.3 },
  { place: 3, left: 1190, height: 180, ink: "var(--teal)", on: "var(--paper)", delay: 0.5 },
] as const;
const BLOCK_WIDTH = 400;
const FLOOR = 930;

const PodiumStep = ({
  step,
  player,
  inkIndex,
  speed,
}: {
  step: (typeof PODIUM)[number];
  player: FinalPlayer;
  inkIndex: number;
  speed: number;
}) => {
  const top = FLOOR - step.height;
  const tokenSize = step.place === 1 ? 150 : 120;
  return (
    <div data-testid={`player-score-${player.id}`}>
      <motion.div
        className="absolute flex items-start justify-center overflow-hidden"
        style={{ left: step.left, top, width: BLOCK_WIDTH, height: step.height, background: step.ink, border: "6px solid var(--ink)", transformOrigin: "bottom" }}
        initial={{ scaleY: 0 }}
        animate={{ scaleY: 1 }}
        transition={{ delay: step.delay * speed, type: "spring", stiffness: 260, damping: 16 }}
      >
        <span className="absolute inset-0 halftone-ink" style={{ opacity: 0.25 }} aria-hidden="true" />
        <span className="tv-display relative tv-rough" style={{ fontSize: step.place === 1 ? 250 : 190, color: step.on, lineHeight: 1, marginTop: 6 }}>
          {step.place}
        </span>
      </motion.div>
      <motion.div
        className="absolute flex flex-col items-center"
        style={{ left: step.left, width: BLOCK_WIDTH, bottom: 1080 - top + 14 }}
        initial={{ scale: 2.2, opacity: 0, y: -60 }}
        animate={{ scale: [2.2, 0.86, 1.04, 1], opacity: 1, y: 0 }}
        transition={{ delay: (step.delay + 0.35) * speed, duration: 0.5, times: [0, 0.55, 0.8, 1] }}
      >
        <InkToken name={player.name} inkIndex={inkIndex} size={tokenSize} />
        <span className="tv-display truncate text-center mt-2" style={{ fontSize: step.place === 1 ? 60 : 48, lineHeight: 1.05, maxWidth: BLOCK_WIDTH + 40, letterSpacing: "-0.015em" }}>
          {player.name}
        </span>
        <span className="tv-display tabular text-blue" style={{ fontSize: 44, lineHeight: 1 }}>
          {player.score} <span className="slug text-[28px]">pts</span>
        </span>
      </motion.div>
    </div>
  );
};

/** Game over: a printed podium stamped 3rd, 2nd, 1st, the winner in huge type, paper confetti, then a calm hold. */
export const TvFinale = ({ players }: { players: FinalPlayer[] }) => {
  const reduced = useReducedMotion() ?? false;
  const speed = reduced ? 0.5 : 1;
  const inkIndex = new Map(players.map((p, i) => [p.id, i]));
  const ranked = [...players].sort((a, b) => b.score - a.score || (inkIndex.get(a.id) ?? 0) - (inkIndex.get(b.id) ?? 0));
  const winner = ranked[0];
  const rest = ranked.slice(3);
  const [calm, setCalm] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setCalm(true), 9000 * speed);
    return () => clearTimeout(t);
  }, [speed]);
  const winnerLine = winner ? `${winner.name} Wins!` : "Game Over!";
  const winnerSize = winnerLine.length <= 12 ? 170 : winnerLine.length <= 18 ? 130 : 96;
  return (
    <motion.div key="finale" className="absolute inset-0" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <Sunburst size={1700} x={960} y={620} rays={30} />
      <div className="absolute flex items-center justify-between" style={{ left: 96, right: 96, top: 56 }} data-testid="game-over-title">
        <Slug>
          <span style={{ background: "var(--ink)", color: "var(--paper)", padding: "12px 20px", display: "inline-block" }}>Game over</span>
        </Slug>
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: calm ? 1 : 0 }} transition={{ duration: 1.2 }}>
          <Slug className="text-blue">Thanks for playing</Slug>
        </motion.div>
      </div>

      {winner ? (
        <motion.div
          className="absolute text-center"
          style={{ left: 0, right: 0, top: 130 }}
          initial={{ scale: 1.5, opacity: 0, rotate: -6 }}
          animate={{ scale: [1.5, 0.92, 1.03, 1], opacity: 1, rotate: -2 }}
          transition={{ delay: 3.1 * speed, duration: 0.6, times: [0, 0.55, 0.8, 1] }}
          data-testid="winner-announcement"
        >
          <span className="tv-display" style={{ fontSize: winnerSize }}>
            <RisoType top="var(--blue)" under="var(--pink)" offset={12} rough>
              {winnerLine}
            </RisoType>
          </span>
          <span className="tv-sr">with {winner.score} points</span>
        </motion.div>
      ) : null}

      {PODIUM.map((step) => {
        const player = ranked[step.place - 1];
        return player ? <PodiumStep key={step.place} step={step} player={player} inkIndex={inkIndex.get(player.id) ?? 0} speed={speed} /> : null;
      })}

      <div className="absolute" style={{ left: 0, right: 0, top: FLOOR, height: 6, background: "var(--ink)" }} />
      <div className="absolute flex items-center gap-8" style={{ left: 96, right: 96, top: FLOOR + 28 }}>
        <Slug className="text-ink whitespace-nowrap" testId="final-scores-heading">
          Final scores
        </Slug>
        {rest.slice(0, 4).map((p, i) => (
          <span key={p.id} className="flex items-center gap-3" data-testid={`player-score-${p.id}`}>
            <span className="slug text-[28px]">{i + 4}</span>
            <InkToken name={p.name} inkIndex={inkIndex.get(p.id) ?? 0} size={52} />
            <span className="tv-display text-[36px] truncate" style={{ maxWidth: 210, letterSpacing: "-0.01em" }}>
              {p.name}
            </span>
            <span className="tv-display tabular text-[36px] text-blue">{p.score}</span>
          </span>
        ))}
        {rest.length > 4 ? <span className="slug text-[28px]">+{rest.length - 4}</span> : null}
      </div>

      <PaperConfetti count={reduced ? 40 : 90} start={2.4 * speed} />
    </motion.div>
  );
};
