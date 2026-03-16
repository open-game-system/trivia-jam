# Noticed

Unrelated issues observed during nightshift runs. Human should review and
either fix these or file tickets.

## 2026-03-15: Dead code actions in game.machine.ts

Three actions defined in `setup()` are never referenced in any machine transition:

1. **`validateAnswer`** (lines 93–115) — was likely the pre-V2 scoring mechanism. Replaced by `processQuestionResults` which uses `calculateScores()`.
2. **`skipQuestion`** (lines 123–134) — SKIP_QUESTION transitions now use `processQuestionResults` instead.
3. **`hasReachedQuestionLimit`** guard (lines 38–40) — defined but not used in any transition. The game-end check is done inline in `processQuestionResults`.

These account for ~57 NoCoverage mutations in Stryker. Removing them would raise the mutation score from ~72% to ~85%+ with no behavior change. Recommend deleting after confirming nothing external imports them.

## 2026-03-15: Parsing error message immediately cleared (bug)

In `game.machine.ts`, the `waitingForQuestions` state has `entry: "clearParsingError"`. When `parsingDocument.onError` transitions back to `waitingForQuestions`, XState 5 runs actions in this order:
1. Transition action: `setParsingError` (sets `parsingErrorMessage`)
2. Entry action: `clearParsingError` (clears it immediately)

This means the user never sees the parsing error message in the UI. Fix: either remove `entry: "clearParsingError"` from `waitingForQuestions` and clear the error explicitly only on non-error transitions, or move `clearParsingError` to only run on the `PARSE_QUESTIONS` and `QUESTIONS_PARSED` transition actions.

## 2026-03-15: Equivalent mutants in scoring.ts

12 surviving mutants in scoring.ts are all equivalent — the `isExactMatch` field is redundant because `difference === 0` already encodes exact matches for valid answers. The `isExactMatch` checks in `compareNumericAnswers` and `isTied` provide clarity but not behavioral difference. The arithmetic mutation on line 69 (`timestamp - startTime` → `timestamp + startTime`) is also equivalent since it shifts all timeTaken values by a constant, preserving relative order and tie detection.

