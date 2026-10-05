import { motion } from "framer-motion";
import { InkToken } from "./print";
import { RollingNumber } from "./standings";
import { FLAG, type GuessGroup, type LineLayout, type LineSize, shortName } from "./number-line-layout";

/** "+4 pts" stamped beside a chip once the points land. */
export const PointsStamp = ({
  points,
  live,
  size = 40,
  bare = false,
  fastest = false,
}: {
  points: number;
  live: boolean;
  size?: number;
  bare?: boolean;
  fastest?: boolean;
}) => (
  <motion.span
    className="tv-display tabular inline-flex items-baseline gap-1 whitespace-nowrap"
    style={{ fontSize: size, background: "var(--pink)", color: "var(--ink)", padding: bare ? "1px 8px" : "2px 10px", border: "4px solid var(--ink)", lineHeight: 1 }}
    initial={live ? { scale: 0, rotate: -20 } : false}
    animate={{ scale: [0, 1.25, 1], rotate: -4 }}
    transition={{ duration: 0.4 }}
  >
    +<RollingNumber from={0} to={points} run={live} duration={0.6} />
    {bare ? <span className="tv-sr"> pts</span> : (
      <span className="slug" style={{ fontSize: 28 }}>
        {" "}pts
      </span>
    )}
    {fastest ? (
      <span className="slug" style={{ fontSize: Math.max(28, Math.round(size * 0.74)) }}>
        {" "}· fastest
      </span>
    ) : null}
  </motion.span>
);

/** A printed starburst in halftone yellow: the spotlight behind whoever nailed it. */
const Burst = ({ cx, cy, r, live }: { cx: number; cy: number; r: number; live: boolean }) => {
  const points = 18;
  const d = Array.from({ length: points * 2 }, (_, i) => {
    const a = (i / (points * 2)) * Math.PI * 2 - Math.PI / 2;
    const rr = i % 2 === 0 ? r : r * 0.8;
    return `${(r + Math.cos(a) * rr).toFixed(1)},${(r + Math.sin(a) * rr).toFixed(1)}`;
  }).join(" ");
  return (
    <motion.svg
      aria-hidden="true"
      className="absolute pointer-events-none"
      width={r * 2}
      height={r * 2}
      style={{ left: cx - r, top: cy - r, mixBlendMode: "multiply", zIndex: 1 }}
      initial={live ? { scale: 0, rotate: -30 } : false}
      animate={{ scale: 1, rotate: 0 }}
      transition={{ type: "spring", stiffness: 260, damping: 15 }}
    >
      <polygon points={d} fill="url(#tv-dots-yellow)" />
    </motion.svg>
  );
};

export const NumberLineAxis = ({ layout, axisY, live }: { layout: LineLayout; axisY: number; live: boolean }) => {
  const left = layout.axisLeft - 36;
  const right = layout.axisRight + 36;
  const tabs = layout.groups.filter((g) => g.offScale !== null);
  return (
    <div aria-hidden="true">
      <motion.div
        className="absolute"
        style={{ left, width: right - left, top: axisY - 4, height: 8, background: "var(--ink)", transformOrigin: "left" }}
        initial={live ? { scaleX: 0 } : false}
        animate={{ scaleX: 1 }}
        transition={{ duration: 0.75, ease: [0.6, 0, 0.2, 1] }}
      />
      {layout.ticks.map((t, i) => (
        <motion.div
          key={t.label}
          className="absolute flex flex-col items-center"
          style={{ left: t.x - 90, width: 180, top: axisY - 18 }}
          initial={live ? { opacity: 0, y: -14 } : false}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: live ? 0.2 + i * 0.06 : 0, duration: 0.3 }}
        >
          <span style={{ width: 6, height: 36, background: "var(--ink)" }} />
          <span className="slug mt-2 text-blue" style={{ fontSize: 38, lineHeight: 1 }}>
            {t.label}
          </span>
        </motion.div>
      ))}
      {tabs.map((g) => {
        const towardsRight = g.offScale === "right";
        const flagLeft = g.axisX - FLAG.width / 2;
        const from = towardsRight ? right : flagLeft + FLAG.width;
        const to = towardsRight ? flagLeft : left;
        return (
          <div key={g.key}>
            <svg className="absolute" style={{ left: Math.min(from, to), top: axisY - 20, overflow: "visible" }} width={Math.abs(to - from)} height={40}>
              <line x1={0} y1={20} x2={Math.abs(to - from)} y2={20} stroke="var(--ink)" strokeWidth={6} strokeDasharray="8 10" />
            </svg>
            {/* The edge flag: the off-scale value, with an arrow pointing off the end of the line. */}
            <span
              className="absolute tv-display tabular flex items-center justify-center whitespace-nowrap"
              style={{
                left: flagLeft,
                width: FLAG.width,
                top: axisY - FLAG.height / 2,
                height: FLAG.height,
                fontSize: 46,
                background: "var(--ink)",
                color: "var(--paper)",
                clipPath: towardsRight ? "polygon(0 0, 84% 0, 100% 50%, 84% 100%, 0 100%)" : "polygon(16% 0, 100% 0, 100% 100%, 16% 100%, 0 50%)",
                paddingLeft: towardsRight ? 0 : 26,
                paddingRight: towardsRight ? 26 : 0,
              }}
              data-testid={`tv-flag-${g.key}`}
            >
              {towardsRight ? `${g.label} →` : `← ${g.label}`}
            </span>
          </div>
        );
      })}
    </div>
  );
};

