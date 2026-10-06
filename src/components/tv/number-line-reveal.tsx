import { motion } from "framer-motion";
import { Bloom, EASE_POP, GlassToken } from "./glass";
import { RollingNumber } from "./standings";
import { FLAG, type GuessGroup, type LineLayout, type LineSize, shortName } from "./number-line-layout";

/** "+4 pts": a small solid lavender pill that pops in beside a chip once the points land. */
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
    className="tv-pill tv-pill--lav inline-flex items-baseline gap-1"
    style={{ fontSize: size, padding: bare ? "4px 12px" : "5px 14px" }}
    initial={live ? { scale: 0, opacity: 0 } : false}
    animate={{ scale: [0, 1.15, 1], opacity: 1 }}
    transition={{ duration: 0.4, ease: EASE_POP }}
  >
    +<RollingNumber from={0} to={points} run={live} duration={0.6} />
    {bare ? <span className="tv-sr"> pts</span> : (
      <span style={{ fontSize: 28, fontWeight: 700 }}>
        {" "}pts
      </span>
    )}
    {fastest ? (
      <span style={{ fontSize: Math.max(28, Math.round(size * 0.74)), fontWeight: 700 }}>
        {" "}· fastest
      </span>
    ) : null}
  </motion.span>
);

export const NumberLineAxis = ({ layout, axisY, live }: { layout: LineLayout; axisY: number; live: boolean }) => {
  const left = layout.axisLeft - 36;
  const right = layout.axisRight + 36;
  const tabs = layout.groups.filter((g) => g.offScale !== null);
  return (
    <div aria-hidden="true">
      <motion.div
        className="absolute tv-axis"
        style={{ left, width: right - left, top: axisY - 3, height: 6, transformOrigin: "left" }}
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
          <span style={{ width: 4, height: 36, borderRadius: 4, background: "rgba(255, 255, 255, 0.28)" }} />
          <span className="tv-display mt-2" style={{ fontSize: 38, lineHeight: 1, fontWeight: 600, letterSpacing: 0, color: "var(--text-2)" }}>
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
              <line x1={0} y1={20} x2={Math.abs(to - from)} y2={20} stroke="rgba(196, 181, 253, 0.55)" strokeWidth={4} strokeLinecap="round" strokeDasharray="2 14" />
            </svg>
            {/* The edge flag: the off-scale value, with an arrow pointing off the end of the line. */}
            <span
              className="absolute tv-display tv-pill tv-pill--glass flex items-center justify-center whitespace-nowrap"
              style={{
                left: flagLeft,
                width: FLAG.width,
                top: axisY - FLAG.height / 2,
                height: FLAG.height,
                fontSize: 42,
                background: "rgba(30, 27, 75, 0.85)",
                borderColor: "var(--glow)",
                boxShadow: "0 0 24px rgba(196, 181, 253, 0.35)",
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
            <line x1={g.x} y1={g.bottom + 2} x2={g.axisX} y2={g.offScale === null ? axisY - 12 : axisY - FLAG.height / 2} stroke="rgba(255, 255, 255, 0.32)" strokeWidth={3} strokeLinecap="round" />
          )}
          {g.offScale === null ? <circle cx={g.axisX} cy={axisY} r={10} fill="#ffffff" stroke="var(--aurora-purple)" strokeWidth={4} style={{ filter: "drop-shadow(0 0 6px rgba(196,181,253,.9))" }} /> : null}
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
      {lit ? <Bloom x={group.x} y={group.bottom - group.height / 2} r={Math.min(260, Math.max(group.width, group.height) / 2 + 80)} color="rgba(74, 222, 128, 0.26)" live={live} /> : null}
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
                  animate={lit ? { scale: 1.16, y: -10 } : shiver ? { rotate: [0, -7, 6, -5, 4, 0], y: [0, -3, 0, -2, 0] } : { scale: 1, rotate: 0, y: 0 }}
                  transition={shiver ? { duration: 0.42, repeat: Infinity } : { type: "spring", stiffness: 420, damping: 11 }}
                >
                  <GlassToken name={m.name} inkIndex={m.inkIndex} size={size.chip} win={lit} />
                </motion.span>
                <span className="tv-name mt-1" style={{ ...fade, fontSize: size.name, lineHeight: 1.04, whiteSpace: "nowrap", color: lit ? "var(--text)" : "var(--text-2)" }}>
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
            <span className="tv-label self-center" style={{ ...fade, fontSize: 30, lineHeight: 1 }}>
              +{more}
            </span>
          ) : null}
        </span>
        {group.offScale === null ? (
          <span className="tv-display mt-2" style={{ ...fade, fontSize: size.value, lineHeight: 0.95, color: lit ? "var(--win)" : "var(--text)" }}>
            {group.label}
          </span>
        ) : null}
      </motion.div>
    </>
  );
};
