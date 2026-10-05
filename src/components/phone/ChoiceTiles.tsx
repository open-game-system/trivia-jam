const TILE_INKS = ["pink", "blue", "yellow", "teal"] as const;

/** Many or long options keep the smaller disc so everything still fits. */
export const isDense = (options: readonly string[]): boolean =>
  options.length > 4 || options.some((option) => option.length > 16);

/** Four giant answer tiles in the four inks (2x2 on landscape). */
export const ChoiceTiles = ({
  options,
  disabled,
  onChoose,
}: {
  options: string[];
  disabled: boolean;
  onChoose: (value: string) => void;
}) => (
  <div className="ptiles" role="group" aria-label="Choices" data-dense={isDense(options)}>
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
