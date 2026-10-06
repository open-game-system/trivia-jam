import { motion } from "framer-motion";
import { QRCodeSVG } from "qrcode.react";
import { FitName } from "./fit-name";
import { EASE_OUT, GlassToken, Label } from "./glass";
import { BrandAxis } from "./brand-axis";

/** The table always shows this many chairs, filled or empty. */
export const LOBBY_SEATS = 10;

type LobbyPlayer = { id: string; name: string };

/** Lifts the mark so its line sits on the wordmark's baseline (the mark's line is 96 px down its 120 px box). */
const BASELINE_LIFT = 10;

const Wordmark = () => (
  <h2 className="tv-display tv-hero relative" aria-label="Trivia Jam" style={{ letterSpacing: "-0.045em" }}>
    <motion.span
      className="block lav-text"
      style={{ fontSize: 184, lineHeight: 0.98, paddingBottom: 8 }}
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: EASE_OUT }}
    >
      Trivia
    </motion.span>
    <span className="flex items-end">
      <motion.span
        className="block glow-text"
        style={{ fontSize: 262, lineHeight: 0.92, marginLeft: 4, paddingBottom: 12 }}
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.55, delay: 0.12, ease: EASE_OUT }}
      >
        Jam
      </motion.span>
      {/* The signature: the line runs on from the wordmark's baseline and its pin seeks, then settles. */}
      <span className="block" style={{ marginLeft: 28, marginBottom: BASELINE_LIFT }}>
        <BrandAxis width={330} pin={0.7} seek ticks={6} />
      </span>
    </span>
  </h2>
);

const JoinCard = ({ joinUrl, host, gameCode }: { joinUrl: string; host: string; gameCode?: string }) => (
  <motion.div
    initial={{ y: 30, opacity: 0 }}
    animate={{ y: 0, opacity: 1 }}
    transition={{ duration: 0.5, delay: 0.2, ease: EASE_OUT }}
    className="tv-glass absolute flex flex-col items-center"
    style={{ right: 96, top: 72, width: 560, padding: "34px 36px 30px", borderRadius: 32 }}
    data-testid="qr-code-section"
  >
    <Label className="mb-6 whitespace-nowrap" testId="qr-code-label" size={30}>
      Scan to join the game
    </Label>
    <div className="p-4" style={{ background: "#ffffff", borderRadius: 20, boxShadow: "0 0 60px rgba(196, 181, 253, 0.35)" }}>
      <QRCodeSVG value={joinUrl} size={290} bgColor="#FFFFFF" fgColor="#0B0F1A" level="M" data-testid="game-qr-code" />
    </div>
    <Label className="mt-6" size={28}>
      or open
    </Label>
    <FitName text={host} max={60} floor={36} box={488} lineHeight={1.1} className="tv-display text-center mt-2 lav-text" />
    {gameCode ? (
      <div className="mt-3 flex items-baseline gap-4">
        <Label size={28}>Code</Label>
        <span className="tv-display text-[72px]" style={{ color: "var(--text)" }}>
          {gameCode}
        </span>
      </div>
    ) : null}
  </motion.div>
);

const Seat = ({ player, index }: { player: LobbyPlayer | undefined; index: number }) => (
  <div className="flex flex-col items-center" style={{ width: 168 }}>
    {player ? (
      <motion.div
        key={player.id}
        initial={{ scale: 0.6, opacity: 0, y: 20 }}
        animate={{ scale: [0.6, 1.08, 1], opacity: [0, 1, 1], y: [20, 0, 0] }}
        transition={{ duration: 0.5, times: [0, 0.6, 1], ease: EASE_OUT }}
      >
        <GlassToken name={player.name} inkIndex={index} size={120} />
      </motion.div>
    ) : (
      <motion.div key={`seat-${index}`} className="tv-seat" style={{ width: 120, height: 120 }} />
    )}
    {player ? (
      <FitName text={player.name} max={36} floor={28} box={168} lineHeight={1.12} className="tv-name mt-3 text-center" />
    ) : (
      <span className="tv-sr">Empty Slot</span>
    )}
  </div>
);

export const TvLobby = ({
  players,
  joinUrl,
  host,
  gameCode,
  onOgsTv = false,
}: {
  players: LobbyPlayer[];
  joinUrl: string;
  host: string;
  gameCode?: string;
  /** Framed by the OGS TV launcher: its own TV code replaces our QR and link. */
  onOgsTv?: boolean;
}) => {
  const seatCount = Math.max(LOBBY_SEATS, players.length);
  const seats = Array.from({ length: seatCount }, (_, i) => players[i]);
  const shown = seats.slice(0, LOBBY_SEATS);
  const extra = players.length - LOBBY_SEATS;
  return (
    <motion.div key="lobby" className="absolute inset-0" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <div className="absolute" style={{ left: 104, top: 88 }}>
        <Label className="flex items-center gap-4">
          <motion.span
            className="inline-block"
            style={{ width: 18, height: 18, background: "var(--glow)", borderRadius: 999, boxShadow: "0 0 18px var(--glow)" }}
            animate={{ opacity: [1, 0.35, 1] }}
            transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
          />
          <span>Waiting for game to start</span>
        </Label>
      </div>
      <div className="absolute" style={{ left: 92, top: 150 }}>
        <Wordmark />
      </div>

      {onOgsTv ? null : <JoinCard joinUrl={joinUrl} host={host} gameCode={gameCode} />}

      <div className="absolute tv-glass" style={{ left: 72, right: 72, bottom: 40, padding: "26px 24px 24px", borderRadius: 32 }}>
        <div className="flex items-baseline justify-between mb-5" style={{ paddingLeft: 12, paddingRight: 12 }}>
          <Label>{players.length === 0 ? "Waiting for players" : `${players.length} ${players.length === 1 ? "player" : "players"}`}</Label>
          {extra > 0 ? <Label className="lav-text">+{extra} more at the table</Label> : null}
        </div>
        <div className="flex justify-between">
          {shown.map((p, i) => (
            <Seat key={p?.id ?? `seat-${i}`} player={p} index={i} />
          ))}
        </div>
      </div>
    </motion.div>
  );
};