/** Leader lines from each group's label stack down to its value on the line. */
export const Leaders = ({ groups, axisY, delays, live }: { groups: GuessGroup[]; axisY: number; delays: Map<string, number>; live: boolean }) => (
  <svg aria-hidden="true" className="absolute inset-0 pointer-events-none" width={1920} height={1080} style={{ zIndex: 2 }}>
    {groups.map((g) => {
      const onFlag = g.offScale !== null && g.bottom > axisY - FLAG.height;
      return (
        <motion.g
          key={g.key}
          initial={live ? { opacity: 0 } : false}
          animate={{ opacity: 1 }}
          transition={{ delay: live ? (delays.get(g.key) ?? 0) + 0.3 : 0, duration: 0.2 }}
        >
          {onFlag ? null : (
            <line x1={g.x} y1={g.bottom + 2} x2={g.axisX} y2={g.offScale === null ? axisY - 12 : axisY - FLAG.height / 2} stroke="var(--ink)" strokeWidth={5} />
          )}
          {g.offScale === null ? <circle cx={g.axisX} cy={axisY} r={13} fill="var(--ink)" /> : null}
        </motion.g>
      );
    })}
  </svg>
);

export const GuessGroupView = ({
  group,
  size,
  showPoints,
  lit,
  dim,
  shiver,
  live,
  delay,
}: {
  group: GuessGroup;
  size: LineSize;
  showPoints: boolean;
  lit: boolean;
  dim: boolean;
  shiver: boolean;
  live: boolean;
  delay: number;
}) => {
  const shown = group.members.slice(0, size.maxRows);
  const more = group.members.length - shown.length;
  const fade = { opacity: dim ? 0.42 : 1, transition: "opacity .3s" };
  return (
    <>
      {lit ? <Burst cx={group.x} cy={group.bottom - group.height / 2} r={Math.min(200, Math.max(group.width, group.height) / 2 + 40)} live={live} /> : null}
      <motion.div
        className="absolute flex flex-col items-center justify-end"
        style={{ left: group.x - group.width / 2, width: group.width, top: group.bottom - group.height, height: group.height, zIndex: lit ? 6 : 4 }}
        initial={live ? { y: -480, opacity: 0 } : false}
        animate={{ y: 0, opacity: 1 }}
        transition={{
          y: { delay: live ? delay : 0, type: "spring", stiffness: 420, damping: 17, mass: 0.9 },
          opacity: { delay: live ? delay : 0, duration: 0.15 },
        }}
        data-testid={`tv-guess-${group.key}`}
      >
        <span className="flex items-start justify-center" style={{ gap: 18 }}>
          {shown.map((m) => {
            const fastest = group.fastest === m.playerId;
            return (
              <span key={m.playerId} className="relative flex flex-col items-center" data-testid={`player-result-${m.playerId}`}>
                <motion.span
                  className="inline-flex"
                  style={fade}
                  animate={lit ? { scale: 1.16 } : shiver ? { rotate: [0, -7, 6, -5, 4, 0], y: [0, -3, 0, -2, 0] } : { scale: 1, rotate: 0, y: 0 }}
                  transition={shiver ? { duration: 0.42, repeat: Infinity } : { type: "spring", stiffness: 420, damping: 11 }}
                >
                  <InkToken name={m.name} inkIndex={m.inkIndex} size={size.chip} />
                </motion.span>
                <span className="tv-display mt-1" style={{ ...fade, fontSize: size.name, lineHeight: 1.04, letterSpacing: "-0.01em", whiteSpace: "nowrap" }}>
                  {shortName(m.name, size.maxName)}
                </span>
                <span className="tv-sr">{m.name}</span>
                {m.points > 0 && size.stampRow ? (
                  <span className="mt-2 relative" style={{ minHeight: size.stamp * 1.3, zIndex: 7 }}>
                    {showPoints ? <PointsStamp points={m.points} live={live} size={size.stamp} bare fastest={fastest} /> : null}
                  </span>
                ) : null}
                {m.points > 0 && !size.stampRow && showPoints ? (
                  <span className="absolute" style={{ left: -22, top: -18, zIndex: 7 }}>
                    <PointsStamp points={m.points} live={live} size={size.stamp} bare fastest={fastest} />
                  </span>
                ) : null}
              </span>
            );
          })}
          {more > 0 ? (
            <span className="slug self-center" style={{ ...fade, fontSize: 30, lineHeight: 1 }}>
              +{more}
            </span>
          ) : null}
        </span>
        {group.offScale === null ? (
          <span className="tv-display tabular mt-2" style={{ ...fade, fontSize: size.value, lineHeight: 0.95 }}>
            {group.label}
          </span>
        ) : null}
      </motion.div>
    </>
  );
};
