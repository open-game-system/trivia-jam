export const MAX_DIGITS = 8;

export type KeypadAction =
  | { type: "digit"; digit: number }
  | { type: "delete" }
  | { type: "clear" }
  | { type: "set"; value: string };

const normalise = (raw: string): string => {
  const digits = raw.replace(/\D/g, "").slice(0, MAX_DIGITS);
  if (digits === "") return "";
  const trimmed = digits.replace(/^0+/, "");
  return trimmed === "" ? "0" : trimmed;
};

export const keypadReducer = (value: string, action: KeypadAction): string => {
  switch (action.type) {
    case "digit":
      return value.length >= MAX_DIGITS
        ? value
        : normalise(`${value}${action.digit}`);
    case "delete":
      return value.slice(0, -1);
    case "clear":
      return "";
    case "set":
      return normalise(action.value);
  }
};

export const toAnswerNumber = (value: string): number | null => {
  if (value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
};
