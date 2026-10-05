import { AnimatePresence, motion } from "framer-motion";
import { QRCodeSVG } from "qrcode.react";
import { InkToken, RisoType, Slug } from "./print";
import { Sunburst } from "./sunburst";

/** The table always shows this many chairs, filled or empty. */
export const LOBBY_SEATS = 10;

type LobbyPlayer = { id: string; name: string };

const Wordmark = () => (
  <h2 className="tv-display relative" aria-label="Trivia Jam">
    <span className="block" style={{ fontSize: 250 }}>
      <RisoType top="var(--blue)" under="var(--pink)" offset={10} rough>
        TRIVIA
      </RisoType>
    </span>
    <span className="block -mt-2" style={{ fontSize: 400, marginLeft: 120 }}>
      <RisoType top="var(--pink)" under="var(--blue)" offset={12} rough>
        JAM
      </RisoType>
    </span>
  </h2>
);

const JoinCard = ({ joinUrl, host, gameCode }: { joinUrl: string; host: string; gameCode?: string }) => (
  <motion.div
    initial={{ y: 60, rotate: 6, opacity: 0 }}
    animate={{ y: 0, rotate: 2.5, opacity: 1 }}
    transition={{ duration: 0.6, ease: [0.2, 0.9, 0.2, 1.15] }}
    className="sheet sheet-pink absolute flex flex-col items-center"
    style={{ right: 96, top: 72, width: 560, padding: "30px 36px 26px" }}
    data-testid="qr-code-section"
  >
    <Slug className="mb-5 text-ink !text-[30px] whitespace-nowrap" testId="qr-code-label">
      Scan to join the game
    </Slug>
    <div className="p-3" style={{ background: "var(--paper)", border: "4px solid var(--ink)" }}>
      <QRCodeSVG
        value={joinUrl}
        size={300}
        bgColor="#F3EEE3"
        fgColor="#1E1B1A"
        level="M"
        data-testid="game-qr-code"
      />
    </div>
    <div className="slug text-[28px] mt-5 text-ink">or open</div>
    <div className="tv-display text-[64px] text-blue mt-1 text-center" style={{ lineHeight: 1 }}>
      {host}
    </div>
    {gameCode ? (
      <div className="mt-2 flex items-baseline gap-4">
        <span className="slug text-[28px]">Code</span>
        <span className="tv-display tabular text-[72px]">{gameCode}</span>
      </div>
    ) : null}
  </motion.div>
);

const Seat = ({ player, index }: { player: LobbyPlayer | undefined; index: number }) => (
  <div className="flex flex-col items-center" style={{ width: 168 }}>
    <AnimatePresence mode="wait" initial={false}>
      {player ? (
        <motion.div
          key={player.id}
          initial={{ scale: 1.7, opacity: 0, y: -40 }}
          animate={{ scale: [1.7, 0.84, 1.05, 1], opacity: 1, y: 0 }}
          transition={{ duration: 0.55, times: [0, 0.5, 0.8, 1] }}
        >
          <InkToken name={player.name} inkIndex={index} size={120} />
        </motion.div>
      ) : (
        <motion.div key={`seat-${index}`} className="tv-seat" style={{ width: 120, height: 120 }} />
      )}
    </AnimatePresence>
    {player ? (
      <span
        className="tv-display text-[38px] mt-3 max-w-full truncate text-ink"
        style={{ lineHeight: 1.1, letterSpacing: "-0.01em" }}
      >
        {player.name}
      </span>
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
}: {
  players: LobbyPlayer[];
  joinUrl: string;
  host: string;
  gameCode?: string;
}) => {
  const seatCount = Math.max(LOBBY_SEATS, players.length);
  const seats = Array.from({ length: seatCount }, (_, i) => players[i]);
  const shown = seats.slice(0, LOBBY_SEATS);
  const extra = players.length - LOBBY_SEATS;
  return (
    <motion.div
      key="lobby"
      className="absolute inset-0"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <Sunburst size={1400} x={560} y={330} />
      <div className="absolute" style={{ left: 96, top: 84 }}>
        <Slug className="flex items-center gap-4 text-ink">
          <span className="inline-block" style={{ width: 28, height: 28, background: "var(--pink)", borderRadius: 999 }} />
          <span>Waiting for game to start</span>
        </Slug>
      </div>
      <div className="absolute" style={{ left: 84, top: 150 }}>
        <Wordmark />
      </div>

      <JoinCard joinUrl={joinUrl} host={host} gameCode={gameCode} />

      <div className="absolute" style={{ left: 96, right: 96, bottom: 56 }}>
        <div className="tv-rule mb-6" />
        <div className="flex items-baseline justify-between mb-5">
          <Slug className="text-ink">
            Players {players.length}/{seatCount}
          </Slug>
          {extra > 0 ? <Slug className="text-blue">+{extra} more at the table</Slug> : null}
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
