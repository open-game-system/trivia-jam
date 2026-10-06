/**
 * The multiple-choice reveal's stage: one full-height glass column per option, the players' chips
 * stacked on their picks from the bottom up. Pure, poster pixels.
 */
export const CHOICE_FRAME = { left: 96, right: 1824, top: 318, bottom: 1010 } as const;

const GAP = 32;
/** The option's letter and text at the head of its column. */
const HEADER = 196;
const PAD = 20;

export type ChoiceColumn = { x: number; width: number; top: number; bottom: number };

export type ChoiceLayout = {
  columns: ChoiceColumn[];
  header: number;
  chip: number;
  /** "list": chip + name per row; "grid": initials only, several per row (a crowd). */
  mode: "list" | "grid";
  /** The smallest size a name may be set at (list mode). */
  nameMin: number;
  /** The width a name may use beside its chip (list mode). */
  nameBox: number;
  /** Centre of pick k (0 = first in) on option i. */
  chipAt: (option: number, k: number) => { x: number; y: number };
};

export const layoutChoiceColumns = (optionCount: number, picks: ReadonlyArray<number>): ChoiceLayout => {
  const n = Math.max(1, optionCount);
  const width = (CHOICE_FRAME.right - CHOICE_FRAME.left - GAP * (n - 1)) / n;
  const columns = Array.from({ length: n }, (_, i) => ({ x: CHOICE_FRAME.left + i * (width + GAP), width, top: CHOICE_FRAME.top, bottom: CHOICE_FRAME.bottom }));
  const most = Math.max(1, ...picks);
  const room = CHOICE_FRAME.bottom - CHOICE_FRAME.top - HEADER - PAD;
  // List: one pick per row, the name beside the chip, as long as the tallest pile fits.
  const listChip = [76, 64, 56].find((c) => most * (c + 14) <= room);
  const nameBox = width - PAD * 2 - (listChip ?? 0) - 16;
  if (listChip !== undefined && nameBox >= 150) {
    const rowH = listChip + 14;
    return {
      columns,
      header: HEADER,
      chip: listChip,
      mode: "list",
      nameMin: 30,
      nameBox,
      chipAt: (i, k) => ({ x: columns[i].x + PAD + listChip / 2, y: CHOICE_FRAME.bottom - PAD - listChip / 2 - k * rowH }),
    };
  }
  // Grid: initials only, filled bottom row first.
  const chip = [88, 72, 60, 52, 44].find((c) => {
    const perRow = Math.max(1, Math.floor((width - PAD) / (c + 12)));
    return Math.ceil(most / perRow) * (c + 12) <= room;
  }) ?? 44;
  const cell = chip + 12;
  const perRow = Math.max(1, Math.floor((width - PAD) / cell));
  const rowWidth = perRow * cell;
  return {
    columns,
    header: HEADER,
    chip,
    mode: "grid",
    nameMin: 30,
    nameBox: 0,
    chipAt: (i, k) => ({
      x: columns[i].x + (width - rowWidth) / 2 + (k % perRow) * cell + cell / 2,
      y: CHOICE_FRAME.bottom - PAD - chip / 2 - Math.floor(k / perRow) * cell,
    }),
  };
};

/** Which wrong options drop away, in order: the emptiest first, the most-picked wrong one last. */
export const eliminationOrder = (picks: ReadonlyArray<number>, correctIndex: number): number[] => {
  if (correctIndex < 0) return [];
  return picks
    .map((count, i) => ({ count, i }))
    .filter((o) => o.i !== correctIndex)
    .sort((a, b) => a.count - b.count || a.i - b.i)
    .map((o) => o.i);
};

/** When (ms into the suspense beat) each wrong option drops: the back half of the beat, done before the answer. */
export const eliminationTimes = (wrongCount: number, suspenseMs: number): number[] => {
  if (wrongCount <= 0) return [];
  const end = suspenseMs - 300;
  const start = Math.max(suspenseMs * 0.45, end - wrongCount * 320);
  const step = wrongCount > 1 ? (end - start) / (wrongCount - 1) : 0;
  return Array.from({ length: wrongCount }, (_, k) => Math.round(start + k * step));
};
