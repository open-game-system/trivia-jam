const TILE_INKS = ["pink", "blue", "yellow", "teal"] as const;

/** One full-width glass tile per option, each with a coloured letter disc. */
export const ChoiceTiles = ({
  options,
  disabled,
  onChoose,
}: {
  options: string[];
  disabled: boolean;
  onChoose: (value: string) => void;
}) => (
  <div className="ptiles" role="group" aria-label="Choices">
    {options.map((option, index) => {
      const letter = String.fromCharCode(65 + index);
      return (
        <button
          key={option}
          type="button"
          disabled={disabled}
          aria-label={`${letter}) ${option}`}
          className={`w-full ptile ptile-${TILE_INKS[index % TILE_INKS.length]}`}
          onClick={() => onChoose(option)}
        >
          <span className="ptile-letter" aria-hidden="true">
            {letter}
          </span>
          <span className="ptile-text" aria-hidden="true">
            {option}
          </span>
        </button>
      );
    })}
  </div>
);

export const tileInkFor = (index: number) => TILE_INKS[index % TILE_INKS.length];
