/** What a player has typed, tied to the question it was typed for. */
export type Draft = { questionId: string | null; value: string };

/** The pad shows a draft only on its own question: a new question always starts empty. */
export const draftFor = (draft: Draft, questionId: string | null): string =>
  questionId !== null && draft.questionId === questionId ? draft.value : "";
