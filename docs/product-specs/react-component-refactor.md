# React Component Refactor: Render Performance + Composability

## Goal

Refactor the 3 game views (host, player, spectator) using two specific patterns:

1. **react-render-performance** — Granular selectors to prevent unnecessary re-renders
2. **react-composable-components** — Small, focused, reusable components

## Context

### Actor Kit Selector Behavior
- `useSelector` uses `===` reference equality (no deep compare)
- Actor Kit syncs via **Immer + JSON Patches** — unchanged subtrees keep the same reference
- This means `GameContext.useSelector(s => s.public.players)` will NOT re-render when only `currentQuestion` changes
- The spectator-view already has good subcomponent splits (TimerDisplay, MultipleChoiceOptionsDisplay, PlayerAnswerRow, ResultScoreRow, etc.) — use these as the template

### Current Problems
Every view does `GameContext.useSelector(s => s.public)` which re-renders the entire component tree on ANY state change (player joins, answers submitted, timer ticks — everything).

## Part 1: Granular Selectors (react-render-performance)

Replace broad selectors with specific field selectors. Every `useSelector(s => s.public)` must become individual field selectors.

### Files to fix:
- `src/components/host-view.tsx` — lines 63, 825 use `state.public`
- `src/components/player-view.tsx` — line 355 uses `state` (worst!), lines 459, 516 use `state.public`
- `src/components/spectator-view.tsx` — lines 231, 561 use `state.public`
- `src/components/player-join.tsx` — line 13 uses `state.public`
- `src/components/scoreboard.tsx` — line 7 uses `state.public`
- `src/components/player-results.tsx` — line 9 uses `state.public`

### Correct pattern (already in host-view.tsx lines 1229-1233):
```tsx
const answerTimeWindow = GameContext.useSelector((state) => state.public.settings.answerTimeWindow);
const questions = GameContext.useSelector((state) => state.public.questions);
const questionNumber = GameContext.useSelector((state) => state.public.questionNumber);
```

### Validation
Write render-count tests that prove:
- When `currentQuestion` changes, `Scoreboard` does NOT re-render (it only depends on `players`)
- When a player joins, `TimerDisplay` does NOT re-render
- When answers are submitted, components that don't use `currentQuestion.answers` don't re-render

## Part 2: Composable Components (react-composable-components)

### Already extracted in spectator-view.tsx (use as template):
- `TimerDisplay` — props: `remainingTime: number`
- `MultipleChoiceOptionsDisplay` — props: `options: string[]`
- `PlayerAnswerRow` — props: `player, answer, startTime`
- `ResultScoreRow` — props: `answer, score, question`
- `QuestionAnswerHeader` — props: `question: Question`
- `ResultsScoreList` — props: `answers, scores, question`
- `MultipleChoiceOptionsList` — props: `options, correctAnswer` (results mode)
- `ActiveGameContent` — composition component

### What to do:
1. Move the shared components from spectator-view.tsx into `src/components/game/`
2. Have all 3 views import from `src/components/game/` instead of defining their own
3. Each view keeps its own layout/composition but uses shared primitives
4. Also extract `GameBackground` (the animated gradient) — it's copy-pasted in every display component

### Components to create in src/components/game/:
- `GameBackground.tsx` — the gradient animation wrapper
- `TimerDisplay.tsx` — countdown with urgency animation
- `QuestionText.tsx` — gradient heading for question text
- `MultipleChoiceOptions.tsx` — options list (with optional correct answer highlight)
- `PlayerAnswerList.tsx` — answer submission list with PlayerAnswerRow
- `QuestionResults.tsx` — results section with ResultScoreRow
- `Scoreboard.tsx` — sidebar scoreboard (already exists in spectator, extract)

### Rules:
- Components do ONE thing
- Props, not context — shared components receive data via props, not useSelector
- Only the top-level view components call useSelector
- Use `cn()` or `twMerge` for className composition if needed
- No `React.memo()` unless profiling shows it's needed — granular selectors should be enough

## Part 3: E2E Tests

After the refactor, add Playwright E2E tests for scenarios not yet covered:
- Host skips a question
- Host ends game early
- 3+ players competing
- Player disconnect/reconnect
- Settings changes before start
- Mid-game player join

## Acceptance Criteria

- [ ] Zero `useSelector(s => s.public)` or `useSelector(s => s)` calls remaining
- [ ] All shared components live in `src/components/game/`
- [ ] All 3 views import from shared components
- [ ] Render-count tests prove selector granularity works
- [ ] All 123 existing tests still pass
- [ ] Typecheck clean
- [ ] At least 3 new E2E specs added
