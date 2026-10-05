type Readable = { text: string; options?: readonly string[] };

/** What the speaker says: the question, then "A, Elephant. B, Blue whale." for multiple choice. */
export const buildReadAloudText = ({ text, options }: Readable): string => {
  const question = text.trim();
  const spokenQuestion = /[.?!]$/.test(question) ? question : `${question}.`;
  const choices = (options ?? [])
    .map((option, index) => `${String.fromCharCode(65 + index)}, ${option.trim()}.`)
    .join(" ");
  return choices ? `${spokenQuestion} ${choices}` : spokenQuestion;
};

type VoiceLike = { name: string; lang: string; localService: boolean };

const isEnglish = (voice: VoiceLike) => /^en([-_]|$)/i.test(voice.lang);

/** An English voice, local ones first (they speak at once, with no network). */
export const pickVoice = <T extends VoiceLike>(voices: readonly T[]): T | undefined => {
  const english = voices.filter(isEnglish);
  return english.find((voice) => voice.localService) ?? english[0];
};

const STORAGE_KEY = "tj-read-aloud";

/** Remembered across questions: once a player taps "Read it to me", later questions read themselves. */
export const readAloudWanted = (): boolean => {
  try {
    return window.localStorage.getItem(STORAGE_KEY) === "1";
  } catch {
    return false;
  }
};

export const rememberReadAloud = () => {
  try {
    window.localStorage.setItem(STORAGE_KEY, "1");
  } catch {
    // storage can be blocked (private window); the button still works.
  }
};
