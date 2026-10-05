import { motion } from "framer-motion";
import { InkToken } from "./print";
import { RollingNumber } from "./standings";
import { type GuessGroup, type LineLayout, type LineSize, shortName } from "./number-line-layout";

/** "+4 pts" stamped beside a chip once the points land. */
export const PointsStamp = ({ points, live, size = 40, bare = false }: { points: number; live: boolean; size?: number; bare?: boolean }) => (
  <motion.span
    className="tv-display tabular inline-flex items-baseline gap-1"
    style={{ fontSize: size, background: "var(--pink)", color: "var(--ink)", padding: bare ? "1px 6px" : "2px 10px", border: "4px solid var(--ink)", lineHeight: 1 }}
    initial={live ? { scale: 0, rotate: -20 } : false}
    animate={{ scale: [0, 1.25, 1], rotate: -6 }}
    transition={{ duration: 0.4 }}
  >
    +<RollingNumber from={0} to={points} run={live} duration={0.6} />
    {bare ? <span className="tv-sr"> pts</span> : (
      <span className="slug" style={{ fontSize: 28 }}>
        {" "}pts
      </span>
    )}
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
        const from = towardsRight ? right : g.axisX + 70;
        const to = towardsRight ? g.axisX - 70 : left;
        return (
          <div key={g.key}>
            <svg className="absolute" style={{ left: Math.min(from, to), top: axisY - 20, overflow: "visible" }} width={Math.abs(to - from)} height={40}>
              <line x1={0} y1={20} x2={Math.abs(to - from)} y2={20} stroke="var(--ink)" strokeWidth={6} strokeDasharray="10 12" />
              {/* The scale break: two slashes where the line leaves the scale. */}
              <line x1={towardsRight ? 14 : Math.abs(to - from) - 30} y1={36} x2={towardsRight ? 30 : Math.abs(to - from) - 14} y2={4} stroke="var(--ink)" strokeWidth={6} />
              <line x1={towardsRight ? 30 : Math.abs(to - from) - 46} y1={36} x2={towardsRight ? 46 : Math.abs(to - from) - 30} y2={4} stroke="var(--ink)" strokeWidth={6} />
            </svg>
            <span
              className="absolute slug flex items-center justify-center"
              style={{
                left: g.axisX - 70,
                width: 140,
                top: axisY - 26,
                height: 52,
                fontSize: 28,
                background: "var(--ink)",
                color: "var(--paper)",
                clipPath: towardsRight ? "polygon(0 0, 82% 0, 100% 50%, 82% 100%, 0 100%)" : "polygon(18% 0, 100% 0, 100% 100%, 18% 100%, 0 50%)",
                paddingLeft: towardsRight ? 0 : 18,
                paddingRight: towardsRight ? 18 : 0,
              }}
            >
              {towardsRight ? "Way up" : "Way down"}
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
    {groups.map((g) => (
      <motion.g
        key={g.key}
        initial={live ? { opacity: 0 } : false}
        animate={{ opacity: 1 }}
        transition={{ delay: live ? (delays.get(g.key) ?? 0) + 0.3 : 0, duration: 0.2 }}
      >
        <line x1={Math.min(g.x + g.width / 2 - 30, Math.max(g.x - g.width / 2 + 30, g.axisX))} y1={g.bottom + 4} x2={g.axisX} y2={axisY - 12} stroke="var(--ink)" strokeWidth={5} />
        {g.offScale === null ? <circle cx={g.axisX} cy={axisY} r={13} fill="var(--ink)" /> : null}
      </motion.g>
    ))}
  </svg>
);

export const GuessGroupView = ({
  group,
  size,
  showPoints,
  lit,
  dim,
  live,
  delay,
}: {
  group: GuessGroup;
  size: LineSize;
  showPoints: boolean;
  lit: boolean;
  dim: boolean;
  live: boolean;
  delay: number;
}) => {
  const shown = group.members.slice(0, size.maxRows);
  const more = group.members.length - shown.length;
  return (
    <>
      {lit ? <Burst cx={group.x} cy={group.bottom - group.height / 2} r={Math.min(230, Math.max(group.width, group.height) / 2 + 50)} live={live} /> : null}
      <motion.div
        className="absolute flex flex-col items-center"
        style={{ left: group.x - group.width / 2, width: group.width, top: group.bottom - group.height, height: group.height, zIndex: lit ? 6 : 4 }}
        initial={live ? { y: -480, opacity: 0 } : false}
        animate={{ y: 0, opacity: dim ? 0.5 : 1 }}
        transition={{
          y: { delay: live ? delay : 0, type: "spring", stiffness: 420, damping: 17, mass: 0.9 },
          opacity: { delay: live && !dim ? delay : 0, duration: dim ? 0.3 : 0.15 },
        }}
        data-testid={`tv-guess-${group.key}`}
      >
        <span className="tv-display tabular" style={{ fontSize: size.value, lineHeight: 0.95 }}>
          {group.label}
        </span>
        <span className="flex flex-col items-start mt-3" style={{ gap: 10 }}>
          {shown.map((m) => (
            <span key={m.playerId} className="relative flex items-center" style={{ height: size.chip, gap: 14 }} data-testid={`player-result-${m.playerId}`}>
              <InkToken name={m.name} inkIndex={m.inkIndex} size={size.chip} />
              <span className="tv-display" style={{ fontSize: size.name, lineHeight: 1, letterSpacing: "-0.01em", whiteSpace: "nowrap" }}>
                {shortName(m.name, size.maxName)}
              </span>
              <span className="tv-sr">{m.name}</span>
              {m.points > 0 && size.stamp > 0 ? (
                <span style={{ minWidth: size.stamp - 24 }}>{showPoints ? <PointsStamp points={m.points} live={live} size={42} /> : null}</span>
              ) : null}
              {m.points > 0 && size.stamp === 0 && showPoints ? (
                <span className="absolute" style={{ left: -26, top: -22, zIndex: 3 }}>
                  <PointsStamp points={m.points} live={live} size={30} bare />
                </span>
              ) : null}
            </span>
          ))}
          {more > 0 ? (
            <span className="slug" style={{ fontSize: 30, lineHeight: 1 }}>
              +{more} more
            </span>
          ) : null}
        </span>
      </motion.div>
    </>
  );
};
