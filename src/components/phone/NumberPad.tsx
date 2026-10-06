import { Delete } from "lucide-react";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { digitGroups, keypadReducer } from "./keypad";

const PadKey = ({
  keyId,
  className = "",
  label,
  disabled = false,
  onPress,
  children,
}: {
  keyId: string;
  className?: string;
  label?: string;
  disabled?: boolean;
  onPress: () => void;
  children: ReactNode;
}) => {
  const [pressed, setPressed] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  return (
    <button
      type="button"
      data-key={keyId}
      data-pressed={pressed}
      aria-label={label}
      disabled={disabled}
      className={`pkey ${className}`}
      onPointerDown={() => {
        // Instant press flash, independent of when the click lands.
        setPressed(true);
        if (timer.current) clearTimeout(timer.current);
        timer.current = setTimeout(() => setPressed(false), 140);
      }}
      onClick={onPress}
    >
      {children}
    </button>
  );
};

const DIGITS = [1, 2, 3, 4, 5, 6, 7, 8, 9] as const;

/**
 * The answer pad: the typed number (thousands separated by CSS, so the text stays
 * plain digits) over a standard 3x4 keypad with GO bottom right. No system
 * keyboard: the only <input> is visually hidden, inputMode="none", and is there
 * for assistive tech and automation.
 */
export const NumberPad = ({
  value,
  onChange,
  onSubmit,
  isSubmitting,
}: {
  value: string;
  onChange: (next: string) => void;
  onSubmit: () => void;
  isSubmitting: boolean;
}) => {
  const press = (digit: number) => onChange(keypadReducer(value, { type: "digit", digit }));
  const canSubmit = value !== "" && !isSubmitting;

  return (
    <>
      <div className="pdisplay-wrap">
        <div
          className={`pdisplay glow-text ${value === "" ? "pdisplay-empty" : ""}`}
          data-len={value.length}
          data-testid="answer-display"
          aria-live="polite"
        >
          {value === ""
            ? "Your guess"
            : digitGroups(value).map((group, index) => (
                <span key={index} className={index === 0 ? "pgroup" : "pgroup pgroup-sep"}>
                  {group}
                </span>
              ))}
          {value !== "" && <span className="pcaret" aria-hidden="true" />}
        </div>
        <label htmlFor="answer" className="sr-only">
          Your Answer
        </label>
        <input
          id="answer"
          type="text"
          inputMode="none"
          tabIndex={-1}
          autoComplete="off"
          className="sr-only"
          value={value}
          onChange={(e) => onChange(keypadReducer(value, { type: "set", value: e.target.value }))}
        />
      </div>
      <div className="ppad" role="group" aria-label="Number pad">
        {DIGITS.map((d) => (
          <PadKey key={d} keyId={String(d)} onPress={() => press(d)}>
            {d}
          </PadKey>
        ))}
        <PadKey
          keyId="delete"
          className="pkey-del"
          label="Delete"
          onPress={() => onChange(keypadReducer(value, { type: "delete" }))}
        >
          <Delete style={{ width: "46%", height: "46%" }} strokeWidth={3} aria-hidden="true" />
        </PadKey>
        <PadKey keyId="0" onPress={() => press(0)}>
          0
        </PadKey>
        <PadKey keyId="go" className="pkey-go" disabled={!canSubmit} onPress={onSubmit}>
          <span aria-hidden="true">GO</span>
          <span className="sr-only">Submit answer</span>
        </PadKey>
      </div>
    </>
  );
};
