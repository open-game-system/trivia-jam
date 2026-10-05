const TOKEN_INKS = ["blue", "pink", "teal", "yellow"] as const;

/** One ink per player, by seat, then repeats. */
export const PlayerToken = ({
  name,
  seat,
  className = "",
}: {
  name: string;
  seat: number;
  className?: string;
}) => (
  <span
    className={`ptoken ptoken-${TOKEN_INKS[seat % TOKEN_INKS.length]} ${className}`}
    aria-hidden="true"
  >
    {name.trim().charAt(0).toUpperCase() || "?"}
  </span>
);

/** Printed rank disc: a number in a circle (replaces medal emoji). */
export const RankDisc = ({ rank }: { rank: number }) => (
  <span
    className={`prank ${rank <= 3 ? `prank-${rank}` : ""}`}
    aria-label={`Place ${rank}`}
  >
    {rank}
  </span>
);

export const Slug = ({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) => <span className={`pslug ${className}`}>{children}</span>;

/** Three printed dots that bob: waiting for the others. */
export const WaitingDots = () => (
  <span className="pdots" aria-hidden="true">
    <span />
    <span />
    <span />
  </span>
);
